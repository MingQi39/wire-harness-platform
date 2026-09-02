package timequery

import (
	"strings"
	"time"
)

func NormalizeStartSQL(raw string) string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return ""
	}
	t, err := parseBound(raw, time.Local, false)
	if err != nil {
		return raw
	}
	return t.Format("2006-01-02 15:04:05")
}

func NormalizeEndSQL(raw string) string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return ""
	}
	t, err := parseBound(raw, time.Local, true)
	if err != nil {
		if isDateOnly(raw) {
			return raw + " 23:59:59"
		}
		return raw
	}
	return t.Format("2006-01-02 15:04:05")
}

func parseBound(raw string, loc *time.Location, end bool) (time.Time, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return time.Time{}, errEmpty
	}
	if loc == nil {
		loc = time.Local
	}

	normalized := strings.Replace(raw, "T", " ", 1)
	layouts := []string{"2006-01-02 15:04:05", "2006-01-02 15:04", "2006-01-02"}
	for _, layout := range layouts {
		t, err := time.ParseInLocation(layout, normalized, loc)
		if err != nil {
			continue
		}
		switch layout {
		case "2006-01-02":
			if end {
				return t.Add(24*time.Hour - time.Nanosecond), nil
			}
			return t, nil
		case "2006-01-02 15:04":
			if end {
				return t.Add(59 * time.Second), nil
			}
			return t, nil
		default:
			return t, nil
		}
	}
	return time.Time{}, errInvalid
}

func isDateOnly(raw string) bool {
	raw = strings.TrimSpace(raw)
	return len(raw) == 10 && !strings.Contains(raw, "T") && !strings.Contains(raw, " ")
}

var (
	errEmpty   = &parseError{"时间不能为空"}
	errInvalid = &parseError{"时间格式无效"}
)

type parseError struct{ msg string }

func (e *parseError) Error() string { return e.msg }
