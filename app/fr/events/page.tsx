import Image from "next/image";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sorties",
  description:
    "Retrouvez les randonnées à venir et les informations pratiques pour chaque rendez-vous.",
};

type Ev = {
  slug: string;
  title: string;
  dateLabel: string;
  details: string;
  imageUrl: string | null;
};

export default async function EventsPage() {
  // Q6 : les événements ne sont jamais masqués automatiquement,
  // pas même les passés ("Live" chez Framer). Tri : plus récents d'abord.
  const events: Ev[] = await prisma.event.findMany({
    where: { status: "published" },
    orderBy: [{ sortDate: "desc" }],
    select: {
      slug: true,
      title: true,
      dateLabel: true,
      details: true,
      imageUrl: true,
    },
  });

  return (
    <section className="section">
      <div className="container">
        <p className="kicker">SORTIES</p>
        <h1 className="h2" style={{ fontSize: 44, margin: "12px 0 8px" }}>
          Toutes les sorties
        </h1>
        <p className="body-muted" style={{ marginBottom: 40 }}>
          Retrouvez les randonnées à venir et les informations pratiques pour
          chaque rendez-vous.
        </p>

        <div className="section-grid">
          {events.map((e) => (
            <article key={e.slug} className="card">
              {e.imageUrl && (
                <Image
                  src={e.imageUrl}
                  alt={e.title}
                  width={1200}
                  height={800}
                  className="card-image"
                />
              )}
              <div className="card-body">
                <p className="card-meta" style={{ color: "var(--ochre)", fontWeight: 600 }}>
                  {e.dateLabel}
                </p>
                <h2 className="card-title" style={{ marginTop: 4 }}>
                  {e.title}
                </h2>
                <p className="card-meta">{e.details}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
