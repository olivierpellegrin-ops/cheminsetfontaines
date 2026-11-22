# Chemins et Fontaines

Recréation **en code** du site [cheminsetfontaines.fr](https://www.cheminsetfontaines.fr)
(association de randonnée, Bassignac-le-Haut, Corrèze) — copie à l'identique du
site Framer, indépendance totale vis-à-vis de l'abonnement Framer.

> Chantier-école : chaque module (auth, itinéraires, GPX, agent IA) est conçu
> pour être transplanté dans le futur back-office SylvaGreen Management.

## Stack

- **Next.js 15 (App Router) + TypeScript strict**
- **PostgreSQL + Prisma** (collections migrées depuis les exports CSV Framer)
- Docker Compose (base de données locale)
- Sans Tailwind : tokens CSS de la charte (`app/globals.css`, spec §9.6)

## Démarrage

```bash
npm install
docker compose up -d                # PostgreSQL local
cp .env.example .env
npx prisma db push                  # schéma
npm run db:seed                     # import des CSV Framer (25 routes, 5 events, 2 newsletters)
npm run dev                         # http://localhost:3000
```

Les traces GPX ne sont pas dans le dépôt distant initial : voir
[docs/MEDIA.md](docs/MEDIA.md) pour les ajouter depuis le PC
(dossier OneDrive `03_Itineraires/migration-auto/`).

## Structure

```
app/fr/            Site public FR (home, routes, events, newsletters, dons, contact, carte)
app/en/            Squelette « English Version — Under Construction » (Q1)
app/actions.ts     Server actions (newsletter, adhésion, contact) + honeypots
app/api/gpx/       Téléchargement GPX nommé (fallback 302 vers Framer)
prisma/            Schéma + seed de migration
lib/slug.ts        Normalisation slugs (Q2), parsing Details, communes INSEE
data/framer/       Exports CSV du CMS Framer (sources de migration, non modifiés)
docs/              MEDIA (GPX/photos), ROADMAP, SECRETS (pointeurs, jamais de secrets)
```

## Règles du repo

- **Zéro secret committé** : clés Brevo/Stripe/Strava/Mistral dans `.env`
  (jamais versionné), pointeurs documentés dans `docs/SECRETS.md`.
- **Zéro donnée personnelle committée** (RGPD) : abonnés Mailchimp et demandes
  d'adhésion vivent en base, jamais dans le repo.
- Photo de Paulette Lafarge **exclue** de tout média publié (instruction de
  l'association).

## Specs

Le document de spécifications v1.1 fait référence (copie dans ce repo :
`docs/specs.md` à l'initialisation ; source de vérité : canvas du projet).
