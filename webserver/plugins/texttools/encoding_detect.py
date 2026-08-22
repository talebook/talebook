# -*- coding: utf-8 -*-
"""文本编码检测（TXT 编码修复 / 正文查找替换 两插件共用，不依赖 MyBooks）。

检测策略（按优先级）：
1. **BOM 优先**：UTF-8 BOM / UTF-16 BOM / UTF-32 BOM 直接判定；
2. **候选编码严格解码打分**：UTF-8 / GB18030 / BIG5 逐个 strict 解码，
   以可读性评分（中文字符占比、替换符、控制字符、常见乱码区）排序；
3. **chardet 三段采样**：开头 / 中间 / 结尾各取样本，chardet 可用时参与投票；
4. **mojibake 反转链**：对首选解码结果尝试常见乱码反转
   （``text.encode(误读编码).decode(真实编码)``），可读性显著提升时采纳，
   并标记 ``mojibake=True`` 供前端提示；
5. **可读性复检**：反转结果与直解结果比较后取最优。

对外主要接口：:func:`detect_encoding`（返回检测报告 dict）、
:func:`decode_with_report`（按报告解码出最终文本）。
"""

import re

try:
    import chardet
except ImportError:  # chardet 缺失时退化为纯规则检测
    chardet = None

# 参与候选打分的编码（strict 解码）
CANDIDATE_ENCODINGS = ("utf-8", "gb18030", "big5")
# BOM → 编码
_BOM_TABLE = (
    (b"\xef\xbb\xbf", "utf-8-sig"),
    (b"\xff\xfe\x00\x00", "utf-32"),
    (b"\x00\x00\xfe\xff", "utf-32"),
    (b"\xff\xfe", "utf-16"),
    (b"\xfe\xff", "utf-16"),
)

# 乱码反转链：对解码文本尝试 ``text.encode(中间编码).decode(真实编码)`` 组合，
# 可读性显著提升时采纳。常见场景：原编码字节被程序误读（如 BIG5 被按 GB18030 读）
# 后以另一种编码（多为 UTF-8）写盘。
_MOJIBAKE_PAIRS = (
    ("gb18030", "big5"),    # BIG5 字节被按 GBK/GB18030 误读
    ("gb18030", "utf-8"),   # UTF-8 字节被按 GBK/GB18030 误读
    ("big5", "utf-8"),      # UTF-8 字节被按 BIG5 误读
    ("big5", "gb18030"),    # GBK 字节被按 BIG5 误读
    ("utf-8", "gb18030"),   # GBK 字节被按 UTF-8 误读（存为乱码 UTF-8）
    ("utf-8", "big5"),      # BIG5 字节被按 UTF-8 误读
)

# 不可读字符（替换符 / 私用区 / 代理区）
_UNREADABLE_RE = re.compile(
    "[\ufffd\ufffe\uffff\ue000-\uf8ff\ud800-\udfff\ud7b0-\ud7ff]"
)
# 常见乱码字形区（GBK 误读 UTF-8 常落入拉丁-1 补充区等；
# 不含全角标点区 \uff00-\uffef——那是正常中文标点，不能当作乱码扣分）
_MOJIBAKE_CHAR_RE = re.compile(
    "[\u0080-\u00ff\u0100-\u017f\u2000-\u206f]"
)
# 控制字符（保留 \n \r \t）
_CONTROL_RE = re.compile("[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")
_CJK_RE = re.compile("[\u3400-\u4dbf\u4e00-\u9fff]")

SAMPLE_CHARS = 800  # 报告中的可读性样本长度
SAMPLE_LIMIT = 2 * 1024 * 1024  # 检测采样上限：候选打分 / chardet / 反转链只在前缀上进行，
# 全量解码仅对最终方案执行一次，避免超大文件（数百 MB）多次全量解码导致 OOM

# 高频常用字（简繁混合，500+）：正常中文文本命中率高（>50%），
# 误读乱码字（鍙岄噸/浜哄伐/锛堥崣 类）几乎不命中，用于识别
# "字形全部合法、统计可读性满分"的语义级乱码（如 UTF-8 被按 GBK 误读）。
_COMMON_CHARS = frozenset(
    "的一是在不了有和人这中大为上个国我以要他时来用们生到作地于出就分对成会可主发年动同工也能下过子说产种面而方后多定行学法所民得经十三之进着等部度家电力里如水化高自二理起小物现实加量都两体制机当使点从业本去把性好应开它合还因由其些然前外天政四日那社义事平形相全表间样与关各重新线内数正心反你明看原又么利比或但质气第向道命此变条只没结解问意建月公无系军很情者最立代想已通并提直题党程展五果料象员革位入常文总次品式活设及管特件长求老头基资边流路级少图山统接知较将组见计别她手角期根论运农指几九区强放决西被干做必战先回则任取据处队南给色光门即保治北造百规热领七海口东导器压志世金增争济阶油思术极交受联什认六共权收证改清己美再采转更单风切打白教速花带安场身车例真务具万每目至达走积示议声报斗完类八离华名确才科张信马节话米整空元况今集温传土许步群广石记需段研界拉林律叫且究观越织装影算低持音众书布复容儿须际商非验连断深难近矿千周委素技备半办青省列习响约支般史感劳便团往酸历市克何除消构府称太准精值号率族维划选标写存候毛亲快效斯院查江型眼王按格养易置派层片始却专状育厂京识适属圆包火住调满县局照参红细引听该铁价严龙飞"
    "這為說時從們發頭國門長經還樣處對進級紅綠簡復書語話認識認真體紙間題問聞隊際陽陰險幾爾東樂習鄉歸開閉學黨興舉親觀覽馬魚鳥貝見車銀門電產業發展電腦軟體資訊網路臺灣機學習深度人工智慧書籍內容涵蓋作者"
)


def _common_ratio(text):
    """高频常用字占比：正常中文文本 >0.5，误读乱码文本通常 <0.1。"""
    if not text:
        return 0.0
    sample = text[:2000]
    if not sample:
        return 0.0
    return sum(1 for ch in sample if ch in _COMMON_CHARS) / len(sample)


def _score_total(text):
    """统一方案评分：可读性为主 + 常用字占比加成（识别语义级乱码）。"""
    return _readability_score(text) + min(30.0, _common_ratio(text) * 40.0)


def _readability_score(text):
    """0~100 可读性评分：中文书籍文本得分应显著高于乱码结果。"""
    if not text:
        return 0.0
    length = len(text)
    sample = text[:2000]
    n = len(sample)
    if n == 0:
        return 0.0

    replace_count = len(_UNREADABLE_RE.findall(sample))
    control_count = len(_CONTROL_RE.findall(sample))
    cjk_count = len(_CJK_RE.findall(sample))
    mojibake_count = len(_MOJIBAKE_CHAR_RE.findall(sample))

    # 可读字符 = 常规字符（非替换/非控制/非乱码字形）
    readable = n - replace_count - control_count - mojibake_count
    score = 100.0 * readable / n

    # 中文书籍文本 CJK 占比应较高，加权；纯英文书亦应可读（CJK 为 0 时不惩罚）
    cjk_ratio = cjk_count / n
    if cjk_ratio > 0.1:
        score += min(15.0, cjk_ratio * 40.0)

    # 替换符密集 = 强乱码信号
    score -= min(60.0, replace_count / max(n, 1) * 500.0)
    # 控制字符（非换行制表）几乎必为乱码/二进制
    score -= min(80.0, control_count / max(n, 1) * 1000.0)
    return max(0.0, min(100.0, score))


def _strict_decode(data, encoding):
    try:
        return data.decode(encoding, errors="strict")
    except (UnicodeDecodeError, LookupError):
        return None


def _sample_segments(data, size=2048, count=3):
    """取开头 / 中间 / 结尾三段样本字节。"""
    if len(data) <= size:
        return [data]
    segs = [data[:size]]
    mid = len(data) // 2
    segs.append(data[mid:mid + size])
    segs.append(data[-size:])
    return segs


def _chardet_vote(data):
    """chardet 三段采样投票；返回 (encoding, confidence) 或 None。"""
    if chardet is None:
        return None
    segments = _sample_segments(data)
    votes = {}
    for seg in segments:
        try:
            guess = chardet.detect(seg)
        except Exception:
            continue
        enc = (guess.get("encoding") or "").lower()
        conf = guess.get("confidence") or 0.0
        if enc and conf > 0.3:
            votes[enc] = votes.get(enc, 0.0) + conf
    if not votes:
        return None
    best = max(votes.items(), key=lambda kv: kv[1])
    return (best[0], best[1] / len(segments))


def _decode_candidates(data):
    """对候选编码逐个 strict 解码（尾部截断自动回退），返回 [(encoding, text, score)] 按得分降序。"""
    results = []
    for enc in CANDIDATE_ENCODINGS:
        text = _strict_decode_tail(data, enc)
        if text is None:
            continue
        results.append((enc, text, _readability_score(text)))
    results.sort(key=lambda r: r[2], reverse=True)
    return results


def _strict_decode_tail(data, enc):
    """对（可能尾部截断的）前缀严格解码：失败时回退至多 8 字节再试。

    采样截断可能切断多字节字符（UTF-8 3/4 字节、GBK/BIG5 双字节），
    直接 strict 解码会误报"无法解码"；回退尾部字节可恢复对齐。
    """
    for cut in range(9):
        chunk = data if cut == 0 else data[:-cut]
        if not chunk:
            continue  # 回退到空串不算有效解码（避免 1 字节截断文件被当成候选）
        try:
            return chunk.decode(enc, errors="strict")
        except (UnicodeDecodeError, LookupError):
            continue
    return None


def _try_mojibake_recovery(text, max_rounds=3):
    """迭代乱码反转：每轮尝试 ``text.encode(中间编码).decode(真实编码)`` 组合，
    对结果继续反转（支持双重/多重误读）；``visited`` 防止 A→B→A 式循环。

    :return: ((recovered_text, mid_enc, real_enc, score) | None, cycle)
        cycle=True 表示检测到反转循环（深度误读，最终结果不可信）。
    """
    best = None
    cycle = False
    current = text
    visited = {text}
    for _ in range(max_rounds):
        found = None
        for mid_enc, real_enc in _MOJIBAKE_PAIRS:
            try:
                raw = current.encode(mid_enc)
            except (UnicodeEncodeError, LookupError):
                continue
            recovered = _strict_decode(raw, real_enc)
            if recovered is None or recovered == current:
                continue  # 解码失败或无变化（纯 ASCII 在任意编码下等价）
            score = _readability_score(recovered)
            if score >= 60:
                found = (recovered, mid_enc, real_enc, score)
                break
        if found is None:
            break
        rec_text, mid_enc, real_enc, rec_score = found
        if rec_text in visited:
            cycle = True
            # 循环无出口：仅当存在"显著更优"的中间态（可读性+常用字）才视为可信，
            # 否则判定深度误读（返回 None 由调用方标记 unrecoverable）
            if best is not None and _score_total(best[0]) > _score_total(text) + 10:
                return best, True
            return None, True
        visited.add(rec_text)
        current = rec_text
        # 高可读性 + 常用字占比显著 → 可信出口，立即停止
        if rec_score >= 90 and _common_ratio(rec_text) > 0.3:
            return (rec_text, mid_enc, real_enc, rec_score), False
        best = rec_text, mid_enc, real_enc, rec_score
    return best, cycle


def _analyze(data):
    """内部完整分析：返回 (text, report)。

    检测阶段（候选打分 / chardet / mojibake 反转）全部在前缀采样上进行，
    最终方案才全量解码一次（防大文件多轮全量解码导致 OOM）；
    ``text`` 是检测 / 恢复后的全文文本（BOM 剥离、mojibake 反转恢复均已应用），
    供修复链路直接使用；``report`` 即 :func:`detect_encoding` 的报告结构。
    """
    reasons = []

    if isinstance(data, str):
        data = data.encode("utf-8")

    if not data:
        return "", {"encoding": "utf-8", "confidence": 0.0, "mojibake": False,
                    "garbage": False, "unrecoverable": False,
                    "sample": "", "reasons": ["空文件"]}

    # 1. BOM 优先（文件头字节，全量数据上判定）
    for bom, enc in _BOM_TABLE:
        if data.startswith(bom):
            text = data.decode(enc, errors="replace").lstrip("\ufeff")
            reasons.append("检测到 BOM，编码确定为 %s" % enc)
            return text, {"encoding": enc, "confidence": 1.0, "mojibake": False,
                          "garbage": False, "unrecoverable": False,
                          "sample": text[:SAMPLE_CHARS], "reasons": reasons}

    sample = data[:SAMPLE_LIMIT]

    # 2. 候选编码 strict 解码打分（采样上，尾部截断自动回退）
    candidates = _decode_candidates(sample)
    if not candidates:
        reasons.append("所有候选编码均无法严格解码，疑似二进制或混用编码")
        return data.decode("utf-8", errors="replace"), {
            "encoding": "utf-8", "confidence": 0.0, "mojibake": False,
            "garbage": True, "unrecoverable": False,
            "sample": "", "reasons": reasons}

    # 3. chardet 投票（作为参考依据，不覆盖 strict 打分）
    chardet_guess = _chardet_vote(sample)
    if chardet_guess:
        c_enc, c_conf = chardet_guess
        reasons.append("chardet 投票：%s（%.0f%%）" % (c_enc, c_conf * 100))

    # 4. 对每个候选解码结果尝试乱码反转（无条件），全局选最优方案。
    #    反转起点必须覆盖所有候选：误读文件常以 UTF-8 存盘（直解 utf-8 是
    #    乱码），但其分数可能低于 gb18030 候选的错解，只反转 candidates[0]
    #    会漏掉正确的恢复路径。
    options = []  # (enc, text, mojibake, mid, real, orig_cand_enc)
    cycle_any = False
    for cand_enc, cand_text, cand_score in candidates:
        options.append((cand_enc, cand_text, False, None, None, cand_enc))
        recovered, cycle = _try_mojibake_recovery(cand_text)
        if recovered is not None:
            rt, mid, real, rs = recovered
            options.append((real, rt, True, mid, real, cand_enc))
        cycle_any = cycle_any or cycle

    # 方案选择：受保护门槛——若 UTF-8 直解可信（readability >= 60），说明文件
    # 是"无辜的正常 UTF-8"，非 UTF-8 方案（其他编码直解 / 反转）必须显著胜出
    # （total 超出 +10）才可采纳，防僻字/低熵文本被误判为 GBK/BIG5 乱码；
    # 若 UTF-8 直解不可信（误读文本可读性差，如锟斤拷场景），则正常竞争不设门槛。
    # 总分打平时直解优先（保守）。
    utf8_direct = next((o for o in options if o[0] == "utf-8" and not o[2]), None)
    if utf8_direct is not None and _readability_score(utf8_direct[1]) >= 60:
        floor = _score_total(utf8_direct[1]) + 10.0

        def _eff(o):
            if o[0] == "utf-8" and not o[2]:
                return _score_total(o[1])
            t = _score_total(o[1])
            # 非 UTF-8 方案：总分未显著超过 UTF-8 直解（+10）即视为无效
            return t if t >= floor else -1.0

        enc, text, mojibake, mid_enc, real_enc, cand_enc = max(
            options, key=lambda o: (_eff(o), 1 if not o[2] else 0))
    else:
        enc, text, mojibake, mid_enc, real_enc, cand_enc = max(
            options, key=lambda o: (_score_total(o[1]), 1 if not o[2] else 0))
    score = _readability_score(text)
    reasons.append("候选解码：%s（可读性 %.0f/100）" % (cand_enc, score))
    if mojibake:
        reasons.append("乱码反转恢复：按 %s 重读后为 %s（可读性 %.0f/100）"
                       % (mid_enc, real_enc, score))
    elif cycle_any:
        # 反转候选可达但构成循环（A→B→A）且无可信出口：深度误读
        reasons.append("检测到乱码反转循环，疑似多重误读，无法自动恢复")

    unrecoverable = bool(cycle_any) and not mojibake

    # 5. 全量解码最终方案（仅一次）
    try:
        if mojibake:
            full_text = data.decode(cand_enc).encode(mid_enc).decode(real_enc)
            score = _readability_score(full_text)
        else:
            full_text = data.decode(enc)
            score = _readability_score(full_text)
    except (UnicodeDecodeError, UnicodeEncodeError):
        # 采样与全量不一致（尾部截断 / 混用编码 / 采样外字符无法往返）：
        # 按 UTF-8 替换解码输出并标记垃圾，拒绝修复而非崩溃
        reasons.append("全量解码失败，疑似尾部截断或混用编码")
        return data.decode("utf-8", errors="replace"), {
            "encoding": "utf-8", "confidence": 0.0, "mojibake": False,
            "garbage": True, "unrecoverable": False,
            "sample": "", "reasons": reasons}

    confidence = min(1.0, score / 100.0)
    return full_text, {
        "encoding": enc,
        "confidence": round(confidence, 2),
        "mojibake": mojibake,
        "garbage": score < 30,
        "unrecoverable": unrecoverable,
        "sample": full_text[:SAMPLE_CHARS],
        "reasons": reasons,
    }


def _has_cycle_candidate(text):
    """是否存在可 strict 反转的候选（供循环判定：反转可达但不可信）。"""
    for mid_enc, real_enc in _MOJIBAKE_PAIRS:
        try:
            raw = text.encode(mid_enc)
        except (UnicodeEncodeError, LookupError):
            continue
        rec = _strict_decode(raw, real_enc)
        if rec is not None and rec != text:
            return True
    return False


def detect_encoding(data):
    """检测字节流的编码并返回报告。

    :param data: 文件原始字节（str 输入会先按 UTF-8 编码）
    :return dict: ``encoding``（建议解码编码）、``confidence``（0~1）、
        ``mojibake``（是否发生乱码反转恢复）、``garbage``（疑似非文本）、
        ``sample``（可读性最好的解码文本片段）、``reasons``（检测依据列表）。
    """
    return _analyze(data)[1]


def decode_with_report(data):
    """按检测报告解码文本；返回 (text, report)。

    ``text`` 与检测阶段完全一致（BOM 剥离 / mojibake 反转恢复均已应用），
    可直接用于后续处理。
    """
    if isinstance(data, str):
        data = data.encode("utf-8")
    return _analyze(data)


def fix_to_utf8(data):
    """修复入口：检测并转换为 UTF-8（无 BOM）字节流。

    :return: (utf8_bytes, report)
    """
    text, report = decode_with_report(data)
    return text.encode("utf-8"), report
