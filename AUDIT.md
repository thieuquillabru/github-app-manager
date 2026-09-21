# Audit de debogage — github-app-manager

**Date :** 21 septembre 2026
**Agent :** `development-tools/debugger` (claude-code-templates), installe dans `.claude/agents/development-tools/debugger.md`
**Symptome rapporte :** « il y a plusieurs bug et les applications n'apparaissent plus »

---

## 1. Resume executif

La disparition des applications **n'etait pas un probleme de deploiement** : les 12 derniers
workflows GitHub Pages sont tous verts et le site repondait bien en HTTP 200.

C'etait un **bug logique dans la synchronisation**, en deux temps :

1. La synchronisation consommait **120 requetes GitHub par heure** alors que le quota
   anonyme est de **60 req/h** → l'API finissait systematiquement par repondre `403`.
2. Une reponse `403` etait traitee comme « 0 application trouvee » au lieu de « echec ».
   La liste etait alors reconstruite a partir de ce tableau vide, **puis ecrite dans
   `localStorage`**. Les applications disparaissaient de l'ecran **et du stockage**, donc
   elles ne revenaient plus, meme apres rechargement.

Reproduction chiffree du code d'origine :

```
OLD CODE: apps before = 3 | after a 403 sync = 0
OLD CODE: names after = []
>> REPRODUCED: all apps vanished.
OLD CODE: 10 requests per sync -> 120 req/h at 5min interval (quota anon = 60/h)
```

**14 bugs** ont ete identifies et corriges, dont 3 critiques. Le build etait par ailleurs
**totalement casse hors ligne**, et le depot n'avait **aucun test**.

---

## 2. Bug critique #1 — Les applications disparaissent (cause racine)

### Observe vs attendu
> Quand l'API GitHub repond `403` (quota atteint), l'application **efface toutes les
> applications** et persiste cette liste vide, alors qu'elle **devrait conserver** la liste
> existante et signaler l'echec.

### Chaine de defaillance

**(a) Motif N+1 qui epuise le quota** — `fetchGithubPagesRepos()` faisait 1 requete de
listing **+ 1 requete `/pages` par depot**. Avec 9 depots Pages : 10 requetes par sync.
Avec un auto-sync toutes les 5 minutes : **120 req/h contre 60 autorisees**.

**(b) L'echec est avale silencieusement** — `if (!res.ok) break` sortait de la boucle et
retournait un tableau **vide**, indiscernable d'un « aucune application ». Idem cote Vercel
avec un `catch {}` muet.

**(c) La fusion ecrase tout** — la liste des applications automatiques etait **integralement
reconstruite** a partir du resultat :
```js
return [...newAutoApps, ...manualApps]   // newAutoApps === [] lors d'un 403
```

**(d) Persistance de l'etat corrompu** — `useEffect(... saveToStorage(APPS_KEY, apps))`
ecrivait aussitot la liste vide dans `localStorage`. **La perte devenait permanente.**

### Correctifs
- **`src/lib/sync.ts` (nouveau)** : logique de synchronisation extraite, pure et testable.
- Les fonctions retournent desormais un `SyncResult { ok, apps, error }` : un echec est
  **explicitement distingue** d'un resultat vide legitime.
- **Suppression du N+1** : l'URL Pages est deduite (`https://<user>.github.io/<repo>/`).
  **10 requetes → 1.**
- Intervalle d'auto-sync porte de 5 a **15 minutes**, et **mis en pause quand l'onglet est
  masque**. Budget : **2 req/sync × 4 sync/h = 8 req/h** (contre 120).
- `mergeSyncedApps()` applique une regle stricte : **une source dont la synchro a echoue
  conserve ses applications**. Une suppression n'a lieu que si la synchro a **reussi**.
- Un depot reellement supprime disparait toujours correctement (non-regression verifiee).

---

## 3. Bug critique #2 — Build casse hors ligne / en cas de coupure reseau

`layout.tsx` utilisait `next/font/google`, qui **telecharge les polices pendant le build**.
Sans acces a `fonts.googleapis.com`, le build echoue completement :

```
Error: Turbopack build failed with 2 errors:
Failed to fetch Geist from Google Fonts.
```

Le deploiement dependait donc de la disponibilite de Google a chaque push.

**Correctif :** passage au paquet `geist`, qui **auto-heberge** exactement les memes polices.
Plus aucun appel reseau au build. Aucun changement visuel.

---

## 4. Bug critique #3 — `.nojekyll` manquant

GitHub Pages fait passer les sites par Jekyll, qui **ignore les dossiers commencant par `_`**.
Or tout le JavaScript de Next.js vit dans **`_next/`**. Le site ne survivait que grace au
build `workflow` ; tout basculement vers un deploiement par branche aurait produit une
**page blanche totale**. C'est exactement la panne deja rencontree sur `ExchangeMGA` et
`akiba` d'apres `worklog.md`.

**Correctif :** ajout de `public/.nojekyll` (present dans `out/` apres build, verifie 200).

---

## 5. Autres bugs corriges

| # | Gravite | Bug | Correctif |
|---|---------|-----|-----------|
| 4 | Haute | `localStorage.setItem` non protege : leve une exception en navigation privee Safari / quota plein, ce qui **interrompait le rendu** | `try/catch` sur toutes les ecritures et lectures |
| 5 | Haute | Etat vide + comptes configures ne correspondait **a aucune branche** de rendu → **page entierement blanche sans issue** | Nouvel etat vide « Aucune application » avec boutons Synchroniser / Ajouter |
| 6 | Haute | Les erreurs de synchro etaient **invisibles** : l'utilisateur voyait ses apps disparaitre sans explication | Banniere d'alerte inline + toast explicite, precisant que **rien n'a ete supprime** |
| 7 | Moyenne | `repairStoredApps` : un unique drapeau `changed` partage dans un `.map()` faisait **reecrire toutes les apps suivant la premiere corrigee** | Detection de changement **par application** |
| 8 | Moyenne | Donnees corrompues dans `localStorage` (`null`, champs manquants) → crash au rendu | Entrees invalides ignorees, repli sur `BUNDLED_APPS` si tout est corrompu |
| 9 | Moyenne | `onClick={doSync}` passait un **MouseEvent** comme argument d'options (erreur de type reelle) | `onClick={() => { void doSync() }}` |
| 10 | Moyenne | Aucune protection contre les **synchros concurrentes** (clic manuel pendant un auto-sync) | Verrou `syncInFlightRef` |
| 11 | Moyenne | Pagination GitHub potentiellement **infinie** (`hasMore` jamais faux si l'API repete une page pleine) | Arret sur page incomplete + plafond de 10 pages |
| 12 | Basse | `useIsMobile` : `setState` synchrone dans un effet → rendus en cascade + flash de mise en page | Reecrit avec `useSyncExternalStore` |
| 13 | Basse | `setState` dans l'effet d'initialisation → cascade de rendus | Initialiseurs paresseux `useState(() => ...)` |
| 14 | Basse | Code mort : `categories` calcule a chaque rendu sans jamais etre affiche ; imports `ExternalLink`, `Filter`, `Badge` inutilises ; prop `url` inutilisee dans `AppIcon` | Supprimes |

### Renforcement supplementaire
- `AppIcon` : `(name || '?')[0]` plantait sur une chaine vide → `.trim().charAt(0) || '?'`.
- Recherche : `search.trim()`, une recherche vide n'exclut plus rien.
- Selection d'URL Vercel : alias de preview (`*-git-*`, `*-projects.vercel.app`) correctement
  rejetes au profit de l'alias de production.
- Les jetons saisis par l'utilisateur ont desormais la priorite sur les jetons d'environnement.

---

## 6. Tests de non-regression

Le depot ne contenait **aucun test** (seulement des scripts shell d'infrastructure).
**31 tests** ont ete ajoutes, tous passants :

- **`tests/sync.test.mjs`** (27 tests) — providers, fusion, reparation du stockage, URLs.
- **`tests/incident-timeline.test.mjs`** (4 tests) — rejoue la panne complete :
  premiere visite → sync saine → `403` → **rechargement** → retablissement.

Ces tests **echouent contre l'ancien code** : ce sont de vraies sentinelles, pas de la
decoration. Tests cles :

```
REGRESSION: a failed GitHub sync keeps the existing GitHub apps
REGRESSION: a failed Vercel sync keeps the existing Vercel apps
REGRESSION: both providers failing leaves the whole list untouched
GitHub: one request per page - no N+1 /pages call (this is what blew the quota)
INCIDENT TIMELINE: apps survive a GitHub quota exhaustion
INCIDENT TIMELINE: 10 consecutive failures never erode the list
QUOTA BUDGET: a sync costs 2 requests, so 15 min auto-sync stays under 60 req/h
```

---

## 7. Prevention

La CI deployait **sans jamais verifier quoi que ce soit** : ni types, ni lint, ni tests.
C'est pour cela que le bug est parti en production avec un workflow « vert ».

Le correctif est fourni dans **`.ci-patch/add-quality-gate-to-deploy-workflow.patch`**.

> ⚠️ Il n'a **pas pu etre pousse automatiquement** : l'App GitHub de cette session n'a pas
> la permission `workflows`, GitHub refuse donc toute modification de `.github/workflows/`.
> Voir `.ci-patch/README.md` pour l'appliquer en une commande.

Une fois applique, `.github/workflows/deploy.yml` executera, **avant** le build :

```yaml
- name: Typecheck
  run: bun run typecheck
- name: Lint
  run: bun run lint
- name: Unit tests
  run: npm test
```

Nouveaux scripts : `npm test`, `npm run typecheck`.

---

## 8. Etat final

| Verification | Avant | Apres |
|---|---|---|
| `tsc --noEmit` | ✅ | ✅ |
| `eslint .` | ❌ 2 erreurs | ✅ 0 |
| `next build` | ❌ **casse hors ligne** | ✅ |
| Tests | ❌ inexistants | ✅ **31/31** |
| `npm audit` | ✅ 0 | ✅ 0 |
| `.nojekyll` | ❌ absent | ✅ |
| Apps preservees sur erreur API | ❌ **effacees** | ✅ **conservees** |
| Quota GitHub | ❌ 120 req/h (> 60) | ✅ **8 req/h** |

---

## 9. Point de securite

- Aucun jeton n'a fuite : `.env` ne contient qu'un `DATABASE_URL` factice inutilise, et le
  bundle compile ne contient aucun secret.
- **A noter tout de meme** : `NEXT_PUBLIC_GITHUB_TOKEN` / `NEXT_PUBLIC_VERCEL_TOKEN` sont,
  par construction, **integres en clair dans le JavaScript public** lors du build. Si ces
  secrets GitHub Actions sont renseignes, **n'importe qui peut les extraire du site**.
  Le correctif du quota rend ces jetons inutiles pour un compte public : la recommandation
  est de **vider les secrets `APP_GH_TOKEN` et `VERCEL_TOKEN_APP`** et de laisser les
  utilisateurs saisir leur propre jeton via l'ecran Reglages (stocke localement).

---

## 10. Fichiers modifies

```
.claude/agents/development-tools/debugger.md   (nouveau) agent installe
src/lib/sync.ts                                (nouveau) logique de sync testable
tests/sync.test.mjs                            (nouveau) 27 tests
tests/incident-timeline.test.mjs               (nouveau) 4 tests de scenario
public/.nojekyll                               (nouveau) correctif GitHub Pages
AUDIT.md                                       (nouveau) ce rapport
src/app/page.tsx                               correctif de la cause racine + 10 bugs
src/app/layout.tsx                             polices auto-hebergees
src/hooks/use-mobile.ts                        useSyncExternalStore
.ci-patch/                                     (nouveau) portail qualite CI, a appliquer a la main
package.json                                   scripts test + typecheck, dep geist
.gitignore                                     out/, .preview/
```
