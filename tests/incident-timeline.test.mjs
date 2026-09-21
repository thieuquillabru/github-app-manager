/**
 * End-to-end simulation of the "les applications ont disparu" incident.
 *
 * It replays the exact sequence the user lived through, driving the real
 * sync module against a fake GitHub/Vercel API and a fake localStorage:
 *
 *   1. first visit          -> 7 bundled apps shown and persisted
 *   2. auto-sync succeeds   -> list refreshed from the API
 *   3. quota is exhausted   -> API answers 403 (the incident trigger)
 *   4. the user reloads     -> the apps MUST still be there
 *
 * Against the pre-fix implementation step 3 emptied the list and step 4
 * re-read an empty localStorage, so the screen stayed blank forever.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { fetchGithubPages, fetchVercelProjects, mergeSyncedApps, repairStoredApps } from '../src/lib/sync.ts'

const USER = 'thieuquillabru'

const BUNDLED = [
  'github-app-manager',
  'discord-bot',
  'empire-forge-game',
  'ExchangeMGA',
  'EnergyX',
  'akiba',
].map((name, i) => ({
  id: `github-${name}`,
  name,
  url: `https://${USER}.github.io/${name}/`,
  description: null,
  category: 'GitHub Pages',
  color: '#24292e',
  icon: 'Github',
  order: i,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  source: 'github',
  repoName: name,
}))

BUNDLED.push({
  id: 'vercel-prj_sYrYBUNllneM4DQr3dOszFeLfxxy',
  name: 'agent-reach-web',
  url: 'https://agent-reach-web-zeta.vercel.app',
  description: null,
  category: 'Vercel',
  color: '#000000',
  icon: 'Zap',
  order: 6,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  source: 'vercel',
  repoName: 'agent-reach-web',
})

/** Tiny in-memory localStorage. */
function makeStorage() {
  const map = new Map()
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
  }
}

/** Fake GitHub/Vercel API whose health can be flipped at will. */
function makeApi() {
  const state = { githubOk: true, vercelOk: true, githubCalls: 0, vercelCalls: 0 }
  const repos = BUNDLED.filter((a) => a.source === 'github').map((a) => ({
    name: a.repoName,
    has_pages: true,
    description: a.description,
  }))
  const fetchImpl = async (url) => {
    if (url.includes('api.github.com')) {
      state.githubCalls++
      if (!state.githubOk) {
        return { ok: false, status: 403, json: async () => ({ message: 'API rate limit exceeded' }) }
      }
      return { ok: true, status: 200, json: async () => repos }
    }
    state.vercelCalls++
    if (!state.vercelOk) {
      return { ok: false, status: 403, json: async () => ({ error: 'forbidden' }) }
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({
        projects: [
          {
            id: 'prj_sYrYBUNllneM4DQr3dOszFeLfxxy',
            name: 'agent-reach-web',
            targets: { production: { alias: ['agent-reach-web-zeta.vercel.app'] } },
          },
        ],
      }),
    }
  }
  return { state, fetchImpl }
}

const APPS_KEY = 'github-app-manager-apps'

/** One sync cycle, exactly as the page component performs it. */
async function syncCycle(storage, api) {
  const stored = JSON.parse(storage.getItem(APPS_KEY) ?? 'null')
  const { apps: current } = repairStoredApps(stored, BUNDLED)
  const results = {
    github: await fetchGithubPages(USER, '', api.fetchImpl),
    vercel: await fetchVercelProjects('vcp_token', api.fetchImpl),
  }
  const outcome = mergeSyncedApps(current, results)
  storage.setItem(APPS_KEY, JSON.stringify(outcome.apps))
  return outcome
}

/** A page load with no sync. */
function pageLoad(storage) {
  const stored = JSON.parse(storage.getItem(APPS_KEY) ?? 'null')
  const { apps } = repairStoredApps(stored, BUNDLED)
  return apps
}

test('INCIDENT TIMELINE: apps survive a GitHub quota exhaustion', async () => {
  const storage = makeStorage()
  const api = makeApi()

  // 1. First visit: nothing stored yet -> the bundled list is shown.
  const first = pageLoad(storage)
  assert.equal(first.length, 7, 'first visit must show the 7 bundled apps')
  storage.setItem(APPS_KEY, JSON.stringify(first))

  // 2. Auto-sync while the API is healthy.
  const healthy = await syncCycle(storage, api)
  assert.equal(healthy.apps.length, 7, 'a healthy sync keeps the 7 apps')
  assert.deepEqual(healthy.keptSources, [])

  // 3. The quota is exhausted -> both providers answer 403. THE INCIDENT.
  api.state.githubOk = false
  api.state.vercelOk = false
  const degraded = await syncCycle(storage, api)
  assert.equal(degraded.apps.length, 7, 'a 403 must NOT empty the list')
  assert.equal(degraded.removed, 0, 'nothing may be reported as removed')
  assert.deepEqual(degraded.keptSources.sort(), ['github', 'vercel'])

  // 4. The user reloads the page. This is where the list used to be blank.
  const afterReload = pageLoad(storage)
  assert.equal(afterReload.length, 7, 'after a reload the apps must still be there')
  assert.deepEqual(
    afterReload.map((a) => a.name).sort(),
    ['EnergyX', 'ExchangeMGA', 'agent-reach-web', 'akiba', 'discord-bot', 'empire-forge-game', 'github-app-manager'],
  )

  // 5. The quota resets: everything recovers on its own.
  api.state.githubOk = true
  api.state.vercelOk = true
  const recovered = await syncCycle(storage, api)
  assert.equal(recovered.apps.length, 7)
  assert.equal(pageLoad(storage).length, 7)
})

test('INCIDENT TIMELINE: 10 consecutive failures never erode the list', async () => {
  const storage = makeStorage()
  const api = makeApi()
  storage.setItem(APPS_KEY, JSON.stringify(BUNDLED))

  api.state.githubOk = false
  api.state.vercelOk = false
  for (let i = 0; i < 10; i++) await syncCycle(storage, api)

  assert.equal(pageLoad(storage).length, 7, 'repeated failures must be idempotent')
})

test('INCIDENT TIMELINE: a manual app added offline survives failed syncs', async () => {
  const storage = makeStorage()
  const api = makeApi()
  const withManual = [
    ...BUNDLED,
    {
      id: 'manual-1',
      name: 'Mon App Perso',
      url: 'https://exemple.fr',
      description: null,
      category: 'General',
      color: '#6e40c9',
      icon: 'Link',
      order: 99,
      createdAt: '2026-02-01T00:00:00.000Z',
      updatedAt: '2026-02-01T00:00:00.000Z',
      source: 'manual',
    },
  ]
  storage.setItem(APPS_KEY, JSON.stringify(withManual))

  api.state.githubOk = false
  await syncCycle(storage, api)

  const apps = pageLoad(storage)
  assert.ok(apps.some((a) => a.id === 'manual-1'), 'the manual app must never be lost')
  assert.equal(apps.length, 8)
})

test('QUOTA BUDGET: a sync costs 2 requests, so 15 min auto-sync stays under 60 req/h', async () => {
  const storage = makeStorage()
  const api = makeApi()
  storage.setItem(APPS_KEY, JSON.stringify(BUNDLED))

  await syncCycle(storage, api)
  const perSync = api.state.githubCalls + api.state.vercelCalls
  assert.equal(perSync, 2, `expected 2 requests per sync, got ${perSync}`)

  const syncsPerHour = 60 / 15
  const hourly = perSync * syncsPerHour
  assert.ok(hourly <= 60, `hourly budget ${hourly} must stay under the 60 req/h anonymous quota`)
})
