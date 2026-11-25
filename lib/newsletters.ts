/**
 * Brique N3 « concepteur de newsletters » (spec §4.3/§6.2) : les blocs
 * d'une newsletter, stockés dans Newsletter.blocks (Json). Le tableau de
 * blocs est la SOURCE DE VÉRITÉ unique : l'aperçu, le test d'envoi,
 * l'e-mail réel (brique N4) et la future fiche d'archive en dérivent tous.
 *
 * Les blocs events/route embarquent les données FIGÉES au moment de la
 * génération (redondance volontaire avec Newsletter.snapshot) : le bureau
 * réordonne, masque, édite sans que les données vivent du site ne changent
 * le numéro sous ses pieds entre la rédaction et l'envoi.
 *
 * N3.6 : trois blocs de composition calés sur le modèle Mailchimp —
 * image, bouton, séparateur — pour les numéros exceptionnels.
 */

export interface NlEventCard {
  slug: string;
  title: string;
  dateLabel: string; // libellé affiché à l'identique ("31 OCT 2026 · 14:00")
  details: string;
  url: string; // page des sorties (/fr/events)
}

export interface NlRouteCard {
  slug: string;
  title: string;
  townshipLabel: string;
  imageUrl: string | null;
  imageAlt: string | null;
  excerpt: string;
  url: string; // fiche itinéraire (/fr/routes/<slug>)
}

export interface NlPhoto {
  url: string;
  alt?: string;
  caption?: string;
}

export type NlBlock =
  | { type: "intro"; body: string; hidden?: boolean }
  | { type: "events"; title?: string; cards: NlEventCard[]; hidden?: boolean }
  | { type: "route"; title?: string; card: NlRouteCard; note?: string; hidden?: boolean }
  | { type: "album"; title?: string; photos: NlPhoto[]; hidden?: boolean }
  | { type: "texte"; title?: string; body: string; hidden?: boolean }
  | { type: "image"; src: string; alt?: string; width?: number; href?: string; hidden?: boolean }
  | { type: "bouton"; label: string; href: string; hidden?: boolean }
  | { type: "separateur"; hidden?: boolean }
  | { type: "adhesion"; hidden?: boolean };

export const BLOCK_TYPE_LABELS: Record<NlBlock["type"], string> = {
  intro: "Édito",
  events: "Sorties du mois",
  route: "Itinéraire à la une",
  album: "Album photo",
  texte: "Texte libre",
  image: "Image",
  bouton: "Bouton",
  separateur: "Séparateur",
  adhesion: "Invitation à adhérer",
};

/** Sorties affichées par défaut si le bloc n'a pas de titre ciblé. */
export const EVENTS_BLOCK_TITLE = "Les sorties à venir";

/**
 * Lecture défensive de Newsletter.blocks : tout ce qui n'est pas un
 * tableau de blocs connus (anciens numéros, JSON inattendu) rend un
 * tableau vide — jamais de crash de rendu à l'aperçu/au test.
 */
export function parseBlocks(raw: unknown): NlBlock[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (b): b is NlBlock =>
      typeof b === "object" &&
      b !== null &&
      ["intro", "events", "route", "album", "texte", "image", "bouton", "separateur", "adhesion"].includes(
        (b as { type?: unknown }).type as string
      )
  );
}

/** Stringification canonique (clés triées, `undefined` ignoré). */
function canonical(value: unknown): string {
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return (
      "{" +
      entries
        .map(([k, v]) => JSON.stringify(k) + ":" + canonical(v))
        .join(",") +
      "}"
    );
  }
  return JSON.stringify(value) ?? "null";
}

/**
 * Empreinte FNV-1a 32 bits (hex) de la version des blocs : le test
 * d'envoi enregistre cette empreinte (Newsletter.testedBlocksHash) et
 * toute modification des blocs l'invalide — le bouton « Envoyer » de la
 * brique N4 exigera un test réalisé sur la version actuelle.
 */
export function blocksHash(blocks: NlBlock[]): string {
  let h = 0x811c9dc5;
  const s = canonical(blocks);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}
