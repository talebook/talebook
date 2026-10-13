package httpapi

import (
	"regexp"
	"testing"
)

// matchFirst 按注册顺序返回首个命中的路由规格。
//
// 与 Server.ServeHTTP 的匹配语义一致：顺序遍历，取首个匹配。
func matchFirst(specs []RouteSpec, path string) (RouteSpec, []string, bool) {
	for _, spec := range specs {
		re, err := regexp.Compile("^" + spec.Pattern + "$")
		if err != nil {
			continue
		}
		if m := re.FindStringSubmatch(path); m != nil {
			return spec, m[1:], true
		}
	}
	return RouteSpec{}, nil, false
}

// TestGetExtractNotShadowedByImageHandler 验证 /get/extract/<id>/ 命中 EpubReader。
//
// 这是「电子书加载超时」的回归测试：阅读器用 book_url=/get/extract/<id>/
// 拉取 EPUB 内文件。FilesRouteSpecs 曾把通配的 ImageHandler
// （/get/(.*)/(.*)）排在 EpubReader 之前，导致 /get/extract/5/ 被抢走，
// parseBookID("extract/5") 解析失败并返回 404「id: not an integer」，
// 阅读器所有资源请求全部失败，最终报「电子书加载超时」。
func TestGetExtractNotShadowedByImageHandler(t *testing.T) {
	specs := FilesRouteSpecs(FilesConfig{})

	cases := []struct {
		path    string
		wantID  string
		wantRel string
	}{
		{"/get/extract/5/", "5", ""},
		{"/get/extract/5/OEBPS/content.opf", "5", "OEBPS/content.opf"},
		{"/get/extract/12/mimetype", "12", "mimetype"},
	}
	for _, tc := range cases {
		spec, params, ok := matchFirst(specs, tc.path)
		if !ok {
			t.Errorf("%s 未命中任何路由", tc.path)
			continue
		}
		if spec.Pattern != rGetExtract {
			t.Errorf("%s 命中了 %s，期望 %s（被通配路由遮蔽）", tc.path, spec.Pattern, rGetExtract)
			continue
		}
		if params[0] != tc.wantID {
			t.Errorf("%s id 参数 = %q，期望 %q", tc.path, params[0], tc.wantID)
		}
		if params[1] != tc.wantRel {
			t.Errorf("%s 内部路径 = %q，期望 %q", tc.path, params[1], tc.wantRel)
		}
	}
}

// TestGetPcoverAndProgressNotShadowed 验证 /get/pcover 与 /get/progress 不被遮蔽。
func TestGetPcoverAndProgressNotShadowed(t *testing.T) {
	specs := FilesRouteSpecs(FilesConfig{})

	cases := []struct {
		path string
		want string
	}{
		{"/get/pcover", rGetPcover},
		{"/get/progress/1", rGetProgress},
	}
	for _, tc := range cases {
		spec, _, ok := matchFirst(specs, tc.path)
		if !ok {
			t.Errorf("%s 未命中任何路由", tc.path)
			continue
		}
		if spec.Pattern != tc.want {
			t.Errorf("%s 命中了 %s，期望 %s", tc.path, spec.Pattern, tc.want)
		}
	}
}

// TestGetImageCatchAllStillWorks 验证通配路由本身仍能服务封面/缩略图。
//
// 调整顺序不能把 /get/cover/1.jpg 这类请求弄丢。
func TestGetImageCatchAllStillWorks(t *testing.T) {
	specs := FilesRouteSpecs(FilesConfig{})

	for _, path := range []string{"/get/cover/1.jpg", "/get/thumb_60x80/1.jpg"} {
		spec, params, ok := matchFirst(specs, path)
		if !ok {
			t.Errorf("%s 未命中任何路由", path)
			continue
		}
		if spec.Pattern != rGetImage {
			t.Errorf("%s 命中了 %s，期望 %s", path, spec.Pattern, rGetImage)
			continue
		}
		if len(params) != 2 {
			t.Errorf("%s 参数数 = %d，期望 2", path, len(params))
		}
	}
}
