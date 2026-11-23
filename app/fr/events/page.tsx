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
    <section className="events-arc">
      <h2 className="events-h2">Toutes les sorties</h2>
      <p className="events-lead">
        Retrouvez les randonnées à venir et les informations pratiques pour
        chaque rendez-vous.
      </p>
      <div className="events-list">
        {events.map((e) => (
          <article key={e.slug} className="card card--event">
            <div className="event-chip">{e.dateLabel}</div>
            <div className="event-body">
              <h2 className="event-title">{e.title}</h2>
              <p className="event-desc">{e.details}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
