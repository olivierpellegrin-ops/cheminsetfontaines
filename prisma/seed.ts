/**
 * Seed de migration — import des exports CSV du CMS Framer
 * (data/framer/, plugin CMS Export, dépôt du 22-23/11/2026) vers PostgreSQL.
 *
 * Correspondances de qualité documentées (spec §6.9) :
 *  - slugs normalisés (Q2) : legacySlug conservé pour audit ;
 *  - difficultés « modéré » -> moyen, le reste tel quel ;
 *  - Townships normalisés vers communes canoniques INSEE,
 *    libellé d'affichage d'origine conservé (copie à l'identique) ;
 *  - Events : brouillons Framer = statut draft (dates sans année ->
 *    sortDate provisoire, à corriger à la publication).
 *
 * Aucune donnée personnelle n'est importée ici : les abonnés Mailchimp
 * (audience_export) font l'objet d'un import séparé et volontaire.
 */
import { PrismaClient } from "@prisma/client";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { parseCsvAsObjects } from "../lib/csv";
import {
  XAINTRIE_COMMUNES,
  canonicalCommune,
  normalizeSlug,
  parseDetails,
  parseEventDate,
} from "../lib/slug";

const prisma = new PrismaClient();

/**
 * Compte admin (B0) : créé/mis à jour si ADMIN_EMAIL + ADMIN_PASSWORD sont
 * définis dans l'environnement (jamais dans le repo — voir docs/SECRETS.md).
 */
import bcrypt from "bcryptjs";

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.log("Admin : ignoré (ADMIN_EMAIL / ADMIN_PASSWORD absents)");
    return;
  }
  const passwordHash = await bcrypt.hash(password, 12);
  const name = process.env.ADMIN_NAME?.trim() || "Bureau C&F";
  await prisma.user.upsert({
    where: { email },
    create: { email, name, passwordHash, role: "admin" },
    update: { name, passwordHash, role: "admin" },
  });
  console.log(`Admin : ${email} (${name})`);
}

async function loadCsv(name: string) {
  const file = path.join(process.cwd(), "data", "framer", name);
  return parseCsvAsObjects(await readFile(file, "utf-8"));
}

async function main() {
  console.log("— Seed Chemins et Fontaines —");

  // 0. Compte admin du back-office (si configuré)
  await seedAdmin();

  // 1. Communes canoniques (Xaintrie, codes INSEE issus de XaintrieTownshipMap.tsx)
  for (const [key, c] of Object.entries(XAINTRIE_COMMUNES)) {
    if (!c.insee && c.name === "") continue;
    await prisma.commune.upsert({
      where: { slug: key },
      create: { name: c.name, slug: key, inseeCode: c.insee || null },
      update: { name: c.name, inseeCode: c.insee || null },
    });
  }
  console.log(`Communes : ${Object.keys(XAINTRIE_COMMUNES).length}`);

  // 2. Routes (+ albums photos)
  const routes = await loadCsv("routes.csv");
  const photos = await loadCsv("route-photos.csv");

  for (const r of routes) {
    const slug = normalizeSlug(r["Slug"]);
    const { distanceKm, elevationGainM, difficulty } = parseDetails(r["Details"] ?? "");
    const commune = canonicalCommune(r["Township"] ?? "");
    const communeRow = await prisma.commune.upsert({
      where: { slug: commune.slug },
      create: { name: commune.name, slug: commune.slug, inseeCode: commune.insee || null },
      update: {},
    });

    const route = await prisma.route.upsert({
      where: { slug },
      create: {
        slug,
        legacySlug: r["Slug"],
        title: r["Title"].trim(),
        detailsRaw: r["Details"],
        distanceKm,
        elevationGainM,
        difficulty,
        description: r["Description"],
        gpxFileName: r["GPX File"] && r["GPX File"].trim() !== "" ? r["GPX File"].trim() : null,
        gpxUrl: r["GPX Upload"] || null,
        imageUrl: r["Route Image"] || null,
        imageAlt: r["Route Image:alt"] || null,
        townshipLabel: r["Township"],
        communeId: communeRow.id,
        status: "published",
        source: "saisie_manuelle",
      },
      update: {
        title: r["Title"].trim(),
        detailsRaw: r["Details"],
        distanceKm,
        elevationGainM,
        difficulty,
        description: r["Description"],
        gpxFileName: r["GPX File"] && r["GPX File"].trim() !== "" ? r["GPX File"].trim() : null,
        gpxUrl: r["GPX Upload"] || null,
        imageUrl: r["Route Image"] || null,
        imageAlt: r["Route Image:alt"] || null,
        townshipLabel: r["Township"],
        communeId: communeRow.id,
      },
    });

    // Album photos : l'export Route Photos référence les routes par leur slug d'origine
    const album = photos.filter((p) => p["Route"] === r["Slug"]);
    for (const p of album) {
      const existing = await prisma.routePhoto.findFirst({
        where: { routeId: route.id, imageUrl: p["Image"] },
      });
      if (!existing) {
        await prisma.routePhoto.create({
          data: {
            title: p["Title"],
            imageUrl: p["Image"],
            imageAlt: p["Image:alt"] || null,
            routeId: route.id,
          },
        });
      }
    }
  }
  console.log(`Routes : ${routes.length}`);

  // 3. Events (brouillons Framer -> draft)
  const events = await loadCsv("events.csv");
  for (const e of events) {
    const draft = e[":draft"] === "true" || e["Draft"] === "true";
    const sortDate = parseEventDate(e["Date"]) ?? new Date();
    await prisma.event.upsert({
      where: { slug: e["Slug"] },
      create: {
        slug: e["Slug"],
        title: e["Title"],
        dateLabel: e["Date"],
        sortDate,
        details: e["Details"],
        imageUrl: e["Image"] || null,
        imageAlt: e["Image:alt"] || null,
        status: draft ? "draft" : "published",
      },
      update: {
        title: e["Title"],
        dateLabel: e["Date"],
        sortDate,
        details: e["Details"],
        imageUrl: e["Image"] || null,
        imageAlt: e["Image:alt"] || null,
        status: draft ? "draft" : "published",
      },
    });
  }
  console.log(`Events : ${events.length} (dont ${
    events.filter((e) => e[":draft"] === "true").length
  } brouillons conservés hors ligne)`);

  // 4. Newsletters (archives Mailchimp : liens conservés)
  const newsletters = await loadCsv("newsletters.csv");
  for (const n of newsletters) {
    await prisma.newsletter.upsert({
      where: { slug: n["Slug"] },
      create: {
        slug: n["Slug"],
        title: n["Title"],
        publicationDate: new Date(n["Publication Date"]),
        publicationLabel: n["Publication Label"],
        summary: n["Summary"],
        coverImageUrl: n["Cover Image"] || null,
        featured: n["Featured Route Or Township"] || null,
        externalUrl: n["Mailchimp Newsletter URL"] || null,
      },
      update: {
        title: n["Title"],
        publicationDate: new Date(n["Publication Date"]),
        publicationLabel: n["Publication Label"],
        summary: n["Summary"],
        coverImageUrl: n["Cover Image"] || null,
        featured: n["Featured Route Or Township"] || null,
        externalUrl: n["Mailchimp Newsletter URL"] || null,
      },
    });
  }
  console.log(`Newsletters : ${newsletters.length}`);

  console.log("Seed terminé. Rappel : aucun abonné importé (RGPD, import séparé).");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
