/**
 * Regression tests for the "les applications ont disparu" incident.
 *
 * Run with:  npm test
 *
 * The bug: a failing GitHub/Vercel API call returned an empty array, the merge
 * step rebuilt the list from that empty array, and localStorage was overwritten
 * with the result. These tests fail against the old implementation.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  fetchGithubPages,
  fetchVercelProjects,
  mergeSyncedApps,
  repairStoredApps,
  normalizeUrl,
  isCleanVercelAlias,
  pickVercelUrl,
} from '../src/lib/sync.ts'

/* ---------------------------------------------------------------- */
/* helpers                                                           */
/* ---------------------------------------------------------------- */

const app = (over = {}) => ({
  id: 'github-akiba',
  name: 'akiba',
  url: 'https://thieuquillabru.github.io/akiba/',
  description: 'desc',
  category: 'GitHub Pages',
  color: '#24292e',
  icon: 'Github',
  order: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  source: 'github',
  repoName: 'akiba',
  ...over,
})

const okResponse = (body) => ({ ok: true, status: 200, json: async () => body })
const errResponse = (status, body = {}) => ({ ok: false, status, json: async () => body })

const repo = (name, hasPages = true) => ({ name, has_pages: hasPages, description: `${name} desc` })

/* ---------------------------------------------------------------- */
/* 1. GitHub provider                                                */
/* ---------------------------------------------------------------- */

test('GitHub: a 403 rate limit is reported as a failure, not as "zero apps"', async () => {
  const res = await fetchGithubPages('thieuquillabru', '', async () => errResponse(403))
  assert.equal(res.ok, false, 'a rate-limited sync must NOT be reported as successful')
  assert.deepEqual(res.apps, [])
  assert.match(res.error, /[Qq]uota/)
})

test('GitHub: a 401 invalid token is reported as a failure', async () => {
  const res = await fetchGithubPages('u', 'bad-token', async () => errResponse(401))
  assert.equal(res.ok, false)
  assert.match(res.error, /invalide/)
})

test('GitHub: a network error is reported as a failure', async () => {
  const res = await fetchGithubPages('u', '', async () => {
    throw new TypeError('Failed to fetch')
  })
  assert.equal(res.ok, false)
  assert.match(res.error, /[Rr]eseau/)
})

test('GitHub: only Pages repos are returned, with a derived URL', async () => {
  const res = await fetchGithubPages('thieuquillabru', '', async () =>
    okResponse([repo('akiba'), repo('EnergyX'), repo('agent-local', false)]),
  )
  assert.equal(res.ok, true)
  assert.deepEqual(
    res.apps.map((a) => a.name),
    ['akiba', 'EnergyX'],
  )
  assert.equal(res.apps[0].url, 'https://thieuquillabru.github.io/akiba/')
})

test('GitHub: one request per page - no N+1 /pages call (this is what blew the quota)', async () => {
  let calls = 0
  await fetchGithubPages('thieuquillabru', '', async () => {
    calls++
    return okResponse([repo('a'), repo('b'), repo('c'), repo('d'), repo('e')])
  })
  assert.equal(calls, 1, `expected 1 request, got ${calls} (N+1 pattern exhausts the 60 req/h quota)`)
})

test('GitHub: pagination stops on a short page and cannot loop forever', async () => {
  let calls = 0
  const full = Array.from({ length: 100 }, (_, i) => repo(`r${i}`))
  const res = await fetchGithubPages('u', '', async () => {
    calls++
    return okResponse(calls === 1 ? full : [repo('last')])
  })
  assert.equal(res.ok, true)
  assert.equal(calls, 2)
  assert.equal(res.apps.length, 101)
})

test('GitHub: an always-full pagination is capped (no infinite loop)', async () => {
  let calls = 0
  const full = Array.from({ length: 100 }, (_, i) => repo(`r${i}`))
  await fetchGithubPages('u', '', async () => {
    calls++
    return okResponse(full)
  })
  assert.ok(calls <= 10, `pagination must be capped, got ${calls} requests`)
})

/* ---------------------------------------------------------------- */
/* 2. Vercel provider                                                */
/* ---------------------------------------------------------------- */

test('Vercel: an expired token is reported as a failure (was silently swallowed)', async () => {
  const res = await fetchVercelProjects('vcp_expired', async () => errResponse(403))
  assert.equal(res.ok, false)
  assert.match(res.error, /Vercel/)
})

test('Vercel: a thrown network error is reported as a failure', async () => {
  const res = await fetchVercelProjects('vcp_x', async () => {
    throw new Error('offline')
  })
  assert.equal(res.ok, false)
})

test('Vercel: a missing token does not produce a bogus successful empty sync', async () => {
  const res = await fetchVercelProjects('', async () => okResponse({ projects: [] }))
  assert.equal(res.ok, false)
})

test('Vercel: picks the clean production alias over preview aliases', async () => {
  const res = await fetchVercelProjects('t', async () =>
    okResponse({
      projects: [
        {
          id: 'prj_1',
          name: 'agent-reach-web',
          targets: {
            production: {
              alias: [
                'agent-reach-web-git-main-thieuquillabrus-projects.vercel.app',
                'agent-reach-web-zeta.vercel.app',
              ],
            },
          },
        },
      ],
    }),
  )
  assert.equal(res.ok, true)
  assert.equal(res.apps[0].url, 'https://agent-reach-web-zeta.vercel.app')
})

/* ---------------------------------------------------------------- */
/* 3. THE BUG: merge must not wipe apps on a failed sync             */
/* ---------------------------------------------------------------- */

test('REGRESSION: a failed GitHub sync keeps the existing GitHub apps', () => {
  const prev = [app({ id: 'github-akiba' }), app({ id: 'github-EnergyX', name: 'EnergyX' })]
  const out = mergeSyncedApps(prev, {
    github: { ok: false, apps: [], error: 'quota' },
  })
  assert.equal(out.apps.length, 2, 'apps must NOT disappear when the API fails')
  assert.deepEqual(out.keptSources, ['github'])
  assert.equal(out.removed, 0)
})

test('REGRESSION: a failed Vercel sync keeps the existing Vercel apps', () => {
  const prev = [app({ id: 'vercel-prj_1', name: 'agent-reach-web', source: 'vercel' })]
  const out = mergeSyncedApps(prev, { vercel: { ok: false, apps: [], error: 'token' } })
  assert.equal(out.apps.length, 1)
})

test('REGRESSION: both providers failing leaves the whole list untouched', () => {
  const prev = [
    app({ id: 'github-akiba' }),
    app({ id: 'vercel-prj_1', source: 'vercel' }),
    app({ id: 'manual-1', source: 'manual', name: 'MonApp' }),
  ]
  const out = mergeSyncedApps(prev, {
    github: { ok: false, apps: [], error: 'x' },
    vercel: { ok: false, apps: [], error: 'y' },
  })
  assert.equal(out.apps.length, 3)
})

test('REGRESSION: a GitHub failure does not affect a successful Vercel sync', () => {
  const prev = [app({ id: 'github-akiba' })]
  const out = mergeSyncedApps(prev, {
    github: { ok: false, apps: [], error: 'quota' },
    vercel: {
      ok: true,
      apps: [
        {
          id: 'vercel-prj_1',
          name: 'agent-reach-web',
          url: 'https://agent-reach-web-zeta.vercel.app',
          description: null,
          category: 'Vercel',
          color: '#000000',
          icon: 'Zap',
          source: 'vercel',
        },
      ],
    },
  })
  assert.deepEqual(
    out.apps.map((a) => a.id).sort(),
    ['github-akiba', 'vercel-prj_1'],
  )
})

test('manual apps are never removed by a sync', () => {
  const prev = [app({ id: 'manual-1', source: 'manual', name: 'MonApp' })]
  const out = mergeSyncedApps(prev, { github: { ok: true, apps: [] }, vercel: { ok: true, apps: [] } })
  assert.deepEqual(out.apps.map((a) => a.name), ['MonApp'])
})

test('a genuinely deleted repo IS removed when the sync succeeded', () => {
  const prev = [app({ id: 'github-akiba' }), app({ id: 'github-gone', name: 'gone' })]
  const out = mergeSyncedApps(prev, {
    github: {
      ok: true,
      apps: [
        {
          id: 'github-akiba',
          name: 'akiba',
          url: 'https://thieuquillabru.github.io/akiba/',
          description: null,
          category: 'GitHub Pages',
          color: '#24292e',
          icon: 'Github',
          source: 'github',
        },
      ],
    },
  })
  assert.deepEqual(out.apps.map((a) => a.id), ['github-akiba'])
  assert.equal(out.removed, 1)
})

test('merge preserves order and createdAt of existing apps', () => {
  const prev = [app({ order: 42, createdAt: '2020-01-01T00:00:00.000Z' })]
  const out = mergeSyncedApps(prev, {
    github: {
      ok: true,
      apps: [
        {
          id: 'github-akiba',
          name: 'akiba',
          url: 'https://thieuquillabru.github.io/akiba/',
          description: 'new desc',
          category: 'GitHub Pages',
          color: '#24292e',
          icon: 'Github',
          source: 'github',
        },
      ],
    },
  })
  assert.equal(out.apps[0].order, 42)
  assert.equal(out.apps[0].createdAt, '2020-01-01T00:00:00.000Z')
  assert.equal(out.apps[0].description, 'new desc')
})

test('merge tolerates a non-array previous state without throwing', () => {
  const out = mergeSyncedApps(undefined, { github: { ok: true, apps: [] } })
  assert.deepEqual(out.apps, [])
})

/* ---------------------------------------------------------------- */
/* 4. Stored data repair                                             */
/* ---------------------------------------------------------------- */

test('repair: empty storage falls back to the bundled apps', () => {
  const fallback = [app()]
  assert.deepEqual(repairStoredApps([], fallback).apps, fallback)
  assert.deepEqual(repairStoredApps(null, fallback).apps, fallback)
})

test('repair: adds the missing https:// scheme', () => {
  const out = repairStoredApps([app({ url: 'thieuquillabru.github.io/akiba/' })], [])
  assert.equal(out.apps[0].url, 'https://thieuquillabru.github.io/akiba/')
  assert.equal(out.changed, true)
})

test('REGRESSION: repairing one app does not rewrite the others', () => {
  // The old code used a single shared `changed` flag inside .map(), so every
  // app after the first broken one was rewritten with the previous URL.
  const broken = app({ id: 'a', name: 'a', url: 'example.com/a' })
  const fine = app({ id: 'b', name: 'b', url: 'https://example.com/b' })
  const out = repairStoredApps([broken, fine], [])
  assert.equal(out.apps[0].url, 'https://example.com/a')
  assert.equal(out.apps[1].url, 'https://example.com/b', 'untouched app must keep its URL')
})

test('repair: drops corrupted entries that would crash the render', () => {
  const out = repairStoredApps([null, { id: 'x' }, app()], [])
  assert.equal(out.apps.length, 1)
  assert.equal(out.apps[0].id, 'github-akiba')
})

test('repair: fully corrupted storage falls back instead of showing nothing', () => {
  const fallback = [app()]
  const out = repairStoredApps([null, undefined, 42], fallback)
  assert.deepEqual(out.apps, fallback)
})

/* ---------------------------------------------------------------- */
/* 5. URL helpers                                                    */
/* ---------------------------------------------------------------- */

test('normalizeUrl', () => {
  assert.equal(normalizeUrl('example.com'), 'https://example.com')
  assert.equal(normalizeUrl('https://example.com'), 'https://example.com')
  assert.equal(normalizeUrl('http://example.com'), 'http://example.com')
  assert.equal(normalizeUrl('  '), '')
})

test('isCleanVercelAlias rejects preview and scoped aliases', () => {
  assert.equal(isCleanVercelAlias('agent-reach-web-zeta.vercel.app'), true)
  assert.equal(isCleanVercelAlias('https://agent-reach-web-zeta.vercel.app'), true)
  assert.equal(isCleanVercelAlias('app-git-main-user-projects.vercel.app'), false)
  assert.equal(isCleanVercelAlias('app-thieuquillabrus-projects.vercel.app'), false)
  assert.equal(isCleanVercelAlias('example.com'), false)
})

test('pickVercelUrl falls back to <name>.vercel.app', () => {
  assert.equal(pickVercelUrl({ name: 'my-app' }), 'https://my-app.vercel.app')
})
