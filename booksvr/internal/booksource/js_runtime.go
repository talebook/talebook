// Package booksource 复刻 webserver/services/booksource/ 的 Legado 书源规则引擎。
//
// 本文件实现受限的书源 JS 运行时（js_runtime.py）。
//
// 只用于字段后处理类规则（如 `result.replace(...)`）。不提供 java.ajax /
// 浏览器等外部副作用能力，避免书源 JS 越权访问服务端环境。
package booksource

import (
	"encoding/json"
	"fmt"
	"net/url"
	"strings"
	"time"

	"github.com/dop251/goja"
)

// JS 运行时的默认限制（复刻 js_runtime.py 顶部常量）。
const (
	// DefaultJSTimeLimit 复刻 DEFAULT_TIME_LIMIT（秒）。
	DefaultJSTimeLimit = 0.2
	// DefaultJSMemoryLimit 复刻 DEFAULT_MEMORY_LIMIT。
	//
	// 注意：goja 没有内存上限 API（QuickJS 的 set_memory_limit 无对应物），
	// 该常量仅作记录，实际靠超时中断兜底。
	DefaultJSMemoryLimit = 8 * 1024 * 1024
	// DefaultJSStackSize 复刻 DEFAULT_STACK_SIZE。
	DefaultJSStackSize = 512 * 1024
)

// jsHostPrelude 复刻 run_js 中注入的宿主环境脚本。
//
// 包含 __talebook_md5 的纯 JS 实现、java 门面与 book 对象。
const jsHostPrelude = `
var __talebook_vars = JSON.parse(__talebook_vars_json || "{}");
function __talebook_md5(value) {
    var text = unescape(encodeURIComponent(String(value)));
    var bytes = [];
    for (var bi = 0; bi < text.length; bi++) bytes.push(text.charCodeAt(bi));
    var bitLength = bytes.length * 8;
    bytes.push(128);
    while ((bytes.length % 64) !== 56) bytes.push(0);
    for (var li = 0; li < 8; li++) bytes.push(Math.floor(bitLength / Math.pow(256, li)) & 255);
    var shifts = [7,12,17,22,7,12,17,22,7,12,17,22,7,12,17,22,
                  5,9,14,20,5,9,14,20,5,9,14,20,5,9,14,20,
                  4,11,16,23,4,11,16,23,4,11,16,23,4,11,16,23,
                  6,10,15,21,6,10,15,21,6,10,15,21,6,10,15,21];
    var constants = [];
    for (var ci = 0; ci < 64; ci++) constants[ci] = (Math.floor(Math.abs(Math.sin(ci + 1)) * 4294967296) | 0);
    function add(x, y) { return (x + y) | 0; }
    function rotate(x, count) { return (x << count) | (x >>> (32 - count)); }
    var state = [1732584193, -271733879, -1732584194, 271733878];
    for (var offset = 0; offset < bytes.length; offset += 64) {
        var words = [];
        for (var wi = 0; wi < 16; wi++) {
            var pos = offset + wi * 4;
            words[wi] = bytes[pos] | (bytes[pos + 1] << 8) | (bytes[pos + 2] << 16) | (bytes[pos + 3] << 24);
        }
        var a = state[0], b = state[1], c = state[2], d = state[3];
        for (var i = 0; i < 64; i++) {
            var f, g;
            if (i < 16) { f = (b & c) | ((~b) & d); g = i; }
            else if (i < 32) { f = (d & b) | ((~d) & c); g = (5 * i + 1) % 16; }
            else if (i < 48) { f = b ^ c ^ d; g = (3 * i + 5) % 16; }
            else { f = c ^ (b | (~d)); g = (7 * i) % 16; }
            var previousD = d;
            d = c;
            c = b;
            b = add(b, rotate(add(add(a, f), add(constants[i], words[g])), shifts[i]));
            a = previousD;
        }
        state[0] = add(state[0], a);
        state[1] = add(state[1], b);
        state[2] = add(state[2], c);
        state[3] = add(state[3], d);
    }
    var hex = "";
    for (var si = 0; si < 4; si++) {
        for (var sj = 0; sj < 4; sj++) hex += ((state[si] >>> (sj * 8)) & 255).toString(16).padStart(2, "0");
    }
    return hex;
}
var java = Object.freeze({
    get: function(key) { return __talebook_vars[String(key)] || ""; },
    put: function(key, value) { __talebook_vars[String(key)] = value == null ? "" : String(value); return value; },
    getString: function() { throw new Error("java.getString is not supported"); },
    ajax: function() { throw new Error("java.ajax is not supported"); },
    post: function() { throw new Error("java.post is not supported"); },
    startBrowserAwait: function() { throw new Error("java.startBrowserAwait is not supported"); },
    longToast: function() { return ""; },
    log: function() { return ""; },
    t2s: function(value) { return value == null ? "" : String(value); },
    s2t: function(value) { return value == null ? "" : String(value); },
    encodeURI: function(value) { return encodeURIComponent(String(value)); },
    md5Encode: function(value) { return __talebook_md5(value); }
});
var book = Object.freeze({
    origin: __talebook_origin,
    name: "",
    author: ""
});
`

// JsRuleUnsupported 复刻 JsRuleUnsupported：规则中包含暂不支持的 JS。
type JsRuleUnsupported struct {
	BookSourceError
	Rule string
}

// NewJsRuleUnsupported 构造 JS 规则不支持错误。
func NewJsRuleUnsupported(rule string) *JsRuleUnsupported {
	return &JsRuleUnsupported{
		BookSourceError: BookSourceError{Message: "JS rule is not supported: " + rule},
		Rule:            rule,
	}
}

// RunJS 复刻 run_js：在受限沙箱中执行书源 JS 规则。
//
// 返回规则求值结果（字符串）；variables 会被就地更新（对应 Python 的
// `variables.update(...)`）。
func RunJS(code, result string, variables map[string]string, baseURL string, timeLimit float64) (string, error) {
	if variables == nil {
		variables = map[string]string{}
	}
	code = strings.TrimSpace(code)
	if code == "" {
		return result, nil
	}
	if timeLimit <= 0 {
		timeLimit = DefaultJSTimeLimit
	}

	vm := goja.New()
	vm.SetMaxCallStackSize(DefaultJSStackSize)

	// 复刻 ctx.set("__talebook_vars_json", ...) 等注入。
	varsJSON, err := json.Marshal(variables)
	if err != nil {
		return "", NewJsRuleUnsupported(truncateRule(code))
	}
	if err := vm.Set("__talebook_vars_json", string(varsJSON)); err != nil {
		return "", NewJsRuleUnsupported(truncateRule(code))
	}
	if err := vm.Set("result", result); err != nil {
		return "", NewJsRuleUnsupported(truncateRule(code))
	}
	if err := vm.Set("baseUrl", baseURL); err != nil {
		return "", NewJsRuleUnsupported(truncateRule(code))
	}
	key := variables["key"]
	page := variables["page"]
	for name, value := range map[string]string{
		"key": key, "page": page, "searchKey": key, "searchPage": page,
	} {
		if err := vm.Set(name, value); err != nil {
			return "", NewJsRuleUnsupported(truncateRule(code))
		}
	}

	// 复刻 origin 推导：scheme://netloc。
	origin := ""
	if parsed, err := url.Parse(baseURL); err == nil && parsed.Scheme != "" && parsed.Host != "" {
		origin = parsed.Scheme + "://" + parsed.Host
	}
	if err := vm.Set("__talebook_origin", origin); err != nil {
		return "", NewJsRuleUnsupported(truncateRule(code))
	}

	if _, err := vm.RunString(jsHostPrelude); err != nil {
		return "", NewJsRuleUnsupported(truncateRule(code))
	}

	// goja 无内置执行时限，用外部定时器 + Interrupt 复刻 set_time_limit。
	timer := time.AfterFunc(time.Duration(timeLimit*float64(time.Second)), func() {
		vm.Interrupt("js rule time limit exceeded")
	})
	defer timer.Stop()

	value, err := vm.RunString(code)
	if err != nil {
		return "", NewJsRuleUnsupported(fmt.Sprintf("%s (%s)", truncateRule(code), err))
	}

	// 复刻：value 为 None 时回落到 ctx.get("result")。
	if value == nil || goja.IsUndefined(value) || goja.IsNull(value) {
		if rv := vm.Get("result"); rv != nil {
			value = rv
		}
	}

	// 复刻 variables.update(json.loads(ctx.eval("JSON.stringify(__talebook_vars)")))。
	if updated, err := vm.RunString("JSON.stringify(__talebook_vars)"); err == nil {
		if s, ok := updated.Export().(string); ok {
			var merged map[string]any
			if json.Unmarshal([]byte(s), &merged) == nil {
				for k, v := range merged {
					variables[k] = jsToString(v)
				}
			}
		}
	}

	return stringifyJSValue(value), nil
}

// truncateRule 复刻 `code[:120]`。
func truncateRule(code string) string {
	r := []rune(code)
	if len(r) <= 120 {
		return code
	}
	return string(r[:120])
}

// stringifyJSValue 复刻 _stringify_js_value。
func stringifyJSValue(value goja.Value) string {
	if value == nil || goja.IsUndefined(value) || goja.IsNull(value) {
		return ""
	}
	exported := value.Export()
	switch t := exported.(type) {
	case bool:
		if t {
			return "true"
		}
		return "false"
	case string:
		return t
	case map[string]any, []any:
		// 复刻 quickjs.Object.json()。
		if encoded, err := json.Marshal(exported); err == nil {
			return string(encoded)
		}
		return fmt.Sprint(exported)
	}
	return fmt.Sprint(exported)
}

// jsToString 复刻 Python 侧 json 反序列化后的字符串化。
func jsToString(v any) string {
	switch t := v.(type) {
	case nil:
		return ""
	case string:
		return t
	case bool:
		if t {
			return "true"
		}
		return "false"
	case float64:
		if t == float64(int64(t)) {
			return fmt.Sprintf("%d", int64(t))
		}
		return fmt.Sprintf("%v", t)
	}
	return fmt.Sprint(v)
}
