package httpapi

import (
	"database/sql"
	"path/filepath"
	"testing"

	_ "modernc.org/sqlite"
)

// openReadOnlyCopy 把内存库落盘后以只读模式打开，用于构造写失败场景。
//
// 只读连接上的 INSERT/UPDATE 会返回错误，从而覆盖错误分支。
func openReadOnlyCopy(t *testing.T, src *sql.DB) (*sql.DB, error) {
	t.Helper()
	path := filepath.Join(t.TempDir(), "ro.db")

	// 用 VACUUM INTO 把内存库导出到文件。
	if _, err := src.Exec(`VACUUM INTO ?`, path); err != nil {
		return nil, err
	}
	db, err := sql.Open("sqlite", "file:"+path+"?mode=ro")
	if err != nil {
		return nil, err
	}
	t.Cleanup(func() { _ = db.Close() })
	return db, nil
}
