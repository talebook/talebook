package httpapi

import (
	"database/sql"
	"os"
	"path/filepath"
	"testing"

	_ "modernc.org/sqlite"
)

// 本文件回归一个真实缺陷：Serve 曾把 **Calibre 元数据库** 传给 ServiceFactory，
// 而 ScanService / PluginRegistry 访问的 scanfiles、plugin_* 只存在于
// Talebook 自有库，导致运行时报 `no such table: scanfiles`。
//
// 双库部署（DBPath != UserDBPath）下必须传自有库；单库部署两者同一句柄。

// newUserDBFile 建一个只含 scanfiles 表的自有库文件。
func newUserDBFile(t *testing.T) (*sql.DB, string) {
	t.Helper()
	path := filepath.Join(t.TempDir(), "calibre-webserver.db")
	db, err := sql.Open("sqlite", path)
	if err != nil {
		t.Fatalf("open user db: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })
	if _, err := db.Exec(`CREATE TABLE scanfiles (
		id INTEGER PRIMARY KEY, path TEXT, status TEXT, create_time TEXT)`); err != nil {
		t.Fatalf("create scanfiles: %v", err)
	}
	return db, path
}

// TestServiceFactoryReceivesUserDB 双库部署时 ServiceFactory 必须收到自有库。
//
// 断言方式：在回调里对 scanfiles 做一次真实查询——若收到的是 Calibre 库，
// 会报 `no such table: scanfiles`，测试即失败。
func TestServiceFactoryReceivesUserDB(t *testing.T) {
	_, calibrePath := newTestDBFile(t)
	_, userPath := newUserDBFile(t)

	var gotPath string
	var queryErr error
	var libraryErr error

	opts := ServeOptions{
		DBPath:       calibrePath,
		UserDBPath:   userPath,
		CookieSecret: "test-secret",
		ServiceFactory: func(userDB, libraryDB *sql.DB) ServiceSet {
			// 记录回调收到的库：用 scanfiles 是否可查来判定。
			var n int
			queryErr = userDB.QueryRow(`SELECT COUNT(*) FROM scanfiles`).Scan(&n)
			if queryErr == nil {
				gotPath = "userdb"
			} else {
				gotPath = "calibre"
			}
			// libraryDB 必须能查 books（Calibre 库）。
			var m int
			libraryErr = libraryDB.QueryRow(`SELECT COUNT(*) FROM books`).Scan(&m)
			return ServiceSet{}
		},
	}

	_, cancel := startServe(t, opts)
	defer cancel()

	if queryErr != nil {
		t.Fatalf("ServiceFactory 收到的库没有 scanfiles 表（说明传了 Calibre 库）: %v", queryErr)
	}
	if gotPath != "userdb" {
		t.Errorf("ServiceFactory 收到 %s，want userdb", gotPath)
	}
	if libraryErr != nil {
		t.Fatalf("ServiceFactory 收到的 libraryDB 没有 books 表（说明传了自有库）: %v", libraryErr)
	}
}

// TestServiceFactorySingleDBStillWorks 单库部署（未指定 UserDBPath）时行为不变。
func TestServiceFactorySingleDBStillWorks(t *testing.T) {
	db, path := newTestDBFile(t)
	// 单库场景下同一个文件里既有 books（newTestDBFile 已建）也有 scanfiles。
	if _, err := db.Exec(`CREATE TABLE scanfiles (
		id INTEGER PRIMARY KEY, path TEXT, status TEXT, create_time TEXT)`); err != nil {
		t.Fatalf("create scanfiles: %v", err)
	}

	called := false
	opts := ServeOptions{
		DBPath:       path,
		CookieSecret: "test-secret",
		ServiceFactory: func(userDB, libraryDB *sql.DB) ServiceSet {
			called = true
			var n int
			if err := userDB.QueryRow(`SELECT COUNT(*) FROM scanfiles`).Scan(&n); err != nil {
				t.Errorf("单库部署下 scanfiles 应可查: %v", err)
			}
			if err := libraryDB.QueryRow(`SELECT COUNT(*) FROM books`).Scan(&n); err != nil {
				t.Errorf("单库部署下 books 应可查: %v", err)
			}
			return ServiceSet{}
		},
	}

	_, cancel := startServe(t, opts)
	defer cancel()

	if !called {
		t.Fatal("ServiceFactory 未被调用")
	}
}

// TestUserDBFileIsSeparateFile 确认测试夹具真的是两个不同文件。
func TestUserDBFileIsSeparateFile(t *testing.T) {
	_, calibrePath := newTestDBFile(t)
	_, userPath := newUserDBFile(t)
	if calibrePath == userPath {
		t.Fatal("两个库路径不应相同")
	}
	for _, p := range []string{calibrePath, userPath} {
		if _, err := os.Stat(p); err != nil {
			t.Errorf("库文件不存在 %s: %v", p, err)
		}
	}
}
