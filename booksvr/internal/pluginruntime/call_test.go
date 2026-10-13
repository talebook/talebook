package pluginruntime

import (
	"errors"
	"testing"
	"time"

	"talebook/booksvr/internal/plugindomain"
	"talebook/booksvr/internal/pluginiface"
	"talebook/booksvr/internal/pluginproto"
	"talebook/booksvr/internal/userdb"
)

// capabilitySet 返回满足 fakeProvider 契约的能力集。
func capabilitySet() pluginiface.CapabilitySet {
	return pluginiface.CapabilitySet{
		Interfaces:   map[string]bool{"MetadataProvider": true},
		HasSelfCheck: true,
	}
}

// newAuthError 构造一个鉴权失败的上游错误。
func newAuthError() error {
	return pluginproto.NewUpstreamAuthError("bad token", "auth", nil)
}

// dispatchProvider 在 fakeProvider 之上实现 MethodDispatcher。
type dispatchProvider struct {
	*fakeProvider
	handler func(method string, args []any, context map[string]any) (any, error)
}

func (d *dispatchProvider) Invoke(method string, args []any,
	context map[string]any) (any, error) {
	if d.handler == nil {
		return nil, errors.New("no handler")
	}
	return d.handler(method, args, context)
}

// newRuntimeWithDispatcher 注册一个可动态分派的 provider。
func newRuntimeWithDispatcher(t *testing.T, handler func(string, []any, map[string]any) (any, error)) (*Runtime, *userdb.PluginConnection) {
	t.Helper()
	db := newSchemaDB(t)
	adminID := seedAdmin(t, db)
	reg := NewPluginRegistry()
	p := &dispatchProvider{
		fakeProvider: &fakeProvider{manifest: minimalManifest("demo")},
		handler:      handler,
	}
	if _, err := reg.Register(p, capabilitySet()); err != nil {
		t.Fatalf("Register: %v", err)
	}
	insts, err := EnsureBuiltinInstallations(db, adminID, map[string]any{}, reg)
	if err != nil {
		t.Fatalf("EnsureBuiltinInstallations: %v", err)
	}
	if _, err := db.Exec(`UPDATE plugin_installations SET enabled = 1 WHERE id = ?`, insts[0].ID); err != nil {
		t.Fatalf("enable: %v", err)
	}
	rt := NewRuntime(db, map[string]any{"PLUGIN_SECRET_KEY": "test-key-123"}, reg)
	rt.Sleep = func(time.Duration) {}
	conn, err := getBuiltinConnection(db, insts[0].ID)
	if err != nil {
		t.Fatalf("getBuiltinConnection: %v", err)
	}
	return rt, conn
}

func TestReadDispatchesAndAudits(t *testing.T) {
	var gotMethod string
	rt, conn := newRuntimeWithDispatcher(t, func(method string, args []any,
		context map[string]any) (any, error) {
		gotMethod = method
		return map[string]any{"count": 3}, nil
	})

	out, err := rt.Read(conn, "search_books", []any{"三体"}, CallOptions{})
	if err != nil {
		t.Fatalf("Read: %v", err)
	}
	if gotMethod != "search_books" {
		t.Errorf("method = %s", gotMethod)
	}
	if out.(map[string]any)["count"] != 3 {
		t.Errorf("out = %v", out)
	}

	// 审计记录应为 succeeded，counts.fetched = 3。
	var status, counts string
	if err := rt.DB.QueryRow(`SELECT status, counts FROM plugin_runs
		WHERE connection_id=? ORDER BY id DESC LIMIT 1`, conn.ID).Scan(&status, &counts); err != nil {
		t.Fatalf("query run: %v", err)
	}
	if status != "succeeded" {
		t.Errorf("status = %s", status)
	}
	if counts != `{"conflicts":0,"failed":0,"fetched":3,"skipped":0,"updated":0,"written":0}` {
		t.Errorf("counts = %s", counts)
	}
}

func TestReadFailureAuditsAndRedacts(t *testing.T) {
	rt, conn := newRuntimeWithDispatcher(t, func(string, []any,
		map[string]any) (any, error) {
		return nil, NewPluginRuntimeError("plugin.execution_failed", "boom s3cr3t", false)
	})

	_, err := rt.Read(conn, "search_books", nil, CallOptions{})
	if err == nil {
		t.Fatal("expected error")
	}

	var status, errorCode string
	if err := rt.DB.QueryRow(`SELECT status, error_code FROM plugin_runs
		WHERE connection_id=? ORDER BY id DESC LIMIT 1`, conn.ID).Scan(&status, &errorCode); err != nil {
		t.Fatalf("query: %v", err)
	}
	if status != "failed" || errorCode != "plugin.execution_failed" {
		t.Errorf("status=%s code=%s", status, errorCode)
	}
}

func TestWriteUsesUpdatedCount(t *testing.T) {
	rt, conn := newRuntimeWithDispatcher(t, func(string, []any,
		map[string]any) (any, error) {
		return map[string]any{"count": 5}, nil
	})

	if _, err := rt.Write(conn, "push_annotation", nil, CallOptions{}); err != nil {
		t.Fatalf("Write: %v", err)
	}
	var counts string
	if err := rt.DB.QueryRow(`SELECT counts FROM plugin_runs
		WHERE connection_id=? ORDER BY id DESC LIMIT 1`, conn.ID).Scan(&counts); err != nil {
		t.Fatalf("query: %v", err)
	}
	if counts != `{"conflicts":0,"failed":0,"fetched":0,"skipped":0,"updated":5,"written":0}` {
		t.Errorf("counts = %s", counts)
	}
}

func TestSyncUsesWrittenCount(t *testing.T) {
	rt, conn := newRuntimeWithDispatcher(t, func(string, []any,
		map[string]any) (any, error) {
		return map[string]any{"count": 2}, nil
	})

	if _, err := rt.Sync(conn, "sync_shelf", nil, CallOptions{}); err != nil {
		t.Fatalf("Sync: %v", err)
	}
	var counts string
	if err := rt.DB.QueryRow(`SELECT counts FROM plugin_runs
		WHERE connection_id=? ORDER BY id DESC LIMIT 1`, conn.ID).Scan(&counts); err != nil {
		t.Fatalf("query: %v", err)
	}
	if counts != `{"conflicts":0,"failed":0,"fetched":0,"skipped":0,"updated":0,"written":2}` {
		t.Errorf("counts = %s", counts)
	}
}

func TestCallOneFinalizeHook(t *testing.T) {
	rt, conn := newRuntimeWithDispatcher(t, func(string, []any,
		map[string]any) (any, error) {
		return map[string]any{"raw": true}, nil
	})

	out, err := rt.Write(conn, "push", nil, CallOptions{
		Finalize: func(v any) (any, error) {
			return map[string]any{"finalized": true}, nil
		},
	})
	if err != nil {
		t.Fatalf("Write: %v", err)
	}
	if out.(map[string]any)["finalized"] != true {
		t.Errorf("out = %v", out)
	}
}

func TestCallOneFinalizeErrorTriggersRollback(t *testing.T) {
	rt, conn := newRuntimeWithDispatcher(t, func(string, []any,
		map[string]any) (any, error) {
		return map[string]any{"raw": true}, nil
	})

	rollbackCalled := false
	_, err := rt.Write(conn, "push", nil, CallOptions{
		Finalize: func(any) (any, error) {
			return nil, NewPluginRuntimeError("plugin.write_failed", "write failed", false)
		},
		Rollback: func() (map[string]any, bool) {
			rollbackCalled = true
			return map[string]any{"restored": true}, true
		},
	})
	if err == nil {
		t.Fatal("expected error")
	}
	if !rollbackCalled {
		t.Error("rollback must be called on finalize failure")
	}

	var status string
	if err := rt.DB.QueryRow(`SELECT status FROM plugin_runs
		WHERE connection_id=? ORDER BY id DESC LIMIT 1`, conn.ID).Scan(&status); err != nil {
		t.Fatalf("query: %v", err)
	}
	if status != "rolled_back" {
		t.Errorf("status = %s, want rolled_back", status)
	}
}

func TestCallOneRollbackFailureKeepsFailed(t *testing.T) {
	rt, conn := newRuntimeWithDispatcher(t, func(string, []any,
		map[string]any) (any, error) {
		return nil, NewPluginRuntimeError("plugin.execution_failed", "boom", false)
	})

	_, err := rt.Write(conn, "push", nil, CallOptions{
		Rollback: func() (map[string]any, bool) { return nil, false },
	})
	if err == nil {
		t.Fatal("expected error")
	}
	var status string
	if err := rt.DB.QueryRow(`SELECT status FROM plugin_runs
		WHERE connection_id=? ORDER BY id DESC LIMIT 1`, conn.ID).Scan(&status); err != nil {
		t.Fatalf("query: %v", err)
	}
	if status != "failed" {
		t.Errorf("status = %s, want failed", status)
	}
}

func TestCallOneProviderWithoutDispatcher(t *testing.T) {
	rt, _, _ := newRuntimeWithPlugin(t, "demo", nil)
	conns, err := rt.ConnectionsFor("metadata.lookup", nil)
	if err != nil {
		t.Fatalf("ConnectionsFor: %v", err)
	}
	// fakeProvider 未实现 MethodDispatcher。
	_, err = rt.Read(conns[0], "search_books", nil, CallOptions{})
	if err == nil {
		t.Fatal("expected contract error")
	}
	if errorCodeOf(err) != "plugin.provider_contract" {
		t.Errorf("code = %s", errorCodeOf(err))
	}
}

func TestReadPagesSinglePage(t *testing.T) {
	rt, conn := newRuntimeWithDispatcher(t, func(string, []any,
		map[string]any) (any, error) {
		return &plugindomain.Page{
			Items:      []any{"a", "b"},
			HasMore:    false,
			NextCursor: map[string]any{"page": 1},
		}, nil
	})

	page, err := rt.ReadPages(conn, "list", nil, ReadPagesOptions{})
	if err != nil {
		t.Fatalf("ReadPages: %v", err)
	}
	if len(page.Items) != 2 || page.HasMore {
		t.Errorf("page = %+v", page)
	}
}

func TestReadPagesMultiplePages(t *testing.T) {
	call := 0
	rt, conn := newRuntimeWithDispatcher(t, func(string, []any,
		map[string]any) (any, error) {
		call++
		if call < 3 {
			return &plugindomain.Page{
				Items:      []any{call},
				HasMore:    true,
				NextCursor: map[string]any{"page": call},
			}, nil
		}
		return &plugindomain.Page{
			Items:      []any{call},
			HasMore:    false,
			NextCursor: map[string]any{"page": call},
		}, nil
	})

	page, err := rt.ReadPages(conn, "list", nil, ReadPagesOptions{})
	if err != nil {
		t.Fatalf("ReadPages: %v", err)
	}
	if len(page.Items) != 3 {
		t.Errorf("items = %v", page.Items)
	}
	if page.HasMore {
		t.Error("has_more must be false")
	}
}

func TestReadPagesStalledCursor(t *testing.T) {
	rt, conn := newRuntimeWithDispatcher(t, func(string, []any,
		map[string]any) (any, error) {
		// 永远返回同一个 cursor 且 has_more=true。
		return &plugindomain.Page{
			Items:      []any{"x"},
			HasMore:    true,
			NextCursor: map[string]any{"page": 1},
		}, nil
	})

	_, err := rt.ReadPages(conn, "list", nil, ReadPagesOptions{})
	if errorCodeOf(err) != "plugin.cursor_stalled" {
		t.Errorf("code = %s, want plugin.cursor_stalled", errorCodeOf(err))
	}
}

func TestReadPagesEmptyCursorWithHasMore(t *testing.T) {
	rt, conn := newRuntimeWithDispatcher(t, func(string, []any,
		map[string]any) (any, error) {
		return &plugindomain.Page{HasMore: true, NextCursor: map[string]any{}}, nil
	})

	_, err := rt.ReadPages(conn, "list", nil, ReadPagesOptions{})
	if errorCodeOf(err) != "plugin.cursor_stalled" {
		t.Errorf("code = %s", errorCodeOf(err))
	}
}

func TestReadPagesExceedsLimit(t *testing.T) {
	call := 0
	rt, conn := newRuntimeWithDispatcher(t, func(string, []any,
		map[string]any) (any, error) {
		call++
		return &plugindomain.Page{
			HasMore:    true,
			NextCursor: map[string]any{"page": call},
		}, nil
	})

	_, err := rt.ReadPages(conn, "list", nil, ReadPagesOptions{MaxPages: 3})
	if errorCodeOf(err) != "plugin.page_limit" {
		t.Errorf("code = %s, want plugin.page_limit", errorCodeOf(err))
	}
}

func TestReadPagesInvalidResult(t *testing.T) {
	rt, conn := newRuntimeWithDispatcher(t, func(string, []any,
		map[string]any) (any, error) {
		return "not a page", nil
	})

	_, err := rt.ReadPages(conn, "list", nil, ReadPagesOptions{})
	if errorCodeOf(err) != "plugin.provider_contract" {
		t.Errorf("code = %s", errorCodeOf(err))
	}
}

func TestReadPagesCursorArgument(t *testing.T) {
	var lastArgs []any
	rt, conn := newRuntimeWithDispatcher(t, func(_ string, args []any,
		_ map[string]any) (any, error) {
		lastArgs = args
		return &plugindomain.Page{HasMore: false}, nil
	})

	if _, err := rt.ReadPages(conn, "list", []any{"q"}, ReadPagesOptions{
		CursorArgument: true,
		Cursor:         map[string]any{"page": 2},
	}); err != nil {
		t.Fatalf("ReadPages: %v", err)
	}
	if len(lastArgs) != 2 {
		t.Fatalf("args = %v, want 2 elements", lastArgs)
	}
	if lastArgs[0] != "q" {
		t.Errorf("args[0] = %v", lastArgs[0])
	}
	if anyMap(lastArgs[1])["page"] != 2 {
		t.Errorf("args[1] = %v", lastArgs[1])
	}
}

func TestReadPagesAccumulatesFailuresAndHealth(t *testing.T) {
	call := 0
	rt, conn := newRuntimeWithDispatcher(t, func(string, []any,
		map[string]any) (any, error) {
		call++
		if call == 1 {
			return &plugindomain.Page{
				Failures:      []plugindomain.ItemFailure{{ExternalID: "x", ErrorCode: "e"}},
				HealthMessage: "degraded upstream",
				HasMore:       true,
				NextCursor:    map[string]any{"page": 2},
			}, nil
		}
		return &plugindomain.Page{HasMore: false}, nil
	})

	page, err := rt.ReadPages(conn, "list", nil, ReadPagesOptions{})
	if err != nil {
		t.Fatalf("ReadPages: %v", err)
	}
	if len(page.Failures) != 1 {
		t.Errorf("failures = %v", page.Failures)
	}
	if page.HealthMessage != "degraded upstream" {
		t.Errorf("health_message = %q", page.HealthMessage)
	}
}

func TestConnectionPublicDictAndCredentials(t *testing.T) {
	rt, inst, _ := newRuntimeWithPlugin(t, "demo", nil)
	conn, err := getBuiltinConnection(rt.DB, inst.ID)
	if err != nil {
		t.Fatalf("getBuiltinConnection: %v", err)
	}

	pub, err := rt.ConnectionPublicDict(conn)
	if err != nil {
		t.Fatalf("ConnectionPublicDict: %v", err)
	}
	if pub["role"] != BuiltinConnectionRole {
		t.Errorf("role = %v", pub["role"])
	}

	has, err := rt.ConnectionHasCredentials(conn)
	if err != nil {
		t.Fatalf("ConnectionHasCredentials: %v", err)
	}
	if has {
		t.Error("builtin connection has no credentials")
	}
}

func TestConnectionHasCredentialsTrue(t *testing.T) {
	rt, inst, _ := newRuntimeWithPlugin(t, "demo", nil)
	if _, err := rt.DB.Exec(`UPDATE plugin_definitions SET auth_schema = ?
		WHERE plugin_key = 'talebook.demo'`,
		`{"properties":{"token":{"type":"string"}}}`); err != nil {
		t.Fatalf("update: %v", err)
	}
	conn, err := rt.SaveConnection(inst.ID, "user", 7, map[string]any{"token": "abc"},
		"个人", map[string]any{}, nil, "", DefaultConnectionRole)
	if err != nil {
		t.Fatalf("SaveConnection: %v", err)
	}
	has, err := rt.ConnectionHasCredentials(conn)
	if err != nil {
		t.Fatalf("ConnectionHasCredentials: %v", err)
	}
	if !has {
		t.Error("connection with credentials must report true")
	}
}

func TestFinishReadUpdatesHealth(t *testing.T) {
	rt, _, _ := newRuntimeWithPlugin(t, "demo", nil)
	conns, err := rt.ConnectionsFor("metadata.lookup", nil)
	if err != nil {
		t.Fatalf("ConnectionsFor: %v", err)
	}
	conn := conns[0]

	results := map[int64]any{
		conn.ID: errors.New("upstream failed"),
	}
	out, err := rt.FinishRead(nil, results)
	if err != nil {
		t.Fatalf("FinishRead: %v", err)
	}
	if _, ok := out[conn.ID].(error); !ok {
		t.Errorf("error must be preserved: %v", out[conn.ID])
	}

	var health string
	if err := rt.DB.QueryRow(`SELECT health FROM plugin_connections WHERE id=?`, conn.ID).
		Scan(&health); err != nil {
		t.Fatalf("query: %v", err)
	}
	if health != "degraded" {
		t.Errorf("health = %s, want degraded", health)
	}
}

func TestFinishReadSuccessSetsHealthy(t *testing.T) {
	rt, _, _ := newRuntimeWithPlugin(t, "demo", nil)
	conns, err := rt.ConnectionsFor("metadata.lookup", nil)
	if err != nil {
		t.Fatalf("ConnectionsFor: %v", err)
	}
	conn := conns[0]

	results := map[int64]any{conn.ID: map[string]any{"ok": true}}
	if _, err := rt.FinishRead(nil, results); err != nil {
		t.Fatalf("FinishRead: %v", err)
	}
	var health string
	if err := rt.DB.QueryRow(`SELECT health FROM plugin_connections WHERE id=?`, conn.ID).
		Scan(&health); err != nil {
		t.Fatalf("query: %v", err)
	}
	if health != "healthy" {
		t.Errorf("health = %s, want healthy", health)
	}
}

func TestFinishReadAuthSetsUnauthorized(t *testing.T) {
	rt, _, _ := newRuntimeWithPlugin(t, "demo", nil)
	conns, err := rt.ConnectionsFor("metadata.lookup", nil)
	if err != nil {
		t.Fatalf("ConnectionsFor: %v", err)
	}
	conn := conns[0]

	results := map[int64]any{conn.ID: newAuthError()}
	if _, err := rt.FinishRead(nil, results); err != nil {
		t.Fatalf("FinishRead: %v", err)
	}
	var health string
	if err := rt.DB.QueryRow(`SELECT health FROM plugin_connections WHERE id=?`, conn.ID).
		Scan(&health); err != nil {
		t.Fatalf("query: %v", err)
	}
	if health != "unauthorized" {
		t.Errorf("health = %s, want unauthorized", health)
	}
}

func TestRedactValueRecursive(t *testing.T) {
	secrets := map[string]any{"token": "s3cr3t"}
	got := redactValue(map[string]any{"msg": "leaked s3cr3t"}, secrets).(map[string]any)
	if got["msg"] != "leaked [REDACTED]" {
		t.Errorf("got %v", got)
	}
}
