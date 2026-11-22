/**
 * Constantes du site — copie à l'identique du site Framer (relevé 22-23/11/2026).
 * Chaque valeur texte provient de la copie HTTrack (02_FrontOffice/cheminsetfontaines_2026).
 */

export const SITE = {
  name: "Chemins et Fontaines",
  baseUrl: "https://www.cheminsetfontaines.fr",
  title: "Chemins et Fontaines — Randonnées en Corrèze",
  description:
    "Association de randonnée à Bassignac-le-Haut, en Corrèze. Marcher ensemble, protéger les paysages qui nous relient. Itinéraires GPX, sorties, newsletters.",
  baseline: "Marcher ensemble, protéger les paysages qui nous relient.",
  kicker: "ASSOCIATION DE RANDONNÉE · CORRÈZE",
  location: "Bassignac-Le-Haut · Corrèze",
  postalAddress: "Chemins et Fontaines, 14 Le Sirieix, Bassignac-Le-Haut, 19220 France",
  notifyEmail: process.env.NOTIFY_EMAIL ?? "contact@cheminsetfontaines.fr",
  contactEmail: "contact@cheminsetfontaines.fr",
  // Q3 résiduel : page Facebook réelle à remplacer dès qu'elle existe (lien générique actuel)
  facebookUrl: "https://www.facebook.com/",
  // Q17 : Stripe Payment Link (v1, aucun secret)
  stripeDonationUrl: "https://buy.stripe.com/5kQ8wR4X3bKNb8e5Z4bo402",
} as const;

export const NAV_LINKS = [
  { href: "/fr", label: "Accueil" },
  { href: "/fr/events", label: "Sorties" },
  { href: "/fr/routes", label: "Itinéraires" },
  { href: "/fr/dons", label: "Dons" },
  { href: "/fr/contact", label: "Contact" },
] as const;

export const FOOTER_LINKS = [
  { href: "/fr/routes", label: "Itinéraires" },
  { href: "/fr/events", label: "Sorties" },
  { href: "/fr/newsletters", label: "Newsletters" },
  { href: "/fr/contact", label: "Contact" },
] as const;
