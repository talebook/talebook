package pluginbuiltin

import (
	"testing"

	"talebook/booksvr/internal/pluginruntime"
)

// expectedBuiltinIDs 是 Python webserver/plugins/register.py 的 39 个内置插件 ID
// （按 PROVIDER_GROUPS 顺序硬编码，防止 Go 侧清单漂移）。
var expectedBuiltinIDs = []string{
	// combo (2)
	"talebook.combo.weread",
	"talebook.combo.open-library",
	// source (12)
	"talebook.source.opds",
	"talebook.source.legado",
	"talebook.source.kavita",
	"talebook.source.komga",
	"talebook.source.booklore",
	"talebook.source.standard-ebooks",
	"talebook.source.gutenberg",
	"talebook.source.internet-archive",
	"talebook.source.webdav",
	"talebook.source.watch-folder",
	"talebook.source.tomato-downloader",
	"talebook.source.venera",
	// meta (7)
	"talebook.meta.douban-v2",
	"talebook.meta.baike",
	"talebook.meta.calibre",
	"talebook.meta.xhsd",
	"talebook.meta.tomato",
	"talebook.meta.qimao",
	"talebook.meta.neodb",
	// review (6)
	"talebook.review.hardcover",
	"talebook.review.neodb",
	"talebook.review.google-books",
	"talebook.review.bangumi",
	"talebook.review.anilist",
	"talebook.review.file-import",
	// annotation (1)
	"talebook.annotation.brs",
	// tool (4)
	"talebook.tool.text-replace",
	"talebook.tool.zh-converter",
	"talebook.tool.txt-fixer",
	"talebook.tool.epub-beautify",
	// push (7)
	"talebook.push.kindle",
	"talebook.push.duokan",
	"talebook.push.boox",
	"talebook.push.hanwang",
	"talebook.push.ireader",
	"talebook.push.dangdang",
	"talebook.push.purelibro",
}

// TestRegisterAllBuiltins 断言 39 个内置插件全部注册且 ID 与 Python 清单一致。
func TestRegisterAllBuiltins(t *testing.T) {
	reg := pluginruntime.NewPluginRegistry()
	if err := Register(reg); err != nil {
		t.Fatalf("Register: %v", err)
	}
	got := reg.SortedIDs()
	if len(got) != len(expectedBuiltinIDs) {
		t.Fatalf("注册数 = %d, want %d\n实际: %v", len(got), len(expectedBuiltinIDs), got)
	}
	want := map[string]bool{}
	for _, id := range expectedBuiltinIDs {
		want[id] = true
	}
	gotSet := map[string]bool{}
	for _, id := range got {
		gotSet[id] = true
		if !want[id] {
			t.Errorf("注册了未知插件 %s", id)
		}
	}
	for _, id := range expectedBuiltinIDs {
		if !gotSet[id] {
			t.Errorf("缺少内置插件 %s", id)
		}
	}
}
