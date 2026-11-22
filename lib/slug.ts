/**
 * Normalisation des slugs (décision Q2, 23/11/2026) :
 * - sans accents (NFD, marks retirés),
 * - apostrophes remplacées par rien (panoramas-d'automne -> panoramas-dautomne),
 * - tirets multiples réduits à un seul,
 * - minuscules, sans espaces.
 * Exemples :
 *   afm-téléthon-2026---randonnée-12-kms -> afm-telethon-2026-randonnee-12-kms
 *   fdv-auriac-2026 -> fdv-auriac-2026 (inchangé)
 */
export function normalizeSlug(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Libellés de difficulté historiques -> enum cible ("modéré" -> moyen, "doux" -> facile). */
export function normalizeDifficulty(raw: string): "facile" | "moyen" | "difficile" | null {
  const v = raw.trim().toLowerCase();
  if (!v) return null;
  if (v.startsWith("facile") || v === "doux") return "facile";
  if (v.startsWith("moyen") || v === "modéré" || v === "modere") return "moyen";
  if (v.startsWith("difficile") || v === "soutenu") return "difficile";
  return null;
}

/**
 * Éclate le champ "Details" Framer (formats non constants) :
 *   "distance 12 kms - dénivellé 167 m - niveau moyen"
 *   "16 km · 772 m D+ · niveau modéré"
 */
export function parseDetails(
  details: string
): { distanceKm: number | null; elevationGainM: number | null; difficulty: "facile" | "moyen" | "difficile" | null } {
  const text = details.toLowerCase();
  const km = text.match(/(\d+(?:[.,]\d+)?)\s*(?:km|kms)/);
  const dplus = text.match(/(?:d[ée]nivel[l]?[ée]?\s*(?:positif)?|d\+)\s*(\d+)|(\d+)\s*m\s*d\+/);
  let elevation: number | null = null;
  if (dplus) {
    elevation = Number(dplus[1] ?? dplus[2] ?? dplus[3]);
  } else {
    const m = text.match(/(\d+(?:[.,]\d+)?)\s*m\b/);
    if (m) elevation = Number(m[1].replace(",", "."));
  }
  const level = text.match(/niveau\s+([a-zéèû]+)$/);
  return {
    distanceKm: km ? Number(km[1].replace(",", ".")) : null,
    elevationGainM: elevation,
    difficulty: level ? normalizeDifficulty(level[1]) : null,
  };
}

/**
 * Nommage canonique INSEE des communes de la Xaintrie (issu de
 * XaintrieTownshipMap.tsx). Les libellés Township du CMS Framer sont
 * incohérents ("St-Chamand", "Servieres-le-Chateau"...) : la migration
 * normalise vers ces noms canoniques (spec §9.3), le libellé d'affichage
 * d'origine est conservé (Route.townshipLabel) pour la copie à l'identique.
 */
export const XAINTRIE_COMMUNES: Record<string, { name: string; insee: string }> = {
  albussac: { name: "Albussac", insee: "19004" },
  argentat: { name: "Argentat-sur-Dordogne", insee: "19010" },
  auriac: { name: "Auriac", insee: "19014" },
  "bassignac-le-bas": { name: "Bassignac-le-Bas", insee: "19017" },
  "bassignac-le-haut": { name: "Bassignac-le-Haut", insee: "19018" },
  "camps-st-mathurin": { name: "Camps-Saint-Mathurin-Léobazel", insee: "19034" },
  darazac: { name: "Darazac", insee: "19069" },
  forges: { name: "Forgès", insee: "19084" },
  goulles: { name: "Goulles", insee: "19086" },
  hautefage: { name: "Hautefage", insee: "19091" },
  "la-chapelle-saint-geraud": { name: "La-Chapelle-Saint-Géraud", insee: "19045" },
  mercoeur: { name: "Mercœur", insee: "19133" },
  "monceaux-sur-dordogne": { name: "Monceaux-sur-Dordogne", insee: "19140" },
  neuville: { name: "Neuville", insee: "19149" },
  reygade: { name: "Reygade", insee: "19171" },
  "rilhac-xaintrie": { name: "Rilhac-Xaintrie", insee: "19173" },
  "saint-bonnet-elvert": { name: "Saint-Bonnet-Elvert", insee: "19186" },
  "saint-bonnet-les-tours-de-merle": { name: "Saint-Bonnet-les-Tours-de-Merle", insee: "19189" },
  "st-chamand": { name: "Saint-Chamant", insee: "19192" },
  "st-cirgue-la-loutre": { name: "Saint-Cirgues-la-Loutre", insee: "19193" },
  "saint-geniez-o-merle": { name: "Saint-Geniez-ô-Merle", insee: "19205" },
  "saint-hilaire-taurieux": { name: "Saint-Hilaire-Taurieux", insee: "19212" },
  "st-julien-aux-bois": { name: "Saint-Julien-aux-Bois", insee: "19214" },
  "saint-julien-le-pelerin": { name: "Saint-Julien-le-Pèlerin", insee: "19215" },
  "saint-martial-entraygues": { name: "Saint-Martial-Entraygues", insee: "19221" },
  "st-martin-la-meanne": { name: "Saint-Martin-la-Méanne", insee: "19222" },
  "saint-privat": { name: "Saint-Privat", insee: "19237" },
  "saint-sylvain": { name: "Saint-Sylvain", insee: "19245" },
  "servieres-le-chateau": { name: "Servières-le-Château", insee: "19258" },
  sexcles: { name: "Sexcles", insee: "19259" },
  // Communes-lien hors SVG Xaintrie mais présentes dans le CMS (itinéraires réels)
  "gros-chastang": { name: "Gros-Chastang", insee: "19092" },
  "marcillac-la-croisille": { name: "Marcillac-la-Croisille", insee: "19126" },
};

export function canonicalCommune(
  townshipLabel: string
): { slug: string; name: string; insee: string } {
  const norm = normalizeSlug(townshipLabel);
  const key = norm.replace(/^saint-/, "st-");
  const known = XAINTRIE_COMMUNES[key] ?? XAINTRIE_COMMUNES[norm];
  if (known) {
    return { slug: key, name: known.name, insee: known.insee };
  }
  // commune inconnue : on la crée sous son libellé normalisé
  return { slug: norm, name: townshipLabel.trim(), insee: "" };
}

/**
 * Dates Events Framer : "31 OCT 2026 · 14:00" (publiés) ou
 * "14 SEPT. · 09:00" (brouillons, sans année -> année courante provisoire,
 * à corriger à la publication, cf. spec §6.9).
 */
const MONTHS: Record<string, number> = {
  jan: 1, janv: 1, fev: 2, "fév": 2, mar: 3, avr: 4, mai: 5, juin: 6,
  juil: 7, aou: 8, "aoû": 8, "aout": 8, "août": 8, sep: 9, sept: 9,
  oct: 10, nov: 11, dec: 12, "déc": 12,
};

export function parseEventDate(label: string, defaultYear?: number): Date | null {
  const m = label.match(/(\d{1,2})\s*([A-ZÉÛa-zéû.]+)\.?\s*(\d{4})?.*?(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const day = Number(m[1]);
  const monthRaw = m[2].toLowerCase().replace(/\./g, "");
  const month = MONTHS[monthRaw.slice(0, 4)] ?? MONTHS[monthRaw.slice(0, 3)];
  if (!month) return null;
  const year = m[3] ? Number(m[3]) : (defaultYear ?? new Date().getFullYear());
  const hour = Number(m[4]);
  const min = Number(m[5]);
  return new Date(Date.UTC(year, month - 1, day, hour, min));
}
