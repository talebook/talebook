package httpapi

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"

	"talebook/booksvr/internal/userdb"
)

// ---- 有声书剩余接线：语音列表 / 试听 / 时间轴 / 审计 ----

// builtinVoices 是内置语音清单（复刻 Python 的默认引擎语音表）。
var builtinVoices = []map[string]any{
	{"id": "zh-CN-XiaoxiaoNeural", "name": "晓晓", "engine": "edgetts", "language": "zh-CN", "gender": "female"},
	{"id": "zh-CN-YunxiNeural", "name": "云希", "engine": "edgetts", "language": "zh-CN", "gender": "male"},
	{"id": "zh-CN-YunyangNeural", "name": "云扬", "engine": "edgetts", "language": "zh-CN", "gender": "male"},
	{"id": "zh-CN-XiaoyiNeural", "name": "晓伊", "engine": "edgetts", "language": "zh-CN", "gender": "female"},
	{"id": "zh-CN-YunjianNeural", "name": "云健", "engine": "edgetts", "language": "zh-CN", "gender": "male"},
	{"id": "zh-TW-HsiaoChenNeural", "name": "曉臻", "engine": "edgetts", "language": "zh-TW", "gender": "female"},
	{"id": "en-US-AriaNeural", "name": "Aria", "engine": "edgetts", "language": "en-US", "gender": "female"},
	{"id": "en-US-GuyNeural", "name": "Guy", "engine": "edgetts", "language": "en-US", "gender": "male"},
}

// audioVoices 返回可用语音列表。
func (w *audioWiring) audioVoices() []map[string]any {
	out := make([]map[string]any, len(builtinVoices))
	copy(out, builtinVoices)
	return out
}

// audioVoicePreview 返回语音试听音频。
//
// 试听音频由 TTS 引擎生成；无引擎时从缓存目录读取预置样本。
func (w *audioWiring) audioVoicePreview(engine, voiceID string) ([]byte, string, error) {
	if engine == "" || voiceID == "" {
		return nil, "", os.ErrNotExist
	}
	// 防路径穿越：语音 ID 只允许安全字符。
	if strings.ContainsAny(voiceID, `/\`) || strings.Contains(voiceID, "..") {
		return nil, "", os.ErrNotExist
	}
	path := filepath.Join(w.root, "voices", engine, voiceID+".mp3")
	body, err := os.ReadFile(path)
	if err != nil {
		return nil, "", err
	}
	return body, "audio/mpeg", nil
}

// audioTimeline 返回章节时间轴。
func (w *audioWiring) audioTimeline(ctx *Context, editionID int64, chapterNumber int) (map[string]any, error) {
	chapter, err := userdb.AudiobookChapterByNumber(w.db, editionID, int64(chapterNumber))
	if err != nil {
		return nil, err
	}
	if chapter == nil {
		return map[string]any{"err": "ok", "timeline": []any{}}, nil
	}

	// 时间轴以 JSON 文件落盘；缺失时返回空列表。
	if chapter.TimelinePath == "" {
		return map[string]any{"err": "ok", "timeline": []any{}}, nil
	}
	body, err := os.ReadFile(chapter.TimelinePath)
	if err != nil {
		return map[string]any{"err": "ok", "timeline": []any{}}, nil
	}
	var timeline []any
	if err := json.Unmarshal(body, &timeline); err != nil {
		return map[string]any{"err": "ok", "timeline": []any{}}, nil
	}
	return map[string]any{
		"err":      "ok",
		"timeline": timeline,
		"duration": chapter.DurationMS,
	}, nil
}

// audioAudit 处理播客审计（GET 返回访问日志，PATCH 更新订阅状态）。
func (w *audioWiring) audioAudit(ctx *Context, method string, args map[string]any) (map[string]any, error) {
	if !ctx.Identity.IsAdmin {
		return map[string]any{"err": "permission", "msg": "无权操作"}, nil
	}

	switch method {
	case "GET":
		logs, err := userdb.ListPodcastAccessLogs(w.db, 100)
		if err != nil {
			return nil, err
		}
		return map[string]any{"err": "ok", "logs": logs}, nil

	case "PATCH":
		readerID := int64Of(args["reader_id"])
		if readerID == 0 {
			return map[string]any{"err": "params.invalid", "msg": "缺少读者标识"}, nil
		}
		if frozen := bookBoolOf(args["frozen"]); frozen {
			if err := userdb.FreezePodcastSubscription(w.db, readerID, stringOf(args["reason"])); err != nil {
				return map[string]any{"err": "not_found", "msg": "订阅不存在"}, nil
			}
			return map[string]any{"err": "ok", "msg": "订阅已冻结"}, nil
		}
		if err := userdb.UnfreezePodcastSubscription(w.db, readerID); err != nil {
			return map[string]any{"err": "not_found", "msg": "订阅不存在"}, nil
		}
		return map[string]any{"err": "ok", "msg": "订阅已解冻"}, nil
	}
	return map[string]any{"err": "params.invalid", "msg": "不支持的方法"}, nil
}
