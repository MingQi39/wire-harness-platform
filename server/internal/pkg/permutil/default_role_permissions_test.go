package permutil

import "testing"

func TestDefaultRolePermissionCodes(t *testing.T) {
	got := DefaultRolePermissionCodes()
	want := []string{
		"file:upload",
		"file:download",
		"notification:read",
		"task:read",
		"ai_assistant:use",
	}
	if len(got) != len(want) {
		t.Fatalf("len = %d, want %d", len(got), len(want))
	}
	for i, code := range want {
		if got[i] != code {
			t.Fatalf("got[%d] = %q, want %q", i, got[i], code)
		}
	}
	got[0] = "mutated"
	if DefaultRolePermissionCodes()[0] != "file:upload" {
		t.Fatal("DefaultRolePermissionCodes should return a copy")
	}
}

func TestDefaultRoleVisiblePermissionCodes(t *testing.T) {
	got := DefaultRoleVisiblePermissionCodes()
	want := []string{"file:upload", "file:download", "notification:read", "ai_assistant:use"}
	if len(got) != len(want) {
		t.Fatalf("len = %d, want %d", len(got), len(want))
	}
	for i, code := range want {
		if got[i] != code {
			t.Fatalf("got[%d] = %q, want %q", i, got[i], code)
		}
	}
}
