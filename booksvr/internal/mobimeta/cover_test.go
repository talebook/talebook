package mobimeta

import (
	"bytes"
	"encoding/binary"
	"os"
	"testing"
)

// TestCoverRealMOBI 验证能从真实 MOBI 样本里取出内嵌封面。
//
// 这是「文件明明有封面却看不到」的回归测试：样本的 EXTH 201 指向
// 记录 52，里面是一张 JPEG。导入时必须把它提取出来写成 cover.jpg
// 并把 books.has_cover 置 1，否则详情页只能显示默认占位图。
func TestCoverRealMOBI(t *testing.T) {
	data, err := os.ReadFile("testdata/sample.mobi")
	if err != nil {
		t.Skipf("缺少样本: %v", err)
	}

	img, ok := Cover(data)
	if !ok {
		t.Fatal("应从真实样本中提取到封面")
	}
	// JPEG 魔数 FF D8 FF。
	if len(img) < 3 || img[0] != 0xFF || img[1] != 0xD8 || img[2] != 0xFF {
		t.Errorf("封面不是 JPEG，前 4 字节 = % x", img[:min(4, len(img))])
	}
	// 封面尺寸必须与 Calibre 的提取结果一致（约 35-40 KB）。
	// 曾错误地把 EXTH 201 当记录号，取到 125 KB 的正文插图。
	if len(img) < 20000 || len(img) > 60000 {
		t.Errorf("封面字节数 = %d，不在预期区间 [20000, 60000]（可能取到了插图）", len(img))
	}
}

// TestCoverRejectsShortInput 验证过短输入不 panic。
func TestCoverRejectsShortInput(t *testing.T) {
	if _, ok := Cover([]byte("short")); ok {
		t.Error("过短输入不应返回封面")
	}
	if _, ok := Cover(nil); ok {
		t.Error("nil 不应返回封面")
	}
}

// TestCoverNoCoverOffset 验证没有 EXTH 201 时返回 ok=false。
func TestCoverNoCoverOffset(t *testing.T) {
	// 构造一个只有 EXTH 503（书名）的最小 MOBI。
	data := buildMOBI("无封面书", map[uint32]string{503: "无封面书"})
	if _, ok := Cover(data); ok {
		t.Error("没有 EXTH 201 时不应返回封面")
	}
}

// TestCoverOffsetOutOfRange 验证 EXTH 201 越界时不 panic。
func TestCoverOffsetOutOfRange(t *testing.T) {
	// 偏移 9999 远超记录数。
	data := buildMOBI("越界书", map[uint32]string{503: "越界书", 201: "\x00\x00\x27\x0f"})
	if _, ok := Cover(data); ok {
		t.Error("越界偏移不应返回封面")
	}
}

func TestCoverUsesHeaderImageBaseAndRecordOffset(t *testing.T) {
	record0 := make([]byte, 16+232+24)
	copy(record0[16:], "MOBI")
	binary.BigEndian.PutUint32(record0[20:], 232)
	binary.BigEndian.PutUint32(record0[0x6c:], 2)
	copy(record0[248:], "EXTH")
	binary.BigEndian.PutUint32(record0[252:], 24)
	binary.BigEndian.PutUint32(record0[256:], 1)
	binary.BigEndian.PutUint32(record0[260:], 201)
	binary.BigEndian.PutUint32(record0[264:], 12)
	binary.BigEndian.PutUint32(record0[268:], 2)
	wanted := []byte{0xff, 0xd8, 0xff, 0x42}
	records := [][]byte{record0, []byte("text"), {0xff, 0xd8, 0xff, 0x10}, []byte("RESC non-image"), wanted}
	data := make([]byte, 78+8*len(records))
	binary.BigEndian.PutUint16(data[76:], uint16(len(records)))
	for i, r := range records {
		binary.BigEndian.PutUint32(data[78+8*i:], uint32(len(data)))
		data = append(data, r...)
	}
	got, ok := Cover(data)
	if !ok || !bytes.Equal(got, wanted) {
		t.Fatalf("wrong cover: %x %v", got, ok)
	}
}
