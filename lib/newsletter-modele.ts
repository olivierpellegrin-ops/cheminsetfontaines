import { type NlBlock } from "@/lib/newsletters";

/**
 * Brique N3.7 (spec §6.3) : le « modèle standard » de l'association —
 * la newsletter de septembre 2026 (modèle Mailchimp « CeF - newsletters
 * #2 - 09.26 ») RECONSTRUITE en blocs, donnée par donnée, depuis le HTML
 * fourni par Olivier. « Créer d'après le modèle » part de cette structure
 * complète (édito, 6 itinéraires avec commune/vignette/lien, texte du
 * bureau, invitation à adhérer) : à dupliquer ou à retoucher bloc par
 * bloc dans l'éditeur.
 *
 * Toutes les données sont PUBLIQUES (contenu du site et de ses
 * parcours, textes du bureau) : rien de personnel ici. Depuis le
 * re-hébergement des images (N3.10), les vignettes des itinéraires
 * sont servies par le site lui-même (public/images/routes), plus
 * aucune dépendance au CDN de l'ancien compte Mailchimp.
 */

const SITE = "https://www.cheminsetfontaines.fr";

/**
 * Édito du modèle (bloc b6 du HTML de septembre) : les deux paragraphes
 * originaux, séparés par une ligne vide.
 */
export const MODELE_EDITEO =
  "L’association Chemins et Fontaines parcourt toute la Xaintrie pour tracer " +
  "les randonnées de la Fédération Française de Randonnées. Elles sont " +
  "remarquables par un panneau signalétique que nous prenons soin de " +
  "photographier pour vous servir au mieux.\n\n" +
  "Vous trouverez ci-dessous les 6 derniers parcours FFR enregistrés sur " +
  "notre site :";

/** Texte du bureau entre les deux bandes (bloc b23 du HTML de septembre). */
export const MODELE_TEXTE_BUREAU =
  "Nos adhérents prennent soin de participer à ces randonnées et à bien " +
  "relever toutes les informations qui vous seront utiles.";

/**
 * Le modèle standard complet, bloc par bloc (mêmes blocs et mêmes bandes
 * de 3 colonnes que le rendu du HTML de septembre) : une fonction pour
 * garantir des objets NEUFS à chaque création (jamais de référence
 * partagée mutant entre numéros).
 */
export function modeleStandardBlocks(): NlBlock[] {
  const routes: NlBlock[] = [
    {
      type: "route",
      title: "Itinéraire",
      card: {
        slug: "les-moulinots",
        title: "Les Moulinots",
        townshipLabel: "Argentat",
        imageUrl: SITE + "/images/routes/les-moulinots-01.jpg",
        imageAlt: null,
        excerpt: "",
        url: SITE + "/fr/routes/les-moulinots",
      },
    },
    {
      type: "route",
      title: "Itinéraire",
      card: {
        slug: "puy-du-bassin",
        title: "Le Puy du Bassin",
        townshipLabel: "Auriac",
        imageUrl: SITE + "/images/routes/puy-du-bassin-01.jpg",
        imageAlt: null,
        excerpt: "",
        url: SITE + "/fr/routes/puy-du-bassin",
      },
    },
    {
      type: "route",
      title: "Itinéraire",
      card: {
        slug: "le-trou-du-loup",
        title: "Le Trou du Loup",
        townshipLabel: "Bassignac Le Haut",
        imageUrl: SITE + "/images/routes/le-trou-du-loup-01.jpg",
        imageAlt: null,
        excerpt: "",
        url: SITE + "/fr/routes/le-trou-du-loup",
      },
    },
    {
      type: "route",
      title: "Itinéraire",
      card: {
        slug: "sentier-des-4-puys",
        title: "Le Sentier des 4 Puys",
        townshipLabel: "Sexcles",
        imageUrl: SITE + "/images/routes/sentier-des-4-puys-01.jpg",
        imageAlt: null,
        excerpt: "",
        url: SITE + "/fr/routes/sentier-des-4-puys",
      },
    },
    {
      type: "route",
      title: "Itinéraire",
      card: {
        slug: "le-gourdaloup",
        title: "Le Gourdaloup",
        townshipLabel: "St Cirgue La Loutre",
        imageUrl: SITE + "/images/routes/le-gourdaloup-01.jpg",
        imageAlt: null,
        excerpt: "",
        url: SITE + "/fr/routes/le-gourdaloup",
      },
    },
    {
      type: "route",
      title: "Itinéraire",
      card: {
        slug: "circuit-des-3-sapins",
        title: "Chemins des marchands",
        townshipLabel: "St Julien aux Bois",
        imageUrl: SITE + "/images/routes/circuit-des-3-sapins-01.jpg",
        imageAlt: null,
        excerpt: "",
        url: SITE + "/fr/routes/circuit-des-3-sapins",
      },
    },
  ];

  return [
    { type: "intro", body: MODELE_EDITEO },
    ...routes.slice(0, 3),
    { type: "texte", title: "", body: MODELE_TEXTE_BUREAU },
    ...routes.slice(3),
    { type: "adhesion" },
  ];
}
