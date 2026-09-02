import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export type HarnessProjectRouteBase = '/ledger' | '/management'

export function parseProjectRouteId(raw: string | undefined): number | null {
  if (!raw) return null
  const id = Number.parseInt(raw, 10)
  return Number.isFinite(id) && id > 0 ? id : null
}

/** 无项目时返回 null，避免在空库时仍选中路由里的无效 id。 */
export function resolveSelectedProjectId(
  projects: { id: number }[],
  routeProjectId: number | null,
): number | null {
  if (projects.length === 0) return null
  if (routeProjectId != null && projects.some((row) => row.id === routeProjectId)) {
    return routeProjectId
  }
  return projects[0]?.id ?? null
}

export function buildProjectRoute(basePath: HarnessProjectRouteBase, projectId: number | null): string {
  if (projectId == null || projectId <= 0) return basePath
  return `${basePath}/${projectId}`
}

/** 无数据时保持在 /ledger 或 /management；有数据且路由无效时回落到首个项目。 */
export function useSyncProjectRoute(
  basePath: HarnessProjectRouteBase,
  projects: { id: number }[],
  projectsReady: boolean,
  routeProjectId: number | null,
  projectIdParam: string | undefined,
) {
  const navigate = useNavigate()

  useEffect(() => {
    if (!projectsReady) return

    if (projects.length === 0) {
      if (projectIdParam) navigate(basePath, { replace: true })
      return
    }

    const routeMatchesProject =
      routeProjectId != null && projects.some((row) => row.id === routeProjectId)
    if (routeMatchesProject) return

    const fallbackId = projects[0]?.id
    if (fallbackId != null) {
      navigate(buildProjectRoute(basePath, fallbackId), { replace: true })
    }
  }, [basePath, projects, projectsReady, projectIdParam, routeProjectId, navigate])
}
