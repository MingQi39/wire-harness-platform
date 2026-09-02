package timequery

import "testing"

func TestNormalizeStartSQLMinute(t *testing.T) {
	got := NormalizeStartSQL("2026-08-19T14:30")
	want := "2026-08-19 14:30:00"
	if got != want {
		t.Fatalf("got %q want %q", got, want)
	}
}

func TestNormalizeEndSQLMinute(t *testing.T) {
	got := NormalizeEndSQL("2026-08-19T14:30")
	want := "2026-08-19 14:30:59"
	if got != want {
		t.Fatalf("got %q want %q", got, want)
	}
}

func TestNormalizeEndSQLDateOnly(t *testing.T) {
	got := NormalizeEndSQL("2026-08-19")
	want := "2026-08-19 23:59:59"
	if got != want {
		t.Fatalf("got %q want %q", got, want)
	}
}
