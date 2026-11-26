# Secrets — pointeurs uniquement

**Règle absolue : aucun secret dans le chat, dans ce repo, ni dans les
identifiants des issues.** Les secrets vivent dans `.env` (local) ou dans
le magasin de l'hébergeur au déploiement.

| Service | Où créer | Variable(s) `.env` | Statut |
|---|---|---|---|
| PostgreSQL | `docker compose up -d` | `DATABASE_URL` | requis |
| Notifications bureau | — | `NOTIFY_EMAIL` (`contact@cheminsetfontaines.fr`) | requis |
| Envoi d'e-mails (brique N0 « Remplacement Mailchimp », SMTP interne) | prod : fiche Gandi de la mailbox `contact@cheminsetfontaines.fr` · local : Mailpit du docker-compose (`localhost:1025`) | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` (prod uniquement), `MAIL_FROM` | requis N0 |
| Stripe (dons v2 : reçus, totaux) | dashboard.stripe.com > Developers > API keys + Webhooks | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | v0.3 |
| Strava (agent, brique S1 : OAuth, jetons chiffrés en base) | strava.com/settings/api — créer l'app « Chemins et Fontaines », domaine de callback : `cheminsetfontaines.vercel.app` (localhost accepté d'office en dev) | `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET` — les jetons d'accès/refresh vivent chiffrés (AES-256-GCM, clé dérivée d'`AUTH_SECRET`) dans la table `StravaCredential`, JAMAIS en env ni en clair | S1 livrée |
| Modèle de texte de l'agent | console.mistral.ai | `MISTRAL_API_KEY` | v0.4 |
| Back-office (Auth.js, B0) | génération locale : `openssl rand -base64 32` | `AUTH_SECRET` | requis back-office |
| Viewer GPX admin (tuiles satellite+terrain) | maptiler.com > Dashboard > Credentials | `MAPTILER_KEY` | requis viewer |
| Premier compte admin (seed) | - | `ADMIN_EMAIL`, `ADMIN_PASSWORD` (+ `ADMIN_NAME` optionnel) | requis une fois, puis retirés du `.env` |

Le lien de don Stripe utilisé en v1 est public par nature (Payment Link) :
`https://buy.stripe.com/5kQ8wR4X3bKNb8e5Z4bo402` — ce n'est pas un secret.

Audience Mailchimp historique (remplacée par la gestion interne du chantier
« Remplacement Mailchimp », spec du 25/11/2026) :
`cheminsetfontaines.us19.list-manage.com` (`u=d8ca3d7b03b51b0bc6b05e561`,
liste `1782fcea85`). Export de 39 abonnés actifs + 5 `cleaned` reçu le
22/11/2026 dans OneDrive `05_Newsletters/audience_export/` : à importer en
base uniquement (jamais dans le repo), décision D4 actée (les 39 en
`subscribed`, les 5 `cleaned` exclues).
