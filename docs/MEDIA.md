# Médias — GPX et photos

## 1. Traces GPX (25 itinéraires)

Les traces ne sont pas poussées via l'API GitHub (volume). Deux sources
possibles, au choix :

**Option A (recommandée) — depuis le dossier OneDrive** :

```powershell
# PowerShell, depuis la racine du repo cloné sur le PC
$src = "C:\Users\olivi\OneDrive\Documents\08 - Associations\03 - Chemins & Fontaines\03 - site internet\03_Itineraires\migration-auto"

# Correspondance : dossier = slug Framer d'origine -> public/gpx/<slug normalisé>.gpx
Get-ChildItem $src -Directory | ForEach-Object {
  $gpx = Join-Path $_.FullName "trace.gpx"
  if (Test-Path $gpx) {
    $slug = $_.Name
    $slug = $slug -replace "[éèêë]", "e" -replace "[àâä]", "a" -replace "[îï]", "i" -replace "[ôö]", "o" -replace "[ûü]", "u" -replace "ç", "c" -replace "'", "" -replace "-{2,}", "-"
    Copy-Item $gpx "public\gpx\$slug.gpx"
  }
}
git add public/gpx ; git commit -m "GPX : 25 traces (migration Framer)" ; git push
```

**Option B — re-téléchargement depuis les assets Framer** : la colonne
`GPX Upload` de `data/framer/routes.csv` contient l'URL de chaque trace
(`https://framerusercontent.com/assets/…`). Tant que le fichier local
`public/gpx/<slug>.gpx` est absent, l'API `/api/gpx/<slug>` fait une
redirection 302 vers cet asset : le site fonctionne dès le premier jour.

**Audit slug normalisé <-> dossier d'origine** (Q2) :
`afm-téléthon-2026---randonnée-12-kms` -> `afm-telethon-2026-randonnee-12-kms`
(seuls les 2 slugs Téléthon changent ; les 23 autres sont identiques).

## 2. Photos d'itinéraires

- **v0.1** : les fiches utilisent les URLs `framerusercontent.com` des CSV
  (`Route Image`, `Route Photos`). Zéro binaire dans le repo.
- **v0.2 (auto-hébergement)** : utiliser UNIQUEMENT les fichiers
  `..._1200x800.png` du dossier OneDrive
  `03_Itineraires/Routes/<Commune>/` (règle actée : les `_original.png` ne
  sont jamais servis). À déposer dans `public/photos/<slug>/…` puis à
  basculer `Route.imageUrl` en chemin local.
  - 27 fichiers `1200x800` pour 25 itinéraires ;
  - 2 surplus à arbitrer : `blh_trou_du_loup_260909` et
    `route_soursac_viaduc_des_rochers_noirs` ;
  - mapping quasi biunivoque par nom de fichier (voir table ci-dessous
    à remplir lors du portage).

## 3. Logo et favicon

À récupérer depuis OneDrive `01_Identite/` (SVG/PNG HD + favicon) et à poser
dans `public/brand/`. Le header utilise pour l'instant un logotype texte
(serif display + point ochre) — portage pixel prévu (cf. ROADMAP §1).
