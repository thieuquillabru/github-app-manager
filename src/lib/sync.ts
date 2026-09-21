/**
 * Pure, testable synchronisation logic for App Manager.
 *
 * This module was extracted from `src/app/page.tsx` during the debugging audit
 * of the "les applications ont disparu" incident.
 *
 * ROOT CAUSE (see tests/sync.test.mjs):
 * `doSync()` used to rebuild the whole list of automatic apps from whatever the
 * GitHub / Vercel APIs returned. When a call failed (HTTP 403 rate limit, an
 * expired/revoked token, or the user being offline), the fetch helpers returned
 * an EMPTY array instead of signalling the failure, so the merge step replaced
 * every GitHub/Vercel app with nothing and persisted that empty list to
 * localStorage. The apps disappeared and stayed gone.
 *
 * The fetch helpers below therefore return a `SyncResult` with an explicit `ok`
 * flag, and `mergeSyncedApps()` only ever removes apps of a source whose fetch
 * actually succeeded.
 */

export const GITHUB_PAGES_COLOR = '#24292e'
export const VERCEL_COLOR = '#000000'

export type AppSource = 'manual' | 'github' | 'vercel'

export interface AppItem {
  id: string
  name: string
  url: string
  description: string | null
  category: string
  color: string
  icon: string
  order: number
  createdAt: string
  updatedAt: string
  source: AppSource
  repoName?: string
}

/** An app as returned by a remote provider, before ordering/timestamps. */
export type RemoteApp = Omit<AppItem, 'order' | 'createdAt' | 'updatedAt'>

export interface SyncResult {
  /** `true` only when the provider answered successfully. */
  ok: boolean
  apps: RemoteApp[]
  /** Human readable reason, present when `ok === false`. */
  error?: string
}

/** Minimal `fetch` shape, so tests can inject a fake implementation. */
export type FetchLike = (
  input: string,
  init?: { headers?: Record<string, string> },
) => Promise<{
  ok: boolean
  status: number
  json: () => Promise<unknown>
}>

/* ------------------------------------------------------------------ */
/* URL helpers                                                         */
/* ------------------------------------------------------------------ */

/** Ensures a URL is absolute https and has no trailing slash noise. */
export function normalizeUrl(rawUrl: string): string {
  const url = (rawUrl || '').trim()
  if (!url) return ''
  if (/^https?:\/\//i.test(url)) return url
  return `https://${url}`
}

/**
 * Vercel preview/scoped aliases (`*-git-*`, `*-projects.vercel.app`, ...) are
 * not stable public URLs. Returns `true` for a clean production alias.
 */
export function isCleanVercelAlias(alias: string): boolean {
  if (!alias) return false
  const host = alias.replace(/^https?:\/\//i, '')
  if (!/^[a-z0-9-]+\.vercel\.app$/i.test(host)) return false
  return !host.includes('-git-') && !host.endsWith('-projects.vercel.app')
}

/** Picks the best public URL for a Vercel project. */
export function pickVercelUrl(project: {
  name?: string
  targets?: { production?: { alias?: string[] } }
  alias?: string[]
}): string {
  const aliases: string[] = project?.targets?.production?.alias ?? project?.alias ?? []
  const clean = aliases.find(isCleanVercelAlias)
  if (clean) return normalizeUrl(clean)
  const anyAlias = aliases.find((a) => /\.vercel\.app$/i.test((a || '').replace(/^https?:\/\//i, '')))
  if (anyAlias) return normalizeUrl(anyAlias)
  return normalizeUrl(`${project?.name ?? ''}.vercel.app`)
}

/* ------------------------------------------------------------------ */
/* Providers                                                           */
/* ------------------------------------------------------------------ */

interface GithubRepo {
  name?: string
  description?: string | null
  has_pages?: boolean
  homepage?: string | null
  fork?: boolean
  archived?: boolean
}

/**
 * Lists the GitHub Pages sites of a user.
 *
 * Previously this issued one extra `GET /repos/:owner/:repo/pages` request per
 * repository (1 + N requests per sync). With ~9 Pages repos and a 5 minute
 * auto-sync that is ~120 requests/hour — twice the 60 req/h unauthenticated
 * quota — so the API started answering 403 and the list was wiped.
 * The Pages URL is fully derivable from the username + repo name, so a single
 * paginated listing request is enough.
 */
export async function fetchGithubPages(
  username: string,
  token: string,
  fetchImpl: FetchLike,
): Promise<SyncResult> {
  const user = (username || '').trim()
  if (!user) return { ok: false, apps: [], error: 'Utilisateur GitHub manquant.' }

  const headers: Record<string, string> = { Accept: 'application/vnd.github+json' }
  if (token) headers.Authorization = `token ${token}`

  const apps: RemoteApp[] = []
  const seen = new Set<string>()
  let page = 1
  const MAX_PAGES = 10 // hard stop, protects against a pagination infinite loop

  while (page <= MAX_PAGES) {
    let res
    try {
      res = await fetchImpl(
        `https://api.github.com/users/${encodeURIComponent(user)}/repos?per_page=100&page=${page}&sort=updated`,
        { headers },
      )
    } catch {
      return { ok: false, apps: [], error: 'Reseau indisponible (GitHub).' }
    }

    if (!res.ok) {
      if (res.status === 403 || res.status === 429) {
        return {
          ok: false,
          apps: [],
          error: token
            ? 'GitHub a refuse la requete (quota atteint ou token invalide).'
            : 'Quota GitHub atteint (60 requetes/h sans token).',
        }
      }
      if (res.status === 401) return { ok: false, apps: [], error: 'Token GitHub invalide.' }
      if (res.status === 404) return { ok: false, apps: [], error: `Utilisateur GitHub "${user}" introuvable.` }
      return { ok: false, apps: [], error: `Erreur GitHub (HTTP ${res.status}).` }
    }

    let repos: unknown
    try {
      repos = await res.json()
    } catch {
      return { ok: false, apps: [], error: 'Reponse GitHub illisible.' }
    }
    if (!Array.isArray(repos)) return { ok: false, apps: [], error: 'Reponse GitHub inattendue.' }
    if (repos.length === 0) break

    for (const repo of repos as GithubRepo[]) {
      if (!repo?.has_pages || !repo.name) continue
      const id = `github-${repo.name}`
      if (seen.has(id)) continue
      seen.add(id)
      apps.push({
        id,
        name: repo.name,
        url: `https://${user}.github.io/${repo.name}/`,
        description: repo.description || null,
        category: 'GitHub Pages',
        color: GITHUB_PAGES_COLOR,
        icon: 'Github',
        source: 'github',
        repoName: repo.name,
      })
    }

    if (repos.length < 100) break
    page++
  }

  return { ok: true, apps }
}

/** Lists the Vercel projects reachable with `token`. */
export async function fetchVercelProjects(token: string, fetchImpl: FetchLike): Promise<SyncResult> {
  const t = (token || '').trim()
  if (!t) return { ok: false, apps: [], error: 'Token Vercel manquant.' }

  let res
  try {
    res = await fetchImpl('https://api.vercel.com/v9/projects?limit=100', {
      headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
    })
  } catch {
    return { ok: false, apps: [], error: 'Reseau indisponible (Vercel).' }
  }

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      return { ok: false, apps: [], error: 'Token Vercel invalide ou expire.' }
    }
    return { ok: false, apps: [], error: `Erreur Vercel (HTTP ${res.status}).` }
  }

  let data: unknown
  try {
    data = await res.json()
  } catch {
    return { ok: false, apps: [], error: 'Reponse Vercel illisible.' }
  }

  const projects = (data as { projects?: unknown })?.projects
  if (!Array.isArray(projects)) return { ok: false, apps: [], error: 'Reponse Vercel inattendue.' }

  const apps: RemoteApp[] = projects
    .filter((p): p is { id: string; name: string } => Boolean(p && (p as { id?: string }).id))
    .map((project) => {
      const p = project as {
        id: string
        name?: string
        description?: string | null
        targets?: { production?: { alias?: string[] } }
      }
      return {
        id: `vercel-${p.id}`,
        name: p.name || p.id,
        url: pickVercelUrl(p),
        description: p.description || null,
        category: 'Vercel',
        color: VERCEL_COLOR,
        icon: 'Zap',
        source: 'vercel' as const,
        repoName: p.name,
      }
    })

  return { ok: true, apps }
}

/* ------------------------------------------------------------------ */
/* Merge                                                               */
/* ------------------------------------------------------------------ */

export interface MergeOutcome {
  apps: AppItem[]
  added: number
  removed: number
  updated: number
  /** Sources that failed and whose existing apps were therefore preserved. */
  keptSources: AppSource[]
}

/**
 * Merges provider results into the current list.
 *
 * Invariants (regression-tested):
 *  1. Manual apps are NEVER touched.
 *  2. Apps of a source whose sync FAILED are preserved as-is.
 *  3. A successful-but-empty result is honoured (a genuinely deleted repo
 *     disappears), but a failed result never empties the list.
 *  4. `order`, `createdAt` and any user edit on an existing app are preserved.
 */
export function mergeSyncedApps(
  prev: AppItem[],
  results: Partial<Record<Exclude<AppSource, 'manual'>, SyncResult>>,
  now: string = new Date().toISOString(),
): MergeOutcome {
  const previous = Array.isArray(prev) ? prev : []
  const manualApps = previous.filter((a) => a.source === 'manual')

  const autoApps: AppItem[] = []
  const keptSources: AppSource[] = []
  let added = 0
  let removed = 0
  let updated = 0

  for (const source of ['github', 'vercel'] as const) {
    const result = results[source]
    const existing = previous.filter((a) => a.source === source)

    // Invariant 2: no result at all, or a failed one -> keep what we have.
    if (!result || !result.ok) {
      if (result && !result.ok && existing.length > 0) keptSources.push(source)
      autoApps.push(...existing)
      continue
    }

    const nextIds = new Set(result.apps.map((a) => a.id))
    removed += existing.filter((a) => !nextIds.has(a.id)).length

    result.apps.forEach((remote, index) => {
      const current = existing.find((a) => a.id === remote.id)
      if (current) {
        updated++
        autoApps.push({
          ...current,
          // Refresh remote-owned fields only; keep user-facing customisation.
          name: remote.name,
          url: normalizeUrl(remote.url) || current.url,
          description: remote.description ?? current.description,
          repoName: remote.repoName ?? current.repoName,
          updatedAt: now,
        })
      } else {
        added++
        autoApps.push({
          ...remote,
          url: normalizeUrl(remote.url),
          order: previous.length + index,
          createdAt: now,
          updatedAt: now,
        })
      }
    })
  }

  return {
    apps: [...autoApps, ...manualApps],
    added,
    removed,
    updated,
    keptSources,
  }
}

/* ------------------------------------------------------------------ */
/* Stored data repair                                                  */
/* ------------------------------------------------------------------ */

/**
 * Repairs apps coming from localStorage (older versions wrote protocol-less or
 * preview Vercel URLs). Also drops entries that are structurally invalid, which
 * previously crashed the render with `Cannot read properties of undefined`.
 */
export function repairStoredApps(
  stored: unknown,
  fallback: AppItem[],
): { apps: AppItem[]; changed: boolean } {
  if (!Array.isArray(stored) || stored.length === 0) {
    return { apps: fallback, changed: true }
  }

  let changed = false
  const apps: AppItem[] = []

  for (const raw of stored) {
    if (!raw || typeof raw !== 'object') {
      changed = true
      continue
    }
    const app = raw as Partial<AppItem>
    if (!app.id || !app.name || !app.url) {
      changed = true
      continue
    }

    // Per-app change detection (the previous implementation used a single
    // shared `changed` accumulator, so unrelated apps were rewritten).
    let url = normalizeUrl(app.url)
    if (app.source === 'vercel' && !isCleanVercelAlias(url)) {
      const known = fallback.find((b) => b.source === 'vercel' && b.repoName === app.repoName)
      if (known) url = known.url
    }
    if (url !== app.url) changed = true

    const source: AppSource =
      app.source === 'github' || app.source === 'vercel' || app.source === 'manual'
        ? app.source
        : 'manual'
    if (source !== app.source) changed = true

    apps.push({
      id: app.id,
      name: app.name,
      url,
      description: app.description ?? null,
      category: app.category || 'General',
      color: app.color || GITHUB_PAGES_COLOR,
      icon: app.icon || 'Link',
      order: typeof app.order === 'number' ? app.order : apps.length,
      createdAt: app.createdAt || new Date(0).toISOString(),
      updatedAt: app.updatedAt || new Date(0).toISOString(),
      source,
      repoName: app.repoName,
    })
  }

  // Invariant: never end up with an empty list because of corrupted storage.
  if (apps.length === 0) return { apps: fallback, changed: true }

  return { apps, changed }
}
