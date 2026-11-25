import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Export CSV des membres (brique N2, spec §10/§8) : procédure bureau,
 * données personnelles UNIQUEMENT en runtime (jamais dans le repo).
 * Séparateur « ; » + BOM UTF-8 pour Excel FR.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");

  const members = await prisma.member.findMany({
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    include: { years: { orderBy: { season: "desc" } } },
  });

  const esc = (v: string) => v.replace(/"/g, '""').replace(/[\r\n]+/g, " ");
  const cell = (v: string | number | boolean | null | undefined): string => {
    if (v === null || v === undefined) return '""';
    if (typeof v === "string") return '"' + esc(v) + '"';
    return '"' + String(v) + '"';
  };
  const frDate = (d: Date | null) => (d ? d.toLocaleDateString("fr-FR") : "");

  const header = [
    "civilité",
    "prénom",
    "nom",
    "e-mail",
    "téléphone",
    "adresse",
    "code postal",
    "ville",
    "pays",
    "nouvelles",
    "droit à l'image",
    "consentement le",
    "statut",
    "saisons payées",
    "dernier rappel",
  ];

  const rows = members.map((m) =>
    [
      m.civilite,
      m.firstName,
      m.lastName,
      m.email,
      m.phone,
      m.address,
      m.postalCode,
      m.city,
      m.country,
      m.newsletter ? "oui" : "non",
      m.photoConsent ? "oui" : "non",
      frDate(m.consentAt),
      m.status,
      m.years.map((y) => y.season).join("|"),
      frDate(m.lastReminderAt),
    ]
      .map(cell)
      .join(";")
  );

  const csv = "\ufeff" + [header.map(cell).join(";"), ...rows].join("\r\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="membres-' + new Date().getFullYear() + '.csv"',
    },
  });
}
