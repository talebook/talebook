package userdb

import (
	"testing"
)

// seedRow 往权威 schema 库里插一行，供读取路径测试使用。
func seedRow(t *testing.T, db interface {
	Exec(string, ...any) (interface{ LastInsertId() (int64, error) }, error)
}, _ string) {
	t.Helper()
}

// TestReadingStateHelpers 覆盖 ReadingState 的取值辅助方法。
func TestReadingStateHelpers(t *testing.T) {
	s := &ReadingState{Favorite: 1, Wants: 1, ReadState: ReadStateFinished}
	if !s.IsFavorite() {
		t.Error("favorite=1 应报告已收藏")
	}
	if !s.IsWants() {
		t.Error("wants=1 应报告在书架")
	}
	if s.GetReadState() != ReadStateFinished {
		t.Errorf("GetReadState = %d, want %d", s.GetReadState(), ReadStateFinished)
	}
	if got := s.GetProgress(); got == nil || len(got) != 0 {
		t.Errorf("nil Progress 应返回空 map，得到 %v", got)
	}

	s2 := &ReadingState{Progress: map[string]any{"cfi": "x"}}
	if got := s2.GetProgress(); got["cfi"] != "x" {
		t.Errorf("GetProgress 应返回原 map，得到 %v", got)
	}

	var nilState *ReadingState
	if nilState.IsFavorite() || nilState.IsWants() {
		t.Error("nil ReadingState 应返回 false")
	}
	if nilState.GetReadState() != ReadStateUnread {
		t.Error("nil ReadingState 的 GetReadState 应为未读")
	}
	if got := nilState.GetProgress(); got == nil || len(got) != 0 {
		t.Errorf("nil ReadingState 的 GetProgress 应为空 map，得到 %v", got)
	}
}

// TestOnlineBookMetaToDict 覆盖 OnlineBookMeta.ToDict 的默认值补齐。
func TestOnlineBookMetaToDict(t *testing.T) {
	m := &OnlineBookMeta{BookID: 7, SourceURL: "u", LastChapter: "c1"}
	got := m.ToDict()
	if got["book_id"] != int64(7) {
		t.Errorf("book_id = %v", got["book_id"])
	}
	if got["serialize_status"] != SerializeStatusUnknown {
		t.Errorf("空 serialize_status 应补为 unknown，得到 %v", got["serialize_status"])
	}
	if got["status_manual"] != false {
		t.Errorf("status_manual = %v", got["status_manual"])
	}

	m.SerializeStatus = SerializeStatusSerial
	if got := m.ToDict(); got["serialize_status"] != SerializeStatusSerial {
		t.Errorf("serialize_status = %v", got["serialize_status"])
	}

	var nilMeta *OnlineBookMeta
	if got := nilMeta.ToDict(); len(got) != 0 {
		t.Errorf("nil OnlineBookMeta 的 ToDict 应为空 map，得到 %v", got)
	}
}

// TestDeviceToDict 覆盖 Device.ToDict 的字段改名。
func TestDeviceToDict(t *testing.T) {
	d := &Device{Name: "n", DeviceType: "duokan", IP: "1.2.3.4", Port: 12121, Schema: "http", Mailbox: "m"}
	got := d.ToDict()
	if got["type"] != "duokan" {
		t.Errorf("type = %v", got["type"])
	}
	if got["name"] != "n" || got["ip"] != "1.2.3.4" || got["port"] != int64(12121) {
		t.Errorf("ToDict = %v", got)
	}
	var nilDev *Device
	if got := nilDev.ToDict(); len(got) != 0 {
		t.Errorf("nil Device 的 ToDict 应为空 map，得到 %v", got)
	}
}

// TestInstalledThemeToDict 覆盖 InstalledTheme.ToDict 的 components 提取。
func TestInstalledThemeToDict(t *testing.T) {
	th := &InstalledTheme{ID: 1, Name: "t", Data: map[string]any{"components": map[string]any{"a": 1}}}
	got := th.ToDict()
	comps, ok := got["components"].(map[string]any)
	if !ok || comps["a"] != 1 {
		t.Errorf("components = %v", got["components"])
	}

	th2 := &InstalledTheme{ID: 2, Name: "t2", Data: map[string]any{}}
	if got := th2.ToDict(); len(got["components"].(map[string]any)) != 0 {
		t.Errorf("无 components 时应为空 map，得到 %v", got["components"])
	}

	var nilTheme *InstalledTheme
	if got := nilTheme.ToDict(); len(got) != 0 {
		t.Errorf("nil InstalledTheme 的 ToDict 应为空 map，得到 %v", got)
	}
}

// TestJSONHelpers 覆盖 jsonMap/jsonList 的容错降级。
func TestJSONHelpers(t *testing.T) {
	if got := jsonMap(""); len(got) != 0 {
		t.Errorf("空串应返回空 map，得到 %v", got)
	}
	if got := jsonMap("{bad json"); len(got) != 0 {
		t.Errorf("非法 JSON 应降级为空 map，得到 %v", got)
	}
	if got := jsonMap(`{"a":1}`); got["a"] != float64(1) {
		t.Errorf("合法 JSON 应解析，得到 %v", got)
	}
	if got := jsonMap("null"); got == nil {
		t.Error("null 应降级为空 map 而非 nil")
	}

	if got := jsonList(""); len(got) != 0 {
		t.Errorf("空串应返回空切片，得到 %v", got)
	}
	if got := jsonList("[bad"); len(got) != 0 {
		t.Errorf("非法 JSON 应降级为空切片，得到 %v", got)
	}
	if got := jsonList(`[1,2]`); len(got) != 2 {
		t.Errorf("合法 JSON 应解析，得到 %v", got)
	}
	if got := jsonList("null"); got == nil {
		t.Error("null 应降级为空切片而非 nil")
	}
}

// TestTrimSpaceAndNowString 覆盖两个小工具函数。
func TestTrimSpaceAndNowString(t *testing.T) {
	if got := trimSpace("  a b  "); got != "a b" {
		t.Errorf("trimSpace = %q", got)
	}
	if got := nowString(); len(got) != 19 {
		t.Errorf("nowString 应为 19 字符的时间串，得到 %q", got)
	}
}

// TestBookSourceApplyRaw 覆盖 ApplyRaw 的字段同步与数值降级。
func TestBookSourceApplyRaw(t *testing.T) {
	b := &BookSourceModel{Name: "old", URL: "old-url"}
	b.ApplyRaw(map[string]any{
		"bookSourceName":    "  新书源  ",
		"bookSourceUrl":     " https://x ",
		"bookSourceGroup":   "g",
		"bookSourceType":    float64(3),
		"weight":            float64(5),
		"bookSourceComment": "c",
	})
	if b.Name != "新书源" {
		t.Errorf("Name = %q", b.Name)
	}
	if b.URL != "https://x" {
		t.Errorf("URL = %q", b.URL)
	}
	if b.Group != "g" || b.SourceType != 3 || b.Weight != 5 || b.Comment != "c" {
		t.Errorf("ApplyRaw 结果 = %+v", b)
	}
	if b.UpdateTime == "" {
		t.Error("ApplyRaw 应刷新 update_time")
	}

	// 数值解析失败降级为 0；空字符串字段不覆盖已有值。
	b2 := &BookSourceModel{Name: "keep", URL: "keep-url"}
	b2.ApplyRaw(map[string]any{
		"bookSourceName": "",
		"bookSourceUrl":  "",
		"bookSourceType": "not-a-number",
		"weight":         nil,
	})
	if b2.Name != "keep" || b2.URL != "keep-url" {
		t.Errorf("空字段不应覆盖已有值: %+v", b2)
	}
	if b2.SourceType != 0 || b2.Weight != 0 {
		t.Errorf("非法数值应降级为 0: %+v", b2)
	}

	// 超长 comment 截断到 500。
	long := make([]byte, 600)
	for i := range long {
		long[i] = 'x'
	}
	b3 := &BookSourceModel{}
	b3.ApplyRaw(map[string]any{"bookSourceComment": string(long)})
	if len(b3.Comment) != 500 {
		t.Errorf("comment 应截断到 500，得到 %d", len(b3.Comment))
	}

	var nilBS *BookSourceModel
	nilBS.ApplyRaw(map[string]any{"bookSourceName": "x"}) // 不应 panic
}

// TestStrFieldIntField 覆盖两个取值辅助的边界。
func TestStrFieldIntField(t *testing.T) {
	raw := map[string]any{"s": "v", "n": float64(2), "i": int64(3), "int": 4, "str": "5", "bad": "x"}
	if got := strField(raw, "s"); got != "v" {
		t.Errorf("strField = %q", got)
	}
	if got := strField(raw, "missing"); got != "" {
		t.Errorf("缺失键应返回空串，得到 %q", got)
	}
	if got := strField(raw, "n"); got != "" {
		t.Errorf("非字符串应返回空串，得到 %q", got)
	}
	if got := strField(map[string]any{"k": nil}, "k"); got != "" {
		t.Errorf("nil 应返回空串，得到 %q", got)
	}

	if got := intField(raw, "n"); got != 2 {
		t.Errorf("float64 = %d", got)
	}
	if got := intField(raw, "i"); got != 3 {
		t.Errorf("int64 = %d", got)
	}
	if got := intField(raw, "int"); got != 4 {
		t.Errorf("int = %d", got)
	}
	if got := intField(raw, "str"); got != 5 {
		t.Errorf("字符串数字 = %d", got)
	}
	if got := intField(raw, "bad"); got != 0 {
		t.Errorf("非法字符串应返回 0，得到 %d", got)
	}
	if got := intField(raw, "missing"); got != 0 {
		t.Errorf("缺失键应返回 0，得到 %d", got)
	}
	if got := intField(map[string]any{"k": nil}, "k"); got != 0 {
		t.Errorf("nil 应返回 0，得到 %d", got)
	}
	if got := intField(map[string]any{"k": true}, "k"); got != 0 {
		t.Errorf("不支持类型应返回 0，得到 %d", got)
	}
}

// TestPluginSecretToPublic 覆盖密文不外泄的序列化。
func TestPluginSecretToPublic(t *testing.T) {
	s := &PluginSecret{Ciphertext: "enc", Kind: "credentials", MaskHint: "ab12", Version: 2, LastRotatedAt: "t"}
	got := s.ToPublic()
	if got["configured"] != true {
		t.Errorf("configured = %v", got["configured"])
	}
	if got["mask"] != "••••ab12" {
		t.Errorf("mask = %v", got["mask"])
	}
	if _, leaked := got["ciphertext"]; leaked {
		t.Error("ToPublic 不得返回密文")
	}

	empty := &PluginSecret{}
	if got := empty.ToPublic(); got["configured"] != false {
		t.Errorf("空密文 configured 应为 false，得到 %v", got["configured"])
	}

	var nilSecret *PluginSecret
	got = nilSecret.ToPublic()
	if got["configured"] != false || got["mask"] != "" {
		t.Errorf("nil PluginSecret 应返回未配置，得到 %v", got)
	}
}

// TestPluginRunToPublic 覆盖 input_data 不外泄的序列化。
func TestPluginRunToPublic(t *testing.T) {
	r := &PluginRun{
		ID: 1, ConnectionID: 2, Action: "sync", Trigger: "manual", Status: "done",
		RequestedBy: 3, Counts: map[string]any{"n": 1}, InputData: map[string]any{"secret": "x"},
		ErrorCode: "e", ErrorMessage: "m", Attempt: 1, DurationMS: 5,
		CreateTime: "c", StartedAt: "s", FinishedAt: "f",
	}
	got := r.ToPublic()
	if _, leaked := got["input_data"]; leaked {
		t.Error("ToPublic 不得返回 input_data")
	}
	if got["action"] != "sync" || got["created_at"] != "c" {
		t.Errorf("ToPublic = %v", got)
	}

	var nilRun *PluginRun
	if got := nilRun.ToPublic(); len(got) != 0 {
		t.Errorf("nil PluginRun 的 ToPublic 应为空 map，得到 %v", got)
	}
}

// TestPluginRunItemToPublic 覆盖 include_data 开关。
func TestPluginRunItemToPublic(t *testing.T) {
	i := &PluginRunItem{ID: 1, RunID: 2, ExternalID: "e", EntityType: "book", Status: "ok",
		Data: map[string]any{"k": "v"}}
	if _, ok := i.ToPublic(false)["data"]; ok {
		t.Error("include_data=false 时不应含 data")
	}
	if got := i.ToPublic(true)["data"]; got == nil {
		t.Error("include_data=true 时应含 data")
	}

	var nilItem *PluginRunItem
	if got := nilItem.ToPublic(true); len(got) != 0 {
		t.Errorf("nil PluginRunItem 的 ToPublic 应为空 map，得到 %v", got)
	}
}

// TestPluginDefinitionToPublic 覆盖 manifest 派生字段。
func TestPluginDefinitionToPublic(t *testing.T) {
	d := &PluginDefinition{
		ID: 1, PluginKey: "k", Version: "1", Name: "n",
		Categories: []any{"c"}, Capabilities: []any{}, Actions: []any{}, Permissions: []any{},
		AuthSchema: map[string]any{}, ConfigSchema: map[string]any{},
		DataPolicy: map[string]any{}, Compatibility: map[string]any{},
		Manifest: map[string]any{
			"description":       "desc",
			"ui":                map[string]any{"tab": "t"},
			"connection_owners": []any{"instance"},
		},
	}
	got := d.ToPublic()
	if got["description"] != "desc" {
		t.Errorf("description = %v", got["description"])
	}
	if got["ui"].(map[string]any)["tab"] != "t" {
		t.Errorf("ui = %v", got["ui"])
	}
	if len(got["connection_owners"].([]any)) != 1 {
		t.Errorf("connection_owners = %v", got["connection_owners"])
	}

	// manifest 缺字段时降级为空值。
	d2 := &PluginDefinition{Manifest: map[string]any{}}
	got2 := d2.ToPublic()
	if got2["description"] != "" {
		t.Errorf("缺 description 应为空串，得到 %v", got2["description"])
	}
	if len(got2["ui"].(map[string]any)) != 0 {
		t.Errorf("缺 ui 应为空 map，得到 %v", got2["ui"])
	}
	if len(got2["connection_owners"].([]any)) != 0 {
		t.Errorf("缺 connection_owners 应为空切片，得到 %v", got2["connection_owners"])
	}

	var nilDef *PluginDefinition
	if got := nilDef.ToPublic(); len(got) != 0 {
		t.Errorf("nil PluginDefinition 的 ToPublic 应为空 map，得到 %v", got)
	}
}

// TestPluginInstallationToPublic 覆盖 definition 可选挂载。
func TestPluginInstallationToPublic(t *testing.T) {
	i := &PluginInstallation{ID: 1, PluginKey: "k", Version: "1", Enabled: true,
		Scope: "instance", Config: map[string]any{}, InstalledFrom: "builtin", Status: "active"}
	if _, ok := i.ToPublic(nil)["definition"]; ok {
		t.Error("definition 为 nil 时不应含 definition 字段")
	}
	def := &PluginDefinition{PluginKey: "k", Manifest: map[string]any{}}
	if _, ok := i.ToPublic(def)["definition"]; !ok {
		t.Error("definition 非 nil 时应含 definition 字段")
	}

	var nilInst *PluginInstallation
	if got := nilInst.ToPublic(nil); len(got) != 0 {
		t.Errorf("nil PluginInstallation 的 ToPublic 应为空 map，得到 %v", got)
	}
}

// TestPluginConnectionToPublic 覆盖 role 默认值与 secret 挂载。
func TestPluginConnectionToPublic(t *testing.T) {
	c := &PluginConnection{ID: 1, InstallationID: 2, OwnerType: "instance", OwnerID: 0,
		Role: "", Name: "n", Config: map[string]any{}, Scopes: []any{}, Cursor: map[string]any{},
		Health: "unknown", Enabled: true}
	got := c.ToPublic(nil)
	if got["role"] != "default" {
		t.Errorf("空 role 应补为 default，得到 %v", got["role"])
	}
	if got["secret"].(map[string]any)["configured"] != false {
		t.Errorf("无 secret 时应报告未配置，得到 %v", got["secret"])
	}

	secret := &PluginSecret{Ciphertext: "enc", MaskHint: "x"}
	if got := c.ToPublic(secret); got["secret"].(map[string]any)["configured"] != true {
		t.Errorf("有 secret 时应报告已配置，得到 %v", got["secret"])
	}

	var nilConn *PluginConnection
	if got := nilConn.ToPublic(nil); len(got) != 0 {
		t.Errorf("nil PluginConnection 的 ToPublic 应为空 map，得到 %v", got)
	}
}

// TestAnnotationToAPI 覆盖批注 API 序列化。
func TestAnnotationToAPI(t *testing.T) {
	a := &Annotation{ID: 1, BookID: 2, AnnotationType: "highlight", IsPrivate: true,
		Chapter: "c", QuoteText: "q", Content: "t", Color: "yellow", AuthorName: "au",
		CreateTime: "ct", UpdateTime: "ut"}
	src := &AnnotationSource{ID: 9, AnnotationID: 1, SourceName: "s", SourceSyncStatus: "synced"}
	got := a.ToAPI([]*AnnotationSource{src})
	if got["id"] != int64(1) || got["created_at"] != "ct" {
		t.Errorf("ToAPI = %v", got)
	}
	items := got["sources"].([]map[string]any)
	if len(items) != 1 || items[0]["source_name"] != "s" {
		t.Errorf("sources = %v", got["sources"])
	}
	if _, leaked := items[0]["create_time"]; leaked {
		t.Error("AnnotationSource.ToAPI 不应含 create_time")
	}

	var nilAnn *Annotation
	if got := nilAnn.ToAPI(nil); len(got) != 0 {
		t.Errorf("nil Annotation 的 ToAPI 应为空 map，得到 %v", got)
	}
	var nilSrc *AnnotationSource
	if got := nilSrc.ToAPI(); len(got) != 0 {
		t.Errorf("nil AnnotationSource 的 ToAPI 应为空 map，得到 %v", got)
	}
}
