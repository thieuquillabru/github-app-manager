'use client'

import { useState, useEffect, useCallback } from 'react'
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
  'General',
  'Frontend',
  'Backend',
  'Fullstack',
  'Mobile',
  'DevOps',
  'API',
  'Outils',
  'Data',
  'Design',
]

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
}

const STORAGE_KEY = 'github-app-manager-apps'

const defaultFormData = {
  name: '',
  url: '',
  description: '',
  category: 'General',
  color: '#6e40c9',
  icon: 'Link',
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9)
}

function loadApps(): AppItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveApps(apps: AppItem[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(apps))
}

export default function Home() {
  const [apps, setApps] = useState<AppItem[]>([])
  const [mounted, setMounted] = useState(false)
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingApp, setEditingApp] = useState<AppItem | null>(null)
  const [deletingApp, setDeletingApp] = useState<AppItem | null>(null)
  const [formData, setFormData] = useState(defaultFormData)
  const { toast } = useToast()

  // Load from localStorage on mount
  useEffect(() => {
    setApps(loadApps())
    setMounted(true)
  }, [])

  // Persist to localStorage whenever apps change
  useEffect(() => {
    if (mounted) {
      saveApps(apps)
    }
  }, [apps, mounted])

  // Get unique categories from apps
  const categories = ['all', ...Array.from(new Set(apps.map((a) => a.category)))]

  // Filter apps
  const filteredApps = apps.filter((app) => {
    const matchSearch =
      app.name.toLowerCase().includes(search.toLowerCase()) ||
      app.url.toLowerCase().includes(search.toLowerCase()) ||
      (app.description?.toLowerCase().includes(search.toLowerCase()) ?? false)
    const matchCategory = filterCategory === 'all' || app.category === filterCategory
    return matchSearch && matchCategory
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
      toast({
        title: 'Champs requis',
        description: 'Le nom et l\'URL sont obligatoires.',
        variant: 'destructive',
      })
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

  // Prevent flash of empty state before localStorage loads
  if (!mounted) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <header className="border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse" />
              <div className="h-6 w-40 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
            </div>
            <div className="h-9 w-32 rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse" />
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
          <Button
            onClick={openCreateDialog}
            className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-lg shadow-violet-200 dark:shadow-violet-900/30 transition-all duration-200 hover:scale-[1.02]"
          >
            <Plus className="h-4 w-4 mr-2" />
            Ajouter
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        {/* Stats Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <LayoutGrid className="h-4 w-4 text-slate-400" />
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {filteredApps.length} application{filteredApps.length !== 1 ? 's' : ''}
              {filterCategory !== 'all' && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {filterCategory}
                </Badge>
              )}
            </span>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Rechercher une app..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-full sm:w-40 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
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

        {/* App Grid */}
        {filteredApps.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="flex items-center justify-center h-20 w-20 rounded-2xl bg-slate-100 dark:bg-slate-800 mb-6">
              <Github className="h-10 w-10 text-slate-300 dark:text-slate-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              {search || filterCategory !== 'all'
                ? 'Aucun resultat'
                : 'Aucune application'}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-6">
              {search || filterCategory !== 'all'
                ? 'Essayez de modifier vos filtres de recherche.'
                : 'Commencez par ajouter votre premiere application GitHub.'}
            </p>
            {!search && filterCategory === 'all' && (
              <Button
                onClick={openCreateDialog}
                variant="outline"
                className="border-violet-200 text-violet-700 hover:bg-violet-50 dark:border-violet-800 dark:text-violet-400 dark:hover:bg-violet-950"
              >
                <Plus className="h-4 w-4 mr-2" />
                Ajouter une app
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredApps.map((app) => {
              const IconComponent = getIcon(app.icon)
              return (
                <div
                  key={app.id}
                  className="group relative bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/50 shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-200 overflow-hidden"
                >
                  {/* Color accent bar */}
                  <div
                    className="h-1 w-full"
                    style={{ backgroundColor: app.color }}
                  />
                  <div className="p-4">
                    {/* App Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex items-center justify-center h-10 w-10 rounded-lg text-white shrink-0 shadow-sm"
                          style={{ backgroundColor: app.color }}
                        >
                          <IconComponent className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                            {app.name}
                          </h3>
                          <Badge
                            variant="secondary"
                            className="text-[10px] px-1.5 py-0 mt-0.5"
                          >
                            {app.category}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    {app.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">
                        {app.description}
                      </p>
                    )}

                    {/* URL Preview */}
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate mb-3 font-mono">
                      {app.url}
                    </p>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5">
                      <a
                        href={app.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1"
                      >
                        <Button
                          size="sm"
                          className="w-full text-xs bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-sm"
                        >
                          <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                          Ouvrir
                        </Button>
                      </a>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                            onClick={() => openEditDialog(app)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Modifier</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-red-500 dark:hover:text-red-400"
                            onClick={() => openDeleteDialog(app)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Supprimer</TooltipContent>
                      </Tooltip>
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
            GitHub App Manager — Gerez vos liens d&apos;applications en un seul endroit
          </p>
        </div>
      </footer>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingApp ? (
                <>
                  <Pencil className="h-5 w-5 text-violet-600" />
                  Modifier l&apos;application
                </>
              ) : (
                <>
                  <Plus className="h-5 w-5 text-violet-600" />
                  Nouvelle application
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {editingApp
                ? 'Modifiez les informations de votre application.'
                : 'Ajoutez une nouvelle application GitHub a votre collection.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            {/* Name */}
            <div className="grid gap-2">
              <Label htmlFor="app-name">
                Nom <span className="text-red-500">*</span>
              </Label>
              <Input
                id="app-name"
                placeholder="Mon Application"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            {/* URL */}
            <div className="grid gap-2">
              <Label htmlFor="app-url">
                URL <span className="text-red-500">*</span>
              </Label>
              <Input
                id="app-url"
                placeholder="https://username.github.io/my-app"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              />
            </div>

            {/* Description */}
            <div className="grid gap-2">
              <Label htmlFor="app-desc">Description</Label>
              <Textarea
                id="app-desc"
                placeholder="Decrivez votre application..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />
            </div>

            {/* Category */}
            <div className="grid gap-2">
              <Label>Categorie</Label>
              <Select
                value={formData.category}
                onValueChange={(val) => setFormData({ ...formData, category: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choisir une categorie" />
                </SelectTrigger>
                <SelectContent>
                  {categoryPresets.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Icon Picker */}
            <div className="grid gap-2">
              <Label>Icone</Label>
              <div className="grid grid-cols-6 gap-2">
                {iconOptions.map((iconName) => {
                  const Ic = iconMap[iconName]
                  return (
                    <button
                      key={iconName}
                      type="button"
                      onClick={() => setFormData({ ...formData, icon: iconName })}
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

            {/* Color Picker */}
            <div className="grid gap-2">
              <Label>Couleur</Label>
              <div className="flex flex-wrap gap-2">
                {colorOptions.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData({ ...formData, color })}
                    className={`h-8 w-8 rounded-full border-2 transition-all duration-150 flex items-center justify-center ${
                      formData.color === color
                        ? 'border-slate-900 dark:border-white scale-110'
                        : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: color }}
                  >
                    {formData.color === color && (
                      <Check className="h-4 w-4 text-white" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
            >
              Annuler
            </Button>
            <Button
              onClick={handleSubmit}
              className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white"
            >
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
              <span className="font-semibold text-slate-900 dark:text-white">
                {deletingApp?.name}
              </span>{' '}
              sera definitivement supprimee.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
