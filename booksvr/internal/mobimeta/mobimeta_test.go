package mobimeta

import (
	"encoding/binary"
	"os"
	"path/filepath"
	"testing"
)

// buildMOBI 构造一个最小但结构正确的 MOBI 容器，用于测试解析。
//
// 结构：PalmDB 头(78) + 记录索引(8) + 记录0(PalmDOC 头 + MOBI 头 + EXTH + fullname)
func buildMOBI(title string, fields map[uint32]string) []byte {
	// 先拼 EXTH 区。
	body := []byte{}
	// 按类型升序，保证输出稳定。
	types := []uint32{}
	for t := range fields {
		types = append(types, t)
	}
	for i := 0; i < len(types); i++ {
		for j := i + 1; j < len(types); j++ {
			if types[j] < types[i] {
				types[i], types[j] = types[j], types[i]
			}
		}
	}
	for _, t := range types {
		v := []byte(fields[t])
		rec := make([]byte, 8+len(v))
		binary.BigEndian.PutUint32(rec[0:4], t)
		binary.BigEndian.PutUint32(rec[4:8], uint32(8+len(v)))
		copy(rec[8:], v)
		body = append(body, rec...)
	}
	// EXTH 头：magic(4) + 总长度(4) + 记录数(4) = 12 字节。
	exth := make([]byte, 12)
	copy(exth[0:4], "EXTH")
	binary.BigEndian.PutUint32(exth[4:8], uint32(12+len(body)))
	binary.BigEndian.PutUint32(exth[8:12], uint32(len(types)))
	exth = append(exth, body...)

	// MOBI 头：至少 0x84 字节，含 full name 偏移/长度与 EXTH 标志。
	mobiHeaderLen := 0xE4
	mobi := make([]byte, mobiHeaderLen)
	copy(mobi[0:4], "MOBI")
	binary.BigEndian.PutUint32(mobi[4:8], uint32(mobiHeaderLen))
	// EXTH 标志位 0x40（相对 MOBI 起点 0x80）。
	binary.BigEndian.PutUint32(mobi[0x80:0x84], 0x40)

	// PalmDOC 头 16 字节。
	palmdoc := make([]byte, 16)
	binary.BigEndian.PutUint16(palmdoc[0:2], 1) // 无压缩

	rec0 := append([]byte{}, palmdoc...)
	rec0 = append(rec0, mobi...)
	rec0 = append(rec0, exth...)
	// full name 放在 EXTH 之后。
	fullNameOff := len(rec0)
	rec0 = append(rec0, []byte(title)...)
	// 回填 full name 偏移/长度（相对记录 0 起点 0x54 / 0x58）。
	binary.BigEndian.PutUint32(rec0[0x54:0x58], uint32(fullNameOff))
	binary.BigEndian.PutUint32(rec0[0x58:0x5C], uint32(len(title)))

	// PalmDB 头。
	pdb := make([]byte, 78)
	copy(pdb[0:32], []byte("PDB-NAME"))
	binary.BigEndian.PutUint16(pdb[76:78], 1) // 1 条记录

	// 记录索引表：1 项，指向 rec0。
	rec0Off := 78 + 8
	idx := make([]byte, 8)
	binary.BigEndian.PutUint32(idx[0:4], uint32(rec0Off))

	out := append([]byte{}, pdb...)
	out = append(out, idx...)
	out = append(out, rec0...)
	return out
}

func TestExtractTitleFromFullName(t *testing.T) {
	data := buildMOBI("红星照耀中国", nil)
	mi, err := Extract(data)
	if err != nil {
		t.Fatalf("Extract: %v", err)
	}
	if mi.Title != "红星照耀中国" {
		t.Errorf("Title = %q", mi.Title)
	}
}

func TestExtractEXTHFields(t *testing.T) {
	data := buildMOBI("书名", map[uint32]string{
		exthAuthor:    "埃德加·斯诺",
		exthPublisher: "人民文学出版社",
		exthComment:   "一部纪实文学经典",
		exthISBN:      "9787020002207",
		exthSubject:   "纪实",
		exthPublishDt: "1979-12-01",
	})
	mi, err := Extract(data)
	if err != nil {
		t.Fatalf("Extract: %v", err)
	}
	if len(mi.Authors) != 1 || mi.Authors[0] != "埃德加·斯诺" {
		t.Errorf("Authors = %v", mi.Authors)
	}
	if mi.Publisher != "人民文学出版社" {
		t.Errorf("Publisher = %q", mi.Publisher)
	}
	if mi.Comments != "一部纪实文学经典" {
		t.Errorf("Comments = %q", mi.Comments)
	}
	if mi.ISBN != "9787020002207" {
		t.Errorf("ISBN = %q", mi.ISBN)
	}
	if len(mi.Tags) != 1 || mi.Tags[0] != "纪实" {
		t.Errorf("Tags = %v", mi.Tags)
	}
	if mi.Published != "1979-12-01" {
		t.Errorf("Published = %q", mi.Published)
	}
}

func TestExtractEXTHTitleOverridesFullName(t *testing.T) {
	data := buildMOBI("旧书名", map[uint32]string{exthTitle: "新书名"})
	mi, err := Extract(data)
	if err != nil {
		t.Fatalf("Extract: %v", err)
	}
	if mi.Title != "新书名" {
		t.Errorf("Title = %q, want 新书名（EXTH 503 优先）", mi.Title)
	}
}

func TestExtractRejectsShortInput(t *testing.T) {
	if _, err := Extract([]byte("short")); err == nil {
		t.Error("过短的输入应报错")
	}
}

func TestExtractRejectsNonMOBI(t *testing.T) {
	data := make([]byte, 200)
	if _, err := Extract(data); err == nil {
		t.Error("非 MOBI 容器应报错")
	}
}

// TestExtractRealMOBI 用真实 MOBI 文件验证解析器。
//
// 文件不存在时跳过（CI 环境可能没有该样本）。
func TestExtractRealMOBI(t *testing.T) {
	path := os.Getenv("MOBI_SAMPLE")
	if path == "" {
		path = filepath.Join("testdata", "sample.mobi")
	}
	data, err := os.ReadFile(path)
	if err != nil {
		t.Skipf("缺少真实 MOBI 样本 %s: %v", path, err)
	}
	mi, err := Extract(data)
	if err != nil {
		t.Fatalf("Extract 真实文件失败: %v", err)
	}
	if mi.Title == "" {
		t.Error("真实 MOBI 应解析出书名")
	}
	t.Logf("解析结果: title=%q authors=%v publisher=%q published=%q isbn=%q",
		mi.Title, mi.Authors, mi.Publisher, mi.Published, mi.ISBN)
}
