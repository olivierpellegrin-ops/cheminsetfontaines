/**
 * Compression des panneaux FFR Corrèze vers le repo (24-25/11/2026).
 * usage : node scripts/compress-panels.mjs
 * Prérequis : npm install -D sharp
 * - 6 photos d'albums  -> public/images/routes/<slug>-01.jpg
 * - autres panneaux    -> public/images/panels-ffr/<nom-normalise>.jpg
 * Sortie : JPEG 1200px max de large, q80 mozjpeg (~200-400 Ko).
 */
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { readdirSync } from "node:fs";
import path from "node:path";

const SRC = "C:/Users/olivi/OneDrive/Documents/08 - Associations/03 - Chemins & Fontaines/03 - site internet/03_Itineraires/FFR Corrèze";
const ROUTES = path.resolve("public/images/routes");
const PANELS = path.resolve("public/images/panels-ffr");

/** fichiers de Png/ et archives/ -> sorties spéciales (photo d'album, convention <slug>-01.jpg) */
const ALBUMS = new Map([
  ["Png/St-Cirgue-La-Loutre_le_gourdaloup.png", "routes/le-gourdaloup-01.jpg"],
  ["Png/Sexcles_sentier_des_4_puys.png", "routes/sentier-des-4-puys-01.jpg"],
  ["Png/auriac_le_puy_du_bassin.png", "routes/puy-du-bassin-01.jpg"],
  ["Png/Argentat_les_moulinots.png", "routes/les-moulinots-01.jpg"],
  ["Png/Bassignac_Le_Haut_vers_le_tour_du_loup.png", "routes/le-trou-du-loup-01.jpg"],
  ["archives/st_julien_aux_bois_chemins_des_marchands_de_parapluies.jpg", "routes/circuit-des-3-sapins-01.jpg"],
]);

/** fichiers volontairement écartés (variante avec travaux, HEIC non lisibles par sharp) */
const SKIP = [/travaux/i, /\.heic$/i];

const normalize = (s) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u2019']/g, "")
    .replace(/\.(png|jpe?g)$/i, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

async function convert(rel) {
  const outRel = ALBUMS.get(rel) ?? `panels-ffr/${normalize(path.basename(rel))}.jpg`;
  const outPath = path.resolve("public", outRel);
  await mkdir(path.dirname(outPath), { recursive: true });
  const info = await sharp(path.join(SRC, rel))
    .rotate() // respecte l'orientation EXIF des photos iPhone
    .resize({ width: 1200, withoutEnlargement: true })
    .jpeg({ quality: 80, mozjpeg: true })
    .toFile(outPath);
  console.log(`OK ${rel} -> ${outRel} (${Math.round(info.size / 1024)} Ko, ${info.width}x${info.height})`);
}

async function main() {
  const files = ["Png", "archives"].flatMap((d) =>
    readdirSync(path.join(SRC, d)).map((f) => `${d}/${f}`),
  );
  for (const rel of files) {
    if (SKIP.some((re) => re.test(rel))) {
      console.log(`écarté : ${rel}`);
      continue;
    }
    if (!/\.(png|jpe?g)$/i.test(rel)) {
      console.log(`ignoré (pas une image web) : ${rel}`);
      continue;
    }
    await convert(rel);
  }
  console.log("Terminé.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
