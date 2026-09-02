package repo

import (
	"fmt"
	"os"
	"path/filepath"
)

func Root() (string, error) {
	wd, err := os.Getwd()
	if err != nil {
		return "", err
	}
	for {
		mod := filepath.Join(wd, "go.mod")
		if _, err := os.Stat(mod); err == nil {
			return wd, nil
		}
		parent := filepath.Dir(wd)
		if parent == wd {
			return "", fmt.Errorf("go.mod not found from cwd")
		}
		wd = parent
	}
}
