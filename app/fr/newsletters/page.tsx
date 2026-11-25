import Image from "next/image";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Les nouvelles du sentier",
  description:
    "Retrouvez chaque mois notre sélection de chemins, d'itinéraires et de nouvelles de l'association.",
  alternates: { canonical: "/fr/newsletters" },
};

type Nl = {
  slug: string;
  title: string;
  summary: string;
  publicationLabel: string;
  featured: string | null;
  coverImageUrl: string | null;
  externalUrl: string | null;
};

/**
 * « Newsletter Archive » à l'identique Framer (relevé HTTrack + page live,
 * 24/11) : wrapper 980px padding 88/72 (mobile 56/24) gap 34 (26),
 * kicker ARCHIVES 14px/600 ls .08em #587551, h1 National Park 48px
 * (38 px ≤ 809px), lead Fira Sans 18px lh 1.55 col max 650, pile
 * d'éditions gap 18 ; carte #e8efe4 bordure #d2dccb radius 18 padding 18
 * gap 24 (mobile colonne gap 16), couverture 180×128 radius 12
 * (mobile 100%×210), détails gap 8 : date, titre NP 28px lh 1.1,
 * description Fira Sans lh 1.45 #43534A, featured 14px/600 #587551,
 * bouton pilule #c18a21 radius 100 padding 11/18 → Mailchimp.
 * Brique N3 : les brouillons et numéros « prêts » du concepteur ne sont
 * JAMAIS listés ici — seuls les numéros envoyés/archivés ou les anciens
 * numéros Mailchimp (externalUrl) sont publics.
 */
export default async function NewslettersPage() {
  const newsletters: Nl[] = await prisma.newsletter.findMany({
    orderBy: [{ publicationDate: "desc" }],
    where: {
      OR: [
        { externalUrl: { not: null } },
        { status: { in: ["valide_envoyee", "archivee"] } },
      ],
    },
  });

  return (
    <section className="nl-arc">
      <p className="nl-kicker">ARCHIVES</p>
      <h1 className="nl-h1">Les nouvelles du sentier</h1>
      <p className="nl-lead">
        Retrouvez chaque mois notre sélection de chemins, d&apos;itinéraires
        et de nouvelles de l&apos;association.
      </p>

      <div className="nl-editions">
        {newsletters.map((n) => (
          <article key={n.slug} className="nl-card">
            {n.coverImageUrl && (
              <Image
                src={n.coverImageUrl}
                alt={n.title}
                width={180}
                height={128}
                className="nl-cover"
                sizes="(min-width: 810px) 180px, 100vw"
              />
            )}
            <div className="nl-details">
              <p className="nl-date">{n.publicationLabel}</p>
              <h2 className="nl-title">{n.title}</h2>
              <p className="nl-desc">{n.summary}</p>
              {n.featured && <p className="nl-featured">{n.featured}</p>}
              {n.externalUrl && (
                <p className="nl-read-row">
                  <a
                    className="nl-read"
                    href={n.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Lire la newsletter
                  </a>
                </p>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
