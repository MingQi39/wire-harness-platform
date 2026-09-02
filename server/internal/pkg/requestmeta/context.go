package requestmeta

import "context"

type ctxKey struct{}

type Meta struct {
	IPAddr         string
	UserAgent      string
	APIMethod      string
	APIPath        string
	PermissionCode string
}

func With(ctx context.Context, meta Meta) context.Context {
	return context.WithValue(ctx, ctxKey{}, meta)
}

func From(ctx context.Context) Meta {
	if v, ok := ctx.Value(ctxKey{}).(Meta); ok {
		return v
	}
	return Meta{}
}

func WithRoute(ctx context.Context, method, path string) context.Context {
	meta := From(ctx)
	meta.APIMethod = method
	meta.APIPath = path
	return With(ctx, meta)
}

func WithPermissionCode(ctx context.Context, code string) context.Context {
	meta := From(ctx)
	meta.PermissionCode = code
	return With(ctx, meta)
}
