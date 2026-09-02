package pdfconv

import (
	"context"
	"errors"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"time"
)

// ErrLibreOfficeQueueFull 表示转换槽位已满且排队超过上限，应快速失败避免全员超时。
var ErrLibreOfficeQueueFull = errors.New("libreoffice convert queue is full")

type profileSlot struct {
	dir      string
	useCount int
}

type profilePoolConfig struct {
	Size         int
	BaseDir      string
	RestartAfter int // 0 = never recycle
	MaxQueueSize int // 0 = unlimited waiters
	Prepare      func(profileDir string) error
}

type profilePool struct {
	slots        chan *profileSlot
	restartAfter int
	maxQueueSize int
	prepare      func(profileDir string) error

	mu       sync.Mutex
	waiting  int
	recycles atomic.Int64
	acquires atomic.Int64
}

func newProfilePool(cfg profilePoolConfig) (*profilePool, error) {
	if cfg.Size < 1 {
		return nil, fmt.Errorf("profile pool size must be >= 1")
	}
	if cfg.Prepare == nil {
		cfg.Prepare = func(string) error { return nil }
	}
	if err := os.MkdirAll(cfg.BaseDir, 0o755); err != nil {
		return nil, fmt.Errorf("create LibreOffice 配置缓存目录失败: %w", err)
	}
	p := &profilePool{
		slots:        make(chan *profileSlot, cfg.Size),
		restartAfter: cfg.RestartAfter,
		maxQueueSize: cfg.MaxQueueSize,
		prepare:      cfg.Prepare,
	}
	for i := 0; i < cfg.Size; i++ {
		dir := filepath.Join(cfg.BaseDir, fmt.Sprintf("profile-%d", i))
		if err := os.MkdirAll(dir, 0o755); err != nil {
			return nil, fmt.Errorf("创建 LibreOffice 配置目录失败: %w", err)
		}
		if err := cfg.Prepare(dir); err != nil {
			return nil, fmt.Errorf("prepare LibreOffice profile: %w", err)
		}
		p.slots <- &profileSlot{dir: dir}
	}
	return p, nil
}

func (p *profilePool) Acquire(ctx context.Context) (*profileSlot, error) {
	select {
	case slot := <-p.slots:
		p.acquires.Add(1)
		return slot, nil
	default:
	}

	if p.maxQueueSize > 0 {
		p.mu.Lock()
		if p.waiting >= p.maxQueueSize {
			p.mu.Unlock()
			return nil, ErrLibreOfficeQueueFull
		}
		p.waiting++
		p.mu.Unlock()
		defer func() {
			p.mu.Lock()
			p.waiting--
			p.mu.Unlock()
		}()
	}

	select {
	case slot := <-p.slots:
		p.acquires.Add(1)
		return slot, nil
	case <-ctx.Done():
		return nil, ctx.Err()
	}
}

// Release 归还 profile；达到 RestartAfter 时清空目录并重新 Prepare（字体替换等），不改变转换参数。
func (p *profilePool) Release(slot *profileSlot) {
	if slot == nil {
		return
	}
	slot.useCount++
	if p.restartAfter > 0 && slot.useCount >= p.restartAfter {
		if err := p.recycle(slot); err != nil {
			log.Printf("pdfconv: recycle LibreOffice profile %s failed: %v", slot.dir, err)
		} else {
			p.recycles.Add(1)
			log.Printf("pdfconv: recycled LibreOffice profile dir=%s after %d uses", slot.dir, p.restartAfter)
		}
	}
	p.slots <- slot
}

func (p *profilePool) recycle(slot *profileSlot) error {
	if err := os.RemoveAll(slot.dir); err != nil {
		return err
	}
	if err := os.MkdirAll(slot.dir, 0o755); err != nil {
		return err
	}
	if err := p.prepare(slot.dir); err != nil {
		return err
	}
	slot.useCount = 0
	return nil
}

func (p *profilePool) RecycleCount() int64 {
	return p.recycles.Load()
}

func (p *profilePool) AcquireCount() int64 {
	return p.acquires.Load()
}

func resolveLibreOfficeRestartAfter() int {
	raw := strings.TrimSpace(os.Getenv("LIBREOFFICE_RESTART_AFTER"))
	if raw == "" {
		return 10
	}
	n, err := strconv.Atoi(raw)
	if err != nil || n < 0 {
		return 10
	}
	return n
}

// resolveLibreOfficeMaxQueueSize 返回允许等待槽位的最大数量（不含正在转换的）。
// 未设置时默认为 poolSize*2；显式 0 表示不限制排队。
func resolveLibreOfficeMaxQueueSize(poolSize int) int {
	raw := strings.TrimSpace(os.Getenv("LIBREOFFICE_MAX_QUEUE_SIZE"))
	if raw == "" {
		n := poolSize * 2
		if n < 2 {
			return 2
		}
		return n
	}
	n, err := strconv.Atoi(raw)
	if err != nil || n < 0 {
		n = poolSize * 2
		if n < 2 {
			return 2
		}
		return n
	}
	return n
}

// acquireProfileTimed 获取 profile，并返回排队等待耗时（用于可观测性）。
func acquireProfileTimed(ctx context.Context, pool *profilePool) (*profileSlot, time.Duration, error) {
	start := time.Now()
	slot, err := pool.Acquire(ctx)
	return slot, time.Since(start), err
}
