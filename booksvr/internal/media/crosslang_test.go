package media

import "testing"

// TestCrossLangVectors 固定与 Python 实测比对过的向量。
//
// 向量由 webserver/services/media_analysis.py 直接执行生成，
// 用于防止 Go 移植在后续修改中偏离 Python 语义。
func TestCrossLangVectors(t *testing.T) {
	t.Run("常量集合", func(t *testing.T) {
		// Python: SUPPORTED_MEDIA_FORMATS
		wantSupported := []string{"azw", "azw3", "cbr", "cbz", "djvu", "docx",
			"epub", "fb2", "htmlz", "mobi", "pdf", "rar", "txt", "uvz", "zip"}
		if len(SupportedMediaFormats) != len(wantSupported) {
			t.Fatalf("SUPPORTED 数量 = %d, want %d", len(SupportedMediaFormats), len(wantSupported))
		}
		for _, f := range wantSupported {
			if !SupportedMediaFormats[f] {
				t.Errorf("SUPPORTED 缺少 %q", f)
			}
		}
		// Python: ONLINE_READ_FORMATS
		wantOnline := []string{"azw", "azw3", "cbr", "cbz", "epub", "mobi", "pdf", "rar", "txt", "zip"}
		if len(OnlineReadFormats) != len(wantOnline) {
			t.Fatalf("ONLINE_READ 数量 = %d, want %d", len(OnlineReadFormats), len(wantOnline))
		}
		for _, f := range wantOnline {
			if !OnlineReadFormats[f] {
				t.Errorf("ONLINE_READ 缺少 %q", f)
			}
		}
		// Python: MANAGED_DOCUMENT_FORMATS / DOWNLOAD_ONLY_FORMATS
		for _, f := range []string{"djvu", "uvz"} {
			if !ManagedDocumentFormats[f] {
				t.Errorf("MANAGED 缺少 %q", f)
			}
		}
		for _, f := range []string{"docx", "fb2", "htmlz"} {
			if !DownloadOnlyFormats[f] {
				t.Errorf("DOWNLOAD_ONLY 缺少 %q", f)
			}
		}
	})

	t.Run("merge_media_type", func(t *testing.T) {
		// Python 实测输出。
		cases := []struct{ a, b, want string }{
			{"unknown", "ebook", "ebook"},
			{"ebook", "comic", "comic"},
			{"comic", "ebook", "comic"},
			{"ebook", "unknown", "ebook"},
			{"bogus", "ebook", "ebook"},
		}
		for _, tc := range cases {
			if got := MergeMediaType(tc.a, tc.b); got != tc.want {
				t.Errorf("MergeMediaType(%q,%q) = %q, want %q", tc.a, tc.b, got, tc.want)
			}
		}
	})

	t.Run("safe_archive_name", func(t *testing.T) {
		// Python 实测输出（注意 a/./b.png 与 a//b.png 为 True）。
		cases := []struct {
			name string
			want bool
		}{
			{"a/b.png", true},
			{"a.png", true},
			{"", false},
			{"/abs.png", false},
			{"../evil.png", false},
			{"a/../b.png", false},
			{"a/./b.png", true},
			{"C:/evil.png", false},
			{"a//b.png", true},
		}
		for _, tc := range cases {
			if got := safeArchiveName(tc.name); got != tc.want {
				t.Errorf("safeArchiveName(%q) = %v, want %v", tc.name, got, tc.want)
			}
		}
	})

	t.Run("ignored_comic_entry", func(t *testing.T) {
		cases := []struct {
			name string
			want bool
		}{
			{"__MACOSX/x.png", true},
			{"a/.DS_Store", true},
			{"a/Thumbs.db", true},
			{"a/ComicInfo.xml", true},
			{"a/._x.png", true},
			{"a/page1.png", false},
		}
		for _, tc := range cases {
			if got := ignoredComicEntry(tc.name); got != tc.want {
				t.Errorf("ignoredComicEntry(%q) = %v, want %v", tc.name, got, tc.want)
			}
		}
	})

	t.Run("detect_image_mime", func(t *testing.T) {
		cases := []struct {
			header []byte
			want   string
		}{
			{[]byte{0xFF, 0xD8, 0xFF, 0xE0}, "image/jpeg"},
			{[]byte{0x89, 'P', 'N', 'G', '\r', '\n', 0x1A, '\n'}, "image/png"},
			{[]byte("GIF87a"), "image/gif"},
			{[]byte("BM"), "image/bmp"},
			{[]byte{'I', 'I', 0x2A, 0x00}, "image/tiff"},
			{[]byte{'M', 'M', 0x00, 0x2A}, "image/tiff"},
			{[]byte("unknown"), ""},
		}
		for _, tc := range cases {
			if got := detectImageMIME(tc.header); got != tc.want {
				t.Errorf("detectImageMIME(%x) = %q, want %q", tc.header, got, tc.want)
			}
		}
	})

	t.Run("image_mime_extensions", func(t *testing.T) {
		// Python 实测：值是 frozenset，.jpeg/.tif 均须匹配。
		cases := []struct {
			ext, mime string
			want      bool
		}{
			{".jpg", "image/jpeg", true},
			{".jpeg", "image/jpeg", true},
			{".png", "image/jpeg", false},
			{".png", "image/png", true},
			{".tif", "image/tiff", true},
			{".tiff", "image/tiff", true},
			{".png", "image/unknown", false},
		}
		for _, tc := range cases {
			if got := extensionMatchesMIME(tc.ext, tc.mime); got != tc.want {
				t.Errorf("extensionMatchesMIME(%q,%q) = %v, want %v", tc.ext, tc.mime, got, tc.want)
			}
		}
	})

	t.Run("normalize_href", func(t *testing.T) {
		cases := []struct {
			base, href, want string
		}{
			{"OEBPS", "text/ch1.xhtml", "OEBPS/text/ch1.xhtml"},
			{"OEBPS", "../images/p.png", "images/p.png"},
			{"", "a.png", "a.png"},
			{"OEBPS", "http://evil.com/x", ""},
			{"OEBPS", "a.png?q=1", "OEBPS/a.png"},
			{"OEBPS", "../../../etc/passwd", ""},
		}
		for _, tc := range cases {
			if got := normalizeHref(tc.base, tc.href); got != tc.want {
				t.Errorf("normalizeHref(%q,%q) = %q, want %q", tc.base, tc.href, got, tc.want)
			}
		}
	})
}
