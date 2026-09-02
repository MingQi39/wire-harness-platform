package pdfconv

import (
	"context"
	"errors"
	"os"
	"path/filepath"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

func TestProfilePoolAcquireRelease(t *testing.T) {
	t.Parallel()
	dir := t.TempDir()
	pool, err := newProfilePool(profilePoolConfig{
		Size:         2,
		BaseDir:      dir,
		RestartAfter: 0,
		MaxQueueSize: 0,
		Prepare:      func(string) error { return nil },
	})
	if err != nil {
		t.Fatal(err)
	}

	ctx := context.Background()
	a, err := pool.Acquire(ctx)
	if err != nil {
		t.Fatal(err)
	}
	b, err := pool.Acquire(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if a.dir == b.dir {
		t.Fatalf("expected distinct profiles, got same %s", a.dir)
	}
	pool.Release(a)
	pool.Release(b)

	c, err := pool.Acquire(ctx)
	if err != nil {
		t.Fatal(err)
	}
	pool.Release(c)
}

func TestProfilePoolRecyclesAfterNUses(t *testing.T) {
	t.Parallel()
	dir := t.TempDir()
	var prepares atomic.Int64
	pool, err := newProfilePool(profilePoolConfig{
		Size:         1,
		BaseDir:      dir,
		RestartAfter: 2,
		MaxQueueSize: 0,
		Prepare: func(profileDir string) error {
			prepares.Add(1)
			marker := filepath.Join(profileDir, "marker")
			return os.WriteFile(marker, []byte("ok"), 0o644)
		},
	})
	if err != nil {
		t.Fatal(err)
	}
	if prepares.Load() != 1 {
		t.Fatalf("initial prepare count=%d want 1", prepares.Load())
	}

	ctx := context.Background()
	slot, err := pool.Acquire(ctx)
	if err != nil {
		t.Fatal(err)
	}
	firstDir := slot.dir
	marker1 := filepath.Join(firstDir, "marker")
	if _, err := os.Stat(marker1); err != nil {
		t.Fatalf("marker missing before recycle: %v", err)
	}
	// leave a dirty file that must disappear after recycle
	_ = os.WriteFile(filepath.Join(firstDir, "dirty"), []byte("x"), 0o644)
	pool.Release(slot) // useCount=1, no recycle yet
	if prepares.Load() != 1 {
		t.Fatalf("prepare count after 1 use=%d want 1", prepares.Load())
	}

	slot, err = pool.Acquire(ctx)
	if err != nil {
		t.Fatal(err)
	}
	pool.Release(slot) // useCount=2 → recycle
	if prepares.Load() != 2 {
		t.Fatalf("prepare count after recycle=%d want 2", prepares.Load())
	}
	if pool.RecycleCount() != 1 {
		t.Fatalf("recycle count=%d want 1", pool.RecycleCount())
	}
	if _, err := os.Stat(filepath.Join(firstDir, "dirty")); !os.IsNotExist(err) {
		t.Fatalf("dirty file should be removed after recycle, err=%v", err)
	}
	if _, err := os.Stat(filepath.Join(firstDir, "marker")); err != nil {
		t.Fatalf("marker should be rewritten after recycle: %v", err)
	}
}

func TestProfilePoolRejectsWhenQueueFull(t *testing.T) {
	t.Parallel()
	dir := t.TempDir()
	pool, err := newProfilePool(profilePoolConfig{
		Size:         1,
		BaseDir:      dir,
		RestartAfter: 0,
		MaxQueueSize: 1,
		Prepare:      func(string) error { return nil },
	})
	if err != nil {
		t.Fatal(err)
	}

	ctx := context.Background()
	held, err := pool.Acquire(ctx)
	if err != nil {
		t.Fatal(err)
	}

	var wg sync.WaitGroup
	wg.Add(1)
	waitingStarted := make(chan struct{})
	go func() {
		defer wg.Done()
		// occupy the single queue slot
		cctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()
		close(waitingStarted)
		_, err := pool.Acquire(cctx)
		if err != nil && !errors.Is(err, context.DeadlineExceeded) && !errors.Is(err, context.Canceled) {
			// may succeed once held is released; either is fine for this waiter
			_ = err
		}
	}()
	<-waitingStarted
	time.Sleep(20 * time.Millisecond) // let waiter register

	_, err = pool.Acquire(context.Background())
	if !errors.Is(err, ErrLibreOfficeQueueFull) {
		t.Fatalf("expected ErrLibreOfficeQueueFull, got %v", err)
	}

	pool.Release(held)
	wg.Wait()
}

func TestResolveLibreOfficeRestartAfter(t *testing.T) {
	t.Setenv("LIBREOFFICE_RESTART_AFTER", "7")
	if n := resolveLibreOfficeRestartAfter(); n != 7 {
		t.Fatalf("got %d want 7", n)
	}
	t.Setenv("LIBREOFFICE_RESTART_AFTER", "0")
	if n := resolveLibreOfficeRestartAfter(); n != 0 {
		t.Fatalf("got %d want 0", n)
	}
	t.Setenv("LIBREOFFICE_RESTART_AFTER", "")
	if n := resolveLibreOfficeRestartAfter(); n != 10 {
		t.Fatalf("default got %d want 10", n)
	}
}

func TestResolveLibreOfficeMaxQueueSize(t *testing.T) {
	t.Setenv("LIBREOFFICE_MAX_QUEUE_SIZE", "3")
	if n := resolveLibreOfficeMaxQueueSize(2); n != 3 {
		t.Fatalf("got %d want 3", n)
	}
	t.Setenv("LIBREOFFICE_MAX_QUEUE_SIZE", "")
	if n := resolveLibreOfficeMaxQueueSize(2); n != 4 {
		t.Fatalf("default for pool=2 got %d want 4", n)
	}
	t.Setenv("LIBREOFFICE_MAX_QUEUE_SIZE", "0")
	if n := resolveLibreOfficeMaxQueueSize(2); n != 0 {
		t.Fatalf("got %d want 0 (unlimited)", n)
	}
}
