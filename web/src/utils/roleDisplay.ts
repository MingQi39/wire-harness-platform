type RoleDisplayLike = {
  name?: string
  display_name?: string
}

export function roleDisplayName(role: RoleDisplayLike | null | undefined): string {
  const displayName = role?.display_name?.trim()
  return displayName || role?.name || ''
}
