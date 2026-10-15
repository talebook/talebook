package httpapi

import (
	"database/sql"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"

	"talebook/booksvr/internal/captcha"
)

type settingsFileStamp struct {
	Modified int64
	Size     int64
}

func settingsStamp(path string) [2]settingsFileStamp {
	var result [2]settingsFileStamp
	for i, name := range []string{path, filepath.Join(filepath.Dir(path), "manual.py")} {
		if info, err := os.Stat(name); err == nil {
			result[i] = settingsFileStamp{info.ModTime().UnixNano(), info.Size()}
		}
	}
	return result
}

// settingsHandler swaps immutable route snapshots, retaining the database and
// service instances. No request mutates a map captured by another request.
type settingsHandler struct {
	mu         sync.Mutex
	opts       ServeOptions
	db, userDB *sql.DB
	stamp      [2]settingsFileStamp
	handler    http.Handler
}

func newSettingsHandler(opts ServeOptions, db, userDB *sql.DB) (http.Handler, error) {
	h := &settingsHandler{opts: opts, db: db, userDB: userDB}
	h.stamp = settingsStamp(opts.SettingsPath)
	var err error
	h.handler, err = newServeDispatcher(effectiveServeOptions(opts), db, userDB)
	if err != nil {
		return nil, err
	}
	return h, nil
}

func (h *settingsHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	h.mu.Lock()
	if h.opts.SettingsPath != "" {
		stamp := settingsStamp(h.opts.SettingsPath)
		if stamp != h.stamp {
			next, err := newServeDispatcher(effectiveServeOptions(h.opts), h.db, h.userDB)
			if err != nil {
				h.mu.Unlock()
				http.Error(w, "无法重新加载站点配置", http.StatusServiceUnavailable)
				return
			}
			h.handler, h.stamp = next, stamp
		}
	}
	current := h.handler
	h.mu.Unlock()
	current.ServeHTTP(w, r)
}

func effectiveServeOptions(opts ServeOptions) ServeOptions {
	if opts.SettingsPath == "" {
		return opts
	}
	s := LoadSettings(opts.SettingsPath)
	opts.Settings = s
	// Cookie signing remains process-scoped, matching the explicit startup secret.
	opts.CDNURL = settingString(s, "static_host")
	opts.Demo.Enabled = settingBool(s, "DEMO_MODE", false)
	opts.Demo.Username = settingString(s, "DEMO_USERNAME")
	opts.Invite.Code = ""
	if settingBool(s, "INVITE_MODE", false) {
		opts.Invite.Code = settingString(s, "INVITE_CODE")
	}
	opts.Invite.Message = settingString(s, "INVITE_MESSAGE")
	opts.ImportDir = LiveImportDir(opts.ImportDir, opts.SettingsPath)
	opts.CaptchaSettings = captcha.Settings{
		Provider:           settingString(s, "CAPTCHA_PROVIDER"),
		EnableFor:          map[string]bool{},
		TurnstileSiteKey:   settingString(s, "TURNSTILE_SITE_KEY"),
		TurnstileSecretKey: settingString(s, "TURNSTILE_SECRET_KEY"),
		GeetestCaptchaID:   settingString(s, "GEETEST_CAPTCHA_ID"),
		GeetestCaptchaKey:  settingString(s, "GEETEST_CAPTCHA_KEY"),
	}
	for _, scene := range captchaScenes {
		key := strings.ToUpper(scene)
		opts.CaptchaSettings.EnableFor[key] = settingBool(s, "CAPTCHA_ENABLE_FOR_"+key, false)
	}
	return opts
}
