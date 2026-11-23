import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SITE } from "@/lib/site";
import GPXButton from "@/components/GPXButton";
import Gallery from "@/components/Gallery";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

async function getRoute(slug: string) {
  return prisma.route.findUnique({
    where: { slug },
    include: { photos: { orderBy: { createdAt: "asc" } }, commune: true },
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const route = await getRoute(slug);
  if (!route) return { title: "Itinéraire" };
  return {
    title: route.title,
    description:
      route.description || `${route.title} — itinéraire de randonnée à ${route.townshipLabel}, Corrèze.`,
    openGraph: route.imageUrl ? { images: [route.imageUrl] } : undefined,
  };
}

export default async function RouteDetailPage({ params }: Props) {
  const { slug } = await params;
  const route = await getRoute(slug);
  if (!route || route.status !== "published") notFound();

  const photoProps = route.photos.map((p) => ({
    title: p.title,
    imageUrl: p.imageUrl,
    imageAlt: p.imageAlt,
  }));

  return (
    <article className="section">
      <div className="container" style={{ maxWidth: 880 }}>
        <p style={{ marginBottom: 12 }}>
          <Link href="/fr/routes" className="link-more">
            ← Tous les itinéraires
          </Link>
        </p>
        <span className="badge">{route.townshipLabel}</span>
        <h1 className="h2" style={{ fontSize: 40, margin: "14px 0 12px" }}>
          {route.title}
        </h1>
        <p className="body-muted" style={{ marginBottom: 24 }}>
          {route.detailsRaw}
        </p>

        {route.imageUrl && (
          <Image
            src={route.imageUrl}
            alt={route.imageAlt || route.title}
            width={1200}
            height={800}
            priority
            style={{ borderRadius: "var(--radius)", width: "100%", height: "auto" }}
          />
        )}

        <div style={{ margin: "24px 0" }}>
          <p style={{ maxWidth: 720 }}>{route.description}</p>
          <p style={{ marginTop: 16 }}>
            <GPXButton slug={route.slug} variant="detail" />
          </p>
        </div>

        <Gallery photos={photoProps} />

        <aside
          className="section-tint"
          style={{
            borderRadius: "var(--radius)",
            padding: 24,
            marginTop: 48,
          }}
        >
          <p style={{ fontWeight: 600, fontFamily: "var(--font-display)", fontSize: 20, marginBottom: 6 }}>
            Prêt à marcher avec nous ?
          </p>
          <p className="body-muted" style={{ marginBottom: 12 }}>
            {SITE.baseline}
          </p>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            <Link href="/fr/events" className="btn btn-ochre">
              Voir les sorties
            </Link>
            <Link href="/fr/dons" className="btn btn-outline">
              Soutenir l&apos;association
            </Link>
          </div>
        </aside>
      </div>
    </article>
  );
}
