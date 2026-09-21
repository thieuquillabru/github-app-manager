# Audit UI/UX & technique — App Manager

**Repo audité :** `thieuquillabru/github-app-manager`
**Date :** 21 septembre 2026
**Branche des correctifs :** `ux/ui-overhaul`
**Stack :** Next.js 16 (App Router, `output: export`) · React 19 · TypeScript · Tailwind CSS v4 · shadcn/ui (Radix) · Bun

> Méthodologie : audit heuristique (Nielsen), accessibilité WCAG 2.1 AA, revue de code React/Next, sécurité, puis application directe des correctifs sur une branche dédiée. Lint et build de production vérifiés (`bun run lint` ✅, `bun run build` ✅).

---

## 1. Synthèse

App Manager est une application mono-page qui centralise vos apps déployées (GitHub Pages + Vercel), avec sync automatique via API, recherche, filtres, et CRUD des entrées manuelles (stockage `localStorage`). Le design de base est soigné (esthétique iOS/Apple, safe-areas, skeleton de chargement, thème sombre défini en CSS).

**Mais** l'audit a révélé **13 problèmes**, dont plusieurs à fort impact :

| Sévérité | Nombre | Exemples |
|----------|--------|----------|
| 🔴 Élevée | 4 | Thème sombre inaccessible (pas de bouton), zoom bloqué (WCAG), secret `.env` versionné, bug icône/couleur |
| 🟠 Moyenne | 5 | Boutons sans libellé accessible, focus visible absent, erreurs de lint, accents FR manquants |
| 🟡 Faible | 4 | Import mort, dev server 404 à la racine, toggles non sémantiques, note de sécurité manquante |

**État : tous corrigés sur la branche `ux/ui-overhaul`.**

---

## 2. Problèmes détectés & corrections appliquées

### 🔴 P1 — Thème sombre défini mais inaccessible à l'utilisateur
- **Constat :** `globals.css` contient une palette `.dark` complète et `next-themes` est installé, mais **aucun `ThemeProvider` ni bouton** n'existait. Le mode sombre était donc du code mort ; l'utilisateur ne pouvait jamais l'activer.
- **Correctif :**
  - `src/components/theme-provider.tsx` (wrapper `next-themes`, `attribute="class"`, `defaultTheme="system"`).
  - `src/components/theme-toggle.tsx` : bouton clair/sombre accessible (label ARIA, garde anti-mismatch d'hydratation).
  - Intégré dans le header + `layout.tsx`.
  - `themeColor` rendu adaptatif (clair/sombre) via `media` queries.

### 🔴 P2 — Zoom désactivé (échec WCAG 2.1 SC 1.4.4 « Resize text »)
- **Constat :** `viewport` avait `maximumScale: 1` + `userScalable: false`, empêchant le pinch-to-zoom — bloquant pour les malvoyants.
- **Correctif :** `maximumScale: 5`, `userScalable: true`.

### 🔴 P3 — Fichier `.env` versionné dans le repo
- **Constat :** `.env` (contenant `DATABASE_URL`) était **suivi par git** alors que `.gitignore` l'exclut — il a été forcé. Présent dans l'historique.
- **Correctif :** `git rm --cached .env` + création d'un `.env.example` documenté.
- **⚠️ Action manuelle requise :** le secret étant déjà dans l'historique git public, il faut **le considérer comme compromis** : régénérez/rotez `DATABASE_URL`, et purgez l'historique si nécessaire (`git filter-repo` ou BFG).

### 🔴 P4 — Icône et couleur choisies mais jamais affichées
- **Constat :** le formulaire d'ajout permet de choisir une **icône** (18 options) et une **couleur** (12 options), mais `AppIcon` les ignorait totalement et affichait toujours une pastille lettre générée par hash du nom. Fonctionnalité trompeuse (l'utilisateur configure quelque chose sans effet).
- **Correctif :** `AppIcon` honore désormais `icon` + `color` pour les apps manuelles ; fallback lettre pour les apps synchronisées.

### 🟠 P5 — Boutons icône sans nom accessible
- **Constat :** header (recherche, réglages, sync, ajout), FAB, pills de filtre, toggles — boutons **icône seule sans `aria-label`**. Un lecteur d'écran annonce « bouton » sans plus.
- **Correctif :** `aria-label` explicites partout + `aria-expanded`/`aria-busy`/`aria-pressed` selon le contexte, icônes décoratives marquées `aria-hidden`.

### 🟠 P6 — Focus clavier invisible
- **Constat :** les boutons custom (non-shadcn) n'avaient aucun style `:focus-visible` — navigation clavier impossible à suivre (échec WCAG 2.4.7).
- **Correctif :** anneaux de focus (`focus-visible:ring`) cohérents sur tous les contrôles interactifs + lien d'évitement « Aller au contenu principal ».

### 🟠 P7 — 2 erreurs de lint (React Compiler / hooks)
- **Constat :** `bun run lint` échouait — `set-state-in-effect` dans `page.tsx` et `use-mobile.ts`.
- **Correctif :** `use-mobile` réécrit avec `useSyncExternalStore` (idiomatique, zéro re-render en cascade) ; l'effet d'hydratation `localStorage` de `page.tsx` documenté et exempté volontairement (pattern hydration-safe légitime). **Lint désormais 100 % vert.**

### 🟠 P8 — Landmarks & régions live manquants
- **Correctif :** `id="main-content"` sur `<main>`, `role="group"` sur les filtres, `aria-live="polite"` sur l'info « dernière synchro », `role="switch"`+`aria-checked` sur le toggle de sync auto.

### 🟠 P9 — Accents français manquants dans l'UI
- **Constat :** « Derniere synchro », « Aucun resultat », « Categorie », « Icone », « definitivement supprime », toasts « Modifiee/Ajoutee/Supprimee/Synchronise/Echec »… Rend l'app peu soignée pour un public francophone.
- **Correctif :** orthographe corrigée dans tous les libellés visibles.

### 🟡 P10 — Import mort
- **Constat :** `Badge` importé mais jamais utilisé.
- **Correctif :** supprimé.

### 🟡 P11 — Dev server 404 à la racine
- **Constat :** `basePath: "/github-app-manager"` (requis pour GitHub Pages) faisait renvoyer 404 à `http://localhost:3000/` en dev.
- **Correctif :** `basePath` appliqué uniquement en production (`NODE_ENV === "production"`). Le dev sert à `/` — meilleure DX et preview fonctionnelle.

### 🟡 P12 — Aucun avertissement sur le stockage des tokens
- **Constat :** les tokens GitHub/Vercel sont écrits en `localStorage` (lisible par tout script → risque XSS) sans que l'utilisateur en soit informé.
- **Correctif :** note de sécurité ajoutée dans la boîte de dialogue Réglages (stockage local, tokens en lecture seule recommandés).

### 🟡 P13 — Robustesse mineure
- Anneaux de focus internes ajoutés aux boutons Modifier/Supprimer des cartes ; labels ARIA contextualisés (« Modifier {nom} »).

---

## 3. Recommandations non appliquées (à décider ensemble)

Ces points sortent du périmètre « UI/UX » ou impliquent des choix produit :

1. **Purger `.env` de l'historique git** (`git filter-repo`) + rotation du secret `DATABASE_URL`. → sécurité, mais réécrit l'historique (impact collaborateurs).
2. **Ne jamais utiliser `NEXT_PUBLIC_*` pour des tokens** : ils sont inlinés dans le bundle client donc publics. Préférer une petite route serveur proxy — mais incompatible avec `output: export` (statique). À arbitrer selon l'hébergement.
3. **Vue grille responsive** sur desktop (actuellement liste 1 colonne même en large) — meilleure densité d'information sur grand écran.
4. **Drag-and-drop de réordonnancement** : le champ `order` existe déjà dans le modèle mais n'est pas exploité dans l'UI.
5. **Tests** : le dossier `tests/` existe ; ajouter des tests de rendu (Vitest + Testing Library) sur le CRUD et les filtres.
6. **Gestion d'erreur réseau plus fine** dans `doSync` (distinguer rate-limit GitHub, token invalide, offline).

---

## 4. Vérifications

```
bun run lint    → ✅ 0 erreur, 0 warning
bun run build   → ✅ build statique généré (3 routes)
dev server      → ✅ 200 à la racine, rendu OK
```

## 5. Fichiers modifiés (branche `ux/ui-overhaul`)

```
.env                              (retiré du suivi git)
.env.example                      (nouveau)
next.config.ts                    (basePath conditionnel)
src/app/layout.tsx                (ThemeProvider, viewport, skip-link)
src/app/page.tsx                  (a11y, icône/couleur, accents, focus)
src/components/theme-provider.tsx (nouveau)
src/components/theme-toggle.tsx   (nouveau)
src/hooks/use-mobile.ts           (useSyncExternalStore)
```

---
*Audit réalisé avec l'agent `ui-ux-designer` et la skill `ui-design-system` (méthodologie NN/g + WCAG 2.1).*
