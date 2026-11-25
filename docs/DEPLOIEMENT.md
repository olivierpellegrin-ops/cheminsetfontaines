# Déploiement production — runbook (Vercel + Neon)

> Décisions actées le 24/11/2026 : Vercel (plan Hobby) héberge le site,
> Neon (Francfort, AWS eu-central-1) héberge la base PostgreSQL.
> Le domaine `cheminsetfontaines.fr` ET la mailbox `contact@cheminsetfontaines.fr`
> RESTENT chez Gandi : seule la zone DNS web change, en toute fin de chantier.
>
> NOTE : ce fichier a été écrasé par un placeholder lors d'un push via le
> connecteur GitHub (incident du 24/11) puis reconstruit le 25/11/2026 à
> partir du journal du chantier. Le contenu reflète les décisions déjà
> exécutées ; le compléter si une étape évolue.

## 1. Vue d'ensemble

- **Site** : Vercel, import du repo GitHub `olivierpellegrin-ops/cheminsetfontaines`
  (GitHub App Vercel en « Only select repositories »). Build + déploiement
  automatiques à chaque push sur `main`, previews sur chaque PR.
  À l'import : refuser « Prisma Postgres » et ignorer les blocs « Onboard your
  agent » (Neon et Vercel), le plan « personal projects/Hobby » suffira.
- **Base** : Neon, org « Chemins et Fontaines », projet `cheminsetfontaines`,
  service Postgres UNIQUEMENT (ne rien activer d'autre), région
  AWS eu-central-1 (Francfurt — non modifiable a posteriori). Connection string
  **pooled** (`-pooler.nom_region.aws.neon.tech`), via Computes > Connect >
  Show password.
- **Domaine + messagerie** : chez Gandi, inchangés. La bascule DNS (§5) ne
  JAMAIS toucher aux enregistrements MX ni aux entêtes SPF/DKIM existants de
  la zone : ils portent la réception de `contact@cheminsetfontaines.fr`.

## 2. Secrets et variables

**GitHub Actions** (repo > Settings > Secrets and variables > Actions) :

| Secret | Usage |
|---|---|
| `PROD_DATABASE_URL` | `prisma db push` du workflow « Production (base Neon) » |
| `PROD_ADMIN_EMAIL`, `PROD_ADMIN_PASSWORD`, `PROD_ADMIN_NAME` | seed initial (compte admin de production) |

Rappel : `AUTH_SECRET` n'est PAS un secret GitHub, il ne vit que dans les
variables d'environnement Vercel.

**Vercel** (Projet > Settings > Environment Variables, cocher Production et
Preview) :

| Variable | Valeur |
|---|---|
| `DATABASE_URL` | string pooled Neon (`postgresql://…-pooler…`), pas de `?schema=public` manquant |
| `AUTH_SECRET` | `openssl rand -base64 32` (signature des cookies de session) |
| `MAPTILER_KEY` | clé satellite + terrain-rgb du viewer GPX (restriction « Origins » à acter après bascule DNS) |
| `NOTIFY_EMAIL` | `contact@cheminsetfontaines.fr` (destinataire des notifications bureau) |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `MAIL_FROM` | émission depuis la mailbox Gandi (brique N0 « Remplacement Mailchimp », voir docs/SECRETS.md) |

Aucun secret dans le repo, le chat, ni les issues — règle absolue du chantier.

## 3. Déploiements et base de production

1. Push sur `main` → build Vercel + prévisualisation de branche sur PR.
   Le build Vercel vérifie les types Prisma UNE erreur à la fois : prévoir un
   cycle d'itérations sur la preview de branche avant fusion.
2. Push sur `main` touchant `prisma/**` → le workflow GitHub « Production
   (base Neon) » applique automatiquement `npx prisma db push`. Il est
   volontairement SANS `--accept-data-loss` : un schéma destructif doit
   échouer bruyamment.
3. Seed initial (une seule fois, ou reset des identifiants admin) :
   Actions > « Production (base Neon) » > Run workflow > cocher « seed
   initial ». Le seed fait un UPSERT du compte `PROD_ADMIN_EMAIL` (reset du
   mot de passe = re-run avec la case cochée).
4. Local : `npm install`, `docker compose up -d`, `cp .env.example .env`,
   `npx prisma db push`, `npm run db:seed`, `npm run dev`.

## 4. Délivrabilité des e-mails (avant le premier envoi réel, brique N4)

Dans la zone DNS Gandi, SANS toucher aux MX ni à l'existant de la mailbox :

1. SPF unique incluant le service d'envoi Gandi (fiche de la mailbox) ;
2. DKIM si proposé par Gandi (clé publiée en TXT) ;
3. DMARC `p=none` avec `rua=mailto:contact@cheminsetfontaines.fr` ;
4. Test http://mail-tester.com : cible ≥ 8/10 avant la première newsletter.

Vérifier ensuite la réception chez Orange, Free, Gmail et Outlook.

## 5. Bascule DNS Gandi (à la TOUTE FIN, acté le 24/11)

- `cheminsetfontaines.fr` (apex) : enregistrement A vers Vercel ;
- `www` : CNAME vers le domaine Vercel (`cname.vercel-dns.com`) ;
- ne RIEN toucher d'autre (MX, SPF/DKIM de la mailbox, TXT existants).
- Vérifier au cours de la propagation : https, redirect apex↔www, previews.

## 6. Checklist post-déploiement

- [ ] Pages FR + squelette EN, aucune erreur console
- [ ] 301 des 2 anciens slugs Téléthon (accentués) fonctionnels
- [ ] robots.txt + sitemap indexés sur le domaine réel
- [ ] `/admin` : login admin OK, `/admin/*` non indexé
- [ ] Viewer GPX : restriction « Origins » activée sur la clé MapTiler
- [ ] Formulaire de contact : message reçu DANS la mailbox contact@
      (brique N0), `EmailOutbox` en `sent` en base
- [ ] Formulaire newsletter + modale adhésion : enregistrements en base
- [ ] Images framerusercontent (remotePatterns) affichées

## 7. Journal

- **24/11/2026** : comptes Neon (eu-central-1) et Vercel (Hobby) créés,
  secrets posés, PR #5 fusionnée (workflow base + ce runbook), seed OK
  (Commune 33 lignes), builds de correctifs (#6, #7 : types Prisma,
  `Prisma.DbNull`, postinstall `prisma generate`, MapLibre
  `preserveDrawingBuffer`), déploiement main Ready, login admin OK (leçon :
  secret AUTH_SECRET absent = « identifiants invalides » affiché).
- **25/11/2026** : brique N0 « Remplacement Mailchimp » (MailService SMTP
  interne, Mailpit local, notification formulaire de contact) ; ce runbook
  reconstruit (fichier écrasé par un placeholder le 24/11, détecté le 25).
