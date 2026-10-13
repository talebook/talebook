package httpapi

import (
	"os"
	"path/filepath"
	"testing"
)

// TestAudioVoicesReturnsList 覆盖语音列表。
func TestAudioVoicesReturnsList(t *testing.T) {
	w, _ := newAudioWriteFixture(t)
	voices := w.audioVoices()
	if len(voices) == 0 {
		t.Fatal("语音列表为空")
	}
	for _, v := range voices {
		if v["id"] == nil || v["engine"] == nil {
			t.Errorf("语音项缺少字段: %v", v)
		}
	}
}

// TestAudioVoicePreviewMissing 覆盖试听文件缺失。
func TestAudioVoicePreviewMissing(t *testing.T) {
	w, _ := newAudioWriteFixture(t)
	if _, _, err := w.audioVoicePreview("edgetts", "nope"); err == nil {
		t.Error("缺失文件应返回错误")
	}
}

// TestAudioVoicePreviewRejectsTraversal 覆盖试听路径穿越防护。
func TestAudioVoicePreviewRejectsTraversal(t *testing.T) {
	w, _ := newAudioWriteFixture(t)
	if _, _, err := w.audioVoicePreview("edgetts", "../../etc/passwd"); err == nil {
		t.Error("路径穿越应被拒绝")
	}
}

// TestAudioVoicePreviewReadsFile 覆盖试听文件读取。
func TestAudioVoicePreviewReadsFile(t *testing.T) {
	w, _ := newAudioWriteFixture(t)
	dir := filepath.Join(w.root, "voices", "edgetts")
	if err := os.MkdirAll(dir, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(dir, "v1.mp3"), []byte("ID3fake"), 0o644); err != nil {
		t.Fatal(err)
	}

	body, ct, err := w.audioVoicePreview("edgetts", "v1")
	if err != nil {
		t.Fatalf("读取失败: %v", err)
	}
	if string(body) != "ID3fake" {
		t.Errorf("body = %q", string(body))
	}
	if ct != "audio/mpeg" {
		t.Errorf("contentType = %q，期望 audio/mpeg", ct)
	}
}

// TestAudioVoicePreviewEmptyArgs 覆盖空参数。
func TestAudioVoicePreviewEmptyArgs(t *testing.T) {
	w, _ := newAudioWriteFixture(t)
	if _, _, err := w.audioVoicePreview("", ""); err == nil {
		t.Error("空参数应返回错误")
	}
}

// TestAudioTimelineMissingChapter 覆盖章节不存在。
func TestAudioTimelineMissingChapter(t *testing.T) {
	w, _ := newAudioWriteFixture(t)
	out, err := w.audioTimeline(adminCtx(1), 999, 1)
	if err != nil {
		t.Fatalf("意外错误: %v", err)
	}
	if out["err"] != "ok" {
		t.Fatalf("err = %v，期望 ok", out["err"])
	}
	if tl, ok := out["timeline"].([]any); !ok || len(tl) != 0 {
		t.Errorf("timeline = %v，期望空列表", out["timeline"])
	}
}

// TestAudioAuditRequiresAdmin 覆盖审计权限。
func TestAudioAuditRequiresAdmin(t *testing.T) {
	w, _ := newAudioWriteFixture(t)
	ctx := &Context{Identity: Identity{UserID: 2, IsAdmin: false}}
	out, err := w.audioAudit(ctx, "GET", nil)
	if err != nil {
		t.Fatalf("意外错误: %v", err)
	}
	if out["err"] != "permission" {
		t.Errorf("err = %v，期望 permission", out["err"])
	}
}

// TestAudioAuditListLogs 覆盖审计日志列表。
func TestAudioAuditListLogs(t *testing.T) {
	w, _ := newAudioWriteFixture(t)
	out, err := w.audioAudit(adminCtx(1), "GET", nil)
	if err != nil {
		t.Fatalf("查询失败: %v", err)
	}
	if out["err"] != "ok" {
		t.Fatalf("err = %v，期望 ok", out["err"])
	}
	if _, ok := out["logs"].([]map[string]any); !ok {
		t.Errorf("logs 类型错误: %T", out["logs"])
	}
}

// TestAudioAuditPatchRequiresReaderID 覆盖 PATCH 缺少读者标识。
func TestAudioAuditPatchRequiresReaderID(t *testing.T) {
	w, _ := newAudioWriteFixture(t)
	out, err := w.audioAudit(adminCtx(1), "PATCH", map[string]any{})
	if err != nil {
		t.Fatalf("意外错误: %v", err)
	}
	if out["err"] != "params.invalid" {
		t.Errorf("err = %v，期望 params.invalid", out["err"])
	}
}

// TestAudioAuditUnknownMethod 覆盖未知方法。
func TestAudioAuditUnknownMethod(t *testing.T) {
	w, _ := newAudioWriteFixture(t)
	out, err := w.audioAudit(adminCtx(1), "DELETE", nil)
	if err != nil {
		t.Fatalf("意外错误: %v", err)
	}
	if out["err"] != "params.invalid" {
		t.Errorf("err = %v，期望 params.invalid", out["err"])
	}
}
