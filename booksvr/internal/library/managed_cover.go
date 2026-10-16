package library

import (
	"bytes"
	"database/sql"
	"fmt"
	"image"
	"image/color"
	_ "image/gif"
	"image/jpeg"
	_ "image/png"
	"os"
	"path/filepath"
)

// ManagedCoverPath keeps artwork separate from external, potentially read-only books.
func ManagedCoverPath(root string, id int64) string {
	return filepath.Join(root, ".talebook-covers", fmt.Sprintf("%d.jpg", id))
}

// StoreCover stores only a bounded JPEG, never an ebook or a source-side file.
// Existing artwork wins; linking the completed temporary file cannot overwrite it.
func StoreCover(db *sql.DB, root string, id int64, data []byte) (bool, error) {
	if id <= 0 || root == "" {
		return false, fmt.Errorf("invalid cover destination")
	}
	if len(data) > 32<<20 {
		return false, fmt.Errorf("cover exceeds 32 MiB")
	}
	config, _, err := image.DecodeConfig(bytes.NewReader(data))
	if err != nil {
		return false, err
	}
	if config.Width <= 0 || config.Height <= 0 || int64(config.Width)*int64(config.Height) > 40_000_000 {
		return false, fmt.Errorf("cover dimensions exceed limit")
	}
	src, _, err := image.Decode(bytes.NewReader(data))
	if err != nil {
		return false, err
	}
	w, h := config.Width, config.Height
	if w > 800 || h > 800 {
		if w >= h {
			h = max(1, h*800/w)
			w = 800
		} else {
			w = max(1, w*800/h)
			h = 800
		}
	}
	normalized := src
	if w != config.Width || h != config.Height {
		dst := image.NewRGBA(image.Rect(0, 0, w, h))
		b := src.Bounds()
		// JPEG's YCbCr fast path avoids allocating a boxed color per pixel.
		// Keep native JPEG buffers when no resize is necessary.
		if jpg, ok := src.(*image.YCbCr); ok {
			for y := 0; y < h; y++ {
				for x := 0; x < w; x++ {
					c := jpg.YCbCrAt(b.Min.X+x*config.Width/w, b.Min.Y+y*config.Height/h)
					r, g, blue := color.YCbCrToRGB(c.Y, c.Cb, c.Cr)
					dst.SetRGBA(x, y, color.RGBA{R: r, G: g, B: blue, A: 255})
				}
			}
		} else {
			for y := 0; y < h; y++ {
				for x := 0; x < w; x++ {
					dst.Set(x, y, src.At(b.Min.X+x*config.Width/w, b.Min.Y+y*config.Height/h))
				}
			}
		}
		normalized = dst
	}

	var out bytes.Buffer
	if err := jpeg.Encode(&out, normalized, &jpeg.Options{Quality: 75}); err != nil {
		return false, err
	}
	if out.Len() > 512<<10 {
		return false, fmt.Errorf("compressed cover exceeds 512 KiB")
	}
	var exists int
	if err := db.QueryRow(`SELECT 1 FROM books WHERE id=?`, id).Scan(&exists); err != nil {
		return false, err
	}
	path := ManagedCoverPath(root, id)
	if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
		return false, err
	}
	f, err := os.CreateTemp(filepath.Dir(path), ".cover-*")
	if err != nil {
		return false, err
	}
	defer os.Remove(f.Name())
	if _, err = f.Write(out.Bytes()); err != nil {
		f.Close()
		return false, err
	}
	if err = f.Chmod(0644); err != nil {
		f.Close()
		return false, err
	}
	if err = f.Close(); err != nil {
		return false, err
	}
	created := true
	if err = os.Link(f.Name(), path); err != nil {
		if !os.IsExist(err) {
			return false, err
		}
		created = false
	}
	// On a busy database the complete image remains usable and a retry repairs the flag.
	_, err = db.Exec(`UPDATE books SET has_cover=1 WHERE id=? AND COALESCE(has_cover,0)=0`, id)
	return created, err
}
