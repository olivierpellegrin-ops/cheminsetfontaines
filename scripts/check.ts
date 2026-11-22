import { parseCsvAsObjects } from "../lib/csv.ts";
import { normalizeSlug, parseDetails, canonicalCommune, parseEventDate } from "../lib/slug.ts";
import { readFile } from "node:fs/promises";

const assert = (cond: boolean, msg: string) => {
  if (!cond) { console.error("FAIL:", msg); process.exitCode = 1; }
  else console.log("ok:", msg);
};

const routes = parseCsvAsObjects(await readFile("data/framer/routes.csv", "utf-8"));
const events = parseCsvAsObjects(await readFile("data/framer/events.csv", "utf-8"));
const newsletters = parseCsvAsObjects(await readFile("data/framer/newsletters.csv", "utf-8"));
const photos = parseCsvAsObjects(await readFile("data/framer/route-photos.csv", "utf-8"));

assert(routes.length === 25, `25 routes parsées (obtenu ${routes.length})`);
assert(events.length === 5, `5 events (obtenu ${events.length})`);
assert(newsletters.length === 2, `2 newsletters (obtenu ${newsletters.length})`);
assert(photos.length === 6, `6 photos (obtenu ${photos.length})`);

// Description multi-ligne de la newsletter d'août conservée intégralement
const aout = newsletters.find((n) => n["Publication Label"] === "Août 2026");
assert(!!aout && aout["Summary"].includes("Bonne marche!"), "résumé multi-ligne intact");
// Guillemets échappés dans randonnée secrète
const secrete = routes.find((r) => r["Slug"].startsWith("randonnee-secrete"));
assert(!!secrete && secrete["Description"].includes('"secrète"'), "guillemets CSV décodés");

// Slugs normalisés
assert(normalizeSlug("afm-téléthon-2026---randonnée-12-kms") === "afm-telethon-2026-randonnee-12-kms", "slug Téléthon 12k");
assert(normalizeSlug("afm-téléthon-2026---randonnée-6-kms") === "afm-telethon-2026-randonnee-6-kms", "slug Téléthon 6k");
assert(normalizeSlug("le-trou-du-loup") === "le-trou-du-loup", "slug inchangé");
assert(normalizeSlug("panoramas-d’automne") === "panoramas-dautomne", "apostrophe typographique retirée");
let changed = 0;
for (const r of routes) if (normalizeSlug(r["Slug"]) !== r["Slug"]) changed++;
assert(changed === 2, `exactement 2 slugs qui changent (obtenu ${changed})`);
let collision = false;
const seen = new Set<string>();
for (const r of routes) { const s = normalizeSlug(r["Slug"]); if (seen.has(s)) collision = true; seen.add(s); }
assert(!collision, "aucune collision de slug normalisé");

// Communes canoniques
assert(canonicalCommune("St-Chamand").name === "Saint-Chamant", "St-Chamand -> Saint-Chamant");
assert(canonicalCommune("Servières-Le-Château").insee === "19258", "Servières INSEE");
assert(canonicalCommune("Bassignac-Le-Haut").slug === "bassignac-le-haut", "Bassignac slug");
assert(canonicalCommune("Gros-Chastang").name === "Gros-Chastang", "Gros-Chastang résolu");
assert(canonicalCommune("Marcillac-La-Croisille").name === "Marcillac-la-Croisille", "Marcillac résolu");
assert(canonicalCommune("St Julien aux Bois").slug === "st-julien-aux-bois", "St Julien aux Bois");

// Détails éclatés
const d1 = parseDetails("distance 12 kms - dénivellé 167 m - niveau moyen");
assert(d1.distanceKm === 12 && d1.elevationGainM === 167 && d1.difficulty === "moyen", "details Téléthon 12k");
const d2 = parseDetails("12 km · 470 m D+ · niveau moyen");
assert(d2.distanceKm === 12 && d2.elevationGainM === 470, "details D+ (fdv-2026-12kms)");
const d3 = parseDetails("16 km · 772 m D+ · niveau modéré");
assert(d3.difficulty === "moyen", "modéré -> moyen (fdv-auriac)");
const d4 = parseDetails("14 kms - dénivelé 590 - niveau difficile");
assert(d4.distanceKm === 14 && d4.elevationGainM === 590 && d4.difficulty === "difficile", "details Trou du Loup");
const d5 = parseDetails("6 kms · niveau facile");
assert(d5.distanceKm === 6 && d5.difficulty === "facile" && d5.elevationGainM === null, "details fdv-2026-6kms");

// Dates d'events
const e1 = parseEventDate("31 OCT 2026 · 14:00");
assert(e1 && e1.getUTCFullYear() === 2026 && e1.getUTCMonth() === 9 && e1.getUTCDate() === 31 && e1.getUTCHours() === 14, "event AFM Téléthon");
const e2 = parseEventDate("01 AOUT 2026 · 09:00");
assert(e2 && e2.getUTCMonth() === 7 && e2.getUTCDate() === 1, "event Fête du village");
const e3 = parseEventDate("14 SEPT. · 09:00", 2027);
assert(e3 && e3.getUTCFullYear() === 2027 && e3.getUTCMonth() === 8, "brouillon sans année -> année par défaut");
const e4 = parseEventDate("28 SEPT. · 10:00", 2027);
assert(e4 && e4.getUTCDate() === 28, "brouillon Bois et sources");

console.log("Terminé.");
