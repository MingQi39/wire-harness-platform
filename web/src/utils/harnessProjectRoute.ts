export function parseProjectRouteId(raw: string | undefined): number | null {
  if (!raw) return null
  const id = Number.parseInt(raw, 10)
  return Number.isFinite(id) && id > 0 ? id : null
}

export function resolveSelectedProjectId(
  projects: { id: number }[],
  routeProjectId: number | null,
): number | null {
  if (routeProjectId != null) {
    if (projects.length === 0) return routeProjectId
    if (projects.some((row) => row.id === routeProjectId)) return routeProjectId
  }
  if (projects.length > 0) return projects[0].id
  return null
}
