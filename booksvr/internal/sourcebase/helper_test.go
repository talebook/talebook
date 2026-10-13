package sourcebase

import (
	"errors"

	"talebook/booksvr/internal/plugindomain"
)

// errTest 是测试用的哨兵错误。
var errTest = errors.New("test error")

// plugindomainDetail 返回一个可下载的详情对象。
func plugindomainDetail() plugindomain.SourceBookDetail {
	return plugindomain.SourceBookDetail{
		ExternalID:     "e1",
		Title:          "三体",
		Downloadable:   true,
		AcquisitionURL: "http://a",
		Format:         "epub",
	}
}

// plugindomainChapter 返回一个章节对象。
func plugindomainChapter() plugindomain.SourceChapter {
	return plugindomain.SourceChapter{ExternalID: "c1", Title: "第一章"}
}
