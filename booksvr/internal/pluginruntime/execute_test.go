package pluginruntime

import (
	"errors"
	"testing"
	"time"

	"talebook/booksvr/internal/pluginproto"
	"talebook/booksvr/internal/userdb"
)

func TestRetryPolicyDefaults(t *testing.T) {
	p := retryPolicyOf(&userdb.PluginConnection{})
	if p.MaxRetries != 2 || p.BaseBackoff != 0.05 {
		t.Errorf("got %+v", p)
	}
}

func TestRetryPolicyClamping(t *testing.T) {
	cases := []struct {
		config   map[string]any
		wantMax  int
		wantBack float64
	}{
		{map[string]any{"max_retries": 0}, 0, 0.05},
		{map[string]any{"max_retries": 5}, 5, 0.05},
		{map[string]any{"max_retries": 99}, 5, 0.05},
		{map[string]any{"max_retries": -3}, 0, 0.05},
		{map[string]any{"backoff_seconds": 0}, 2, 0},
		{map[string]any{"backoff_seconds": 999}, 2, 60},
		{map[string]any{"backoff_seconds": -1}, 2, 0},
		{map[string]any{"max_retries": "3", "backoff_seconds": "1.5"}, 3, 1.5},
	}
	for _, c := range cases {
		p := retryPolicyOf(&userdb.PluginConnection{Config: c.config})
		if p.MaxRetries != c.wantMax || p.BaseBackoff != c.wantBack {
			t.Errorf("config %v → %+v, want max=%d back=%v", c.config, p, c.wantMax, c.wantBack)
		}
	}
}

func TestRetryDelayExponential(t *testing.T) {
	p := RetryPolicy{MaxRetries: 3, BaseBackoff: 1}
	// attempt 1 → 1*2^0 = 1；attempt 2 → 2；attempt 3 → 4。
	for attempt, want := range map[int]float64{1: 1, 2: 2, 3: 4} {
		if got := retryDelay(p, attempt, nil, 100); got != want {
			t.Errorf("attempt %d = %v, want %v", attempt, got, want)
		}
	}
}

func TestRetryDelayClampedByRemaining(t *testing.T) {
	p := RetryPolicy{MaxRetries: 3, BaseBackoff: 10}
	if got := retryDelay(p, 3, nil, 2); got != 2 {
		t.Errorf("got %v, want 2 (clamped by remaining)", got)
	}
}

func TestRetryDelayClampedTo60(t *testing.T) {
	p := RetryPolicy{MaxRetries: 5, BaseBackoff: 100}
	if got := retryDelay(p, 1, nil, 1000); got != 60 {
		t.Errorf("got %v, want 60", got)
	}
}

func TestRetryDelayUsesRetryAfter(t *testing.T) {
	p := RetryPolicy{MaxRetries: 3, BaseBackoff: 1}
	after := 7.5
	if got := retryDelay(p, 1, &after, 100); got != 7.5 {
		t.Errorf("got %v, want 7.5", got)
	}
}

func TestIsRetryable(t *testing.T) {
	if isRetryable(errors.New("plain")) {
		t.Error("plain error must not be retryable")
	}
	rate := pluginproto.NewUpstreamRateLimitError("slow", nil)
	if !isRetryable(rate) {
		t.Error("rate limit must be retryable")
	}
	auth := pluginproto.NewUpstreamAuthError("bad", "auth", nil)
	if isRetryable(auth) {
		t.Error("auth error must never be retryable")
	}
	upstream := pluginproto.NewUpstreamError("boom", "server", nil)
	if isRetryable(upstream) {
		t.Error("generic upstream error is not retryable by default")
	}
}

func TestInvokeWithRetrySucceedsFirstTry(t *testing.T) {
	rt := NewRuntime(nil, nil, nil)
	rt.Sleep = func(time.Duration) {}
	calls := 0
	got, err := rt.InvokeWithRetry(func() (any, error) {
		calls++
		return "ok", nil
	}, &userdb.PluginConnection{}, nil, "search", 5)
	if err != nil {
		t.Fatalf("got %v", err)
	}
	if got != "ok" || calls != 1 {
		t.Errorf("got %v after %d calls", got, calls)
	}
}

func TestInvokeWithRetryRetriesThenSucceeds(t *testing.T) {
	rt := NewRuntime(nil, nil, nil)
	rt.Sleep = func(time.Duration) {}
	calls := 0
	got, err := rt.InvokeWithRetry(func() (any, error) {
		calls++
		if calls < 3 {
			return nil, pluginproto.NewUpstreamRateLimitError("slow", nil)
		}
		return "ok", nil
	}, &userdb.PluginConnection{Config: map[string]any{"max_retries": 3}}, nil, "search", 5)
	if err != nil {
		t.Fatalf("got %v", err)
	}
	if got != "ok" || calls != 3 {
		t.Errorf("got %v after %d calls", got, calls)
	}
}

func TestInvokeWithRetryExhausts(t *testing.T) {
	rt := NewRuntime(nil, nil, nil)
	rt.Sleep = func(time.Duration) {}
	calls := 0
	_, err := rt.InvokeWithRetry(func() (any, error) {
		calls++
		return nil, pluginproto.NewUpstreamRateLimitError("slow", nil)
	}, &userdb.PluginConnection{Config: map[string]any{"max_retries": 2}}, nil, "search", 5)
	if err == nil {
		t.Fatal("expected error")
	}
	if calls != 3 {
		t.Errorf("calls = %d, want 3 (1 + 2 retries)", calls)
	}
}

func TestInvokeWithRetryAuthNotRetried(t *testing.T) {
	rt := NewRuntime(nil, nil, nil)
	rt.Sleep = func(time.Duration) {}
	calls := 0
	_, err := rt.InvokeWithRetry(func() (any, error) {
		calls++
		return nil, pluginproto.NewUpstreamAuthError("bad token", "auth", nil)
	}, &userdb.PluginConnection{Config: map[string]any{"max_retries": 5}}, nil, "search", 5)
	if err == nil {
		t.Fatal("expected error")
	}
	if calls != 1 {
		t.Errorf("calls = %d, want 1 (auth never retried)", calls)
	}
}

func TestInvokeWithRetryRedactsSecrets(t *testing.T) {
	rt := NewRuntime(nil, nil, nil)
	rt.Sleep = func(time.Duration) {}
	secrets := map[string]any{"token": "s3cr3t"}
	_, err := rt.InvokeWithRetry(func() (any, error) {
		return nil, errors.New("failed with s3cr3t")
	}, &userdb.PluginConnection{}, secrets, "search", 5)
	if err == nil {
		t.Fatal("expected error")
	}
	if err.Error() != "failed with [REDACTED]" {
		t.Errorf("message = %q", err.Error())
	}
}

func TestInvokeWithRetryTimeout(t *testing.T) {
	rt := NewRuntime(nil, nil, nil)
	rt.Sleep = func(time.Duration) {}
	_, err := rt.InvokeWithRetry(func() (any, error) {
		time.Sleep(2 * time.Second)
		return "late", nil
	}, &userdb.PluginConnection{}, nil, "search", 0.05)
	var runtimeErr *PluginRuntimeError
	if !errorsAs(err, &runtimeErr) || runtimeErr.Code != "plugin.timeout" {
		t.Fatalf("got %v", err)
	}
	if !runtimeErr.Retryable {
		t.Error("timeout must be retryable")
	}
}

func TestAuditSubjectPrefersRequestedBy(t *testing.T) {
	rt, _, _ := newRuntimeWithPlugin(t, "demo", nil)
	conn := &userdb.PluginConnection{OwnerType: "user", OwnerID: 5}
	by := int64(9)
	got, err := rt.AuditSubject(conn, &by)
	if err != nil {
		t.Fatalf("AuditSubject: %v", err)
	}
	if got != 9 {
		t.Errorf("got %d, want 9", got)
	}
}

func TestAuditSubjectFallsBackToOwner(t *testing.T) {
	rt, _, _ := newRuntimeWithPlugin(t, "demo", nil)
	conn := &userdb.PluginConnection{OwnerType: "user", OwnerID: 5}
	got, err := rt.AuditSubject(conn, nil)
	if err != nil {
		t.Fatalf("AuditSubject: %v", err)
	}
	if got != 5 {
		t.Errorf("got %d, want 5", got)
	}
}

func TestAuditSubjectFallsBackToInstaller(t *testing.T) {
	rt, inst, adminID := newRuntimeWithPlugin(t, "demo", nil)
	conn, err := getBuiltinConnection(rt.DB, inst.ID)
	if err != nil {
		t.Fatalf("getBuiltinConnection: %v", err)
	}
	got, err := rt.AuditSubject(conn, nil)
	if err != nil {
		t.Fatalf("AuditSubject: %v", err)
	}
	if got != adminID {
		t.Errorf("got %d, want %d", got, adminID)
	}
}

func TestAuditSubjectMissing(t *testing.T) {
	rt, inst, _ := newRuntimeWithPlugin(t, "demo", nil)
	if _, err := rt.DB.Exec(`UPDATE plugin_installations SET installed_by = 0 WHERE id = ?`, inst.ID); err != nil {
		t.Fatalf("update: %v", err)
	}
	conn, err := getBuiltinConnection(rt.DB, inst.ID)
	if err != nil {
		t.Fatalf("getBuiltinConnection: %v", err)
	}
	_, err = rt.AuditSubject(conn, nil)
	var runtimeErr *PluginRuntimeError
	if !errorsAs(err, &runtimeErr) || runtimeErr.Code != "plugin.audit_subject_missing" {
		t.Errorf("got %v", err)
	}
}

func TestBeginCapabilityRunReadSkipsLease(t *testing.T) {
	rt, _, _ := newRuntimeWithPlugin(t, "demo", nil)
	conns, err := rt.ConnectionsFor("metadata.lookup", nil)
	if err != nil {
		t.Fatalf("ConnectionsFor: %v", err)
	}
	run, token, err := rt.BeginCapabilityRun(conns[0], "read", 30, nil, nil)
	if err != nil {
		t.Fatalf("BeginCapabilityRun: %v", err)
	}
	if token != "" {
		t.Errorf("read must not take a lease, token = %q", token)
	}
	if run.Status != "running" {
		t.Errorf("status = %s", run.Status)
	}
	if run.Trigger != "capability" {
		t.Errorf("trigger = %s", run.Trigger)
	}
}

func TestBeginCapabilityRunWriteTakesLease(t *testing.T) {
	rt, _, _ := newRuntimeWithPlugin(t, "demo", nil)
	conns, err := rt.ConnectionsFor("metadata.lookup", nil)
	if err != nil {
		t.Fatalf("ConnectionsFor: %v", err)
	}
	_, token, err := rt.BeginCapabilityRun(conns[0], "write", 30, nil, nil)
	if err != nil {
		t.Fatalf("BeginCapabilityRun: %v", err)
	}
	if token == "" {
		t.Error("write must take a lease")
	}
	if len(token) != 32 {
		t.Errorf("token length = %d, want 32", len(token))
	}
}

func TestBeginCapabilityRunConcurrentRefused(t *testing.T) {
	rt, _, _ := newRuntimeWithPlugin(t, "demo", nil)
	conns, err := rt.ConnectionsFor("metadata.lookup", nil)
	if err != nil {
		t.Fatalf("ConnectionsFor: %v", err)
	}
	if _, _, err := rt.BeginCapabilityRun(conns[0], "write", 30, nil, nil); err != nil {
		t.Fatalf("first: %v", err)
	}
	// 第二次应被租约拒绝。
	_, _, err = rt.BeginCapabilityRun(conns[0], "write", 30, nil, nil)
	var runtimeErr *PluginRuntimeError
	if !errorsAs(err, &runtimeErr) || runtimeErr.Code != "plugin.concurrent_run" {
		t.Fatalf("got %v", err)
	}

	// 被拒绝的运行应留下 failed 审计记录。
	var count int
	if err := rt.DB.QueryRow(`SELECT COUNT(*) FROM plugin_runs
		WHERE status='failed' AND error_code='plugin.concurrent_run'`).Scan(&count); err != nil {
		t.Fatalf("count: %v", err)
	}
	if count != 1 {
		t.Errorf("refused run count = %d, want 1", count)
	}
}

func TestFinishCapabilityRunSuccess(t *testing.T) {
	rt, _, _ := newRuntimeWithPlugin(t, "demo", nil)
	conns, err := rt.ConnectionsFor("metadata.lookup", nil)
	if err != nil {
		t.Fatalf("ConnectionsFor: %v", err)
	}
	conn := conns[0]
	run, token, err := rt.BeginCapabilityRun(conn, "write", 30, nil, nil)
	if err != nil {
		t.Fatalf("BeginCapabilityRun: %v", err)
	}
	if err := rt.FinishCapabilityRun(run, conn, token, "write", map[string]any{"count": 7},
		nil, false, nil); err != nil {
		t.Fatalf("FinishCapabilityRun: %v", err)
	}

	var status, health string
	var counts string
	if err := rt.DB.QueryRow(`SELECT status, counts FROM plugin_runs WHERE id=?`, run.ID).
		Scan(&status, &counts); err != nil {
		t.Fatalf("query run: %v", err)
	}
	if status != "succeeded" {
		t.Errorf("status = %s", status)
	}
	if err := rt.DB.QueryRow(`SELECT health FROM plugin_connections WHERE id=?`, conn.ID).
		Scan(&health); err != nil {
		t.Fatalf("query conn: %v", err)
	}
	if health != "healthy" {
		t.Errorf("health = %s", health)
	}
}

func TestFinishCapabilityRunFailure(t *testing.T) {
	rt, _, _ := newRuntimeWithPlugin(t, "demo", nil)
	conns, err := rt.ConnectionsFor("metadata.lookup", nil)
	if err != nil {
		t.Fatalf("ConnectionsFor: %v", err)
	}
	conn := conns[0]
	run, token, err := rt.BeginCapabilityRun(conn, "write", 30, nil, nil)
	if err != nil {
		t.Fatalf("BeginCapabilityRun: %v", err)
	}
	failure := NewPluginRuntimeError("plugin.execution_failed", "boom", false)
	if err := rt.FinishCapabilityRun(run, conn, token, "write", nil, failure, false, nil); err != nil {
		t.Fatalf("FinishCapabilityRun: %v", err)
	}

	var status, health, errorCode string
	if err := rt.DB.QueryRow(`SELECT status, health FROM plugin_runs r
		JOIN plugin_connections c ON c.id = r.connection_id WHERE r.id=?`, run.ID).
		Scan(&status, &health); err != nil {
		t.Fatalf("query: %v", err)
	}
	if status != "failed" {
		t.Errorf("status = %s", status)
	}
	if health != "degraded" {
		t.Errorf("health = %s", health)
	}
	if err := rt.DB.QueryRow(`SELECT error_code FROM plugin_runs WHERE id=?`, run.ID).
		Scan(&errorCode); err != nil {
		t.Fatalf("query error_code: %v", err)
	}
	if errorCode != "plugin.execution_failed" {
		t.Errorf("error_code = %s", errorCode)
	}
}

func TestFinishCapabilityRunAuthSetsUnauthorized(t *testing.T) {
	rt, _, _ := newRuntimeWithPlugin(t, "demo", nil)
	conns, err := rt.ConnectionsFor("metadata.lookup", nil)
	if err != nil {
		t.Fatalf("ConnectionsFor: %v", err)
	}
	conn := conns[0]
	run, token, err := rt.BeginCapabilityRun(conn, "write", 30, nil, nil)
	if err != nil {
		t.Fatalf("BeginCapabilityRun: %v", err)
	}
	authErr := pluginproto.NewUpstreamAuthError("bad token", "auth", nil)
	if err := rt.FinishCapabilityRun(run, conn, token, "write", nil, authErr, false, nil); err != nil {
		t.Fatalf("FinishCapabilityRun: %v", err)
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

func TestFinishCapabilityRunTimeoutKeepsLease(t *testing.T) {
	rt, _, _ := newRuntimeWithPlugin(t, "demo", nil)
	conns, err := rt.ConnectionsFor("metadata.lookup", nil)
	if err != nil {
		t.Fatalf("ConnectionsFor: %v", err)
	}
	conn := conns[0]
	run, token, err := rt.BeginCapabilityRun(conn, "write", 30, nil, nil)
	if err != nil {
		t.Fatalf("BeginCapabilityRun: %v", err)
	}
	timeoutErr := NewPluginRuntimeError("plugin.timeout", "timed out", true)
	if err := rt.FinishCapabilityRun(run, conn, token, "write", nil, timeoutErr, false, nil); err != nil {
		t.Fatalf("FinishCapabilityRun: %v", err)
	}
	// 超时必须保留租约，让宽限期保护已发生的副作用。
	var leaseToken string
	if err := rt.DB.QueryRow(`SELECT COALESCE(lease_token,'') FROM plugin_connections WHERE id=?`, conn.ID).
		Scan(&leaseToken); err != nil {
		t.Fatalf("query: %v", err)
	}
	if leaseToken != token {
		t.Errorf("lease_token = %q, want %q (timeout must keep lease)", leaseToken, token)
	}
}

func TestFinishCapabilityRunRolledBack(t *testing.T) {
	rt, _, _ := newRuntimeWithPlugin(t, "demo", nil)
	conns, err := rt.ConnectionsFor("metadata.lookup", nil)
	if err != nil {
		t.Fatalf("ConnectionsFor: %v", err)
	}
	conn := conns[0]
	run, token, err := rt.BeginCapabilityRun(conn, "write", 30, nil, nil)
	if err != nil {
		t.Fatalf("BeginCapabilityRun: %v", err)
	}
	failure := NewPluginRuntimeError("plugin.execution_failed", "boom", false)
	if err := rt.FinishCapabilityRun(run, conn, token, "write", nil, failure, true, nil); err != nil {
		t.Fatalf("FinishCapabilityRun: %v", err)
	}
	var status string
	if err := rt.DB.QueryRow(`SELECT status FROM plugin_runs WHERE id=?`, run.ID).Scan(&status); err != nil {
		t.Fatalf("query: %v", err)
	}
	if status != "rolled_back" {
		t.Errorf("status = %s, want rolled_back", status)
	}
}

func TestFinishCapabilityRunRedactsErrorMessage(t *testing.T) {
	rt, _, _ := newRuntimeWithPlugin(t, "demo", nil)
	conns, err := rt.ConnectionsFor("metadata.lookup", nil)
	if err != nil {
		t.Fatalf("ConnectionsFor: %v", err)
	}
	conn := conns[0]
	run, token, err := rt.BeginCapabilityRun(conn, "write", 30, nil, nil)
	if err != nil {
		t.Fatalf("BeginCapabilityRun: %v", err)
	}
	failure := NewPluginRuntimeError("plugin.execution_failed", "leaked s3cr3t here", false)
	secrets := map[string]any{"token": "s3cr3t"}
	if err := rt.FinishCapabilityRun(run, conn, token, "write", nil, failure, false, secrets); err != nil {
		t.Fatalf("FinishCapabilityRun: %v", err)
	}
	var message string
	if err := rt.DB.QueryRow(`SELECT error_message FROM plugin_runs WHERE id=?`, run.ID).
		Scan(&message); err != nil {
		t.Fatalf("query: %v", err)
	}
	if message != "leaked [REDACTED] here" {
		t.Errorf("message = %q", message)
	}
}

func TestErrorCodeOf(t *testing.T) {
	if got := errorCodeOf(nil); got != "" {
		t.Errorf("nil = %q", got)
	}
	if got := errorCodeOf(NewPluginRuntimeError("plugin.x", "m", false)); got != "plugin.x" {
		t.Errorf("runtime error = %q", got)
	}
	if got := errorCodeOf(pluginproto.NewUpstreamAuthError("m", "auth", nil)); got != "provider_unauthorized" {
		t.Errorf("upstream = %q", got)
	}
	if got := errorCodeOf(errors.New("plain")); got != "plugin.execution_failed" {
		t.Errorf("plain = %q", got)
	}
}

func TestNewLeaseTokenFormat(t *testing.T) {
	tok := newLeaseToken()
	if len(tok) != 32 {
		t.Errorf("length = %d, want 32", len(tok))
	}
	if tok == newLeaseToken() {
		t.Error("tokens must differ")
	}
}

func TestCopyCountsAndMapAny(t *testing.T) {
	counts := copyCounts(DefaultCounts)
	counts["fetched"] = 99
	if DefaultCounts["fetched"] != 0 {
		t.Error("copyCounts must not alias the source")
	}
	src := map[string]any{"a": 1}
	cp := copyMapAny(src)
	cp["a"] = 2
	if src["a"] != 1 {
		t.Error("copyMapAny must not alias the source")
	}
}
