package userdb

import "testing"

// TestDecodeJSONMap 覆盖 decodeJSONMap 的全部输入形态。
func TestDecodeJSONMap(t *testing.T) {
	cases := []struct {
		name  string
		value any
		want  int
	}{
		{"nil", nil, 0},
		{"已是 map", map[string]any{"a": 1}, 1},
		{"字节切片", []byte(`{"a":1,"b":2}`), 2},
		{"字符串", `{"a":1,"b":2,"c":3}`, 3},
		{"空字符串", "", 0},
		{"仅空白", "   ", 0},
		{"非法 JSON", "{not json", 0},
		{"非法字节切片", []byte("{not json"), 0},
		{"JSON 数组", `[1,2,3]`, 0},
		{"不支持的类型", 42, 0},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got := decodeJSONMap(c.value)
			if got == nil {
				t.Fatalf("不应返回 nil")
			}
			if len(got) != c.want {
				t.Fatalf("len = %d, want %d (%+v)", len(got), c.want, got)
			}
		})
	}
}

// TestAudiobookEditionConfigMap 覆盖版本 config 访问器。
func TestAudiobookEditionConfigMap(t *testing.T) {
	e := &AudiobookEdition{Config: map[string]any{"revision_number": 2}}
	if got := e.ConfigMap(); got["revision_number"] != 2 {
		t.Fatalf("ConfigMap = %+v", got)
	}
	empty := &AudiobookEdition{}
	if got := empty.ConfigMap(); len(got) != 0 {
		t.Fatalf("空 config 应返回空 map: %+v", got)
	}
}

// TestAudiobookJobMaps 覆盖任务的 config / data 访问器。
func TestAudiobookJobMaps(t *testing.T) {
	j := &AudiobookJob{
		Config: map[string]any{"mode": "full"},
		Data:   map[string]any{"plan": map[string]any{"x": 1}},
	}
	if got := j.ConfigMap(); got["mode"] != "full" {
		t.Fatalf("ConfigMap = %+v", got)
	}
	if got := j.DataMap(); got["plan"] == nil {
		t.Fatalf("DataMap = %+v", got)
	}
	empty := &AudiobookJob{}
	if len(empty.ConfigMap()) != 0 || len(empty.DataMap()) != 0 {
		t.Fatalf("空值应返回空 map")
	}
}
