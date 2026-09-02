package storage

import (
	"context"
	"io"
)

type Backend interface {
	Put(ctx context.Context, key string, r io.Reader, contentLength int64, contentType string) error
	Get(ctx context.Context, key string) (io.ReadCloser, error)
	Delete(ctx context.Context, key string) error
}
