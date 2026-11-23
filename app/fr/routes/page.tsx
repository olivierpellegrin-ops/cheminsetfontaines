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
    <section className="section">
      <div className="container">
        <p className="kicker">ITINÉRAIRES</p>
        <h1 className="h2" style={{ fontSize: 44, margin: "12px 0 8px" }}>
          Tous les itinéraires
        </h1>
        <p className="body-muted" style={{ marginBottom: 40 }}>
          Téléchargez nos traces GPX et préparez votre prochaine marche en
          Corrèze.
        </p>

        {orderedGroups.map(([township, items]) => (
          <div key={township} style={{ marginBottom: 48 }}>
            <h2
              id={normalizeSlug(township)}
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 28,
                borderBottom: "1px solid var(--border-soft)",
                paddingBottom: 10,
                marginBottom: 20,
              }}
            >
              {township}
            </h2>
            <div
              style={{
                display: "grid",
                gap: 20,
                gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              }}
            >
              {items.map((r) => (
                <article key={r.slug} className="card card--tint">
                  {r.imageUrl && (
                    <Link href={`/fr/routes/${r.slug}`} aria-label={r.title}>
                      <Image
                        src={r.imageUrl}
                        alt={r.title}
                        width={1200}
                        height={800}
                        className="card-image"
                      />
                    </Link>
                  )}
                  <div className="card-body">
                    <h3 className="card-title">
                      <Link href={`/fr/routes/${r.slug}`}>{r.title}</Link>
                    </h3>
                    <p className="card-meta">{r.description}</p>
                    <p style={{ marginTop: 12, display: "flex", gap: 18, alignItems: "center" }}>
                      <GPXButton slug={r.slug} variant="list" />
                      {r.hasAlbum && (
                        <Link href={`/fr/routes/${r.slug}#album`} className="link-more">
                          Album photos
                        </Link>
                      )}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
