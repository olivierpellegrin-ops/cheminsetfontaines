# Deploiement production — cheminsetfontaines.fr

Stack : **Vercel** (front + back-office Next.js) + **Neon** (PostgreSQL) + DNS **Gandi**
(la mailbox contact@cheminsetfontaines.fr ne bouge pas : aucun enregistrement MX/email ne doit etre modifie).

Sources de verite : specs `docs/specs.md`, secrets `docs/SECRETS.md` (jamais de secret dans le repo ni dans le chat).

## Automatisations livrees

| Evenement | Effet | Ou |
|---|---|---|
| push sur `main` | build + deploy du site sur cheminsetfontaines.fr | Vercel (natif) |
| PR ouverte | preview automatique + commentaire avec l'URL | Vercel (natif) |
| push sur `main` modifiant `prisma/` | `prisma db push` sur la base Neon | workflow `production.yml` |
| declenchement manuel (onglet Actions > Production) | `db push` seul, ou `db push` + **seed initial** si case cochee | workflow `production.yml` |
| echec d'un job | fin des logs publiee dans une issue du repo (meme garde-fou que la CI), fermee au succes suivant | workflow `production.yml` |

## Etape 1 — Neon (base, 10 min, une seule fois)

1. Creer un compte sur neon.com (plan gratuit, region **Frankfurt / eu-central-1**, UE).
2. Creer un projet `cheminsetfontaines` > branche par defaut `main`.
3. Copier la ``connection string` `postgresql://...` (avec `?sslmode=require`).
4. Dans le repo GitHub : Settings > Secrets and variables > Actions > New repository secret :
   - `PROD_DATABASE_URL` = la connection string Neon ;
   - `PROD_ADMIN_EMAIL`, `PROD_ADMIN_PASSWORD`, `PROD_ADMIN_NAME` = identifiants reels du premier compte admin (le seed les supprimera ensuite du local).

## Etape 2 — Vercel (site, 15 min, une seule fois)

1. Creer un compte sur vercel.com (plan Hobby, gratuit pour association).
2. Add New... > Project > importer le repo GitHub `olivierpellegrin-ops/cheminsetfontaines`.
   Le framework est detecte (Next.js), aucune config a changer (Node 22 par defaut).
3. Environment Variables (Production ET Preview), valeurs des secrets reels :
   - `DATABASE_URL` = connection string Neon (identique a PROD_DATABASE_URL) ;
   - `AUTH_SECRET` = `openssl rand -base64 32` ;
   - `MAPTILER_KEY` = cle existante ;
   - `NOTIFY_EMAIL` = contact@cheminsetfontaines.fr.
   Ne pas mettre ADMIN_* en prod (seed uniquement).
4. Deploy : le build part des le import. Chaque push sur `main` re-déploie ensuite tout seul ; chaque PR genere une preview.
   RC : sur les previews, le back-office admin reste protege par l'auth (rappel : ne pas saisir de vraies donnees sur une preview).

## Etape 3 — Seed initial de la base (une seule fois, depuis GitHub)

Onglet **Actions** > workflow **Production (base Neon)** > Run workflow > cocher **seed initial** > Run.
(Cree le schema via `prisma db push` puis importe les donnees Framer + le compte admin.)

## Etape 4 — DNS Gandi sans casser la mailbox

Dans Gandi > domaine cheminsetfontaines.fr > Zone DNS :
- **ne rien toucher** aux enregistrements MX, SPF ou DKIM (la mailbox reste chez Gandi) ;
- modifier / creer le **A** de `@` avec l'IP fournie par le dashboard Vercel (Domains) ;
- creer/modifier le **CNAME** de `www` vers `cname.vercel-dns.com` ;
- laisser se propager (quelques minutes a quelques heures), puis "Verify" dans le dashboard Vercel.
Le certificat HTTPS Let's Encrypt est emis automatiquement par Vercel.

## Etape 5 — Verifications post-deploiement

- [ ] parcours complet front : accueil, 3 derniers itineraires home, une fiche, un GPX, sorties, newsletters, dons, contact ;
- [ ] les 2 redirections 301 des anciens slugs Telethon (F12 > Network > statut 301) ;
- [ ] `/admin` : login admin, creation d'itineraire avec GPX + capture viewer (JPEG, rappel des limites_serverActions) ;
- [ ] restriction **Origins** de la cle MapTiler : maptiler.com > Credentials > Domain restrictions > cheminsetfontaines.fr ;
- [ ] robots.txt et images framerusercontent.com (remotePatterns) OK ;
- [ ] retirer ADMIN_PASSWORD du .env local si encore present (le seed prod a deja servi).

## Journal des deploiements

- 2026-11-24 : passage au chantier deploiement, branche `deploiement-production` (workflow + ce runbook).
