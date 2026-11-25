/**
 * Import de l'audience Mailchimp (brique N1, décision D4 + spec §9) :
 * usage UNIQUE, en local, par le bureau. Le fichier CSV (OneDrive
 * 05_Newsletters/audience_export/) ne va JAMAIS dans le repo, seules les
 * adresses entrent en base.
 *
 * Usage :
 *   npx tsx scripts/import-mailchimp.ts "<chemin du CSV>" [--dry-run]
 *
 * Règles (D4) :
 *  - lignes importées : statut subscribed, source import, confirmedAt =
 *    Confirm Time de Mailchimp si présent (consentement déjà recueilli,
 *    pas de re-double-opt-in) ;
 *  - une adresse déjà unsubscribed localement n'est PAS réabonnée
 *    (la désinscription locale est plus récente que le consentement Mailchimp) ;
 *  - une adresse locale pending passe subscribed (consentement Mailchimp) ;
 *  - détection automatique des colonnes (Email Address / Adresse e-mail /
 *    EMAIL / E-mail…, First Name / Prénom, Last Name / Nom de famille,
 *    Confirm Time / CONFIRM_TIME) : les exports Mailchimp varient selon
 *    la langue de l'interface (l'export FR nomme la colonne « Adresse
 *    e-mail » et garde les noms techniques OPTIN_TIME/CONFIRM_TIME).
 */

import { PrismaClient } from "@prisma/client";
import { readFile } from "node:fs/promises";
import { parseCsvAsObjects } from "../lib/csv";

const prisma = new PrismaClient();

/** Trouve la première colonne présente parmi les candidats (insensible casse). */
function pick(row: Record<string, string>, candidates: string[]): string {
  const keys = Object.keys(row);
  for (const c of candidates) {
    const hit = keys.find((k) => k.trim().toLowerCase() === c.toLowerCase());
    if (hit) return (row[hit] ?? "").trim();
  }
  return "";
}

function parseMailchimpDate(v: string): Date | null {
  if (!v) return null;
  // Mailchimp : "2023-05-14 10:22:31" en UTC
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
  if (!m) return null;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Masque une adresse pour les logs (RGPD : pas d'adresse complète en console). */
function maskEmail(email: string): string {
  const [name, domain] = email.split("@");
  if (!domain) return "***";
  return `${name.slice(0, 1)}***@${domain}`;
}

/** Colonnes e-mail selon la langue de l'export Mailchimp. */
const EMAIL_COLUMNS = [
  "Email Address",
  "Adresse e-mail",
  "Adresse Email",
  "Adresse mail",
  "EMAIL",
  "E-mail",
  "Email",
  "email address",
];

async function main() {
  const argv = process.argv.slice(2);
  const dryRun = argv.includes("--dry-run");
  const csvPath = argv.find((a) => !a.startsWith("--"));
  if (!csvPath) {
    console.error("Usage : npx tsx scripts/import-mailchimp.ts \"<chemin du CSV>\" [--dry-run]");
    process.exit(1);
  }

  const text = await readFile(csvPath, "utf8");
  const rows = parseCsvAsObjects(text).filter((r) => {
    const email = pick(r, EMAIL_COLUMNS);
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
  });
  if (rows.length === 0) {
    console.error("Aucune ligne exploitable : colonne e-mail introuvable ou CSV vide.");
    process.exit(1);
  }

  console.log(
    `${rows.length} adresses lisibles${dryRun ? " (DRY RUN : rien ne sera écrit)" : ""}`
  );

  let created = 0;
  let upgraded = 0;
  let keptSubscribed = 0;
  let keptUnsubscribed = 0;
  let excludedCleaned = 0;

  for (const row of rows) {
    const email = pick(row, EMAIL_COLUMNS)
      .trim()
      .toLowerCase();
    const firstName = pick(row, ["First Name", "FIRSTNAME", "FNAME", "Prénom"]) || null;
    const lastName = pick(row, ["Last Name", "LASTNAME", "LNAME", "Nom de famille"]) || null;
    const confirmedAt =
      parseMailchimpDate(pick(row, ["Confirm Time", "CONFIRM_TIME", "Opt-in Time", "Member Since"])) ??
      new Date();

    // Nettoie la liste Mailchimp : les « cleaned » (adresses en échec)
    // sont exclues (décision D4) ; un export aurait une colonne
    // "Subscriber Type"/"Status" à cleaned dans ce cas.
    const status = pick(row, ["Subscriber Type", "Status", "EMAIL_TYPE"]);
    if (/cleaned/i.test(status)) {
      excludedCleaned++;
      continue;
    }

    if (dryRun) {
      console.log(`  [dry-run] ${maskEmail(email)}`);
      continue;
    }

    const existing = await prisma.subscriber.findUnique({ where: { email } });
    if (!existing) {
      await prisma.subscriber.create({
        data: {
          email,
          firstName,
          lastName,
          status: "subscribed",
          source: "import",
          confirmedAt,
        },
      });
      created++;
      continue;
    }
    if (existing.status === "unsubscribed") {
      keptUnsubscribed++; // désinscription locale plus récente : on ne réabonne pas
      continue;
    }
    if (existing.status === "subscribed") {
      keptSubscribed++;
      // Date de consentement Mailchimp plus ancienne conservée si déjà là.
      await prisma.subscriber.update({
        where: { id: existing.id },
        data: {
          firstName: existing.firstName ?? firstName,
          lastName: existing.lastName ?? lastName,
          confirmedAt: existing.confirmedAt ?? confirmedAt,
        },
      });
      continue;
    }
    // pending / invalid locaux : le consentement Mailchimp prime (D4)
    await prisma.subscriber.update({
      where: { id: existing.id },
      data: {
        status: "subscribed",
        source: existing.source === "import" ? "import" : existing.source,
        confirmedAt: existing.confirmedAt ?? confirmedAt,
        confirmToken: null,
      },
    });
    upgraded++;
    console.log(`  réabonné (consentement Mailchimp) : ${maskEmail(email)}`);
  }

  if (!dryRun) {
    const total = await prisma.subscriber.count({ where: { status: "subscribed" } });
    console.log(
      [
        `\nRésultat : ${created} importé(s), ${upgraded} confirmé(s) via le consentement Mailchimp,`,
        `${keptSubscribed} déjà inscrit(s) (inchangés), ${keptUnsubscribed} désinscrit(s) conservé(s)`,
        `${excludedCleaned} ligne(s) « cleaned » exclue(s).`,
        `Souscripteurs inscrits en base à présent : ${total}.`,
      ].join("\n")
    );
  }
}

main()
  .catch((err) => {
    console.error("Échec de l'import :", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
