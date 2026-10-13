package scan

import "talebook/booksvr/internal/importmeta"

// importmetaForTest 返回一份测试用的元数据。
func importmetaForTest() importmeta.Metadata {
	return importmeta.Metadata{Title: "三体", Authors: []string{"佚名"}}
}
