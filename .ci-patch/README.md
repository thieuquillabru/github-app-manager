# Portail qualite CI — patch a appliquer manuellement

Ce patch ajoute `typecheck` + `lint` + `test` au workflow de deploiement,
**avant** l'etape de build.

Il n'a pas pu etre pousse automatiquement : l'App GitHub utilisee pour cette
session ne dispose pas de la permission `workflows`, GitHub refuse donc toute
modification de `.github/workflows/` :

```
refusing to allow a GitHub App to create or update workflow
`.github/workflows/deploy.yml` without `workflows` permission
```

## Pourquoi c'est important

La CI deployait **sans rien verifier** : ni types, ni lint, ni tests. C'est
precisement pour cela que le bug « les applications disparaissent » est parti en
production avec un workflow affiche en vert.

## Application

```bash
git apply .ci-patch/add-quality-gate-to-deploy-workflow.patch
git add .github/workflows/deploy.yml
git commit -m "ci: run typecheck, lint and tests before deploying"
git push
```

(ou editez `.github/workflows/deploy.yml` directement depuis l'interface GitHub,
qui n'a pas cette restriction.)
