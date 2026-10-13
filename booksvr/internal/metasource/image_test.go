package metasource

import (
	"bytes"
	"image"
	"image/color"
	"image/jpeg"
	"image/png"
	"testing"
)

// makePNG 生成一张纯色 PNG。
func makePNG(t *testing.T, w, h int, c color.Color) []byte {
	t.Helper()
	img := image.NewRGBA(image.Rect(0, 0, w, h))
	for y := 0; y < h; y++ {
		for x := 0; x < w; x++ {
			img.Set(x, y, c)
		}
	}
	var buf bytes.Buffer
	if err := png.Encode(&buf, img); err != nil {
		t.Fatalf("png.Encode: %v", err)
	}
	return buf.Bytes()
}

// TestConvertPNGToJPEG 校验 PNG→JPEG 转换输出可解码的 JPEG。
func TestConvertPNGToJPEG(t *testing.T) {
	src := makePNG(t, 100, 200, color.RGBA{255, 0, 0, 255})
	out, err := convertPNGToJPEG(src, false)
	if err != nil {
		t.Fatalf("convertPNGToJPEG: %v", err)
	}
	img, err := jpeg.Decode(bytes.NewReader(out))
	if err != nil {
		t.Fatalf("输出不是合法 JPEG: %v", err)
	}
	// normalCover=false 时不裁剪，尺寸保持不变。
	if b := img.Bounds(); b.Dx() != 100 || b.Dy() != 200 {
		t.Errorf("尺寸 = %dx%d, want 100x200", b.Dx(), b.Dy())
	}
}

// TestConvertPNGToJPEGCrop 校验高宽比 < 1.2 且 normalCover 时居中裁剪为正方形。
func TestConvertPNGToJPEGCrop(t *testing.T) {
	// 100x110 → 比例 1.1 < 1.2，应裁剪为 100x100。
	src := makePNG(t, 100, 110, color.RGBA{0, 0, 255, 255})
	out, err := convertPNGToJPEG(src, true)
	if err != nil {
		t.Fatalf("convertPNGToJPEG: %v", err)
	}
	img, err := jpeg.Decode(bytes.NewReader(out))
	if err != nil {
		t.Fatalf("输出不是合法 JPEG: %v", err)
	}
	if b := img.Bounds(); b.Dx() != 100 || b.Dy() != 100 {
		t.Errorf("裁剪后尺寸 = %dx%d, want 100x100", b.Dx(), b.Dy())
	}
}

// TestConvertPNGToJPEGNoCropWhenTall 校验高宽比 >= 1.2 时不裁剪。
func TestConvertPNGToJPEGNoCropWhenTall(t *testing.T) {
	// 100x200 → 比例 2.0 >= 1.2，不裁剪。
	src := makePNG(t, 100, 200, color.RGBA{0, 255, 0, 255})
	out, err := convertPNGToJPEG(src, true)
	if err != nil {
		t.Fatalf("convertPNGToJPEG: %v", err)
	}
	img, err := jpeg.Decode(bytes.NewReader(out))
	if err != nil {
		t.Fatalf("输出不是合法 JPEG: %v", err)
	}
	if b := img.Bounds(); b.Dx() != 100 || b.Dy() != 200 {
		t.Errorf("尺寸 = %dx%d, want 100x200", b.Dx(), b.Dy())
	}
}

// TestConvertPNGToJPEGInvalid 校验非法输入返回错误。
func TestConvertPNGToJPEGInvalid(t *testing.T) {
	if _, err := convertPNGToJPEG([]byte("not a png"), false); err == nil {
		t.Error("非法 PNG 应返回错误")
	}
}

// TestToRGB 校验 RGBA 转 RGB 丢弃 alpha。
func TestToRGB(t *testing.T) {
	src := image.NewRGBA(image.Rect(0, 0, 2, 2))
	src.Set(0, 0, color.RGBA{10, 20, 30, 128})
	src.Set(1, 0, color.RGBA{40, 50, 60, 0})
	src.Set(0, 1, color.RGBA{70, 80, 90, 255})
	src.Set(1, 1, color.RGBA{100, 110, 120, 255})

	got := toRGB(src)
	if b := got.Bounds(); b.Dx() != 2 || b.Dy() != 2 {
		t.Fatalf("尺寸 = %dx%d", b.Dx(), b.Dy())
	}
	// alpha 一律置为不透明。
	for y := 0; y < 2; y++ {
		for x := 0; x < 2; x++ {
			_, _, _, a := got.At(x, y).RGBA()
			if a != 0xffff {
				t.Errorf("(%d,%d) alpha = %d, want 65535", x, y, a)
			}
		}
	}
	// RGB 通道保留。
	r, g, b, _ := got.At(0, 0).RGBA()
	if r>>8 != 10 || g>>8 != 20 || b>>8 != 30 {
		t.Errorf("(0,0) = (%d,%d,%d), want (10,20,30)", r>>8, g>>8, b>>8)
	}
}

// TestCropImage 校验裁剪区域与偏移。
func TestCropImage(t *testing.T) {
	src := image.NewRGBA(image.Rect(0, 0, 10, 10))
	// 在 (5,5) 放一个标记色。
	src.Set(5, 5, color.RGBA{255, 0, 0, 255})

	got := cropImage(src, 5, 5, 3, 3)
	if b := got.Bounds(); b.Dx() != 3 || b.Dy() != 3 {
		t.Fatalf("尺寸 = %dx%d, want 3x3", b.Dx(), b.Dy())
	}
	// 原图 (5,5) 应落在裁剪图 (0,0)。
	r, _, _, _ := got.At(0, 0).RGBA()
	if r>>8 != 255 {
		t.Errorf("裁剪原点 = %d, want 255", r>>8)
	}
}

// TestBaikeStringify 校验 str(value) 语义。
func TestBaikeStringify(t *testing.T) {
	cases := []struct {
		in   any
		want string
	}{
		{nil, "None"},
		{"abc", "abc"},
		{true, "True"},
		{false, "False"},
		{float64(42), "42"},
		{float64(1.5), "1.5"},
		{[]any{"a", "b"}, `["a","b"]`},
	}
	for _, tc := range cases {
		if got := baikeStringify(tc.in); got != tc.want {
			t.Errorf("baikeStringify(%v) = %q, want %q", tc.in, got, tc.want)
		}
	}
}

// TestXhsdError 校验错误消息。
func TestXhsdError(t *testing.T) {
	if got := errNotNumber.Error(); got != "not a number" {
		t.Errorf("errNotNumber.Error() = %q", got)
	}
	if got := (&xhsdError{"boom"}).Error(); got != "boom" {
		t.Errorf("xhsdError.Error() = %q", got)
	}
}

// TestAtoiSafe 校验端口解析。
func TestAtoiSafe(t *testing.T) {
	if n, err := atoiSafe("443"); err != nil || n != 443 {
		t.Errorf("atoiSafe(443) = (%d, %v)", n, err)
	}
	if _, err := atoiSafe("abc"); err == nil {
		t.Error("非数字应返回错误")
	}
	if _, err := atoiSafe(""); err != nil {
		t.Errorf("空串应返回 (0, nil), 得到 %v", err)
	}
}

// TestBaikeEndpointDefault 校验默认接口地址。
func TestBaikeEndpointDefault(t *testing.T) {
	src := NewBaikeSource(nil)
	if got := src.endpoint(); got != BaikeEndpoint {
		t.Errorf("endpoint() = %q, want %q", got, BaikeEndpoint)
	}
	src.Endpoint = "http://mirror.test"
	if got := src.endpoint(); got != "http://mirror.test" {
		t.Errorf("覆盖后 endpoint() = %q", got)
	}
}

// TestXhsdURLDefaults 校验默认地址。
func TestXhsdURLDefaults(t *testing.T) {
	src := NewXhsdSource(nil)
	if got := src.searchURL(); got != XhsdSearchURL {
		t.Errorf("searchURL() = %q", got)
	}
	if got := src.detailBase(); got != XhsdDetailBase {
		t.Errorf("detailBase() = %q", got)
	}
	src.SearchURL = "http://s.test"
	src.DetailBase = "http://d.test"
	if got := src.searchURL(); got != "http://s.test" {
		t.Errorf("覆盖后 searchURL() = %q", got)
	}
	if got := src.detailBase(); got != "http://d.test" {
		t.Errorf("覆盖后 detailBase() = %q", got)
	}
}
