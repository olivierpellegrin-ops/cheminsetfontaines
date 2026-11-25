import { render } from "@react-email/render";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { NewsletterMensuelle } from "@/emails/newsletter-mensuelle";
import {
  parseBlocks,
  type NlBlock,
  type NlEventCard,
  type NlRouteCard,
} from "@/lib/newsletters";
import { emailBaseUrl } from "@/lib/mail/notifications";

/**
 * Brique N3 « concepteur de newsletters » (spec §6.3) : génération
 * mensuelle autogénérée (sorties à venir + itinéraire à la une, données
 * FIGÉES) et rendu du tableau de blocs en HTML/texte pour l'aperçu et
 * le test d'envoi. L'envoi réel aux souscripteurs (worker, reprise,
 * List-Unsubscribe) est la brique N4.
 */

const MONTHS_FR = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

/** « Décembre 2026 » : libellé de publication du numéro courant. */
export function currentPublicationLabel(now = new Date()): string {
  const m = MONTHS_FR[now.getMonth()];
  return m[0].toUpperCase() + m.slice(1) + " " + now.getFullYear();
}

/**
 * « Générer la newsletter du mois » (spec §6.3) : crée la Newsletter du
 * mois courant si elle n'existe pas encore (garde anti-doublon sur le
 * libellé ET le slug), blocs pré-remplis à partir d'un snapshot figé —
 * sorties Event publiées à venir, dernière Route publiée (updatedAt
 * desc). Les textes de rédaction (édito) naissent vides : le bureau les
 * complète dans l'éditeur.
 */
export async function generateMonthlyNewsletter(): Promise<{
  id: string;
  created: boolean;
}> {
  const now = new Date();
  const year = now.getFullYear();
  const monthIdx = now.getMonth();
  const label = currentPublicationLabel(now);
  const slug = `nouvelles-${MONTHS_FR[monthIdx]}-${year}`;
  const base = emailBaseUrl();

  const existing = await prisma.newsletter.findFirst({
    where: { OR: [{ slug }, { publicationLabel: label }] },
  });
  if (existing) return { id: existing.id, created: false };

  // Sorties publiées À VENIR (sortDate aujourd'hui ou après) : le numéro
  // part du programme du mois, la fiche vit sur /fr/events.
  const startOfToday = new Date(year, monthIdx, now.getDate());
  const events = await prisma.event.findMany({
    where: { status: "published", sortDate: { gte: startOfToday } },
    orderBy: { sortDate: "asc" },
    take: 6,
  });
  const cards: NlEventCard[] = events.map((e) => ({
    slug: e.slug,
    title: e.title,
    dateLabel: e.dateLabel,
    details: e.details,
    url: base + "/fr/events",
  }));

  // Itinéraire à la une : dernière route publiée (mise à jour la plus
  // récente = fraîchement éditée ou publiée).
  const route = await prisma.route.findFirst({
    where: { status: "published" },
    orderBy: { updatedAt: "desc" },
  });
  const routeCard: NlRouteCard | null = route
    ? {
        slug: route.slug,
        title: route.title,
        townshipLabel: route.townshipLabel,
        imageUrl: route.imageUrl,
        imageAlt: route.imageAlt,
        excerpt: route.description.replace(/\s+/g, " ").trim().slice(0, 220) + "…",
        url: base + "/fr/routes/" + route.slug,
      }
    : null;

  const blocks: NlBlock[] = [
    { type: "intro", body: "" },
    ...(cards.length > 0
      ? [{ type: "events" as const, title: "Les sorties à venir", cards }]
      : []),
    ...(routeCard
      ? [
          {
            type: "route" as const,
            title: "Itinéraire à la une",
            card: routeCard,
          },
        ]
      : []),
    { type: "adhesion" },
  ];

  const summary =
    "Les nouvelles du sentier — " +
    label +
    " : " +
    (cards.length > 0
      ? cards.length + " sortie" + (cards.length > 1 ? "s" : "") + " à venir, "
      : "") +
    "un itinéraire à la une et les nouvelles de l'association.";

  const nl = await prisma.newsletter.create({
    data: {
      slug,
      title: "Chemins et Fontaines : " + label,
      publicationDate: new Date(year, monthIdx, 1),
      publicationLabel: label,
      summary,
      coverImageUrl: routeCard?.imageUrl ?? null,
      featured: routeCard?.title ?? null,
      status: "brouillon",
      blocks: blocks as unknown as Prisma.InputJsonValue,
      snapshot: {
        generatedAt: now.toISOString(),
        events: cards,
        route: routeCard,
      } as unknown as Prisma.InputJsonValue,
    },
  });

  return { id: nl.id, created: true };
}

/**
 * Rendu du tableau de blocs d'un numéro (aperçu /fr admin + test d'envoi).
 * Retourne le HTML ET la version texte ; jamais de crash sur un JSON
 * inattendu (parseBlocks rend un tableau vide).
 */
export async function renderNewsletter(
  nl: {
    title: string;
    summary: string;
    publicationLabel: string;
    blocks: unknown;
  },
  opts?: { unsubscribeUrl?: string }
): Promise<{ html: string; text: string; subject: string }> {
  const blocks = parseBlocks(nl.blocks);
  const element = (
    <NewsletterMensuelle
      title={nl.title}
      publicationLabel={nl.publicationLabel}
      summary={nl.summary}
      blocks={blocks}
      siteUrl={emailBaseUrl()}
      unsubscribeUrl={opts?.unsubscribeUrl ?? emailBaseUrl() + "/fr/newsletters"}
    />
  );
  const [html, text] = await Promise.all([
    render(element),
    render(element, { plainText: true }),
  ]);
  return { html, text, subject: nl.title };
}
