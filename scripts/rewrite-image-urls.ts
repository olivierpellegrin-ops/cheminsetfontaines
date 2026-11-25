/**
 * Bascule des imageUrl de framerusercontent vers les fichiers locaux
 * (migration contenus réels, 25/11/2026) :
 *
 *   - Route.imageUrl  : /images/routes/<slug>-main.png (25 itinéraires,
 *     cf. docs/MEDIA.md) — les fichiers sont dans public/images/routes/ ;
 *   - RoutePhoto.imageUrl : /images/routes/<slug>-01.jpg (6 albums,
 *     panneaux FFR compressés) ;
 *   - Newsletter.coverImageUrl : la couverture de septembre 2026
 *     (re-hébergement N3.10) bascule vers
 *     /images/newsletters/couverture-09-2026.webp ;
 *   - les fiches créées via le back-office (imageUrl déjà local, ex.
 *     Combejean) ne sont JAMAIS touchées ;
 *   - les itinéraires sans bascule connue restent sur Framer (zéro rupture).
 *
 * Usage (prérequis : base à jour via le seed + fichiers images en place) :
 *   npx tsx scripts/rewrite-image-urls.ts --dry-run   # aperçu sans écriture
 *   npx tsx scripts/rewrite-image-urls.ts             # écriture effective
 *
 * Idempotent : relancer ne change rien (les URLs locales détectées par
 * l'inspection des fichiers sont laissées tranquilles).
 */

import { PrismaClient } from "@prisma/client";
import { access } from "node:fs/promises";
import path from "node:path";

const prisma = new PrismaClient();

/** slugs concernés par la bascule (les 25 routes Framer migrées) */
const HERO_SLUGS = [
  "afm-telethon-2026-randonnee-12-kms",
  "afm-telethon-2026-randonnee-6-kms",
  "comite-des-fetes-2024-auriac",
  "randonnee-secrete-2024-st-martin-la-meanne",
  "comite-des-fetes-2025-rilhac-xaintrie",
  "comite-des-fetes-2024-st-chamand",
  "base-nautique-2023",
  "de-gleny-au-lac-de-feyt",
  "entre-terre-et-eaux",
  "le-trou-du-loup",
  "le-gourdaloup",
  "les-moulinots",
  "circuit-des-3-sapins",
  "puy-du-bassin",
  "sentier-des-4-puys",
  "fete-du-village-2026-goulles",
  "itinereve-2026",
  "le-moulin-de-chambon",
  "tour-du-lac-de-la-valette",
  "rives-et-cotaux-mars-2026-tour-d-argentat",
  "ape-albussac-2026",
  "fdv-2026-6kms",
  "fdv-2026-12kms",
  "blh-tour-1",
  "fdv-auriac-2026",
];

const ALBUM_SLUGS = new Set([
  "sentier-des-4-puys",
  "puy-du-bassin",
  "les-moulinots",
  "le-trou-du-loup",
  "circuit-des-3-sapins",
  "le-gourdaloup",
]);

const isLocal = (url: string) => url.startsWith("/images/");

/** Couvertures de newsletters Framer encore externes (N3.10) : URL -> fichier local */
const NEWSLETTER_COVERS: Record<string, string> = {
  "https://framerusercontent.com/images/ummu5PHEcHXmlv6tpLOtN7HeapM.png":
    "/images/newsletters/couverture-09-2026.webp",
};

async function existsInPublic(rel: string): Promise<boolean> {
  try {
    await access(path.join(process.cwd(), "public", rel));
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  let heroes = 0;
  let albums = 0;
  let covers = 0;
  const warnings: string[] = [];

  // 1. Photos d'albums (fichiers <slug>-01.jpg)
  const albumRoutes = await prisma.route.findMany({
    where: { slug: { in: [...ALBUM_SLUGS] } },
    include: { photos: true },
  });
  for (const route of albumRoutes) {
    for (const photo of route.photos) {
      if (isLocal(photo.imageUrl)) continue;
      const local = `/images/routes/${route.slug}-01.jpg`;
      if (!(await existsInPublic(local.slice(1)))) {
        warnings.push(`album ${route.slug} : fichier manquant ${local}`);
        continue;
      }
      console.log(
        `${dryRun ? "[dry] " : ""}album ${route.slug} : ${photo.imageUrl} -> ${local}`,
      );
      if (!dryRun) {
        await prisma.routePhoto.update({
          where: { id: photo.id },
          data: { imageUrl: local },
        });
      }
      albums++;
    }
  }

  // 2. Images principales
  for (const slug of HERO_SLUGS) {
    const route = await prisma.route.findUnique({ where: { slug } });
    if (!route) {
      warnings.push(`itinéraire absent de la base : ${slug}`);
      continue;
    }
    if (isLocal(route.imageUrl)) continue;
    const local = `/images/routes/${slug}-main.png`;
    if (!(await existsInPublic(local.slice(1)))) {
      warnings.push(`${slug} : fichier manquant ${local}`);
      continue;
    }
    console.log(
      `${dryRun ? "[dry] " : ""}${slug} : ${route.imageUrl} -> ${local}`,
    );
    if (!dryRun) {
      await prisma.route.update({ where: { id: route.id }, data: { imageUrl: local } });
    }
    heroes++;
  }

  // 3. Couvertures de newsletters (N3.10)
  const newsletters = await prisma.newsletter.findMany();
  for (const nl of newsletters) {
    if (!nl.coverImageUrl) continue;
    const local = NEWSLETTER_COVERS[nl.coverImageUrl];
    if (!local) continue;
    if (!(await existsInPublic(local.slice(1)))) {
      warnings.push(`newsletter ${nl.publicationLabel} : fichier manquant ${local}`);
      continue;
    }
    console.log(
      `${dryRun ? "[dry] " : ""}newsletter ${nl.publicationLabel} : ${nl.coverImageUrl} -> ${local}`,
    );
    if (!dryRun) {
      await prisma.newsletter.update({
        where: { id: nl.id },
        data: { coverImageUrl: local },
      });
    }
    covers++;
  }

  console.log(
    `\n${dryRun ? "[dry-run, RIEN écrit] " : ""}${heroes} image(s) principale(s), ${albums} photo(s) d'album, ${covers} couverture(s) de newsletter.`,
  );
  if (warnings.length) {
    console.log("\nAvertissements :");
    for (const w of warnings) console.log(`  - ${w}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
