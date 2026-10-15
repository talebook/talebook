package httpapi

import (
	"bytes"
	"io"
	"net/http"
	"net/url"
	"strings"

	"talebook/booksvr/internal/captcha"
)

// Apply the configured scenes to the actual routes as well as the UI config.
func applyCaptchaSettings(specs []RouteSpec, cfg CaptchaConfig) {
	for i := range specs {
		scene, book := "", false
		switch specs[i].Pattern {
		case rSignIn:
			scene = "login"
		case rWelcome:
			scene = "welcome"
		case rUserSignUp:
			scene = "register"
		case rUserReset:
			scene = "reset"
		case rBookDetailExt:
			scene, book = "download", true
		case rBookRead, rBookReaderBoot, rBookReaderRes, rBookTxtRead, rBookTxtInit, rGetExtract, rReadExtract:
			scene, book = "read", true
		}
		if scene == "" {
			continue
		}
		specs[i].Handler = captchaProtected(specs[i].Handler, cfg, scene, book)
	}
}

func captchaProtected(next HandlerFunc, cfg CaptchaConfig, scene string, book bool) HandlerFunc {
	return func(ctx *Context) (map[string]any, error) {
		if !captcha.IsEnabled(cfg.Settings, scene) || (!book && ctx.Request.Method != http.MethodPost) {
			return next(ctx)
		}
		if book {
			id := strings.SplitN(ctx.Param(0), ".", 2)[0]
			if id == "" {
				id = ctx.Request.URL.Query().Get("id")
			}
			if _, ok := bookGrants(ctx, cfg, scene)[id]; ok {
				return next(ctx)
			}
			ctx.Writer.Header().Set("Cache-Control", "private, no-store")
			return map[string]any{"err": "captcha.required", "msg": "请先完成人机验证"}, nil
		}
		// Preserve JSON/form bodies for the handler after verification.
		raw := ctx.Body()
		ctx.Request.Body = io.NopCloser(bytes.NewReader(raw))
		values := parseFormValues(ctx.Request)
		ctx.Request.Form = url.Values{}
		for _, key := range []string{"captcha_code", "turnstile_token", "lot_number", "captcha_output", "pass_token", "gen_time"} {
			ctx.Request.Form.Set(key, values.Get(key))
		}
		ok, msg := checkCaptcha(ctx, cfg, scene, true, false)
		ctx.Request.Body = io.NopCloser(bytes.NewReader(raw))
		if !ok {
			return map[string]any{"err": "captcha.invalid", "msg": msg}, nil
		}
		return next(ctx)
	}
}
