package pluginbuiltin

import (
	"talebook/booksvr/internal/metabase"
	"talebook/booksvr/internal/metasource"
	"talebook/booksvr/internal/plugindomain"
	"talebook/booksvr/internal/pluginiface"
	"talebook/booksvr/internal/pluginproto"
	"talebook/booksvr/internal/pluginruntime"
)

// metaCaps 是元数据源共用的能力声明。
//
// 对应 Python MetaSourceMixin：实现 metadata.lookup，声明 self_check。
func metaCaps() pluginiface.CapabilitySet {
	return pluginiface.CapabilitySet{
		Interfaces:   map[string]bool{"MetadataProvider": true},
		HasSelfCheck: true,
	}
}

// registerMetaProviders 注册 7 个元数据源。
//
// 顺序与 Python register.py 的 META_PROVIDERS 一致。
func registerMetaProviders(reg *pluginruntime.PluginRegistry) error {
	providers := []pluginiface.Provider{
		newDoubanV2Provider(),
		newBaikeProvider(),
		newCalibreMetaProvider(),
		newXhsdProvider(),
		newTomatoMetaProvider(),
		newQimaoProvider(),
		&neoDBProvider{metasource.NewNeoDBProvider(metasource.NewNeoDBSource(nil))},
	}
	for _, p := range providers {
		if _, err := reg.Register(p, metaCaps()); err != nil {
			return err
		}
	}
	return nil
}

// ---- 豆瓣(V2) ----

// doubanV2Provider 复刻 DoubanV2Provider。
type doubanV2Provider struct {
	*metabase.MetaSourceMixin
	Source       *metasource.DoubanV2Source
	ManifestDict map[string]any
}

func newDoubanV2Provider() *doubanV2Provider {
	p := &doubanV2Provider{
		Source: metasource.NewDoubanV2Source(nil),
		ManifestDict: metabase.MetaManifest(
			"talebook.meta.douban-v2", "豆瓣",
			"解析豆瓣读书搜索页，提取书名、作者、出版信息、评分与简介。",
			"mdi-book-search", "https://book.douban.com/",
			metabase.ManifestOptions{BrandIcon: "/images/plugin-icons/douban.ico"},
		),
	}
	p.MetaSourceMixin = metabase.NewMetaSourceMixin(p)
	return p
}

func (p *doubanV2Provider) Manifest() map[string]any { return p.ManifestDict }

// ProxyImageHosts 复刻 proxy_image_hosts。
func (p *doubanV2Provider) ProxyImageHosts() []string { return []string{"doubanio.com"} }

// Search 复刻 _search：query = isbn or title，max_count=1，copy_image=False。
func (p *doubanV2Provider) Search(query plugindomain.MetadataQuery, context map[string]any) ([]map[string]any, error) {
	_ = context
	keyword := query.ISBN
	if keyword == "" {
		keyword = query.Title
	}
	if keyword == "" {
		return nil, nil
	}
	items, searchURL := p.Source.Search(keyword, 1)
	results := make([]map[string]any, 0, len(items))
	for _, item := range items {
		results = append(results, p.Source.BuildMetadata(item, searchURL, query.ISBN, false))
	}
	return results, nil
}

// Fetch 复刻 _fetch：get_metadata_by_provider(external_id, mi=None)。
//
// mi 为 None 时 query 为空，直接返回 None（与 Python 一致）。
func (p *doubanV2Provider) Fetch(externalID string, context map[string]any) (map[string]any, error) {
	_ = externalID
	_ = context
	return nil, nil
}

// GetCover 复刻 get_cover：api.get_cover(cover_url)（默认 referer）。
func (p *doubanV2Provider) GetCover(coverURL string, context map[string]any) (*pluginiface.CoverResult, error) {
	_ = context
	if cover := p.Source.GetCover(coverURL, "https://book.douban.com/"); cover != nil {
		return &pluginiface.CoverResult{Extension: cover.Extension, Content: cover.Content}, nil
	}
	return nil, nil
}

// ---- 百度百科 ----

// baikeProvider 复刻 BaiduBaikeProvider。
type baikeProvider struct {
	*metabase.MetaSourceMixin
	Source       *metasource.BaikeSource
	ManifestDict map[string]any
}

func newBaikeProvider() *baikeProvider {
	p := &baikeProvider{
		Source: metasource.NewBaikeSource(nil),
		ManifestDict: metabase.MetaManifest(
			"talebook.meta.baike", "百度百科",
			"从百度百科词条提取书籍简介、作者与出版信息。",
			"mdi-book-information-variant", "https://baike.baidu.com/",
			metabase.ManifestOptions{BrandIcon: "/images/plugin-icons/baidu-baike.ico"},
		),
	}
	p.MetaSourceMixin = metabase.NewMetaSourceMixin(p)
	return p
}

func (p *baikeProvider) Manifest() map[string]any { return p.ManifestDict }

// ProxyImageHosts 复刻 proxy_image_hosts。
func (p *baikeProvider) ProxyImageHosts() []string { return []string{"bcebos.com", "bdstatic.com"} }

// Search 复刻 _search：get_book(title, authors[0])，provider_value 换成引用串。
func (p *baikeProvider) Search(query plugindomain.MetadataQuery, context map[string]any) ([]map[string]any, error) {
	_ = context
	author := ""
	if len(query.Authors) > 0 {
		author = query.Authors[0]
	}
	mi := p.Source.GetBook(query.Title, author, "", false)
	if mi == nil {
		return nil, nil
	}
	lemmaID, _ := mi["provider_value"].(string)
	mi["provider_value"] = metasource.EncodeBaikeReference(query.Title, author, lemmaID)
	return []map[string]any{mi}, nil
}

// Fetch 复刻 _fetch：解析引用后重新检索（copy_image=True）。
func (p *baikeProvider) Fetch(externalID string, context map[string]any) (map[string]any, error) {
	_ = context
	return p.Source.Fetch(externalID), nil
}

// GetCover 复刻 get_cover：BaiduBaikeApi.get_cover(cover_url)（normal_cover 默认 True）。
func (p *baikeProvider) GetCover(coverURL string, context map[string]any) (*pluginiface.CoverResult, error) {
	_ = context
	if cover := p.Source.GetCover(coverURL, true); cover != nil {
		return &pluginiface.CoverResult{Extension: cover.Extension, Content: cover.Content}, nil
	}
	return nil, nil
}

// ---- Calibre 元数据 ----

// calibreMetaProvider 复刻 CalibreProvider。
type calibreMetaProvider struct {
	*metabase.MetaSourceMixin
	Source       *metasource.CalibreSource
	ManifestDict map[string]any
}

func newCalibreMetaProvider() *calibreMetaProvider {
	p := &calibreMetaProvider{
		// CalibreIdentifier 由部署方注入；nil 时所有查询返回空（与 Go 侧约定一致）。
		Source: metasource.NewCalibreSource(nil, nil),
		ManifestDict: metabase.MetaManifest(
			"talebook.meta.calibre", "Calibre 元数据",
			"书籍信息检索默认启用 Google Books（Google）、Amazon.com 与 Edelweiss；"+
				"Calibre 运行时同时启用 Big Book Search、Google Images 与 Open Library 封面来源。",
			"mdi-google", "https://calibre-ebook.com/",
			metabase.ManifestOptions{BrandIcon: "/images/plugin-icons/calibre.svg"},
		),
	}
	p.MetaSourceMixin = metabase.NewMetaSourceMixin(p)
	return p
}

func (p *calibreMetaProvider) Manifest() map[string]any { return p.ManifestDict }

// Search 复刻 _search：优先 ISBN，其次书名。
func (p *calibreMetaProvider) Search(query plugindomain.MetadataQuery, context map[string]any) ([]map[string]any, error) {
	_ = context
	if p.Source.API.Identifier == nil {
		return nil, pluginproto.NewUpstreamError("Calibre 元数据检索服务未接入，请选择其他元数据源", "unavailable", nil)
	}
	results, err := p.Source.Search(query.ISBN, query.Title, query.Authors)
	if err != nil {
		return nil, err
	}
	out := make([]map[string]any, 0, len(results))
	for _, r := range results {
		if r == nil {
			continue
		}
		out = append(out, calibreResultToMetadata(r))
	}
	return out, nil
}

// SelfCheck reports the actual adapter availability rather than a successful no-op.
func (p *calibreMetaProvider) SelfCheck(context map[string]any) (plugindomain.CheckReport, error) {
	if p.Source.API.Identifier == nil {
		return plugindomain.CheckReport{Healthy: false, Message: "Calibre 元数据检索服务未接入，请选择其他元数据源"}, nil
	}
	return p.MetaSourceMixin.SelfCheck(context)
}

// Fetch 复刻 _fetch：按 ISBN 查，失败再按书名查，取第一条。
func (p *calibreMetaProvider) Fetch(externalID string, context map[string]any) (map[string]any, error) {
	_ = context
	r, err := p.Source.Fetch(externalID)
	if err != nil {
		return nil, err
	}
	if r == nil {
		return nil, nil
	}
	return calibreResultToMetadata(r), nil
}

// GetCover 复刻 get_cover。
func (p *calibreMetaProvider) GetCover(coverURL string, context map[string]any) (*pluginiface.CoverResult, error) {
	_ = context
	if cover := p.Source.GetCover(coverURL); cover != nil {
		return &pluginiface.CoverResult{Extension: cover.Extension, Content: cover.Content}, nil
	}
	return nil, nil
}

// calibreResultToMetadata 把 identify 结果转成元数据字典。
//
// 字段集合与 metabase.METADATA_FIELDS 对齐；rating 已由 NormalizeResults
// 换算为 0-10 刻度。
func calibreResultToMetadata(r *metasource.CalibreIdentifyResult) map[string]any {
	mi := map[string]any{
		"title":          r.Title,
		"authors":        r.Authors,
		"isbn":           r.ISBN,
		"cover_url":      r.CoverURL,
		"source":         r.Source,
		"provider_key":   r.ProviderKey,
		"provider_value": r.ProviderValue,
		"author_sort":    r.AuthorSort,
	}
	if len(r.Authors) > 0 {
		mi["author"] = r.Authors[0]
	}
	if r.Rating != nil {
		mi["rating"] = *r.Rating
	}
	return mi
}

// ---- 新华书店 ----

// xhsdProvider 复刻 XhsdProvider。
type xhsdProvider struct {
	*metabase.MetaSourceMixin
	Source       *metasource.XhsdSource
	ManifestDict map[string]any
}

func newXhsdProvider() *xhsdProvider {
	p := &xhsdProvider{
		Source: metasource.NewXhsdSource(nil),
		ManifestDict: metabase.MetaManifest(
			"talebook.meta.xhsd", "新华书店",
			"按 ISBN 从新华书店商品页抓取书名、作者、出版社与封面。",
			"mdi-store", "https://www.xhsd.com/",
			metabase.ManifestOptions{BrandIcon: "/images/plugin-icons/xhsd.ico"},
		),
	}
	p.MetaSourceMixin = metabase.NewMetaSourceMixin(p)
	return p
}

func (p *xhsdProvider) Manifest() map[string]any { return p.ManifestDict }

// Search 复刻 _search：keyword = isbn or title（get_book 会校验 13 位 ISBN）。
func (p *xhsdProvider) Search(query plugindomain.MetadataQuery, context map[string]any) ([]map[string]any, error) {
	_ = context
	mi := p.Source.Search(query.ISBN, query.Title, false)
	if mi == nil {
		return nil, nil
	}
	return []map[string]any{mi}, nil
}

// Fetch 复刻 _fetch：get_book_by_isbn(external_id)（copy_image=False）。
func (p *xhsdProvider) Fetch(externalID string, context map[string]any) (map[string]any, error) {
	_ = context
	return p.Source.Fetch(externalID, false), nil
}

// GetCover 复刻 get_cover：XhsdBookApi(copy_image=True).get_cover。
func (p *xhsdProvider) GetCover(coverURL string, context map[string]any) (*pluginiface.CoverResult, error) {
	_ = context
	if cover := p.Source.GetCover(coverURL, true); cover != nil {
		return &pluginiface.CoverResult{Extension: cover.Extension, Content: cover.Content}, nil
	}
	return nil, nil
}

// ---- 番茄小说 ----

// tomatoMetaProvider 复刻 TomatoProvider。
type tomatoMetaProvider struct {
	*metabase.MetaSourceMixin
	Source       *metasource.TomatoSource
	ManifestDict map[string]any
}

func newTomatoMetaProvider() *tomatoMetaProvider {
	p := &tomatoMetaProvider{
		Source: metasource.NewTomatoSource(nil),
		ManifestDict: metabase.MetaManifest(
			"talebook.meta.tomato", "番茄小说",
			"从番茄小说检索网文书名、作者、简介与封面。",
			"mdi-book-open-page-variant", "https://fanqienovel.com/",
			metabase.ManifestOptions{BrandIcon: "/images/plugin-icons/fanqie.png"},
		),
	}
	p.MetaSourceMixin = metabase.NewMetaSourceMixin(p)
	return p
}

func (p *tomatoMetaProvider) Manifest() map[string]any { return p.ManifestDict }

// ProxyImageHosts 复刻 proxy_image_hosts。
func (p *tomatoMetaProvider) ProxyImageHosts() []string {
	return []string{"byteimg.com", "fanqienovel.com"}
}

// Search 复刻 _search：get_book(title, authors[0])。
func (p *tomatoMetaProvider) Search(query plugindomain.MetadataQuery, context map[string]any) ([]map[string]any, error) {
	_ = context
	author := ""
	if len(query.Authors) > 0 {
		author = query.Authors[0]
	}
	mi := p.Source.GetBook(query.Title, author, false)
	if mi == nil {
		return nil, nil
	}
	return []map[string]any{mi}, nil
}

// Fetch 复刻 _fetch：按 ID 直接取元数据（copy_image=False）。
func (p *tomatoMetaProvider) Fetch(externalID string, context map[string]any) (map[string]any, error) {
	_ = context
	return p.Source.GetBookByIDDirect(externalID, false), nil
}

// GetCover 复刻 get_cover：TomatoNovelApi(copy_image=True).get_cover。
func (p *tomatoMetaProvider) GetCover(coverURL string, context map[string]any) (*pluginiface.CoverResult, error) {
	_ = context
	if cover := p.Source.GetCover(coverURL); cover != nil {
		return &pluginiface.CoverResult{Extension: cover.Extension, Content: cover.Content}, nil
	}
	return nil, nil
}

// ---- 七猫小说 ----

// qimaoProvider 复刻 QimaoProvider。
type qimaoProvider struct {
	*metabase.MetaSourceMixin
	Source       *metasource.QimaoSource
	ManifestDict map[string]any
}

func newQimaoProvider() *qimaoProvider {
	p := &qimaoProvider{
		Source: metasource.NewQimaoSource(nil),
		ManifestDict: metabase.MetaManifest(
			"talebook.meta.qimao", "七猫小说",
			"从七猫小说检索网文书名、作者、简介与封面。",
			"mdi-cat", "https://www.qimao.com/",
			metabase.ManifestOptions{BrandIcon: "/images/plugin-icons/qimao.jpg"},
		),
	}
	p.MetaSourceMixin = metabase.NewMetaSourceMixin(p)
	return p
}

func (p *qimaoProvider) Manifest() map[string]any { return p.ManifestDict }

// ProxyImageHosts 复刻 proxy_image_hosts。
func (p *qimaoProvider) ProxyImageHosts() []string { return []string{"wtzw.com"} }

// Search 复刻 _search：get_book(title, authors[0])。
func (p *qimaoProvider) Search(query plugindomain.MetadataQuery, context map[string]any) ([]map[string]any, error) {
	_ = context
	author := ""
	if len(query.Authors) > 0 {
		author = query.Authors[0]
	}
	mi := p.Source.GetBook(query.Title, author, false)
	if mi == nil {
		return nil, nil
	}
	return []map[string]any{mi}, nil
}

// Fetch 复刻 _fetch：get_book_by_id(external_id)。
func (p *qimaoProvider) Fetch(externalID string, context map[string]any) (map[string]any, error) {
	_ = context
	return p.Source.GetBookByID(externalID, false), nil
}

// GetCover 复刻 get_cover：QimaoNovelApi(copy_image=True).get_cover。
func (p *qimaoProvider) GetCover(coverURL string, context map[string]any) (*pluginiface.CoverResult, error) {
	_ = context
	if cover := p.Source.GetCover(coverURL); cover != nil {
		return &pluginiface.CoverResult{Extension: cover.Extension, Content: cover.Content}, nil
	}
	return nil, nil
}

// SearchBooks 用接口精确签名覆盖 mixin 的宽签名，使 provider 满足
// pluginiface.MetadataProvider（DispatchInvoke 按此接口断言分派）。
func (p *doubanV2Provider) SearchBooks(query plugindomain.MetadataQuery,
	context map[string]any) ([]plugindomain.BookMetadata, error) {
	return p.MetaSourceMixin.SearchBooks(query, context)
}

// Invoke 实现 MethodDispatcher：全部委托 DispatchInvoke。
func (p *doubanV2Provider) Invoke(method string, args []any, context map[string]any) (any, error) {
	return DispatchInvoke(p, method, args, context)
}

// SearchBooks 用接口精确签名覆盖 mixin 的宽签名。
func (p *baikeProvider) SearchBooks(query plugindomain.MetadataQuery,
	context map[string]any) ([]plugindomain.BookMetadata, error) {
	return p.MetaSourceMixin.SearchBooks(query, context)
}

// Invoke 实现 MethodDispatcher：全部委托 DispatchInvoke。
func (p *baikeProvider) Invoke(method string, args []any, context map[string]any) (any, error) {
	return DispatchInvoke(p, method, args, context)
}

// SearchBooks 用接口精确签名覆盖 mixin 的宽签名。
func (p *calibreMetaProvider) SearchBooks(query plugindomain.MetadataQuery,
	context map[string]any) ([]plugindomain.BookMetadata, error) {
	return p.MetaSourceMixin.SearchBooks(query, context)
}

// Invoke 实现 MethodDispatcher：全部委托 DispatchInvoke。
func (p *calibreMetaProvider) Invoke(method string, args []any, context map[string]any) (any, error) {
	return DispatchInvoke(p, method, args, context)
}

// SearchBooks 用接口精确签名覆盖 mixin 的宽签名。
func (p *xhsdProvider) SearchBooks(query plugindomain.MetadataQuery,
	context map[string]any) ([]plugindomain.BookMetadata, error) {
	return p.MetaSourceMixin.SearchBooks(query, context)
}

// Invoke 实现 MethodDispatcher：全部委托 DispatchInvoke。
func (p *xhsdProvider) Invoke(method string, args []any, context map[string]any) (any, error) {
	return DispatchInvoke(p, method, args, context)
}

// SearchBooks 用接口精确签名覆盖 mixin 的宽签名。
func (p *tomatoMetaProvider) SearchBooks(query plugindomain.MetadataQuery,
	context map[string]any) ([]plugindomain.BookMetadata, error) {
	return p.MetaSourceMixin.SearchBooks(query, context)
}

// Invoke 实现 MethodDispatcher：全部委托 DispatchInvoke。
func (p *tomatoMetaProvider) Invoke(method string, args []any, context map[string]any) (any, error) {
	return DispatchInvoke(p, method, args, context)
}

// SearchBooks 用接口精确签名覆盖 mixin 的宽签名。
func (p *qimaoProvider) SearchBooks(query plugindomain.MetadataQuery,
	context map[string]any) ([]plugindomain.BookMetadata, error) {
	return p.MetaSourceMixin.SearchBooks(query, context)
}

// Invoke 实现 MethodDispatcher：全部委托 DispatchInvoke。
func (p *qimaoProvider) Invoke(method string, args []any, context map[string]any) (any, error) {
	return DispatchInvoke(p, method, args, context)
}

// 编译期断言：元数据 provider 满足平台能力接口。
var (
	_ pluginiface.MetadataProvider   = (*doubanV2Provider)(nil)
	_ pluginiface.MetadataProvider   = (*baikeProvider)(nil)
	_ pluginiface.MetadataProvider   = (*calibreMetaProvider)(nil)
	_ pluginiface.MetadataProvider   = (*xhsdProvider)(nil)
	_ pluginiface.MetadataProvider   = (*tomatoMetaProvider)(nil)
	_ pluginiface.MetadataProvider   = (*qimaoProvider)(nil)
	_ pluginruntime.MethodDispatcher = (*doubanV2Provider)(nil)
)

// neoDBProvider supplies runtime dispatch without coupling metasource to builtin.
type neoDBProvider struct{ *metasource.NeoDBProvider }

func (p *neoDBProvider) Invoke(method string, args []any, context map[string]any) (any, error) {
	return DispatchInvoke(p, method, args, context)
}
