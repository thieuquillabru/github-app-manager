'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Plus, Pencil, Trash2, Search, Github, X, Check,
  Link2, Globe, Code2, Database, Server, Smartphone, Monitor, Cloud,
  Zap, BookOpen, ShoppingCart, MessageSquare, BarChart3, Settings,
  Gamepad2, Palette, Music, RefreshCw, Key, ChevronRight, AlertTriangle,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import {
  fetchGithubPages, fetchVercelProjects, mergeSyncedApps, repairStoredApps,
  normalizeUrl, GITHUB_PAGES_COLOR, VERCEL_COLOR,
  type AppItem, type SyncResult,
} from '@/lib/sync'

const iconMap: Record<string, LucideIcon> = {
  Link: Link2, Globe: Globe, Code: Code2, Database: Database, Server: Server,
  Smartphone: Smartphone, Monitor: Monitor, Cloud: Cloud, Zap: Zap,
  BookOpen: BookOpen, ShoppingCart: ShoppingCart, MessageSquare: MessageSquare,
  BarChart3: BarChart3, Settings: Settings, Gamepad2: Gamepad2,
  Palette: Palette, Music: Music, Github: Github,
}

const iconOptions = Object.keys(iconMap)
const colorOptions = [
  '#6e40c9', '#0d9488', '#ea580c', '#dc2626',
  '#2563eb', '#7c3aed', '#db2777', '#059669',
  '#d97706', '#4f46e5', '#0891b2', '#65a30d',
]
const categoryPresets = [
  'General', 'Frontend', 'Backend', 'Fullstack',
  'Mobile', 'DevOps', 'API', 'Outils', 'Data', 'Design',
]

interface SyncSettings {
  githubUsername: string; githubToken: string; vercelToken: string; autoSync: boolean
}

const APPS_KEY = 'github-app-manager-apps'
const SETTINGS_KEY = 'github-app-manager-settings'
const LAST_SYNC_KEY = 'github-app-manager-last-sync'
/** Auto-sync interval. 15 min keeps us well inside GitHub's 60 req/h anonymous quota. */
const AUTO_SYNC_INTERVAL_MS = 15 * 60 * 1000

const defaultFormData = { name: '', url: '', description: '', category: 'General', color: '#6e40c9', icon: 'Link' }

const defaultSettings: SyncSettings = {
  githubUsername: 'thieuquillabru',
  githubToken: process.env.NEXT_PUBLIC_GITHUB_TOKEN || '',
  vercelToken: process.env.NEXT_PUBLIC_VERCEL_TOKEN || '',
  autoSync: true,
}

const BUNDLED_APPS: AppItem[] = [
  { id: 'github-github-app-manager', name: 'github-app-manager', url: 'https://thieuquillabru.github.io/github-app-manager/', description: 'GitHub App Manager', category: 'GitHub Pages', color: GITHUB_PAGES_COLOR, icon: 'Github', order: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), source: 'github', repoName: 'github-app-manager' },
  { id: 'github-discord-bot', name: 'discord-bot', url: 'https://thieuquillabru.github.io/discord-bot/', description: 'Bot Discord modulaire + Dashboard', category: 'GitHub Pages', color: GITHUB_PAGES_COLOR, icon: 'MessageSquare', order: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), source: 'github', repoName: 'discord-bot' },
  { id: 'github-empire-forge-game', name: 'empire-forge-game', url: 'https://thieuquillabru.github.io/empire-forge-game/', description: 'Empire Forge - Jeu de strategie 3D style Clash of Clans', category: 'GitHub Pages', color: GITHUB_PAGES_COLOR, icon: 'Gamepad2', order: 2, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), source: 'github', repoName: 'empire-forge-game' },
  { id: 'github-ExchangeMGA', name: 'ExchangeMGA', url: 'https://thieuquillabru.github.io/ExchangeMGA/', description: 'Convertisseur Yuan -> Ariary (MGA) avec cours en temps reel', category: 'GitHub Pages', color: GITHUB_PAGES_COLOR, icon: 'BarChart3', order: 3, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), source: 'github', repoName: 'ExchangeMGA' },
  { id: 'github-EnergyX', name: 'EnergyX', url: 'https://thieuquillabru.github.io/EnergyX/', description: 'Developpement personnel : habitudes, objectifs, journal, meditation', category: 'GitHub Pages', color: GITHUB_PAGES_COLOR, icon: 'Zap', order: 4, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), source: 'github', repoName: 'EnergyX' },
  { id: 'github-akiba', name: 'akiba', url: 'https://thieuquillabru.github.io/akiba/', description: "Gestion d'argent, tontine et education financiere. PWA en 8 langues et 166 devises.", category: 'GitHub Pages', color: GITHUB_PAGES_COLOR, icon: 'BookOpen', order: 5, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), source: 'github', repoName: 'akiba' },
  { id: 'vercel-prj_sYrYBUNllneM4DQr3dOszFeLfxxy', name: 'agent-reach-web', url: 'https://agent-reach-web-zeta.vercel.app', description: 'Agent Reach - Recherche multi-plateforme (YouTube, GitHub, RSS, V2EX...)', category: 'Vercel', color: VERCEL_COLOR, icon: 'Globe', order: 6, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), source: 'vercel', repoName: 'agent-reach-web' },
]

function generateId(): string { return Date.now().toString(36) + Math.random().toString(36).substring(2, 9) }
function loadFromStorage<T>(key: string, fallback: T): T { if (typeof window === 'undefined') return fallback; try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback } catch { return fallback } }
function saveToStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return
  // Safari private mode and a full quota both throw here; an unhandled throw
  // used to abort the render pass and leave the list blank.
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* storage unavailable */ }
}

function stringToHue(str: string): number {
 let hash = 0
 for (let i = 0; i < str.length; i++) { hash = str.charCodeAt(i) + ((hash << 5) - hash) }
 return Math.abs(hash) % 360
}

function AppIcon({ name }: { name: string }) {
  const letter = (name || '?').trim().charAt(0).toUpperCase() || '?'
  const hue = stringToHue(name)
  return (
    <div
      className="flex items-center justify-center h-11 w-11 rounded-2xl text-white shrink-0 select-none"
      style={{ background: `linear-gradient(145deg, hsl(${hue}, 65%, 48%), hsl(${(hue + 35) % 360}, 70%, 58%))` }}
    >
      <span className="text-[15px] font-semibold tracking-tight drop-shadow-sm">{letter}</span>
    </div>
  )
}

export default function Home() {
  // Lazy initialisers: evaluated once, during the first render, on the client
  // only (SSR/export returns the fallbacks). No setState-in-effect cascade.
  const [initialApps] = useState(() => repairStoredApps(loadFromStorage<unknown>(APPS_KEY, []), BUNDLED_APPS))
  const [apps, setApps] = useState<AppItem[]>(() => initialApps.apps)
  const [settings, setSettings] = useState<SyncSettings>(() => {
    const storedSettings = loadFromStorage(SETTINGS_KEY, defaultSettings)
    return {
      ...defaultSettings,
      ...storedSettings,
      // Env tokens are only a fallback: a token typed by the user always wins.
      githubToken: storedSettings.githubToken || process.env.NEXT_PUBLIC_GITHUB_TOKEN || '',
      vercelToken: storedSettings.vercelToken || process.env.NEXT_PUBLIC_VERCEL_TOKEN || '',
    }
  })
  const [mounted, setMounted] = useState(false)
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterSource, setFilterSource] = useState('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false)
  const [editingApp, setEditingApp] = useState<AppItem | null>(null)
  const [deletingApp, setDeletingApp] = useState<AppItem | null>(null)
  const [formData, setFormData] = useState(defaultFormData)
  const [syncing, setSyncing] = useState(false)
  const [lastSync, setLastSync] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null
    try { return localStorage.getItem(LAST_SYNC_KEY) } catch { return null }
  })
  const [showSearch, setShowSearch] = useState(false)
  const [syncErrors, setSyncErrors] = useState<string[]>([])
  const syncTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const syncInFlightRef = useRef(false)
  const initialisedRef = useRef(false)
  const { toast } = useToast()

  // Hydration-safe initialisation: localStorage is read lazily during the first
  // client render (the component renders a skeleton until `mounted`), so no
  // setState-in-effect cascade and no flash of an empty list.
  useEffect(() => {
    if (initialisedRef.current) return
    initialisedRef.current = true
    if (initialApps.changed) saveToStorage(APPS_KEY, initialApps.apps)
    setMounted(true)
  }, [initialApps])

  useEffect(() => { if (mounted) saveToStorage(APPS_KEY, apps) }, [apps, mounted])
  useEffect(() => { if (mounted) saveToStorage(SETTINGS_KEY, settings) }, [settings, mounted])

  const doSync = useCallback(async (opts: { silent?: boolean } = {}) => {
    const { silent = false } = opts
    if (!settings.githubUsername && !settings.vercelToken) return
    // Guard against overlapping runs (manual click during an auto-sync).
    if (syncInFlightRef.current) return
    syncInFlightRef.current = true
    setSyncing(true)
    try {
      const results: { github?: SyncResult; vercel?: SyncResult } = {}
      if (settings.githubUsername) {
        results.github = await fetchGithubPages(settings.githubUsername, settings.githubToken, fetch)
      }
      if (settings.vercelToken) {
        results.vercel = await fetchVercelProjects(settings.vercelToken, fetch)
      }

      const errors = Object.values(results).filter((r) => r && !r.ok).map((r) => r!.error!)
      const anyOk = Object.values(results).some((r) => r?.ok)

      // CRITICAL: mergeSyncedApps() never drops apps of a source that failed.
      // This is what used to make every application vanish on a 403.
      let outcome: ReturnType<typeof mergeSyncedApps> | null = null
      setApps((prev) => {
        outcome = mergeSyncedApps(prev, results)
        return outcome.apps
      })

      if (anyOk) {
        const nowStr = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
        setLastSync(nowStr)
        try { localStorage.setItem(LAST_SYNC_KEY, nowStr) } catch { /* storage unavailable */ }
      }

      setSyncErrors(errors)

      if (errors.length > 0) {
        // Never fail silently any more: the user is told why, and that nothing
        // was deleted.
        if (!silent) {
          toast({
            title: anyOk ? 'Synchronisation partielle' : 'Synchronisation impossible',
            description: `${errors.join(' ')} Vos applications ont ete conservees.`,
            variant: 'destructive',
          })
        }
      } else if (!silent) {
        const o = outcome as ReturnType<typeof mergeSyncedApps> | null
        const parts: string[] = []
        if (o) {
          parts.push(`${o.apps.length} app(s)`)
          if (o.added > 0) parts.push(`+${o.added}`)
          if (o.removed > 0) parts.push(`-${o.removed}`)
        }
        toast({ title: 'Synchronise', description: parts.join(', ') || 'Aucun changement.' })
      }
    } catch (err) {
      // Defensive: an unexpected throw must not leave the spinner stuck.
      if (!silent) {
        toast({
          title: 'Erreur',
          description: 'Echec de la synchronisation. Vos applications ont ete conservees.',
          variant: 'destructive',
        })
      }
      setSyncErrors([err instanceof Error ? err.message : 'Erreur inconnue.'])
    } finally {
      syncInFlightRef.current = false
      setSyncing(false)
    }
  }, [settings.githubUsername, settings.githubToken, settings.vercelToken, toast])

  // Initial sync on mount (silent: a quota error must not greet the user with
  // a red toast, the inline banner is enough).
  useEffect(() => {
    if (!mounted || !settings.autoSync) return
    if (!settings.githubUsername && !settings.vercelToken) return
    const t = setTimeout(() => { void doSync({ silent: true }) }, 500)
    return () => clearTimeout(t)
  }, [mounted, settings.autoSync, settings.githubUsername, settings.vercelToken, doSync])

  // Periodic sync. Also pauses while the tab is hidden, which used to burn the
  // API quota in background tabs.
  useEffect(() => {
    if (!mounted || !settings.autoSync) return
    if (!settings.githubUsername && !settings.vercelToken) return
    syncTimerRef.current = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return
      void doSync({ silent: true })
    }, AUTO_SYNC_INTERVAL_MS)
    return () => {
      if (syncTimerRef.current) clearInterval(syncTimerRef.current)
      syncTimerRef.current = null
    }
  }, [mounted, settings.autoSync, settings.githubUsername, settings.vercelToken, doSync])

  // `categories` was computed on every render but never rendered: removed.
  const filteredApps = apps.filter((app) => {
    const s = search.trim().toLowerCase()
    const matchSearch = !s
      || app.name.toLowerCase().includes(s)
      || app.url.toLowerCase().includes(s)
      || (app.description?.toLowerCase().includes(s) ?? false)
    return matchSearch && (filterCategory === 'all' || app.category === filterCategory) && (filterSource === 'all' || app.source === filterSource)
  })
  const ghCount = apps.filter(a => a.source === 'github').length
  const vcCount = apps.filter(a => a.source === 'vercel').length
  const mnCount = apps.filter(a => a.source === 'manual').length

  const openCreateDialog = () => { setEditingApp(null); setFormData(defaultFormData); setDialogOpen(true) }
  const openEditDialog = (app: AppItem) => { setEditingApp(app); setFormData({ name: app.name, url: app.url, description: app.description || '', category: app.category, color: app.color, icon: app.icon }); setDialogOpen(true) }
  const openDeleteDialog = (app: AppItem) => { setDeletingApp(app); setDeleteDialogOpen(true) }
  const handleSubmit = () => {
    if (!formData.name.trim() || !formData.url.trim()) { toast({ title: 'Champs requis', description: 'Nom et URL obligatoires.', variant: 'destructive' }); return }
    let url = formData.url.trim()
    if (!url.startsWith('http://') && !url.startsWith('https://')) url = 'https://' + url
    if (editingApp) { setApps((p) => p.map((a) => a.id === editingApp.id ? { ...a, ...formData, url, updatedAt: new Date().toISOString() } : a)); toast({ title: 'Modifiee', description: `${formData.name} mis a jour.` }) }
    else { setApps((p) => [...p, { id: generateId(), name: formData.name.trim(), url, description: formData.description.trim() || null, category: formData.category, color: formData.color, icon: formData.icon, order: apps.length, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), source: 'manual' }]); toast({ title: 'Ajoutee', description: `${formData.name} ajoute.` }) }
    setDialogOpen(false)
  }
  const handleDelete = () => { if (!deletingApp) return; setApps((p) => p.filter((a) => a.id !== deletingApp.id)); toast({ title: 'Supprimee', description: `${deletingApp.name} supprime.` }); setDeleteDialogOpen(false); setDeletingApp(null) }
  const getIcon = (n: string): LucideIcon => iconMap[n] || Link2

  // ---- SKELETON ----
  if (!mounted) {
    return (
      <div className="min-h-[100dvh] bg-[var(--background)]">
        <div className="h-14" style={{ paddingTop: 'var(--safe-top)' }} />
        <div className="px-4 pt-4 pb-2"><div className="h-7 w-48 rounded-full bg-[var(--muted)] animate-pulse" /></div>
        <div className="px-4 pt-2"><div className="h-10 rounded-2xl bg-[var(--muted)] animate-pulse" /></div>
        <div className="px-4 pt-6 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (<div key={i} className="h-[72px] rounded-2xl bg-[var(--card)] animate-pulse" />))}
        </div>
      </div>
    )
  }

  // ---- MAIN UI ----
  return (
    <div className="min-h-[100dvh] bg-[var(--background)] flex flex-col" style={{ paddingTop: 'var(--safe-top)', paddingBottom: 'var(--safe-bottom)', paddingLeft: 'var(--safe-left)', paddingRight: 'var(--safe-right)' }}>

      {/* ---- HEADER ---- */}
      <header className="sticky top-0 z-30 bg-[var(--background)]/80 backdrop-blur-xl backdrop-saturate-180% border-b border-[var(--border)]">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[#6e40c9] to-[#a855f7] flex items-center justify-center shadow-sm">
              <Github className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="text-[17px] font-semibold tracking-tight text-[var(--foreground)] leading-none">App Manager</h1>
              <p className="text-[11px] text-[var(--muted-foreground)] mt-0.5">{apps.length} application{apps.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setShowSearch(!showSearch)} className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-[var(--secondary)] transition-colors">
              {showSearch ? <X className="h-[18px] w-[18px] text-[var(--foreground)]" /> : <Search className="h-[18px] w-[18px] text-[var(--foreground)]" />}
            </button>
            <button onClick={() => setSettingsDialogOpen(true)} className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-[var(--secondary)] transition-colors">
              <Key className="h-[18px] w-[18px] text-[var(--foreground)]" />
            </button>
            <button onClick={() => { void doSync() }} disabled={syncing} className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-[var(--secondary)] transition-colors disabled:opacity-40">
              <RefreshCw className={`h-[18px] w-[18px] text-[var(--foreground)] ${syncing ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={openCreateDialog} className="h-9 w-9 flex items-center justify-center rounded-full bg-[var(--primary)] text-[var(--primary-foreground)] shadow-sm active:scale-95 transition-transform">
              <Plus className="h-[18px] w-[18px]" />
            </button>
          </div>
        </div>

        {/* Search bar */}
        {showSearch && (
          <div className="max-w-3xl mx-auto px-4 pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
              <Input
                placeholder="Rechercher..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-10 rounded-xl bg-[var(--card)] border-[var(--border)] text-[15px]"
                autoFocus
              />
            </div>
          </div>
        )}
      </header>

      {/* ---- FILTER PILLS ---- */}
      <div className="max-w-3xl mx-auto w-full px-4 pt-3 pb-1">
        <div className="flex gap-2 overflow-x-auto ios-scroll scrollbar-none -mx-4 px-4 pb-1">
          <button onClick={() => { setFilterSource('all'); setFilterCategory('all') }} className={`shrink-0 px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-colors ${filterSource === 'all' && filterCategory === 'all' ? 'bg-[var(--primary)] text-[var(--primary-foreground)]' : 'bg-[var(--card)] text-[var(--foreground)] border border-[var(--border)]'}`}>
            Toutes ({apps.length})
          </button>
          <button onClick={() => setFilterSource('github')} className={`shrink-0 px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-colors flex items-center gap-1.5 ${filterSource === 'github' ? 'bg-[#24292e] text-white' : 'bg-[var(--card)] text-[var(--foreground)] border border-[var(--border)]'}`}>
            <Github className="h-3.5 w-3.5" />GitHub ({ghCount})
          </button>
          <button onClick={() => setFilterSource('vercel')} className={`shrink-0 px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-colors flex items-center gap-1.5 ${filterSource === 'vercel' ? 'bg-[var(--primary)] text-[var(--primary-foreground)]' : 'bg-[var(--card)] text-[var(--foreground)] border border-[var(--border)]'}`}>
            <Zap className="h-3.5 w-3.5" />Vercel ({vcCount})
          </button>
          {mnCount > 0 && (
            <button onClick={() => setFilterSource('manual')} className={`shrink-0 px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-colors ${filterSource === 'manual' ? 'bg-[var(--primary)] text-[var(--primary-foreground)]' : 'bg-[var(--card)] text-[var(--foreground)] border border-[var(--border)]'}`}>
              Manuel ({mnCount})
            </button>
          )}
        </div>
        {lastSync && <p className="text-[11px] text-[var(--muted-foreground)] mt-1.5">Derniere synchro : {lastSync}</p>}

        {/* Sync failures are surfaced inline instead of silently emptying the list. */}
        {syncErrors.length > 0 && (
          <div className="mt-2 flex items-start gap-2 rounded-xl border border-[var(--destructive)]/30 bg-[var(--destructive)]/10 px-3 py-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-[var(--destructive)] mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-medium text-[var(--destructive)]">Synchronisation incomplete</p>
              <p className="text-[11px] text-[var(--muted-foreground)] leading-snug">
                {syncErrors.join(' ')} Vos applications affichees sont conservees.
              </p>
            </div>
            <button
              onClick={() => setSyncErrors([])}
              aria-label="Masquer l'avertissement"
              className="shrink-0 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* ---- CONTENT ---- */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 pt-2 pb-24 ios-scroll">

        {/* Empty states.
            Previously, an empty list WITH configured settings matched no branch
            at all and rendered a fully blank page with no way out. */}
        {apps.length === 0 && (settings.githubUsername || settings.vercelToken) && (
          <div className="flex flex-col items-center justify-center py-24 text-center px-6">
            <div className="h-16 w-16 rounded-full bg-[var(--secondary)] flex items-center justify-center mb-5">
              <RefreshCw className="h-7 w-7 text-[var(--muted-foreground)]" />
            </div>
            <h3 className="text-[17px] font-semibold mb-1.5">Aucune application</h3>
            <p className="text-[15px] text-[var(--muted-foreground)] max-w-[280px] mb-6 leading-relaxed">
              Rien n&apos;a encore ete synchronise. Relancez une synchronisation ou ajoutez une application manuellement.
            </p>
            <div className="flex gap-2">
              <Button onClick={() => { void doSync() }} disabled={syncing} className="rounded-full px-6 h-11 text-[15px] font-medium">
                <RefreshCw className={`h-4 w-4 mr-1.5 ${syncing ? 'animate-spin' : ''}`} />Synchroniser
              </Button>
              <Button variant="outline" onClick={openCreateDialog} className="rounded-full px-6 h-11 text-[15px] font-medium">
                <Plus className="h-4 w-4 mr-1.5" />Ajouter
              </Button>
            </div>
          </div>
        )}

        {apps.length === 0 && !settings.githubUsername && !settings.vercelToken && (
          <div className="flex flex-col items-center justify-center py-24 text-center px-6">
            <div className="h-16 w-16 rounded-full bg-[var(--secondary)] flex items-center justify-center mb-5">
              <Key className="h-7 w-7 text-[var(--muted-foreground)]" />
            </div>
            <h3 className="text-[17px] font-semibold mb-1.5">Configuration requise</h3>
            <p className="text-[15px] text-[var(--muted-foreground)] max-w-[260px] mb-6 leading-relaxed">Connectez vos comptes GitHub et Vercel pour synchroniser vos applications.</p>
            <Button onClick={() => setSettingsDialogOpen(true)} className="rounded-full px-6 h-11 text-[15px] font-medium">Configurer</Button>
          </div>
        )}

        {filteredApps.length === 0 && apps.length > 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center px-6">
            <div className="h-16 w-16 rounded-full bg-[var(--secondary)] flex items-center justify-center mb-5">
              <Search className="h-7 w-7 text-[var(--muted-foreground)]" />
            </div>
            <h3 className="text-[17px] font-semibold mb-1.5">Aucun resultat</h3>
            <p className="text-[15px] text-[var(--muted-foreground)]">Modifiez vos filtres ou votre recherche.</p>
          </div>
        )}

        {/* ---- APP LIST ---- */}
        {filteredApps.length > 0 && (
          <div className="space-y-2">
            {filteredApps.map((app) => {
              const isAuto = app.source === 'github' || app.source === 'vercel'
              return (
                <div key={app.id} className="group bg-[var(--card)] rounded-2xl border border-[var(--border)] overflow-hidden active:scale-[0.98] transition-transform duration-150">
                  <a href={app.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3.5 p-3.5">
                    <AppIcon name={app.name} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-[15px] font-semibold text-[var(--foreground)] truncate">{app.name}</h3>
                        {app.source === 'github' && <span className="shrink-0 text-[10px] font-medium text-[#24292e] bg-[#24292e]/10 px-1.5 py-0.5 rounded-md">GH</span>}
                        {app.source === 'vercel' && <span className="shrink-0 text-[10px] font-medium text-[var(--foreground)] bg-[var(--secondary)] px-1.5 py-0.5 rounded-md">VC</span>}
                      </div>
                      {app.description && <p className="text-[13px] text-[var(--muted-foreground)] truncate mt-0.5 leading-snug">{app.description}</p>}
                      <p className="text-[11px] text-[var(--muted-foreground)]/60 font-mono truncate mt-0.5">{app.url}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-[var(--muted-foreground)]/40 shrink-0" />
                  </a>
                  {!isAuto && (
                    <div className="flex border-t border-[var(--border)]">
                      <button onClick={() => openEditDialog(app)} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[13px] text-[var(--muted-foreground)] hover:bg-[var(--secondary)] transition-colors border-r border-[var(--border)]">
                        <Pencil className="h-3.5 w-3.5" />Modifier
                      </button>
                      <button onClick={() => openDeleteDialog(app)} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[13px] text-[var(--destructive)] hover:bg-[var(--destructive)]/10 transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />Supprimer
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* ---- FLOATING ADD BUTTON (mobile) ---- */}
      <div className="fixed bottom-6 right-6 z-20 sm:hidden" style={{ marginBottom: 'var(--safe-bottom)' }}>
        <button
          onClick={openCreateDialog}
          className="h-14 w-14 rounded-full bg-[#6e40c9] text-white shadow-lg shadow-[#6e40c9]/30 flex items-center justify-center active:scale-90 transition-transform"
        >
          <Plus className="h-6 w-6" />
        </button>
      </div>

      {/* ---- SETTINGS DIALOG ---- */}
      <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
        <DialogContent className="sm:max-w-[440px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-[17px]">Synchronisation</DialogTitle>
            <DialogDescription>Connectez vos comptes pour synchroniser automatiquement.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="gh-username" className="text-[13px]">Utilisateur GitHub</Label>
              <Input id="gh-username" placeholder="thieuquillabru" value={settings.githubUsername} onChange={(e) => setSettings({ ...settings, githubUsername: e.target.value })} className="h-11 rounded-xl" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="gh-token" className="text-[13px]">Token GitHub (optionnel)</Label>
              <Input id="gh-token" type="password" placeholder="ghp_xxx" value={settings.githubToken} onChange={(e) => setSettings({ ...settings, githubToken: e.target.value })} className="h-11 rounded-xl" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="vc-token" className="text-[13px]">Token Vercel</Label>
              <Input id="vc-token" type="password" placeholder="vcp_xxx" value={settings.vercelToken} onChange={(e) => setSettings({ ...settings, vercelToken: e.target.value })} className="h-11 rounded-xl" />
            </div>
            <div className="flex items-center justify-between py-1">
              <div><Label className="text-[13px]">Sync automatique</Label><p className="text-[11px] text-[var(--muted-foreground)]">Toutes les 5 min + au chargement</p></div>
              <button type="button" onClick={() => setSettings({ ...settings, autoSync: !settings.autoSync })} className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ${settings.autoSync ? 'bg-[#6e40c9]' : 'bg-[var(--muted)]'}`}>
                <span className={`pointer-events-none inline-block h-5.5 w-5.5 translate-y-0.5 rounded-full bg-white shadow-md transition duration-200 ${settings.autoSync ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
              </button>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setSettingsDialogOpen(false)} className="rounded-full h-11 flex-1">Fermer</Button>
            <Button onClick={() => { setSettingsDialogOpen(false); setTimeout(() => { void doSync() }, 300) }} className="rounded-full h-11 flex-1 bg-[#6e40c9] hover:bg-[#5b2da0] text-white">
              <RefreshCw className="h-4 w-4 mr-1.5" />Sync
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- ADD/EDIT DIALOG ---- */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[460px] max-h-[85vh] overflow-y-auto ios-scroll rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-[17px]">{editingApp ? 'Modifier' : 'Nouvelle application'}</DialogTitle>
            <DialogDescription>{editingApp ? 'Modifiez les informations.' : 'Ajoutez une application.'}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3.5 py-1">
            <div className="grid gap-1.5">
              <Label className="text-[13px]">Nom *</Label>
              <Input placeholder="Mon Application" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="h-11 rounded-xl" />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-[13px]">URL *</Label>
              <Input placeholder="https://example.com" value={formData.url} onChange={(e) => setFormData({ ...formData, url: e.target.value })} className="h-11 rounded-xl" />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-[13px]">Description</Label>
              <Textarea placeholder="Decrivez l'application..." value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} className="rounded-xl" />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-[13px]">Categorie</Label>
              <Select value={formData.category} onValueChange={(val) => setFormData({ ...formData, category: val })}>
                <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>{categoryPresets.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-[13px]">Icone</Label>
              <div className="grid grid-cols-6 gap-2">
                {iconOptions.map((iconName) => { const Ic = iconMap[iconName]; return (
                  <button key={iconName} type="button" onClick={() => setFormData({ ...formData, icon: iconName })} className={`flex items-center justify-center h-11 w-full rounded-xl border-2 transition-all ${formData.icon === iconName ? 'border-[#6e40c9] bg-[#6e40c9]/10 text-[#6e40c9]' : 'border-[var(--border)] text-[var(--muted-foreground)]'}`}>
                    <Ic className="h-4 w-4" />
                  </button>
                )})}
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-[13px]">Couleur</Label>
              <div className="flex flex-wrap gap-2.5">
                {colorOptions.map((color) => (
                  <button key={color} type="button" onClick={() => setFormData({ ...formData, color })} className={`h-9 w-9 rounded-full border-2 transition-all flex items-center justify-center ${formData.color === color ? 'border-[var(--foreground)] scale-110' : 'border-transparent'}`} style={{ backgroundColor: color }}>
                    {formData.color === color && <Check className="h-3.5 w-3.5 text-white" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 pt-1">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-full h-11 flex-1">Annuler</Button>
            <Button onClick={handleSubmit} className="rounded-full h-11 flex-1 bg-[#6e40c9] hover:bg-[#5b2da0] text-white">{editingApp ? 'Enregistrer' : 'Ajouter'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- DELETE DIALOG ---- */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[17px]">Supprimer ?</AlertDialogTitle>
            <AlertDialogDescription className="text-[15px] leading-relaxed">
              <span className="font-semibold">{deletingApp?.name}</span> sera definitivement supprime.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-full h-11 flex-1">Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="rounded-full h-11 flex-1 bg-[var(--destructive)] hover:opacity-90 text-white">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
