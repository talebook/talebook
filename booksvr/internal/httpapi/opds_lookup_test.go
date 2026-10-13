package httpapi

import (
	"database/sql"
	"net/http"
	"testing"

	_ "modernc.org/sqlite"
)

// TestOpdsSourcesUpdateNameLookupError 覆盖「按 id 查到、按名查失败」的分支。
//
// 用视图让按 id 的查询成功、按 name 的查询因类型不匹配而 Scan 失败：
// 视图把 name 匹配行的 id 列替换成文本，使 Scan 到 *int64 报错。
func TestOpdsSourcesUpdateNameLookupError(t *testing.T) {
	db, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("打开内存库失败: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })

	if _, err := db.Exec(`CREATE TABLE opds_real (
		id INTEGER PRIMARY KEY, name VARCHAR(200), url VARCHAR(1000), description VARCHAR(500),
		active BOOLEAN, create_time DATETIME, update_time DATETIME, data VARCHAR(255))`); err != nil {
		t.Fatalf("建表失败: %v", err)
	}
	// 两行：id=1 名为 ok（供按 id 查），id=2 名为 bad（供按名查且 Scan 失败）。
	if _, err := db.Exec(`INSERT INTO opds_real (id, name, url, active, create_time, update_time, data)
		VALUES (1, 'ok', 'https://a.com', 1, '2026-01-01 00:00:00', '2026-01-01 00:00:00', '{}')`); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	if _, err := db.Exec(`INSERT INTO opds_real (id, name, url, active, create_time, update_time, data)
		VALUES (2, 'bad', 'https://b.com', 1, '2026-01-01 00:00:00', '2026-01-01 00:00:00', '{}')`); err != nil {
		t.Fatalf("插入失败: %v", err)
	}

	// 视图：当 name = 'bad' 时把 id 换成文本，使 Scan 失败；其余行正常。
	if _, err := db.Exec(`CREATE VIEW opds_sources AS
		SELECT CASE WHEN name = 'bad' THEN 'not-a-number' ELSE CAST(id AS INTEGER) END AS id,
		       name, url, description, active, create_time, update_time, data
		FROM opds_real`); err != nil {
		t.Fatalf("建视图失败: %v", err)
	}

	// 更新时改名成 'bad' → GetOpdsSourceByName 的 Scan 失败 → 返回 error。
	// 注意：不能先调 GET 列表，因为列表会扫到 'bad' 行而失败。
	resp := opdsCall(t, db, http.MethodPut, `{"id":1,"name":"bad"}`)
	if resp["err"] != "error" {
		t.Errorf("按名查询失败应返回 error，得到 %v", resp["err"])
	}
}
