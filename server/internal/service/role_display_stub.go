package service

func normalizedRoleDisplayName(code, displayName string) string {
	if displayName != "" {
		return displayName
	}
	return code
}
