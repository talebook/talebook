package httpapi

import (
	"bytes"
	"database/sql"
	"encoding/base64"
	"encoding/xml"
	"fmt"
	"image"
	_ "image/gif"
	"image/jpeg"
	_ "image/png"
	"strings"

	"talebook/booksvr/internal/library"
)

// DefaultThumbnail 生成缩略图（等比缩放后居中裁剪）。
//
// 对应 Calibre 的 calibre.utils.magick.draw.thumbnail。
func DefaultThumbnail(data []byte, width, height int) ([]byte, error) {
	if width <= 0 {
		width = 60
	}
	if height <= 0 {
		height = 80
	}
	src, _, err := image.Decode(bytes.NewReader(data))
	if err != nil {
		return nil, fmt.Errorf("files: 解码图片失败: %w", err)
	}

	bounds := src.Bounds()
	sw, sh := bounds.Dx(), bounds.Dy()
	if sw == 0 || sh == 0 {
		return nil, fmt.Errorf("files: 图片尺寸为零")
	}

	// 等比缩放到「至少覆盖目标框」，再居中裁剪。
	scale := float64(width) / float64(sw)
	if s := float64(height) / float64(sh); s > scale {
		scale = s
	}
	dw := int(float64(sw)*scale + 0.5)
	dh := int(float64(sh)*scale + 0.5)
	if dw < width {
		dw = width
	}
	if dh < height {
		dh = height
	}

	dst := image.NewRGBA(image.Rect(0, 0, width, height))
	offX := (dw - width) / 2
	offY := (dh - height) / 2
	for y := 0; y < height; y++ {
		for x := 0; x < width; x++ {
			sx := bounds.Min.X + (x+offX)*sw/dw
			sy := bounds.Min.Y + (y+offY)*sh/dh
			if sx >= bounds.Max.X {
				sx = bounds.Max.X - 1
			}
			if sy >= bounds.Max.Y {
				sy = bounds.Max.Y - 1
			}
			dst.Set(x, y, src.At(sx, sy))
		}
	}

	var buf bytes.Buffer
	if err := jpeg.Encode(&buf, dst, &jpeg.Options{Quality: 85}); err != nil {
		return nil, fmt.Errorf("files: 编码缩略图失败: %w", err)
	}
	return buf.Bytes(), nil
}

// opfPackage 是 OPF 文档的最小结构。
type opfPackage struct {
	XMLName  xml.Name `xml:"package"`
	Xmlns    string   `xml:"xmlns,attr"`
	Version  string   `xml:"version,attr"`
	UniqueID string   `xml:"unique-identifier,attr"`
	Metadata opfMeta  `xml:"metadata"`
	Manifest opfManif `xml:"manifest"`
	Spine    opfSpine `xml:"spine"`
}

type opfMeta struct {
	XmlnsDC   string   `xml:"xmlns:dc,attr"`
	XmlnsOPF  string   `xml:"xmlns:opf,attr"`
	Titles    []string `xml:"dc:title"`
	Creators  []string `xml:"dc:creator"`
	Language  string   `xml:"dc:language"`
	ID        string   `xml:"dc:identifier"`
	Publisher string   `xml:"dc:publisher,omitempty"`
	Comments  string   `xml:"dc:description,omitempty"`
	Tags      []string `xml:"dc:subject,omitempty"`
}

type opfManif struct {
	Items []opfItem `xml:"item"`
}

type opfItem struct {
	ID        string `xml:"id,attr"`
	Href      string `xml:"href,attr"`
	MediaType string `xml:"media-type,attr"`
}

type opfSpine struct {
	Toc   string   `xml:"toc,attr,omitempty"`
	Items []opfRef `xml:"itemref"`
}

type opfRef struct {
	IDRef string `xml:"idref,attr"`
}

// DefaultMetadataToOPF 把书籍元数据渲染成 OPF。
//
// 对应 Calibre 的 calibre.ebooks.metadata.opf2.metadata_to_opf。
func DefaultMetadataToOPF(db *sql.DB, bookID int64) ([]byte, error) {
	books, err := library.GetBooksData(db, []int64{bookID})
	if err != nil {
		return nil, fmt.Errorf("files: 读取元数据失败: %w", err)
	}
	if len(books) == 0 {
		return nil, fmt.Errorf("files: 书籍 %d 不存在", bookID)
	}
	b := books[0]

	uid := fmt.Sprintf("urn:uuid:talebook-%d", b.ID)
	pkg := opfPackage{
		Xmlns:    "http://www.idpf.org/2007/opf",
		Version:  "2.0",
		UniqueID: "uuid_id",
		Metadata: opfMeta{
			XmlnsDC:   "http://purl.org/dc/elements/1.1/",
			XmlnsOPF:  "http://www.idpf.org/2007/opf",
			Titles:    []string{b.Title},
			Creators:  b.Authors,
			Language:  orDefault(b.Language, "und"),
			ID:        uid,
			Publisher: b.Publisher,
			Comments:  b.Comments,
			Tags:      b.Tags,
		},
		Manifest: opfManif{Items: []opfItem{{
			ID:        "uuid_id",
			Href:      fmt.Sprintf("book_%d.opf", b.ID),
			MediaType: "application/oebps-package+xml",
		}}},
		Spine: opfSpine{Toc: "ncx", Items: []opfRef{{IDRef: "uuid_id"}}},
	}

	out, err := xml.MarshalIndent(pkg, "", "  ")
	if err != nil {
		return nil, fmt.Errorf("files: 序列化 OPF 失败: %w", err)
	}
	return append([]byte(xml.Header), out...), nil
}

// orDefault 在字符串为空时返回兜底值。
func orDefault(value, fallback string) string {
	if strings.TrimSpace(value) == "" {
		return fallback
	}
	return value
}

// base64Encode 是 base64 编码的薄封装，供 OPF 封面内联使用。
func base64Encode(data []byte) string {
	return base64.StdEncoding.EncodeToString(data)
}
