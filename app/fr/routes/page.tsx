import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { normalizeSlug } from "@/lib/slug";
import GPXButton from "@/components/GPXButton";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Itinéraires",
  description:
    "Tous les itinéraires de l'association, regroupés par commune. Téléchargez nos traces GPX et préparez votre prochaine marche en Corrèze.",
};

// Ligne brute renvoyée par Prisma (avant enrichissement).
type RouteRow = {
  slug: string;
  title: string;
  description: string;
  detailsRaw: string;
  townshipLabel: string;
  imageUrl: string | null;
  photos: { id: string }[];
};

// Ligne enrichie : hasAlbum est calculé localement.
type Rt = RouteRow & { hasAlbum: boolean };

export default async function RoutesPage() {
  const rows: RouteRow[] = await prisma.route.findMany({
    where: { status: "published" },
    orderBy: [{ townshipLabel: "asc" }, { title: "asc" }],
    select: {
      slug: true,
      title: true,
      description: true,
      detailsRaw: true,
      townshipLabel: true,
      imageUrl: true,
      photos: { select: { id: true } },
    },
  });

  // Q16 : regroupement par commune (Township), libellés d'origine conservés.
  const groups = new Map<string, Rt[]>();
  for (const r of rows) {
    const item: Rt = { ...r, hasAlbum: r.photos.length > 0 };
    const list = groups.get(r.townshipLabel) ?? [];
    list.push(item);
    groups.set(r.townshipLabel, list);
  }
  const orderedGroups = [...groups.entries()].sort((a, b) =>
    a[0].localeCompare(b[0], "fr")
  );

  return (
    <section className="routes-arc">
      <h2 className="routes-h2">Tous les itinéraires</h2>
      <p className="routes-lead">
        Téléchargez nos traces GPX et préparez votre prochaine marche en Corrèze.
      </p>

      {orderedGroups.map(([township, items]) => (
        <div key={township} className="routes-group">
          <h3 id={normalizeSlug(township)} className="routes-group-title">
            {township}
          </h3>
          <div className="routes-list">
            {items.map((r) => (
              <article key={r.slug} className="card card--tint">
                {r.imageUrl && (
                  <Image
                    src={r.imageUrl}
                    alt={r.title}
                    width={1200}
                    height={800}
                    className="card-image"
                  />
                )}
                <div className="routes-card-body">
                  <h3 className="routes-card-title">
                    <Link href={`/fr/routes/${r.slug}`}>{r.title}</Link>
                  </h3>
                  <p className="routes-meta">{r.detailsRaw}</p>
                  <p className="routes-card-desc">{r.description}</p>
                </div>
                <div className="routes-gpx-wrap">
                  <GPXButton slug={r.slug} variant="list" />
                </div>
                {r.hasAlbum && (
                  <Link
                    href={`/fr/routes/${r.slug}#album`}
                    className="routes-album"
                  >
                    Album photos
                  </Link>
                )}
              </article>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
