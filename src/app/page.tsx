'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Plus,
  ExternalLink,
  Pencil,
  Trash2,
  Search,
  Github,
  LayoutGrid,
  X,
  Check,
  Link2,
  Globe,
  Code2,
  Database,
  Server,
  Smartphone,
  Monitor,
  Cloud,
  Zap,
  BookOpen,
  ShoppingCart,
  MessageSquare,
  BarChart3,
  Settings,
  Gamepad2,
  Palette,
  Music,
  RefreshCw,
  Key,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

// Icon mapping
const iconMap: Record<string, LucideIcon> = {
  Link: Link2,
  Globe: Globe,
  Code: Code2,
  Database: Database,
  Server: Server,
  Smartphone: Smartphone,
  Monitor: Monitor,
  Cloud: Cloud,
  Zap: Zap,
  BookOpen: BookOpen,
  ShoppingCart: ShoppingCart,
  MessageSquare: MessageSquare,
  BarChart3: BarChart3,
  Settings: Settings,
  Gamepad2: Gamepad2,
  Palette: Palette,
  Music: Music,
  Github: Github,
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

const GITHUB_PAGES_COLOR = '#24292e'
const VERCEL_COLOR = '#000000'

interface AppItem {
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
  source: 'manual' | 'github' | 'vercel'
  repoName?: string
}

interface SyncSettings {
  githubUsername: string
  githubToken: string
  vercelToken: string
  autoSync: boolean
}

const APPS_KEY = 'github-app-manager-apps'
const SETTINGS_KEY = 'github-app-manager-settings'

const defaultFormData = {
  name: '',
  url: '',
  description: '',
  category: 'General',
  color: '#6e40c9',
  icon: 'Link',
}

const defaultSettings: SyncSettings = {
  githubUsername: 'thieuquillabru',
  githubToken: process.env.NEXT_PUBLIC_GITHUB_TOKEN || '',
  vercelToken: process.env.NEXT_PUBLIC_VERCEL_TOKEN || '',
  autoSync: true,
}

// Apps pré-intégrées (bundlées) — visible immédiatement au premier chargement
const BUNDLED_APPS: AppItem[] = [
  // --- GitHub Pages ---
  {
    id: 'github-github-app-manager',
    name: 'github-app-manager',
    url: 'https://thieuquillabru.github.io/github-app-manager/',
    description: 'GitHub App Manager',
    category: 'GitHub Pages',
    color: GITHUB_PAGES_COLOR,
    icon: 'Github',
    order: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    source: 'github',
    repoName: 'github-app-manager',
  },
  {
    id: 'github-discord-bot',
    name: 'discord-bot',
    url: 'https://thieuquillabru.github.io/discord-bot/',
    description: 'Bot Discord modulaire',
    category: 'GitHub Pages',
    color: GITHUB_PAGES_COLOR,
    icon: 'MessageSquare',
    order: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    source: 'github',
    repoName: 'discord-bot',
  },
  {
    id: 'github-empire-forge-game',
    name: 'empire-forge-game',
    url: 'https://thieuquillabru.github.io/empire-forge-game/',
    description: 'Empire Forge - Jeu de strategie 3D style Clash of Clans',
    category: 'GitHub Pages',
    color: GITHUB_PAGES_COLOR,
    icon: 'Gamepad2',
    order: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    source: 'github',
    repoName: 'empire-forge-game',
  },
  {
    id: 'github-ExchangeMGA',
    name: 'ExchangeMGA',
    url: 'https://thieuquillabru.github.io/ExchangeMGA/',
    description: 'Convertisseur Yuan -> Ariary (MGA) avec cours en temps reel',
    category: 'GitHub Pages',
    color: GITHUB_PAGES_COLOR,
    icon: 'BarChart3',
    order: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    source: 'github',
    repoName: 'ExchangeMGA',
  },
  {
    id: 'github-EnergyX',
    name: 'EnergyX',
    url: 'https://thieuquillabru.github.io/EnergyX/',
    description: 'EnergyX',
    category: 'GitHub Pages',
    color: GITHUB_PAGES_COLOR,
    icon: 'Zap',
    order: 4,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    source: 'github',
    repoName: 'EnergyX',
  },
  {
    id: 'github-akiba',
    name: 'akiba',
    url: 'https://thieuquillabru.github.io/akiba/',
    description: "Gestion d'argent, tontine et education financiere — hors-ligne, sans compte, sans serveur. PWA en 8 langues et 166 devises.",
    category: 'GitHub Pages',
    color: GITHUB_PAGES_COLOR,
    icon: 'BookOpen',
    order: 5,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    source: 'github',
    repoName: 'akiba',
  },
  {
    id: 'github-Sanbox',
    name: 'Sanbox',
    url: 'https://thieuquillabru.github.io/Sanbox/',
    description: 'Sanbox',
    category: 'GitHub Pages',
    color: GITHUB_PAGES_COLOR,
    icon: 'Code2',
    order: 6,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    source: 'github',
    repoName: 'Sanbox',
  },
  // --- Vercel ---
  {
    id: 'vercel-prj_sYrYBUNllneM4DQr3dOszFeLfxxy',
    name: 'agent-reach-web',
    url: 'https://agent-reach-web-zeta.vercel.app',
    description: 'Agent Reach Web',
    category: 'Vercel',
    color: VERCEL_COLOR,
    icon: 'Globe',
    order: 7,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    source: 'vercel',
    repoName: 'agent-reach-web',
  },
  {
    id: 'vercel-prj_128VPziESKTh5PTLVIxcjSQTPEkL',
    name: 'yourenergyx',
    url: 'https://yourenergyx.vercel.app',
    description: 'YourEnergyX',
    category: 'Vercel',
    color: VERCEL_COLOR,
    icon: 'Zap',
    order: 8,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    source: 'vercel',
    repoName: 'yourenergyx',
  },
]

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9)
}

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function saveToStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(key, JSON.stringify(value))
}

// GitHub API
async function fetchGithubPagesRepos(username: string, token: string): Promise<Omit<AppItem, 'order' | 'createdAt' | 'updatedAt'>[]> {
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github+json',
  }
  if (token) headers['Authorization'] = `token ${token}`

  const apps: Omit<AppItem, 'order' | 'createdAt' | 'updatedAt'>[] = []
  let page = 1
  let hasMore = true

  while (hasMore) {
    const res = await fetch(
      `https://api.github.com/users/${username}/repos?per_page=100&page=${page}&sort=updated`,
      { headers }
    )
    if (!res.ok) break
    const repos = await res.json()
    if (!Array.isArray(repos) || repos.length === 0) break

    const pagesRepos = repos.filter((r: { has_pages?: boolean }) => r.has_pages)

    for (const repo of pagesRepos) {
      const pagesRes = await fetch(
        `https://api.github.com/repos/${username}/${repo.name}/pages`,
        { headers }
      )
      if (pagesRes.ok) {
        const pagesData = await pagesRes.json()
        apps.push({
          id: `github-${repo.name}`,
          name: repo.name,
          url: pagesData.html_url?.replace(/\/$/, '') || `https://${username}.github.io/${repo.name}`,
          description: repo.description || null,
          category: 'GitHub Pages',
          color: GITHUB_PAGES_COLOR,
          icon: 'Github',
          source: 'github' as const,
          repoName: repo.name,
        })
      }
    }

    hasMore = repos.length === 100
    page++
  }

  return apps
}

// Vercel API
async function fetchVercelProjects(token: string): Promise<Omit<AppItem, 'order' | 'createdAt' | 'updatedAt'>[]> {
  const apps: Omit<AppItem, 'order' | 'createdAt' | 'updatedAt'>[] = []

  try {
    const res = await fetch('https://api.vercel.com/v9/projects?limit=100', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })
    if (!res.ok) return apps
    const data = await res.json()

    if (data.projects) {
      for (const project of data.projects) {
        const targets = project.targets
        const prodTarget = targets?.production
        const aliases: string[] = prodTarget?.alias || []
        // Prefer clean alias like "project.vercel.app"
        const cleanAlias = aliases.find((a: string) => /^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(a) && !a.includes('git-') && !a.includes('-thieuquillabrus-'))
        const fallbackAlias = aliases.find((a: string) => /^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(a))
        const url = cleanAlias || fallbackAlias || prodTarget?.url || `https://${project.name}.vercel.app`

        apps.push({
          id: `vercel-${project.id}`,
          name: project.name,
          url,
          description: project.description || null,
          category: 'Vercel',
          color: VERCEL_COLOR,
          icon: 'Zap',
          source: 'vercel' as const,
          repoName: project.name,
        })
      }
    }
  } catch {
    // Vercel API error - silently fail
  }

  return apps
}

function getFaviconUrl(url: string): string {
  try {
    const domain = new URL(url).hostname
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`
  } catch {
    return ''
  }
}

function FaviconIcon({ url, fallbackIcon, color }: { url: string; fallbackIcon: LucideIcon; color: string }) {
  const FallbackIcon = fallbackIcon
  const [imgError, setImgError] = useState(false)
  const faviconUrl = getFaviconUrl(url)

  if (!faviconUrl || imgError) {
    return (
      <div
        className="flex items-center justify-center h-12 w-12 rounded-xl text-white shrink-0 shadow-sm"
        style={{ backgroundColor: color }}
      >
        <FallbackIcon className="h-6 w-6" />
      </div>
    )
  }

  return (
    <div className="h-12 w-12 rounded-xl shrink-0 shadow-sm overflow-hidden bg-slate-100 dark:bg-slate-700 p-1.5 flex items-center justify-center">
      <img
        src={faviconUrl}
        alt=""
        className="w-full h-full object-contain rounded"
        onError={() => setImgError(true)}
      />
    </div>
  )
}

export default function Home() {
  const [apps, setApps] = useState<AppItem[]>([])
  const [settings, setSettings] = useState<SyncSettings>(defaultSettings)
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
  const [lastSync, setLastSync] = useState<string | null>(null)
  const syncTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const { toast } = useToast()

  // Load from localStorage on mount
  useEffect(() => {
    const stored = loadFromStorage<AppItem[]>(APPS_KEY, [])
    const storedSettings = loadFromStorage(SETTINGS_KEY, defaultSettings)

    // Env var tokens always supplement stored settings (stored may be empty from old visit)
    const envGhToken = process.env.NEXT_PUBLIC_GITHUB_TOKEN || ''
    const envVcToken = process.env.NEXT_PUBLIC_VERCEL_TOKEN || ''
    const effectiveSettings: SyncSettings = {
      ...storedSettings,
      githubToken: storedSettings.githubToken || envGhToken,
      vercelToken: storedSettings.vercelToken || envVcToken,
    }

    if (stored.length === 0) {
      // First visit — seed with bundled apps, sync will refresh
      setApps(BUNDLED_APPS)
      saveToStorage(APPS_KEY, BUNDLED_APPS)
    } else {
      // Returning visit — use stored apps as-is (sync will reconcile)
      setApps(stored)
    }

    setSettings(effectiveSettings)
    const savedSync = localStorage.getItem('github-app-manager-last-sync')
    if (savedSync) setLastSync(savedSync)
    setMounted(true)
  }, [])

  // Persist apps and settings
  useEffect(() => {
    if (mounted) saveToStorage(APPS_KEY, apps)
  }, [apps, mounted])

  useEffect(() => {
    if (mounted) saveToStorage(SETTINGS_KEY, settings)
  }, [settings, mounted])

  // Auto-sync on mount + interval
  const doSync = useCallback(async () => {
    if (!settings.githubUsername && !settings.vercelToken) return
    setSyncing(true)
    try {
      let syncedApps: Omit<AppItem, 'order' | 'createdAt' | 'updatedAt'>[] = []

      if (settings.githubUsername) {
        const ghApps = await fetchGithubPagesRepos(settings.githubUsername, settings.githubToken)
        syncedApps = [...syncedApps, ...ghApps]
      }

      if (settings.vercelToken) {
        const vcApps = await fetchVercelProjects(settings.vercelToken)
        syncedApps = [...syncedApps, ...vcApps]
      }

      // Always replace ALL auto-synced apps with fresh API data (removes deleted, adds new)
      let addedCount = 0
      let removedCount = 0
      let updatedCount = 0

      setApps((prev) => {
        const manualApps = prev.filter((a) => a.source === 'manual')
        const prevAutoIds = new Set(prev.filter((a) => a.source !== 'manual').map((a) => a.id))
        const nowAutoIds = new Set(syncedApps.map((sa) => sa.id))

        addedCount = syncedApps.filter((sa) => !prevAutoIds.has(sa.id)).length
        removedCount = [...prevAutoIds].filter((id) => !nowAutoIds.has(id)).length
        updatedCount = syncedApps.filter((sa) => prevAutoIds.has(sa.id)).length

        const now = new Date().toISOString()
        const newAutoApps = syncedApps.map((sa, i) => {
          const existing = prev.find((a) => a.id === sa.id)
          return {
            ...sa,
            order: existing?.order ?? (manualApps.length + i),
            createdAt: existing?.createdAt ?? now,
            updatedAt: now,
          }
        })
        return [...newAutoApps, ...manualApps]
      })

      const nowStr = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      setLastSync(nowStr)
      localStorage.setItem('github-app-manager-last-sync', nowStr)

      const parts: string[] = []
      if (syncedApps.length > 0) parts.push(`${syncedApps.length} app(s) au total`)
      if (addedCount > 0) parts.push(`+${addedCount} nouvelle(s)`)
      if (removedCount > 0) parts.push(`-${removedCount} supprimee(s)`)
      if (updatedCount > 0) parts.push(`${updatedCount} mise(s) a jour`)
      toast({ title: 'Synchronisation terminee', description: parts.join(', ') || 'Aucune application sync.' })
    } catch {
      toast({ title: 'Erreur de synchro', description: 'Impossible de synchroniser. Verifiez vos parametres.', variant: 'destructive' })
    } finally {
      setSyncing(false)
    }
  }, [settings, toast])

  // Auto-sync on mount when settings are ready
  useEffect(() => {
    if (mounted && settings.autoSync && (settings.githubUsername || settings.vercelToken)) {
      const timer = setTimeout(() => doSync(), 500)
      return () => clearTimeout(timer)
    }
  }, [mounted, settings.autoSync, settings.githubUsername, settings.vercelToken, doSync])

  // Auto-sync interval (every 5 minutes)
  useEffect(() => {
    if (mounted && settings.autoSync && (settings.githubUsername || settings.vercelToken)) {
      syncTimerRef.current = setInterval(doSync, 5 * 60 * 1000)
      return () => {
        if (syncTimerRef.current) clearInterval(syncTimerRef.current)
      }
    }
  }, [mounted, settings.autoSync, settings.githubUsername, settings.vercelToken, doSync])

  // Get unique categories from apps
  const categories = ['all', ...Array.from(new Set(apps.map((a) => a.category)))]
  const sourceOptions = ['all', 'github', 'vercel', 'manual']

  // Filter apps
  const filteredApps = apps.filter((app) => {
    const matchSearch =
      app.name.toLowerCase().includes(search.toLowerCase()) ||
      app.url.toLowerCase().includes(search.toLowerCase()) ||
      (app.description?.toLowerCase().includes(search.toLowerCase()) ?? false)
    const matchCategory = filterCategory === 'all' || app.category === filterCategory
    const matchSource = filterSource === 'all' || app.source === filterSource
    return matchSearch && matchCategory && matchSource
  })

  const openCreateDialog = () => {
    setEditingApp(null)
    setFormData(defaultFormData)
    setDialogOpen(true)
  }

  const openEditDialog = (app: AppItem) => {
    setEditingApp(app)
    setFormData({
      name: app.name,
      url: app.url,
      description: app.description || '',
      category: app.category,
      color: app.color,
      icon: app.icon,
    })
    setDialogOpen(true)
  }

  const openDeleteDialog = (app: AppItem) => {
    setDeletingApp(app)
    setDeleteDialogOpen(true)
  }

  const handleSubmit = () => {
    if (!formData.name.trim() || !formData.url.trim()) {
      toast({ title: 'Champs requis', description: 'Le nom et l\'URL sont obligatoires.', variant: 'destructive' })
      return
    }
    let url = formData.url.trim()
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url
    }
    if (editingApp) {
      setApps((prev) =>
        prev.map((a) =>
          a.id === editingApp.id
            ? { ...a, ...formData, url, updatedAt: new Date().toISOString() }
            : a
        )
      )
      toast({ title: 'Application modifiee', description: `${formData.name} a ete mis a jour.` })
    } else {
      const newApp: AppItem = {
        id: generateId(),
        name: formData.name.trim(),
        url,
        description: formData.description.trim() || null,
        category: formData.category,
        color: formData.color,
        icon: formData.icon,
        order: apps.length,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        source: 'manual',
      }
      setApps((prev) => [...prev, newApp])
      toast({ title: 'Application ajoutee', description: `${formData.name} a ete ajoute.` })
    }
    setDialogOpen(false)
  }

  const handleDelete = () => {
    if (!deletingApp) return
    setApps((prev) => prev.filter((a) => a.id !== deletingApp.id))
    toast({ title: 'Supprime', description: `${deletingApp.name} a ete supprime.` })
    setDeleteDialogOpen(false)
    setDeletingApp(null)
  }

  const getIcon = (iconName: string): LucideIcon => {
    return iconMap[iconName] || Link2
  }

  const sourceBadge = (source: AppItem['source']) => {
    if (source === 'github') return <Badge variant='outline' className='text-[10px] px-1.5 py-0 border-slate-300 dark:border-slate-600 gap-1'><Github className='h-3 w-3' />GitHub</Badge>
    if (source === 'vercel') return <Badge variant='outline' className='text-[10px] px-1.5 py-0 border-slate-300 dark:border-slate-600 gap-1'><Zap className='h-3 w-3' />Vercel</Badge>
    return null
  }

  // Skeleton / loading before mount
  if (!mounted) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <header className="border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse" />
              <div className="h-6 w-40 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
            </div>
            <div className="flex gap-2">
              <div className="h-9 w-9 rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse" />
              <div className="h-9 w-32 rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse" />
            </div>
          </div>
        </header>
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-40 rounded-xl bg-white dark:bg-slate-800 shadow-sm animate-pulse" />
            ))}
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      {/* Header */}
      <header className="border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-gradient-to-br from-violet-600 to-purple-700 text-white shadow-lg shadow-violet-200 dark:shadow-violet-900/30">
              <Github className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                GitHub App Manager
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
                Centralisez et accedez a vos applications
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 relative"
                  onClick={() => setSettingsDialogOpen(true)}
                >
                  <Key className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Parametres de synchro</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  onClick={doSync}
                  disabled={syncing || (!settings.githubUsername && !settings.vercelToken)}
                >
                  <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {syncing ? 'Synchronisation...' : 'Synchroniser maintenant'}
              </TooltipContent>
            </Tooltip>
            <Button
              onClick={openCreateDialog}
              className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-lg shadow-violet-200 dark:shadow-violet-900/30 transition-all duration-200 hover:scale-[1.02]"
            >
              <Plus className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Ajouter</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        {/* Stats Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <LayoutGrid className="h-4 w-4 text-slate-400" />
              <span className="text-sm text-slate-500 dark:text-slate-400">
                {filteredApps.length} application{filteredApps.length !== 1 ? 's' : ''}
              </span>
            </div>
            {lastSync && (
              <span className="text-[11px] text-slate-400 dark:text-slate-500">
                Derniere synchro : {lastSync}
              </span>
            )}
            {filterCategory !== 'all' && (
              <Badge variant="secondary" className="text-xs">{filterCategory}</Badge>
            )}
            {filterSource !== 'all' && (
              <Badge variant="secondary" className="text-xs">
                {filterSource === 'github' ? 'GitHub Pages' : filterSource === 'vercel' ? 'Vercel' : 'Manuel'}
              </Badge>
            )}
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Rechercher..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <Select value={filterSource} onValueChange={setFilterSource}>
              <SelectTrigger className="w-full sm:w-36 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes sources</SelectItem>
                <SelectItem value="github">GitHub Pages</SelectItem>
                <SelectItem value="vercel">Vercel</SelectItem>
                <SelectItem value="manual">Manuel</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-full sm:w-36 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <SelectValue placeholder="Categorie" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat === 'all' ? 'Toutes' : cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Empty state when no settings configured */}
        {apps.length === 0 && !settings.githubUsername && !settings.vercelToken && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="flex items-center justify-center h-20 w-20 rounded-2xl bg-violet-50 dark:bg-violet-950/30 mb-6">
              <Key className="h-10 w-10 text-violet-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              Configurez la synchronisation
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-6">
              Entrez votre nom d&apos;utilisateur GitHub et/ou votre token Vercel pour synchroniser automatiquement toutes vos applications déployées.
            </p>
            <Button
              onClick={() => setSettingsDialogOpen(true)}
              className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white"
            >
              <Key className="h-4 w-4 mr-2" />
              Configurer
            </Button>
          </div>
        )}

        {/* App Grid */}
        {filteredApps.length === 0 && (settings.githubUsername || settings.vercelToken) && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="flex items-center justify-center h-20 w-20 rounded-2xl bg-slate-100 dark:bg-slate-800 mb-6">
              <Github className="h-10 w-10 text-slate-300 dark:text-slate-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              {search || filterCategory !== 'all' || filterSource !== 'all'
                ? 'Aucun resultat'
                : 'Aucune application'}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-6">
              {search || filterCategory !== 'all' || filterSource !== 'all'
                ? 'Essayez de modifier vos filtres.'
                : 'Aucune application trouvee. Ajoutez-en manuellement ou attendez la synchro.'}
            </p>
          </div>
        )}

        {filteredApps.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredApps.map((app) => {
              const IconComponent = getIcon(app.icon)
              const isAuto = app.source === 'github' || app.source === 'vercel'
              return (
                <div
                  key={app.id}
                  className={`group relative bg-white dark:bg-slate-800/80 rounded-xl border shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden ${
                    isAuto
                      ? 'border-slate-200/80 dark:border-slate-700/40'
                      : 'border-slate-200 dark:border-slate-700/50 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <div className="h-1 w-full" style={{ backgroundColor: app.color }} />
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <FaviconIcon url={app.url} fallbackIcon={IconComponent} color={app.color} />
                        <div className="min-w-0">
                          <h3 className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                            {app.name}
                          </h3>
                          <div className="flex items-center gap-1 mt-0.5">
                            {sourceBadge(app.source)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {app.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">
                        {app.description}
                      </p>
                    )}

                    <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate mb-3 font-mono">
                      {app.url}
                    </p>

                    <div className="flex items-center gap-1.5">
                      <a href={app.url} target="_blank" rel="noopener noreferrer" className="flex-1">
                        <Button
                          size="sm"
                          className="w-full text-xs bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-sm"
                        >
                          <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                          Ouvrir
                        </Button>
                      </a>
                      {!isAuto && (
                        <>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" onClick={() => openEditDialog(app)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Modifier</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-500 dark:hover:text-red-400" onClick={() => openDeleteDialog(app)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Supprimer</TooltipContent>
                          </Tooltip>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 text-center">
          <p className="text-xs text-slate-400 dark:text-slate-500">
            GitHub App Manager — Synchronisation automatique GitHub Pages & Vercel
          </p>
        </div>
      </footer>

      {/* Settings Dialog */}
      <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-violet-600" />
              Parametres de synchronisation
            </DialogTitle>
            <DialogDescription>
              Configurez vos comptes pour synchroniser automatiquement vos applications déployées.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            {/* GitHub Username */}
            <div className="grid gap-2">
              <Label htmlFor="gh-username">Nom d&apos;utilisateur GitHub</Label>
              <Input
                id="gh-username"
                placeholder="thieuquillabru"
                value={settings.githubUsername}
                onChange={(e) => setSettings({ ...settings, githubUsername: e.target.value })}
              />
              <p className="text-[11px] text-slate-400">Synchronisera tous les repos avec GitHub Pages activé.</p>
            </div>

            {/* GitHub Token (optional) */}
            <div className="grid gap-2">
              <Label htmlFor="gh-token">Token GitHub (optionnel)</Label>
              <Input
                id="gh-token"
                type="password"
                placeholder="ghp_xxxxxxxxxxxx"
                value={settings.githubToken}
                onChange={(e) => setSettings({ ...settings, githubToken: e.target.value })}
              />
              <p className="text-[11px] text-slate-400">Augmente la limite de requetes API. Stocké localement dans votre navigateur.</p>
            </div>

            {/* Vercel Token */}
            <div className="grid gap-2">
              <Label htmlFor="vc-token">Token Vercel</Label>
              <Input
                id="vc-token"
                type="password"
                placeholder="Vercel token"
                value={settings.vercelToken}
                onChange={(e) => setSettings({ ...settings, vercelToken: e.target.value })}
              />
              <p className="text-[11px] text-slate-400">
                Créez un token sur{' '}
                <a href="https://vercel.com/account/tokens" target="_blank" rel="noopener noreferrer" className="text-violet-600 hover:underline">
                  vercel.com/account/tokens
                </a>
              </p>
            </div>

            {/* Auto Sync Toggle */}
            <div className="flex items-center justify-between py-2">
              <div>
                <Label>Synchronisation automatique</Label>
                <p className="text-[11px] text-slate-400">Synchro toutes les 5 minutes + au chargement</p>
              </div>
              <button
                type="button"
                onClick={() => setSettings({ ...settings, autoSync: !settings.autoSync })}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 ${
                  settings.autoSync ? 'bg-violet-600' : 'bg-slate-200 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    settings.autoSync ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setSettingsDialogOpen(false)}>
              Fermer
            </Button>
            <Button
              onClick={() => {
                setSettingsDialogOpen(false)
                setTimeout(doSync, 300)
              }}
              className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Enregistrer & Sync
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingApp ? (
                <><Pencil className="h-5 w-5 text-violet-600" />Modifier l&apos;application</>
              ) : (
                <><Plus className="h-5 w-5 text-violet-600" />Nouvelle application</>
              )}
            </DialogTitle>
            <DialogDescription>
              {editingApp ? 'Modifiez les informations.' : 'Ajoutez une application manuellement.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="app-name">Nom <span className="text-red-500">*</span></Label>
              <Input id="app-name" placeholder="Mon Application" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="app-url">URL <span className="text-red-500">*</span></Label>
              <Input id="app-url" placeholder="https://username.github.io/my-app" value={formData.url} onChange={(e) => setFormData({ ...formData, url: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="app-desc">Description</Label>
              <Textarea id="app-desc" placeholder="Decrivez votre application..." value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} />
            </div>
            <div className="grid gap-2">
              <Label>Categorie</Label>
              <Select value={formData.category} onValueChange={(val) => setFormData({ ...formData, category: val })}>
                <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                <SelectContent>
                  {categoryPresets.map((cat) => (<SelectItem key={cat} value={cat}>{cat}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Icone</Label>
              <div className="grid grid-cols-6 gap-2">
                {iconOptions.map((iconName) => {
                  const Ic = iconMap[iconName]
                  return (
                    <button key={iconName} type="button" onClick={() => setFormData({ ...formData, icon: iconName })}
                      className={`flex items-center justify-center h-10 w-full rounded-lg border-2 transition-all duration-150 ${
                        formData.icon === iconName
                          ? 'border-violet-600 bg-violet-50 dark:bg-violet-950/30 text-violet-600'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      <Ic className="h-4 w-4" />
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Couleur</Label>
              <div className="flex flex-wrap gap-2">
                {colorOptions.map((color) => (
                  <button key={color} type="button" onClick={() => setFormData({ ...formData, color })}
                    className={`h-8 w-8 rounded-full border-2 transition-all duration-150 flex items-center justify-center ${
                      formData.color === color ? 'border-slate-900 dark:border-white scale-110' : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: color }}
                  >
                    {formData.color === color && <Check className="h-4 w-4 text-white" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSubmit} className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white">
              {editingApp ? 'Enregistrer' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-500" />
              Supprimer cette application ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irreversible. L&apos;application{' '}
              <span className="font-semibold text-slate-900 dark:text-white">{deletingApp?.name}</span>{' '}
              sera definitivement supprimee.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}