# Secrets — pointeurs uniquement

**Règle absolue : aucun secret dans le chat, dans ce repo, ni dans les
identifiants des issues.** Les secrets vivent dans `.env` (local) ou dans
le magasin de l'hébergeur au déploiement.

| Service | Où créer | Variable(s) `.env` | Statut |
|---|---|---|---|
| PostgreSQL | `docker compose up -d` | `DATABASE_URL` | requis |
| Notifications bureau | — | `NOTIFY_EMAIL` (`contact@cheminsetfontaines.fr`) | requis |
| Brevo (relay newsletters + adhésion) | brevo.com -> Transactionnel > SMTP & API | `BREVO_API_KEY`, `BREVO_LIST_ID` | v0.2 |
| Stripe (dons v2 : reçus, totaux) | dashboard.stripe.com > Developers > API keys + Webhooks | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | v0.3 |
| Strava (agent, suivi incrémental) | strava.com/settings/api | `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`, `STRAVA_REFRESH_TOKEN` | v0.4 |
| Modèle de texte de l'agent | console.mistral.ai | `MISTRAL_API_KEY` | v0.4 |
| Back-office (Auth.js, B0) | génération locale : `openssl rand -base64 32` | `AUTH_SECRET` | requis back-office |
| Viewer GPX admin (tuiles satellite+terrain) | maptiler.com > Dashboard > Credentials | `MAPTILER_KEY` | requis viewer |
| Premier compte admin (seed) | - | `ADMIN_EMAIL`, `ADMIN_PASSWORD` (+ `ADMIN_NAME` optionnel) | requis une fois, puis retirés du `.env` |

Le lien de don Stripe utilisé en v1 est public par nature (Payment Link) :
`https://buy.stripe.com/5kQ8wR4X3bKNb8e5Z4bo402` — ce n'est pas un secret.

Audience Mailchimp historique (remplacée par Brevo) :
`cheminsetfontaines.us19.list-manage.com` (`u=d8ca3d7b03b51b0bc6b05e561`,
liste `1782fcea85`). Export de 39 abonnés actifs + 5 `cleaned` reçu le
22/11/2026 dans OneDrive `05_Newsletters/audience_export/` : à importer en
base uniquement (jamais dans le repo).
