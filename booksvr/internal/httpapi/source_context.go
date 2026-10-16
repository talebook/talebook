package httpapi

import "context"

// Direct handler callers (including maintenance tools) need no HTTP request.
func sourceContext(ctx *Context) context.Context {
	if ctx != nil && ctx.Request != nil {
		return ctx.Request.Context()
	}
	return context.Background()
}
