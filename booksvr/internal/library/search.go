package library

import (
	"context"
	"database/sql"
	"fmt"
	"strconv"
	"strings"
)

// Search 执行 Calibre 风格的查询，返回匹配的书籍 id。
//
// 支持的语法：
//   - 字段限定：title:/author:/tag:/publisher:/series:/rating:/format:/search:
//   - 比较符：`:` 等于、`:=` 等于、`:<` 小于、`:>` 大于
//   - 布尔运算：and / or / not（大小写不敏感）
//   - 括号分组
//   - 空查询返回全部
//
// 未实现的语法（正则 `~`、虚拟书库、custom_columns 高级查询）会返回
// 明确错误，不静默给出错误结果。
func Search(db *sql.DB, query string) ([]int64, error) {
	query = strings.TrimSpace(query)
	if query == "" {
		return AllBookIDs(db)
	}

	tokens, err := lex(query)
	if err != nil {
		return nil, err
	}
	p := &parser{tokens: tokens}
	node, err := p.parseExpr()
	if err != nil {
		return nil, err
	}
	if p.pos != len(p.tokens) {
		return nil, fmt.Errorf("library: 查询语法错误：位置 %d 处有多余内容", p.pos)
	}

	cond, args, err := node.toSQL()
	if err != nil {
		return nil, err
	}

	// 条件片段以 b.id 为主键引用，这里补上 FROM 子句。
	sqlText := "SELECT b.id FROM books b WHERE " + cond + " ORDER BY b.id"

	rows, err := db.Query(sqlText, args...)
	if err != nil {
		return nil, fmt.Errorf("library: 执行搜索失败: %w", err)
	}
	defer rows.Close()

	ids := []int64{}
	for rows.Next() {
		var id int64
		if err := rows.Scan(&id); err != nil {
			return nil, fmt.Errorf("library: 扫描搜索结果失败: %w", err)
		}
		ids = append(ids, id)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("library: 遍历搜索结果失败: %w", err)
	}
	return ids, nil
}

// --- 词法分析 ---

type tokenKind int

const (
	tokField tokenKind = iota // 字段名（author/tag/...）
	tokValue                  // 字段值（已去引号）
	tokOp                     // 比较符 : := :< :>
	tokAnd
	tokOr
	tokNot
	tokLParen
	tokRParen
)

type token struct {
	kind tokenKind
	text string
}

// knownFields 是支持的字段名。
var knownFields = map[string]bool{
	"title": true, "author": true, "authors": true, "tag": true, "tags": true,
	"publisher": true, "series": true, "rating": true, "format": true,
	"search": true, "comments": true, "language": true, "isbn": true,
}

// lex 把查询串切成 token。
func lex(s string) ([]token, error) {
	var out []token
	i := 0
	for i < len(s) {
		c := s[i]
		switch {
		case c == ' ' || c == '\t' || c == '\n':
			i++
		case c == '(':
			out = append(out, token{kind: tokLParen, text: "("})
			i++
		case c == ')':
			out = append(out, token{kind: tokRParen, text: ")"})
			i++
		default:
			// 读一个「词」：字段名或裸词。
			start := i
			for i < len(s) && !strings.ContainsRune(" \t\n():=<>", rune(s[i])) {
				i++
			}
			word := s[start:i]
			if word == "" {
				return nil, fmt.Errorf("library: 查询语法错误：位置 %d 处有非法字符 %q", i, string(c))
			}

			lower := strings.ToLower(word)
			switch lower {
			case "and":
				out = append(out, token{kind: tokAnd, text: lower})
				continue
			case "or":
				out = append(out, token{kind: tokOr, text: lower})
				continue
			case "not":
				out = append(out, token{kind: tokNot, text: lower})
				continue
			}

			// 后面跟比较符则是字段名。
			if i < len(s) && (s[i] == ':' || s[i] == '=' || s[i] == '<' || s[i] == '>') {
				if !knownFields[lower] {
					return nil, fmt.Errorf("library: 查询语法错误：未知字段 %q", word)
				}
				op, next, err := lexOp(s, i)
				if err != nil {
					return nil, err
				}
				i = next
				val, next2, err := lexValue(s, i)
				if err != nil {
					return nil, err
				}
				i = next2
				out = append(out, token{kind: tokField, text: lower}, token{kind: tokOp, text: op}, token{kind: tokValue, text: val})
				continue
			}

			// 裸词：视为全文搜索。
			out = append(out, token{kind: tokField, text: "search"}, token{kind: tokOp, text: ":"}, token{kind: tokValue, text: word})
		}
	}
	return out, nil
}

// lexOp 读取比较符，返回符号与新的位置。
func lexOp(s string, i int) (string, int, error) {
	if i >= len(s) {
		return "", i, fmt.Errorf("library: 查询语法错误：缺少比较符")
	}
	switch s[i] {
	case ':':
		if i+1 < len(s) && (s[i+1] == '=' || s[i+1] == '<' || s[i+1] == '>') {
			return s[i : i+2], i + 2, nil
		}
		return ":", i + 1, nil
	case '=':
		return ":=", i + 1, nil
	case '<':
		return ":<", i + 1, nil
	case '>':
		return ":>", i + 1, nil
	}
	return "", i, fmt.Errorf("library: 查询语法错误：非法比较符 %q", string(s[i]))
}

// lexValue 读取字段值（支持单/双引号），返回去引号后的值与新位置。
func lexValue(s string, i int) (string, int, error) {
	if i >= len(s) {
		return "", i, fmt.Errorf("library: 查询语法错误：字段缺少值")
	}
	if s[i] == '\'' || s[i] == '"' {
		quote := s[i]
		i++
		start := i
		for i < len(s) && s[i] != quote {
			i++
		}
		if i >= len(s) {
			return "", i, fmt.Errorf("library: 查询语法错误：引号未闭合")
		}
		val := s[start:i]
		i++ // 跳过收尾引号
		if val == "" {
			return "", i, fmt.Errorf("library: 查询语法错误：字段值为空")
		}
		return val, i, nil
	}
	start := i
	for i < len(s) && !strings.ContainsRune(" \t\n()", rune(s[i])) {
		i++
	}
	val := s[start:i]
	if val == "" {
		return "", i, fmt.Errorf("library: 查询语法错误：字段缺少值")
	}
	return val, i, nil
}

// --- 语法分析 ---

type parser struct {
	tokens []token
	pos    int
}

// node 是查询语法树的节点。
type node interface {
	toSQL() (string, []any, error)
}

// parseExpr 解析 or 层（最低优先级）。
func (p *parser) parseExpr() (node, error) {
	left, err := p.parseAnd()
	if err != nil {
		return nil, err
	}
	for p.peek(tokOr) {
		p.next()
		right, err := p.parseAnd()
		if err != nil {
			return nil, err
		}
		left = &orNode{left: left, right: right}
	}
	return left, nil
}

// parseAnd 解析 and 层。
func (p *parser) parseAnd() (node, error) {
	left, err := p.parseUnary()
	if err != nil {
		return nil, err
	}
	for p.peek(tokAnd) {
		p.next()
		right, err := p.parseUnary()
		if err != nil {
			return nil, err
		}
		left = &andNode{left: left, right: right}
	}
	return left, nil
}

// parseUnary 解析 not 与括号。
func (p *parser) parseUnary() (node, error) {
	if p.peek(tokNot) {
		p.next()
		inner, err := p.parseUnary()
		if err != nil {
			return nil, err
		}
		return &notNode{inner: inner}, nil
	}
	if p.peek(tokLParen) {
		p.next()
		inner, err := p.parseExpr()
		if err != nil {
			return nil, err
		}
		if !p.peek(tokRParen) {
			return nil, fmt.Errorf("library: 查询语法错误：括号未闭合")
		}
		p.next()
		return inner, nil
	}
	return p.parseTerm()
}

// parseTerm 解析一个字段条件。
func (p *parser) parseTerm() (node, error) {
	if !p.peek(tokField) {
		return nil, fmt.Errorf("library: 查询语法错误：位置 %d 处应为字段名", p.pos)
	}
	field := p.next().text
	if !p.peek(tokOp) {
		return nil, fmt.Errorf("library: 查询语法错误：字段 %q 后缺少比较符", field)
	}
	op := p.next().text
	if !p.peek(tokValue) {
		return nil, fmt.Errorf("library: 查询语法错误：字段 %q 缺少值", field)
	}
	value := p.next().text
	return &termNode{field: field, op: op, value: value}, nil
}

func (p *parser) peek(k tokenKind) bool {
	return p.pos < len(p.tokens) && p.tokens[p.pos].kind == k
}

func (p *parser) next() token {
	t := p.tokens[p.pos]
	p.pos++
	return t
}

// --- SQL 生成 ---

type andNode struct{ left, right node }

func (n *andNode) toSQL() (string, []any, error) {
	l, la, err := n.left.toSQL()
	if err != nil {
		return "", nil, err
	}
	r, ra, err := n.right.toSQL()
	if err != nil {
		return "", nil, err
	}
	return fmt.Sprintf("(%s) AND (%s)", l, r), append(la, ra...), nil
}

type orNode struct{ left, right node }

func (n *orNode) toSQL() (string, []any, error) {
	l, la, err := n.left.toSQL()
	if err != nil {
		return "", nil, err
	}
	r, ra, err := n.right.toSQL()
	if err != nil {
		return "", nil, err
	}
	return fmt.Sprintf("(%s) OR (%s)", l, r), append(la, ra...), nil
}

type notNode struct{ inner node }

func (n *notNode) toSQL() (string, []any, error) {
	inner, args, err := n.inner.toSQL()
	if err != nil {
		return "", nil, err
	}
	// 内层条件引用 b.id；外层用 NOT 包裹即可（同一张 books 表）。
	return fmt.Sprintf("NOT (%s)", inner), args, nil
}

// termNode 是一个字段条件。
type termNode struct {
	field string
	op    string
	value string
}

func (n *termNode) toSQL() (string, []any, error) {
	switch n.field {
	case "title":
		return cmp("b.title", n.op, n.value)
	case "author", "authors":
		return subqueryCmp("authors", "author", "name", n.op, n.value)
	case "tag", "tags":
		return subqueryCmp("tags", "tag", "name", n.op, n.value)
	case "publisher":
		return subqueryCmp("publishers", "publisher", "name", n.op, n.value)
	case "series":
		return subqueryCmp("series", "series", "name", n.op, n.value)
	case "language":
		return subqueryCmp("languages", "lang_code", "lang_code", n.op, n.value)
	case "comments":
		return cmp("COALESCE((SELECT text FROM comments WHERE book = b.id), '')", n.op, n.value)
	case "isbn":
		return identifierCmp(n.op, n.value)
	case "format":
		return fmt.Sprintf(
			"b.id IN (SELECT book FROM data WHERE UPPER(format) = UPPER(?))",
		), []any{n.value}, nil
	case "rating":
		return ratingCmp(n.op, n.value)
	case "search":
		return fullText(n.value)
	}
	return "", nil, fmt.Errorf("library: 不支持的字段 %q", n.field)
}

// cmp 生成普通列的比较条件。
func cmp(col, op, value string) (string, []any, error) {
	switch op {
	case ":", ":=":
		return fmt.Sprintf("%s = ?", col), []any{value}, nil
	case ":<":
		return fmt.Sprintf("%s < ?", col), []any{value}, nil
	case ":>":
		return fmt.Sprintf("%s > ?", col), []any{value}, nil
	}
	return "", nil, fmt.Errorf("library: 字段不支持比较符 %q", op)
}

// subqueryCmp 生成「通过关联表匹配分类项名」的条件。
//
// 适用于 books_<item>_link 关联表 + <item> 项表的结构。
func subqueryCmp(itemTable, linkCol, nameCol, op, value string) (string, []any, error) {
	cond, args, err := cmp("i."+nameCol, op, value)
	if err != nil {
		return "", nil, err
	}
	linkTable := "books_" + itemTable + "_link"
	sqlText := fmt.Sprintf(
		"b.id IN (SELECT l.book FROM %s l JOIN %s i ON i.id = l.%s WHERE %s)",
		linkTable, itemTable, linkCol, cond)
	return sqlText, args, nil
}

// identifierCmp 生成按标识符（如 isbn）匹配的条件。
//
// identifiers 表没有独立的项表，直接按 type/val 过滤。
func identifierCmp(op, value string) (string, []any, error) {
	cond, args, err := cmp("val", op, value)
	if err != nil {
		return "", nil, err
	}
	sqlText := fmt.Sprintf(
		"b.id IN (SELECT book FROM identifiers WHERE type = 'isbn' AND %s)", cond)
	return sqlText, args, nil
}

// ratingCmp 生成评分比较条件（Calibre 的 rating 是 0-10 整数）。
func ratingCmp(op, value string) (string, []any, error) {
	num, err := strconv.ParseInt(strings.TrimSpace(value), 10, 64)
	if err != nil {
		return "", nil, fmt.Errorf("library: 评分值 %q 不是整数", value)
	}
	cond, _, err := cmp("r.rating", op, "")
	if err != nil {
		return "", nil, err
	}
	return fmt.Sprintf(
		"b.id IN (SELECT l.book FROM books_ratings_link l JOIN ratings r ON r.id = l.rating WHERE %s)",
		cond), []any{num}, nil
}

// fullText 生成全文搜索条件（title / comments / tags）。
func fullText(value string) (string, []any, error) {
	like := "%" + value + "%"
	sqlText := `(
		b.title LIKE ?
		OR COALESCE((SELECT text FROM comments WHERE book = b.id), '') LIKE ?
		OR b.id IN (SELECT l.book FROM books_tags_link l JOIN tags t ON t.id = l.tag WHERE t.name LIKE ?)
	)`
	return sqlText, []any{like, like, like}, nil
}

// SearchPage uses the existing query grammar but returns only a requested page.
// A negative size preserves the administrative export-all contract.
func SearchPage(ctx context.Context, db *sql.DB, query string, start, size int, descending bool) ([]int64, int, error) {
	cond := "1=1"
	args := []any{}
	if strings.TrimSpace(query) != "" {
		tokens, err := lex(strings.TrimSpace(query))
		if err != nil {
			return nil, 0, err
		}
		p := &parser{tokens: tokens}
		node, err := p.parseExpr()
		if err != nil {
			return nil, 0, err
		}
		if p.pos != len(p.tokens) {
			return nil, 0, fmt.Errorf("library: 查询语法错误：有多余内容")
		}
		cond, args, err = node.toSQL()
		if err != nil {
			return nil, 0, err
		}
	}
	tx, err := db.BeginTx(ctx, &sql.TxOptions{ReadOnly: true})
	if err != nil {
		return nil, 0, err
	}
	defer tx.Rollback()
	var total int
	if err = tx.QueryRowContext(ctx, "SELECT count(*) FROM books b WHERE "+cond, args...).Scan(&total); err != nil {
		return nil, 0, err
	}
	order := "ASC"
	if descending {
		order = "DESC"
	}
	stmt := "SELECT b.id FROM books b WHERE " + cond + " ORDER BY b.id " + order
	if size >= 0 {
		stmt += " LIMIT ? OFFSET ?"
		args = append(args, size, start)
	}
	rows, err := tx.QueryContext(ctx, stmt, args...)
	if err != nil {
		return nil, 0, err
	}
	ids := []int64{}
	for rows.Next() {
		var id int64
		if err = rows.Scan(&id); err != nil {
			rows.Close()
			return nil, 0, err
		}
		ids = append(ids, id)
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return nil, 0, err
	}
	if err = tx.Commit(); err != nil {
		return nil, 0, err
	}
	return ids, total, nil
}

// BookTitles reads only titles and IDs; no per-comparison database accesses.
func BookTitles(db *sql.DB, ids []int64) (map[int64]string, error) {
	rows, err := db.Query("SELECT id,title FROM books WHERE id IN (SELECT value FROM json_each(?))", jsonIDs(ids))
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := map[int64]string{}
	for rows.Next() {
		var id int64
		var title string
		if err = rows.Scan(&id, &title); err != nil {
			return nil, err
		}
		out[id] = title
	}
	return out, rows.Err()
}
