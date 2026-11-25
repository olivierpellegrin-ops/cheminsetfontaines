# Feuille de route

## v0.1 — Socle (livré)

- [x] Next.js 15 + TS strict + Prisma/PostgreSQL + docker compose
- [x] Pages FR : home (mission, 3 derniers events — Q6, itinéraires, dons,
      adhésion, newsletter), routes (regroupées par commune — Q16, avec ancres),
      fiche itinéraire (+ album photos), events, newsletters, dons, contact, carte
- [x] Squelette `/en` « English Version — Under Construction » (Q1, obligatoire)
- [x] Modale d'adhésion à l'identique (9 champs + honeypots `website`/`company`)
- [x] Server actions + honeypots (newsletter, adhésion, contact)
- [x] Téléchargement GPX nommé (`/api/gpx/<slug>`, fallback 302 Framer)
- [x] Galerie 3/2/1, ratio 4:3, rayon 14 px, lightbox clavier (Échap/flèches)
- [x] Seed depuis les CSV Framer (normalisation slugs Q2, difficultés,
      communes INSEE, brouillons Events conservés hors ligne)
- [x] Redirections 301 des slugs normalisés ; aucune redirection Framer (Q8)
- [x] Charte §9.6 en tokens CSS ; `prefers-reduced-motion`
- [x] sitemap.xml + robots.txt ; CI GitHub Actions (seed + typecheck + build)

## v0.2 — Portage pixel & médias

- [ ] Ajout des 25 GPX locaux (docs/MEDIA.md) puis retrait du fallback Framer
- [ ] Logo/brand depuis `01_Identite/` + favicon
- [ ] Photos auto-hébergées (`1200x800` uniquement) + AVIF/WebP (Sharp)
- [ ] Carte SVG interactive (portage de `XaintrieTownshipMap.tsx`,
      30 communes + codes INSEE + 16 interactives) — module non essentiel
      acté le 22/11 (la carte n'est pas accessible aux visiteurs actuellement)
- [ ] Chantier « Remplacement Mailchimp » (spec du 25/11/2026, dev interne,
      D1-D6 actées) : [x] N0 socle MailService (SMTP Gandi + Mailpit local +
      notification contact) ; [x] N1 double opt-in souscripteurs (confirmation,
      bienvenue, désinscription 1 clic, admin souscripteurs, script import
      Mailchimp — l'import réel est une procédure bureau, hors repo) ; [x] N2 parcours e-mails
      adhérents (confirmation à jeton 30 j, fiche au bureau, admin membres +
      export CSV, bienvenue à la création, rappels de renouvellement,
      suppression RGPD) ; [x] N3
      éditeur de newsletters (génération mensuelle, éditeur par blocs,
      aperçu et test d'envoi) ; [ ] N4
      envoi de masse + DNS SPF/DKIM/DMARC ; [ ] N5 réseaux sociaux assistés
- [ ] Import abonnés Mailchimp (39 actifs en `subscribed`, marquage `import` ;
      5 `cleaned` exclues — décision D4) — hors repo, procédure bureau
- [ ] Mentions légales/RGPD (n° RNA manquant), politique de confidentialité

## v0.3 — Back office

- [ ] Auth.js (rôles `admin`/`bureau`), `/admin/*` non indexé
- [ ] CRUD collections (React Hook Form + Zod), slug auto/éditable,
      toggle brouillon/publication, uploads image (Sharp) + GPX (validation XML)
- [ ] Import/export CSV par collection (sauvegarde du bureau)
- [ ] Analytics légère auto-hébergée (Umami ou Plausible CE)

## v0.4 — Agent Strava (§7 des specs)

- [ ] Ingestion du ZIP d'export Strava (`06_Strava/export/`)
- [ ] Filtrage géographique Xaintrie (validation visuelle — Q13 acté : oui,
      plus tard) ; enrichissement (titre/description par modèle Mistral)
- [ ] Dédoublonnage (Hausdorff simplifiée) et stock tampon de brouillons
- [ ] Écran « Import Strava » + journal des imports ; suivi incrémental
      API OAuth (app Strava à créer — Q12/Q14 descopés v1)

## Décisions non bloquantes restantes

- Q3 résiduel : vraie page Facebook (lien actuel générique)
- Q6/Q9 : années des 3 events brouillons à compléter à la publication
- Q7 : hébergement (Vercel vs VPS UE) au moment du déploiement
- `circuit-des-3-sapins` vs titre « Chemins des Marchands de Parapluie » :
  arbitrage slug/slug conservé tel quel en v0.1 (redirection si renommage)
