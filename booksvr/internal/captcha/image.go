// 本文件复刻 webserver/plugins/captcha/image_captcha.py 的图片生成。
package captcha

import (
	"bytes"
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"image"
	"image/color"
	"image/draw"
	"image/png"
	"math/big"
	"strings"
)

// charSet 复刻 Python 的字符集：大写字母 + 数字，去掉易混淆的 0/O/I/1/L。
const charSet = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"

// 默认尺寸与长度，对齐 Python 的 settings 默认值。
const (
	defaultImageLength = 4
	defaultImageWidth  = 120
	defaultImageHeight = 40
)

// ImageResult 是 generate 的返回值。
type ImageResult struct {
	// Image 是 data:image/png;base64,... 形式的数据 URI。
	Image string
	// Code 是正确答案（明文，供写入 secure cookie）。
	Code string
	// CaptchaID 是随机 UUID。
	CaptchaID string
}

// Generate 复刻 ImageCaptchaProvider.generate。
//
// 生成随机验证码图片：浅色背景 + 5 条干扰线 + 旋转字符 + 噪点。
// 字体使用内置点阵字模，避免依赖系统字体文件（Python 在无字体时
// 也回退到 ImageFont.load_default()）。
func (p *imageProvider) Generate() (ImageResult, error) {
	length := p.settings.ImageLength
	if length <= 0 {
		length = defaultImageLength
	}
	width := p.settings.ImageWidth
	if width <= 0 {
		width = defaultImageWidth
	}
	height := p.settings.ImageHeight
	if height <= 0 {
		height = defaultImageHeight
	}

	code, err := randomCode(length)
	if err != nil {
		return ImageResult{}, err
	}

	img := image.NewRGBA(image.Rect(0, 0, width, height))
	draw.Draw(img, img.Bounds(), &image.Uniform{randomLightColor()}, image.Point{}, draw.Src)

	// 干扰线。
	for i := 0; i < 5; i++ {
		x1, err := randInt(width + 1)
		if err != nil {
			return ImageResult{}, err
		}
		y1, err := randInt(height + 1)
		if err != nil {
			return ImageResult{}, err
		}
		x2, err := randInt(width + 1)
		if err != nil {
			return ImageResult{}, err
		}
		y2, err := randInt(height + 1)
		if err != nil {
			return ImageResult{}, err
		}
		drawLine(img, x1, y1, x2, y2, randomColor())
	}

	// 字符：等距分布，带随机偏移。
	fontSize := height * 7 / 10
	if fontSize < 5 {
		fontSize = 5
	}
	charWidth := width / (length + 1)
	for i, ch := range code {
		jitter, err := randInt(11)
		if err != nil {
			return ImageResult{}, err
		}
		x := charWidth*2*(i+1)/2 + jitter - 5
		yj, err := randInt(7)
		if err != nil {
			return ImageResult{}, err
		}
		y := (height-fontSize)/2 + yj - 3
		drawGlyph(img, ch, x, y, fontSize, randomDarkColor())
	}

	// 噪点：约 1/10 像素。
	noise := width * height / 10
	for i := 0; i < noise; i++ {
		x, err := randInt(width)
		if err != nil {
			return ImageResult{}, err
		}
		y, err := randInt(height)
		if err != nil {
			return ImageResult{}, err
		}
		img.Set(x, y, randomColor())
	}

	var buf bytes.Buffer
	if err := png.Encode(&buf, img); err != nil {
		return ImageResult{}, fmt.Errorf("captcha: 编码 PNG 失败: %w", err)
	}
	id, err := randomUUID()
	if err != nil {
		return ImageResult{}, err
	}
	return ImageResult{
		Image:     "data:image/png;base64," + base64.StdEncoding.EncodeToString(buf.Bytes()),
		Code:      code,
		CaptchaID: id,
	}, nil
}

// randomCode 生成指定长度的随机验证码。
func randomCode(length int) (string, error) {
	var sb strings.Builder
	for i := 0; i < length; i++ {
		n, err := randInt(len(charSet))
		if err != nil {
			return "", err
		}
		sb.WriteByte(charSet[n])
	}
	return sb.String(), nil
}

// randomUUID 生成 RFC 4122 v4 UUID 字符串。
func randomUUID() (string, error) {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return "", fmt.Errorf("captcha: 生成 UUID 失败: %w", err)
	}
	b[6] = (b[6] & 0x0f) | 0x40
	b[8] = (b[8] & 0x3f) | 0x80
	return fmt.Sprintf("%x-%x-%x-%x-%x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:16]), nil
}

// randInt 返回 [0, n) 的均匀随机整数。
func randInt(n int) (int, error) {
	if n <= 0 {
		return 0, nil
	}
	v, err := rand.Int(rand.Reader, big.NewInt(int64(n)))
	if err != nil {
		return 0, fmt.Errorf("captcha: 生成随机数失败: %w", err)
	}
	return int(v.Int64()), nil
}

// randomLightColor 复刻 _random_background：每通道 200-255。
func randomLightColor() color.RGBA {
	return color.RGBA{R: uint8(randRange(200, 255)), G: uint8(randRange(200, 255)), B: uint8(randRange(200, 255)), A: 255}
}

// randomColor 复刻 _random_color：每通道 0-255。
func randomColor() color.RGBA {
	return color.RGBA{R: uint8(randRange(0, 255)), G: uint8(randRange(0, 255)), B: uint8(randRange(0, 255)), A: 255}
}

// randomDarkColor 复刻 _random_dark_color：每通道 0-100。
func randomDarkColor() color.RGBA {
	return color.RGBA{R: uint8(randRange(0, 100)), G: uint8(randRange(0, 100)), B: uint8(randRange(0, 100)), A: 255}
}

// randRange 返回 [lo, hi] 闭区间内的随机整数。
func randRange(lo, hi int) int {
	n, err := randInt(hi - lo + 1)
	if err != nil {
		return lo
	}
	return lo + n
}

// drawLine 画一条 Bresenham 直线。
func drawLine(img *image.RGBA, x1, y1, x2, y2 int, c color.RGBA) {
	dx := abs(x2 - x1)
	dy := -abs(y2 - y1)
	sx := 1
	if x1 > x2 {
		sx = -1
	}
	sy := 1
	if y1 > y2 {
		sy = -1
	}
	err := dx + dy
	for {
		if image.Pt(x1, y1).In(img.Bounds()) {
			img.Set(x1, y1, c)
		}
		if x1 == x2 && y1 == y2 {
			return
		}
		e2 := 2 * err
		if e2 >= dy {
			err += dy
			x1 += sx
		}
		if e2 <= dx {
			err += dx
			y1 += sy
		}
	}
}

// abs 返回整数绝对值。
func abs(v int) int {
	if v < 0 {
		return -v
	}
	return v
}
