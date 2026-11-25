# Feuille de route

*État au 25/11/2026 (v1.2 des specs). Production : Vercel (Hobby) + PostgreSQL Neon eu-central-1, déploiement automatique à chaque push main.*

## v0.1 — Socle (livré)

- [x] Next.js 15 + TS strict + Prisma/PostgreSQL + docker compose
- [x] Pages FR : home (mission, 3 derniers events — Q6, itinéraires, dons,
      adhésion, newsletter), routes (regroupées par commune — Q16, avec ancres),
      fiche itinéraire (+ album photos), events, newsletters, dons, contact, carte
- [x] Squelette `/en` « English Version — Under Construction » (Q1, obligatoire)
- [x] Modale d'adhésion à l'identique (9 champs + honeypots `website`/`company`)
- [x] Server actions + honeypots (newsletter, adhésion, contact)
- [x] Téléchargement GPX nommé (`/api/gpx/<slug>`)
- [x] Galerie 3/2/1, ratio 4:3, rayon 14 px, lightbox clavier (Échap/flèches)
- [x] Seed depuis les CSV Framer (normalisation slugs Q2, difficultés,
      communes INSEE, brouillons Events conservés hors ligne)
- [x] Redirections 301 des slugs normalisés ; aucune redirection Framer (Q8)
- [x] Charte §9.6 en tokens CSS ; `prefers-reduced-motion`
- [x] sitemap.xml + robots.txt ; CI GitHub Actions (seed + typecheck + build)

## v0.2 — Portage pixel & médias (largement livré)

- [x] ~~Ajout des 25 GPX locaux puis retrait du fallback Framer~~ (25/11 : les 25
      traces servies localement, parité md5 25/25 ; le fallback ne joue plus que
      si le fichier local manque)
- [x] ~~Logo/brand depuis `01_Identite/`~~ (25/11 : marque du modèle e-mail
      re-hébergée dans `public/images/brand/` — logos, QR, icônes sociales ;
      **plus aucune image visible du site ni des e-mails servie par un CDN externe**)
- [x] ~~Photos auto-hébergées (`1200x800` uniquement)~~ (25/11 : migration des 25
      photos principales + 6 albums + panneaux FFR compressés ; hero/dons/
      couverture newsletter en WebP côté `public/images/home|newsletters`)
- [ ] Passage AVIF/WebP systématique (Sharp) pour les photos restantes
- [ ] Carte SVG interactive (portage de `XaintrieTownshipMap.tsx`,
      30 communes + codes INSEE + 16 interactives) — module non essentiel
      acté le 22/11 (la carte n'est pas accessible aux visiteurs actuellement)
- [x] Chantier « Remplacement Mailchimp » (spec du 25/11/2026, **dev interne**,
      D1-D6 actées — Brevo abandonné, reste plan B relais SMTP) :
      [x] N0 socle MailService (SMTP Gandi + Mailpit local + notification
      contact, `EmailOutbox`, jamais-throw) ;
      [x] N1 double opt-in souscripteurs (confirmation à jeton, bienvenue,
      désinscription 1 clic, admin souscripteurs, script import Mailchimp) ;
      [x] N2 parcours e-mails adhérents (confirmation à jeton 30 j, fiche au
      bureau, admin membres + export CSV, bienvenue à la création, rappels de
      renouvellement **à l'anniversaire de paiement**, suppression RGPD) ;
      [x] N3 éditeur de newsletters (génération mensuelle, éditeur par blocs,
      aperçu et test d'envoi avec garde « test à jour de la version ») ;
      [x] N3.5 clonage + newsletter vierge ; [x] N3.6 calage du modèle e-mail
      Mailchimp (coquille + logo/QR/réseaux/divider) ; [x] N3.7 « Créer d'après
      le modèle » (septembre reconstruit en blocs) ; [x] N3.8/N3.8b bouton
      Annuler avec garde anti-perte + boutons compacts ;
      [x] N3.9 WYSIWYG : [x] 1/2 canvas vivant (toolbar, réglages au clic,
      aperçu réel dans la page), [x] 2/2 glisser-déposer par poignée +
      édition en place (paragraphes, titres, colonnes d'itinéraire) ;

      [ ] N4 envoi de masse + reprise par lots + DNS SPF/DKIM/DMARC ;
      [ ] N5 réseaux sociaux assistés
- [x] ~~Import abonnés Mailchimp~~ (25/11 : 39 `subscribed` importés sans
      re-opt-in — D4 —, 5 `cleaned` exclues ; libellés FR de l'export couverts)
- [ ] Mentions légales/RGPD (n° RNA manquant), politique de confidentialité
- [ ] Remplacer le lien Instagram générique par le vrai compte (s'il existe)

## v0.3 — Back office (livré)

- [x] Auth.js (rôles `admin`/`bureau`), `/admin/*` non indexé (B0, 23-24/11)
- [x] CRUD itinéraires complet (B2-B4) : formulaires Zod, slug auto/éditable,
      toggle brouillon/publication, suppression avec nettoyage des fichiers,
      uploads image principale + album avec garde-fous de taille (B3)
- [x] **Viewer GPX satellite 3D intégré** (MapLibre + MapTiler) : métriques
      Garmin, profil d'altitude, relief DEM, **capture 1200×800 injectée comme
      photo principale** (Gimp supprimé de la routine), caméra sauvegardée pour
      re-cadrage (V1.1, 24-25/11)
- [x] Export CSV adhérents/souscripteurs pour le bureau (Excel FR : `;` + BOM)
- [ ] Import/export CSV génériques par collection
- [ ] Analytics légère auto-hébergée (Umami ou Plausible CE)

## v0.4 — Agent Strava (§7 des specs)

- [ ] Ingestion du ZIP d'export Strava (`06_Strava/export/`)
- [ ] Filtrage géographique Xaintrie (validation visuelle — Q13 acté : oui,
      plus tard) ; enrichissement (titre/description par modèle Mistral)
- [ ] Dédoublonnage (Hausdorff simplifiée) et stock tampon de brouillons
- [ ] Écran « Import Strava » + journal des imports ; suivi incrémental
      API OAuth (app Strava à créer — Q12/Q14 descopés v1)

## Production (livré le 24/11, bascule DNS en attente)

- [x] Vercel (Hobby) + Neon eu-central-1 (Frankfurt) ; domaine et messagerie
      restent chez Gandi
- [x] Workflow GitHub Actions « Production (base Neon) » : `prisma db push`
      sur main si `prisma/**` touché + seed initial manuel (dispatch) ;
      échecs = logs en issue auto fermée au run vert suivant ;
      `accept_data_loss` uniquement en dispatch manuel explicite
- [x] Build production Ready validé (public + back office + viewer)
- [ ] **Bascule DNS Gandi (A + www CNAME, sans toucher MX/SPF/DKIM) — À LA
      TOUTE FIN du chantier, comme acté**, puis checklist post-déploiement
      (robots/sitemap, 301 slugs, **restriction Origins MapTiler**)

## Décisions non bloquantes restantes

- Q6/Q9 : années des 3 events brouillons à compléter à la publication
- Q7 : ~~hébergement~~ **résolu le 24/11 (Vercel + Neon)**
- Q15 : ~~Brevo~~ **remplacé le 25/11 par le développement interne** (plan B relais SMTP)
- `circuit-des-3-sapins` vs titre « Chemins des Marchands de Parapluie » :
  arbitrage slug conservé tel quel en v0.1 (redirection si renommage)
