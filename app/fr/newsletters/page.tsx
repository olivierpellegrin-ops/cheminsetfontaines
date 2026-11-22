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

export default async function NewslettersPage() {
  const newsletters: Nl[] = await prisma.newsletter.findMany({
    orderBy: [{ publicationDate: "desc" }],
  });

  return (
    <section className="section">
      <div className="container">
        <p className="kicker">ARCHIVES</p>
        <h1 className="h2" style={{ fontSize: 44, margin: "12px 0 8px" }}>
          Les nouvelles du sentier
        </h1>
        <p className="body-muted" style={{ marginBottom: 40 }}>
          Retrouvez chaque mois notre sélection de chemins, d&apos;itinéraires
          et de nouvelles de l&apos;association.
        </p>

        <div className="section-grid">
          {newsletters.map((n) => (
            <article key={n.slug} className="card">
              {n.coverImageUrl && (
                <Image
                  src={n.coverImageUrl}
                  alt={n.title}
                  width={1200}
                  height={800}
                  className="card-image"
                />
              )}
              <div className="card-body">
                <p className="card-meta" style={{ color: "var(--ochre)", fontWeight: 600 }}>
                  {n.publicationLabel}
                </p>
                <h2 className="card-title" style={{ marginTop: 4 }}>
                  {n.title}
                </h2>
                <p className="card-meta">{n.featured}</p>
                <p className="card-meta" style={{ marginTop: 10 }}>
                  {n.summary}
                </p>
                {n.externalUrl && (
                  <p style={{ marginTop: 12 }}>
                    <a className="link-more" href={n.externalUrl} target="_blank" rel="noopener noreferrer">
                      Lire la newsletter
                    </a>
                  </p>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
