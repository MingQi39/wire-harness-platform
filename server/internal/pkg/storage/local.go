package storage

import (
	"context"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"

	"github.com/hmq/wire-harness-platform/internal/pkg/apperror"
)

type Local struct {
	rootDir string
}

func NewLocal(rootDir string) *Local {
	if rootDir == "" {
		rootDir = "./uploads"
	}
	_ = os.MkdirAll(rootDir, 0o755)
	return &Local{rootDir: rootDir}
}

func (l *Local) Put(_ context.Context, key string, r io.Reader, _ int64, _ string) error {
	fullPath, err := l.safePath(key)
	if err != nil {
		return err
	}
	targetDir := filepath.Dir(fullPath)
	if err := os.MkdirAll(targetDir, 0o755); err != nil {
		return fmt.Errorf("create upload dir (root=%s target=%s uid=%d gid=%d): %w", l.rootDir, targetDir, os.Getuid(), os.Getgid(), err)
	}
	dst, err := os.Create(fullPath)
	if err != nil {
		return fmt.Errorf("create file (root=%s path=%s uid=%d gid=%d): %w", l.rootDir, fullPath, os.Getuid(), os.Getgid(), err)
	}
	if _, err := io.Copy(dst, r); err != nil {
		dst.Close()
		os.Remove(fullPath)
		return fmt.Errorf("write file: %w", err)
	}
	if err := dst.Close(); err != nil {
		os.Remove(fullPath)
		return fmt.Errorf("close file: %w", err)
	}
	return nil
}

func (l *Local) Get(_ context.Context, key string) (io.ReadCloser, error) {
	fullPath, err := l.safePath(key)
	if err != nil {
		return nil, err
	}
	f, err := os.Open(fullPath)
	if err != nil {
		if os.IsNotExist(err) {
			// 必须使用 WrapError：裸 ErrNotFound 无 Detail，经 FileService fmt 包装后响应 JSON 无法区分「仅存 DB、盘上已无实体文件」等场景。
			return nil, apperror.WrapError(apperror.ErrNotFound, fmt.Sprintf("本地存储文件不存在（storage_key=%s）", key))
		}
		return nil, fmt.Errorf("open file: %w", err)
	}
	return f, nil
}

func (l *Local) Delete(_ context.Context, key string) error {
	fullPath, err := l.safePath(key)
	if err != nil {
		return err
	}
	if err := os.Remove(fullPath); err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("remove file: %w", err)
	}
	return nil
}

func (l *Local) safePath(key string) (string, error) {
	full := filepath.Join(l.rootDir, key)
	absRoot, _ := filepath.Abs(l.rootDir)
	absFull, _ := filepath.Abs(full)
	if !strings.HasPrefix(absFull, absRoot+string(filepath.Separator)) && absFull != absRoot {
		return "", apperror.WrapError(apperror.ErrBadRequest, "非法文件路径")
	}
	return absFull, nil
}
