package httpapi

import (
	"database/sql"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"sort"
	"strconv"
	"strings"

	"talebook/booksvr/internal/library"
	"talebook/booksvr/internal/userdb"
)

// MetaConfig 是元数据分类模块的依赖注入点。
type MetaConfig struct {
	// DB 是 Calibre 元数据库（authors / tags / publishers 等表）。
	DB *sql.DB
	// UserDB 是 Talebook 自有库（author_aliases / book_aliases 等表）。
	// 为空时回落为 DB，兼容单库部署与测试。
	UserDB *sql.DB
	// Settings 是站点配置。
	Settings map[string]any
	// UpdateBook 触发单本书的元数据刷新（对应 do_book_update）。
	// 为 nil 时表示该能力未接线。
	UpdateBook func(ctx *Context, bookID int64) error
	// Book 是书籍格式化配置，分类详情页用它生成与 /api/book 一致的书籍字典
	// （含 img / thumb / href）。为零值时回落到精简字典，仅用于测试。
	Book BookConfig
}

// userDB 返回 Talebook 自有库句柄；未单独指定时回落为 Calibre 库。
func (cfg MetaConfig) userDB() *sql.DB {
	if cfg.UserDB != nil {
		return cfg.UserDB
	}
	return cfg.DB
}

// ---- 路由常量 ----

const (
	rAuthorAlias    = "/api/author/(.*)/alias"
	rMetaList       = "/api/(author|publisher|tag|rating|series|format)"
	rMetaBooks      = "/api/(author|publisher|tag|rating|series|format)/(.*)"
	rAuthorBooksUpd = "/api/author/(.*)/update"
	rPubBooksUpdate = "/api/publisher/(.*)/update"
)

// metaCategory 把 URL 里的 meta 名映射到 library 包使用的分类表名。
//
// 对应 Python BaseHandler.get_category_with_count 的
// `table = field if field in ["series"] else field + "s"`。
//
// 注意：Python 详情页把单数字段名交给 Calibre 的 get_item_id /
// get_books_for_category，由 Calibre 内部解析到复数表；Go 侧直接查
// categorySpecs 里的表名，因此列表页与详情页必须用同一个复数映射，
// 否则 publisher / rating 会因查不到表而恒返回空集。
func metaCategory(meta string) string {
	if meta == "series" {
		return meta
	}
	return meta + "s"
}

// metaListTitles 是分类列表页的标题模板。
var metaListTitles = map[string]string{
	"tag":       "全部标签",
	"author":    "全部作者",
	"series":    "丛书列表",
	"rating":    "全部评分",
	"publisher": "全部出版社",
	"format":    "全部格式",
}

// metaBooksTitles 是分类详情页的标题模板。
var metaBooksTitles = map[string]string{
	"tag":       `含有"%(name)s"标签的书籍`,
	"author":    `"%(name)s"编著的书籍`,
	"series":    `"%(name)s"丛书包含的书籍`,
	"rating":    "评分为%(name)s星的书籍",
	"publisher": `"%(name)s"出版的书籍`,
	"format":    `格式为"%(name)s"的书籍`,
}

// ---- MetaList ----

// MetaListHandler 实现 /api/<meta>（分类列表）。
func MetaListHandler(cfg MetaConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		meta := ctx.Param(0)

		pageArg := ctx.Query("page")
		sizeArg := ctx.Query("page_size")
		page, pageSize := 1, 100
		if pageArg != "" {
			n, err := strconv.Atoi(strings.TrimSpace(pageArg))
			if err != nil {
				return map[string]any{"err": "params.pagination.invalid", "msg": "分页参数无效"}, nil
			}
			page = n
		}
		if sizeArg != "" {
			n, err := strconv.Atoi(strings.TrimSpace(sizeArg))
			if err != nil {
				return map[string]any{"err": "params.pagination.invalid", "msg": "分页参数无效"}, nil
			}
			pageSize = n
		}
		if page < 1 || pageSize < 1 || pageSize > 1000 {
			return map[string]any{"err": "params.pagination.invalid", "msg": "分页参数无效"}, nil
		}

		query := strings.ToLower(strings.TrimSpace(ctx.Query("q")))
		title := metaListTitles[meta]
		if title == "" {
			title = "未知"
		}

		var items []map[string]any
		var err error
		if meta == "format" {
			items, err = metaFormatItems(cfg.DB)
		} else {
			items, err = metaCategoryItems(cfg, meta)
		}
		if err != nil {
			return nil, err
		}

		unfilteredTotal := len(items)
		if query != "" {
			filtered := make([]map[string]any, 0, len(items))
			for _, item := range items {
				if strings.Contains(strings.ToLower(stringOf(item["name"])), query) {
					filtered = append(filtered, item)
				}
			}
			items = filtered
		}

		// 稳定的排序：计数降序，再按名称（大小写不敏感）、原名、id 兜底，
		// 保证同计数的条目不会因底层返回顺序变化而在分页间跳动。
		sort.SliceStable(items, func(i, j int) bool {
			a, b := items[i], items[j]
			var ai, bi float64
			if meta == "rating" {
				ai, _ = strconv.ParseFloat(stringOf(a["name"]), 64)
				bi, _ = strconv.ParseFloat(stringOf(b["name"]), 64)
			} else {
				ai = float64(int64Of(a["count"]))
				bi = float64(int64Of(b["count"]))
			}
			if ai != bi {
				return ai > bi
			}
			an, bn := strings.ToLower(stringOf(a["name"])), strings.ToLower(stringOf(b["name"]))
			if an != bn {
				return an < bn
			}
			ar, br := stringOf(a["name"]), stringOf(b["name"])
			if ar != br {
				return ar < br
			}
			return stringOf(a["id"]) < stringOf(b["id"])
		})

		total := len(items)
		paginated := total >= 1000 || pageArg != "" || sizeArg != ""
		pages := 1
		if paginated {
			pages = (total + pageSize - 1) / pageSize
			if pages < 1 {
				pages = 1
			}
			start := (page - 1) * pageSize
			if start > total {
				start = total
			}
			end := start + pageSize
			if end > total {
				end = total
			}
			items = items[start:end]
		}
		if items == nil {
			items = []map[string]any{}
		}

		effectiveSize := pageSize
		if !paginated {
			effectiveSize = total
			if effectiveSize < 1 {
				effectiveSize = 1
			}
		}
		return map[string]any{
			"err":              "ok",
			"meta":             meta,
			"title":            title,
			"items":            items,
			"total":            total,
			"unfiltered_total": unfilteredTotal,
			"page":             page,
			"page_size":        effectiveSize,
			"pages":            pages,
			"paginated":        paginated,
		}, nil
	}
}

// metaFormatItems 直接聚合 data 表统计各格式数量。
//
// data 表每行 = 一本书的一个格式，因此一次 GROUP BY 即可，
// 避免逐本调用 formats() 在大库下阻塞。
func metaFormatItems(db *sql.DB) ([]map[string]any, error) {
	rows, err := db.Query(`SELECT format, COUNT(*) FROM data GROUP BY format`)
	if err != nil {
		return nil, fmt.Errorf("httpapi: 统计格式失败: %w", err)
	}
	defer rows.Close()

	out := []map[string]any{}
	for rows.Next() {
		var format string
		var count int64
		if err := rows.Scan(&format, &count); err != nil {
			return nil, fmt.Errorf("httpapi: 扫描格式失败: %w", err)
		}
		out = append(out, map[string]any{"id": format, "name": format, "count": count})
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("httpapi: 遍历格式失败: %w", err)
	}
	return out, nil
}

// metaCategoryItems 取分类项并按作者别名归组。
func metaCategoryItems(cfg MetaConfig, meta string) ([]map[string]any, error) {
	cats, err := library.GetCategories(cfg.DB, metaCategory(meta))
	if err != nil {
		return nil, err
	}
	items := make([]map[string]any, 0, len(cats))
	for _, c := range cats {
		items = append(items, map[string]any{"id": c.ID, "name": c.Name, "count": c.Count})
	}
	if meta != "author" {
		return items, nil
	}
	return metaGroupAuthors(cfg, items)
}

// metaGroupAuthors 按作者别名把同名作者合并成一项。
func metaGroupAuthors(cfg MetaConfig, items []map[string]any) ([]map[string]any, error) {
	svc := userdb.NewAliasService(cfg.userDB())
	mapping, err := svc.AuthorMapping()
	if err != nil {
		return nil, err
	}

	type group struct {
		id      any
		name    string
		count   int64
		members []string
	}
	order := []string{}
	grouped := map[string]*group{}

	for _, item := range items {
		name := stringOf(item["name"])
		normalized, err := userdb.NormalizeAlias(name)
		if err != nil {
			normalized = name
		}
		canonical := name
		if mapped, ok := mapping[normalized]; ok {
			canonical = mapped
		}
		key, err := userdb.NormalizeAlias(canonical)
		if err != nil {
			key = canonical
		}
		g, ok := grouped[key]
		if !ok {
			g = &group{id: item["id"], name: canonical}
			grouped[key] = g
			order = append(order, key)
		}
		g.count += int64Of(item["count"])
		g.members = append(g.members, name)
	}

	out := make([]map[string]any, 0, len(order))
	for _, key := range order {
		g := grouped[key]
		count := g.count
		// 多个成员合并时，计数改为去重后的实际书籍数。
		if len(g.members) > 1 {
			ids, err := metaAuthorBookIDs(cfg.DB, g.members)
			if err != nil {
				return nil, err
			}
			count = int64(len(ids))
		}
		out = append(out, map[string]any{"id": g.id, "name": g.name, "count": count})
	}
	return out, nil
}

// metaAuthorBookIDs 汇总若干作者名下的全部书籍 id（去重）。
func metaAuthorBookIDs(db *sql.DB, names []string) (map[int64]bool, error) {
	ids := map[int64]bool{}
	for _, name := range names {
		itemID, err := library.GetItemID(db, "authors", name)
		if err != nil {
			return nil, err
		}
		if itemID == 0 {
			continue
		}
		bookIDs, err := library.GetBooksForCategory(db, "authors", itemID)
		if err != nil {
			return nil, err
		}
		for _, id := range bookIDs {
			ids[id] = true
		}
	}
	return ids, nil
}

// ---- MetaBooks ----

// MetaBooksHandler 实现 /api/<meta>/<name>（分类下的书籍）。
func MetaBooksHandler(cfg MetaConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		meta := ctx.Param(0)
		name := ctx.Param(1)

		title := metaBooksTitles[meta]
		if title == "" {
			title = "未知"
		}
		title = strings.ReplaceAll(title, "%(name)s", name)

		var ids []int64
		var err error
		var authorGroup *userdb.AuthorGroup

		switch {
		case meta == "format":
			ids, err = metaFormatBookIDs(cfg.DB, name)
		case meta == "author":
			svc := userdb.NewAliasService(cfg.userDB())
			authorGroup, err = svc.GetAuthorGroup(name)
			if err != nil {
				return nil, err
			}
			title = strings.ReplaceAll(metaBooksTitles["author"], "%(name)s", authorGroup.Canonical)
			idSet, err := metaAuthorBookIDs(cfg.DB, authorGroup.Names)
			if err != nil {
				return nil, err
			}
			ids = sortedInt64Keys(idSet)
		case meta == "rating":
			ids, err = metaRatingBookIDs(cfg.DB, name)
		default:
			ids, err = metaCategoryBookIDs(cfg.DB, meta, name)
		}
		if err != nil {
			return nil, err
		}

		rsp, err := metaRenderBookIDs(ctx, cfg, ids, title)
		if err != nil {
			return nil, err
		}
		if meta == "author" && authorGroup != nil {
			rsp["canonical_author"] = authorGroup.Canonical
			rsp["author_aliases"] = authorGroup.Aliases
		}
		return rsp, nil
	}
}

// metaFormatBookIDs 取指定格式的全部书籍 id。
func metaFormatBookIDs(db *sql.DB, format string) ([]int64, error) {
	return library.BooksForFormat(db, format)
}

// metaRatingBookIDs 取指定评分值的全部书籍 id。
func metaRatingBookIDs(db *sql.DB, name string) ([]int64, error) {
	ratingValue, err := strconv.ParseInt(strings.TrimSpace(name), 10, 64)
	if err != nil {
		return []int64{}, nil
	}
	nameMap, err := library.GetItemNameMap(db, "ratings")
	if err != nil {
		return nil, err
	}
	itemID := int64(0)
	for id, label := range nameMap {
		if label == strconv.FormatInt(ratingValue, 10) {
			itemID = id
			break
		}
	}
	if itemID == 0 {
		return []int64{}, nil
	}
	return library.GetBooksForCategory(db, "ratings", itemID)
}

// metaCategoryBookIDs 取普通分类下的书籍 id。
func metaCategoryBookIDs(db *sql.DB, meta, name string) ([]int64, error) {
	itemID, err := library.GetItemID(db, metaCategory(meta), name)
	if err != nil {
		return nil, err
	}
	if itemID == 0 {
		return []int64{}, nil
	}
	return library.GetBooksForCategory(db, metaCategory(meta), itemID)
}

// metaLoadBooks 按 id 批量取书并转成响应字典。
//
// 对应 Python 的 `[self.fmt(b) for b in books]`：必须用完整的 BookFormatter，
// 否则返回的书籍缺少 img / thumb / href，前端 BookCards 拿不到封面地址。
func metaLoadBooks(cfg MetaConfig, ids []int64) ([]map[string]any, error) {
	if len(ids) == 0 {
		return []map[string]any{}, nil
	}
	data, err := library.GetBooksData(cfg.DB, ids)
	if err != nil {
		return nil, err
	}
	out := make([]map[string]any, 0, len(data))
	for _, b := range data {
		if cfg.Book.DB != nil {
			out = append(out, bookDict(cfg.Book, b))
			continue
		}
		out = append(out, bookDataToDict(b))
	}
	return out, nil
}

// bookDataToDict 把 BookData 转成响应字典。
func bookDataToDict(b library.BookData) map[string]any {
	return map[string]any{
		"id":           b.ID,
		"title":        b.Title,
		"authors":      b.Authors,
		"author_sort":  b.AuthorSort,
		"tags":         b.Tags,
		"publisher":    b.Publisher,
		"series":       b.Series,
		"series_index": b.SeriesIdx,
		"rating":       b.Rating,
		"comments":     b.Comments,
		"language":     b.Language,
		"isbn":         b.ISBN,
		"pubdate":      b.Pubdate,
		"timestamp":    b.Timestamp,
		"has_cover":    b.HasCover,
		"path":         b.Path,
		"fmt":          b.Formats,
		"format_sizes": b.FormatSizes,
	}
}

// metaRenderBookList 复刻 render_book_list 的分页与权限过滤。
func metaRenderBookList(ctx *Context, cfg MetaConfig, allBooks []map[string]any, title string) (map[string]any, error) {
	start := intArg(ctx.Query("start"), 0)
	if start < 0 {
		start = 0
	}
	maxSize := int(toIntSetting(cfg.Settings, "DEFAULT_PAGE_SIZE", 60))
	if maxSize < 60 {
		maxSize = 60
	}
	size := maxSize
	if raw := ctx.Query("size"); raw != "" {
		if n, err := strconv.Atoi(strings.TrimSpace(raw)); err == nil {
			size = n
		}
	}
	delta := size
	if delta < 1 {
		delta = 1
	}
	if delta > maxSize {
		delta = maxSize
	}

	privateIDs, err := privateBookIDs(ctx)
	if err != nil {
		return nil, err
	}
	visible := make([]map[string]any, 0, len(allBooks))
	missing, err := library.UnavailableSourceBooks(cfg.DB)
	if err != nil {
		return nil, err
	}
	for _, b := range allBooks {
		if privateIDs[int64Of(b["id"])] || missing[int64Of(b["id"])] {
			continue
		}
		visible = append(visible, b)
	}
	total := len(visible)

	page := []map[string]any{}
	if start < total {
		end := start + delta
		if end > total {
			end = total
		}
		page = visible[start:end]
	}
	page, err = attachReadingStates(ctx, page)
	if err != nil {
		return nil, err
	}
	return map[string]any{
		"err":   "ok",
		"title": title,
		"total": total,
		"books": page,
	}, nil
}

// ---- AuthorAliases ----

// AuthorAliasesHandler 实现 /api/author/<name>/alias。
func AuthorAliasesHandler(cfg MetaConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		name := ctx.Param(0)
		svc := userdb.NewAliasService(cfg.userDB())

		if ctx.Request.Method == http.MethodPost {
			return metaReplaceAuthorAliases(cfg, ctx, svc, name)
		}

		group, err := svc.GetAuthorGroup(name)
		if err != nil {
			return nil, err
		}
		count, err := metaVisibleAuthorBookCount(ctx, cfg.DB, group.Names)
		if err != nil {
			return nil, err
		}
		return map[string]any{
			"err": "ok",
			"author": map[string]any{
				"canonical":  group.Canonical,
				"aliases":    group.Aliases,
				"names":      group.Names,
				"book_count": count,
				"can_edit":   ctx.HasPermission("e") && ctx.Identity.IsAdmin,
			},
		}, nil
	}
}

// metaReplaceAuthorAliases 处理作者别名的写入。
func metaReplaceAuthorAliases(cfg MetaConfig, ctx *Context, svc *userdb.AliasService,
	name string) (map[string]any, error) {
	if !ctx.HasPermission("e") || !ctx.Identity.IsAdmin {
		return map[string]any{"err": "permission", "msg": "无权操作"}, nil
	}

	data, ok := decodeJSONObject(ctx.Request)
	if !ok {
		return map[string]any{"err": "params.aliases.invalid", "msg": "别名参数无效"}, nil
	}
	canonicalRaw := stringOf(data["canonical"])
	if canonicalRaw == "" {
		canonicalRaw = name
	}
	canonical, err := userdb.CleanAliasName(canonicalRaw)
	if err != nil {
		return map[string]any{"err": "params.aliases.invalid", "msg": "别名参数无效"}, nil
	}
	aliases, err := metaStringList(data["aliases"])
	if err != nil {
		return map[string]any{"err": "params.aliases.invalid", "msg": "别名参数无效"}, nil
	}
	merge, _ := data["merge"].(bool)

	sourceNames, err := svc.AuthorNames(name)
	if err != nil {
		return nil, err
	}

	group, err := svc.ReplaceAuthorGroup(name, canonical, aliases, merge)
	if err != nil {
		if errors.Is(err, userdb.ErrAliasConflict) {
			return map[string]any{"err": "author.alias.conflict", "msg": err.Error()}, nil
		}
		return map[string]any{"err": "params.aliases.invalid", "msg": "别名参数无效"}, nil
	}

	mergeResult := map[string]any{"updated": 0, "failed": []any{}}
	if merge {
		memberNames := append(append([]string{}, sourceNames...), group.Names...)
		renameMap, affected := userdb.CalibreAuthorMergePlan(cfg.DB, memberNames, group.Canonical)
		if len(renameMap) > 0 {
			updated, failed, err := metaRenameAuthors(cfg, ctx, renameMap, affected)
			if err != nil {
				mergeResult["failed"] = int64SliceToAny(failed)
			} else {
				mergeResult["updated"] = updated
			}
		}
	}

	count, err := metaVisibleAuthorBookCount(ctx, cfg.DB, group.Names)
	if err != nil {
		return nil, err
	}
	return map[string]any{
		"err": "ok",
		"author": map[string]any{
			"canonical":  group.Canonical,
			"aliases":    group.Aliases,
			"names":      group.Names,
			"book_count": count,
		},
		"merge": mergeResult,
		"msg":   "作者别名更新成功",
	}, nil
}

// metaRenameAuthors 执行 Calibre 作者改名，保留外部索引路径。
func metaRenameAuthors(cfg MetaConfig, ctx *Context, renameMap map[int64]string,
	affected map[int64]bool) (int, []int64, error) {
	renamed, err := userdb.RenameItemsPreservingExternalPaths(cfg.DB, "authors", renameMap, affected)
	if err != nil {
		return 0, sortedInt64Keys(affected), err
	}
	return len(renamed), nil, nil
}

// metaVisibleAuthorBookCount 统计当前请求方可见的作者书籍数。
func metaVisibleAuthorBookCount(ctx *Context, db *sql.DB, names []string) (int, error) {
	ids, err := metaAuthorBookIDs(db, names)
	if err != nil {
		return 0, err
	}
	privateIDs, err := privateBookIDs(ctx)
	if err != nil {
		return 0, err
	}
	count := 0
	for id := range ids {
		if !privateIDs[id] {
			count++
		}
	}
	return count, nil
}

// metaStringList 把任意值转成字符串列表。
func metaStringList(v any) ([]string, error) {
	if v == nil {
		return []string{}, nil
	}
	items, ok := v.([]any)
	if !ok {
		return nil, fmt.Errorf("httpapi: 期望列表")
	}
	out := make([]string, 0, len(items))
	for _, item := range items {
		s, ok := item.(string)
		if !ok {
			return nil, fmt.Errorf("httpapi: 列表元素应为字符串")
		}
		out = append(out, s)
	}
	return out, nil
}

// ---- AuthorBooksUpdate / PubBooksUpdate ----

// AuthorBooksUpdateHandler 实现 /api/author/<name>/update。
//
// 注意：Python 版调用 `self.do_book_update(...)`，但该方法在整个 webserver
// 包中并不存在（仅 tools/tools.py 这个独立脚本里有同名函数），因此该路由
// 在 Python 下必然抛 AttributeError 返回 500。这里保持「未接线即报错」的
// 等价行为，避免静默成功造成语义漂移。
func AuthorBooksUpdateHandler(cfg MetaConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		name := ctx.Param(0)
		itemID, err := library.GetItemID(cfg.DB, "authors", name)
		if err != nil {
			return nil, err
		}
		ids := []int64{}
		if itemID != 0 {
			ids, err = library.GetBooksForCategory(cfg.DB, "authors", itemID)
			if err != nil {
				return nil, err
			}
		}
		if err := metaUpdateBooks(cfg, ctx, ids); err != nil {
			return nil, err
		}
		http.Redirect(ctx.Writer, ctx.Request, "/author/"+url.PathEscape(name), http.StatusFound)
		return nil, nil
	}
}

// PubBooksUpdateHandler 实现 /api/publisher/<name>/update。
func PubBooksUpdateHandler(cfg MetaConfig) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		name := ctx.Param(0)
		itemID, err := library.GetItemID(cfg.DB, "publishers", name)
		if err != nil {
			return nil, err
		}
		var ids []int64
		if itemID != 0 {
			ids, err = library.GetBooksForCategory(cfg.DB, "publishers", itemID)
			if err != nil {
				return nil, err
			}
		} else {
			// 出版社不存在时，回退到「全部无出版社的书」。
			ids, err = metaBooksWithoutPublisher(cfg.DB)
			if err != nil {
				return nil, err
			}
		}
		if err := metaUpdateBooks(cfg, ctx, ids); err != nil {
			return nil, err
		}
		http.Redirect(ctx.Writer, ctx.Request, "/publisher/"+url.PathEscape(name), http.StatusFound)
		return nil, nil
	}
}

// metaBooksWithoutPublisher 取全部没有出版社的书籍 id。
func metaBooksWithoutPublisher(db *sql.DB) ([]int64, error) {
	rows, err := db.Query(`SELECT id FROM books ORDER BY id DESC`)
	if err != nil {
		return nil, fmt.Errorf("httpapi: 查询书籍失败: %w", err)
	}
	defer rows.Close()

	all := []int64{}
	for rows.Next() {
		var id int64
		if err := rows.Scan(&id); err != nil {
			return nil, fmt.Errorf("httpapi: 扫描书籍失败: %w", err)
		}
		all = append(all, id)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("httpapi: 遍历书籍失败: %w", err)
	}
	if len(all) == 0 {
		return []int64{}, nil
	}

	books, err := library.GetBooksData(db, all)
	if err != nil {
		return nil, err
	}
	out := []int64{}
	for _, b := range books {
		if strings.TrimSpace(b.Publisher) == "" {
			out = append(out, b.ID)
		}
	}
	return out, nil
}

// metaUpdateBooks 对前 40 本书触发元数据刷新。
func metaUpdateBooks(cfg MetaConfig, ctx *Context, ids []int64) error {
	if cfg.UpdateBook == nil {
		return fmt.Errorf("httpapi: do_book_update 未接线（Python 版该方法不存在）")
	}
	limit := len(ids)
	if limit > 40 {
		limit = 40
	}
	for _, id := range ids[:limit] {
		if err := cfg.UpdateBook(ctx, id); err != nil {
			return err
		}
	}
	return nil
}

// ---- 路由表 ----

// MetaRouteSpecs 返回元数据分类模块接管的 5 条路由。
func MetaRouteSpecs(cfg MetaConfig) []RouteSpec {
	methods := []string{http.MethodGet, http.MethodPost}
	return []RouteSpec{
		{Pattern: rAuthorAlias, Methods: methods, Handler: AuthorAliasesHandler(cfg)},
		{Pattern: rMetaList, Methods: methods, Handler: MetaListHandler(cfg)},
		{Pattern: rMetaBooks, Methods: methods, Handler: MetaBooksHandler(cfg)},
		{Pattern: rAuthorBooksUpd, Methods: methods, Handler: AuthorBooksUpdateHandler(cfg)},
		{Pattern: rPubBooksUpdate, Methods: methods, Handler: PubBooksUpdateHandler(cfg)},
	}
}

// sortedInt64Keys 把集合转成升序切片。
func sortedInt64Keys(set map[int64]bool) []int64 {
	out := make([]int64, 0, len(set))
	for id := range set {
		out = append(out, id)
	}
	sort.Slice(out, func(i, j int) bool { return out[i] < out[j] })
	return out
}

// int64SliceToAny 把 int64 切片转成 any 切片。
func int64SliceToAny(values []int64) []any {
	out := make([]any, 0, len(values))
	for _, v := range values {
		out = append(out, v)
	}
	return out
}
