import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import GPXButton from "@/components/GPXButton";
import Gallery from "@/components/Gallery";
import ZoomImage from "@/components/ZoomImage";

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
      route.description ||
      `${route.title} — itinéraire de randonnée à ${route.townshipLabel}, Corrèze.`,
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
    <article className="route-detail">
      <p className="route-detail-kicker">{route.townshipLabel}</p>
      <h1 className="route-detail-title">{route.title}</h1>
      <p className="route-detail-meta">{route.detailsRaw}</p>

      {route.imageUrl && (
        <ZoomImage
          src={route.imageUrl}
          alt={route.imageAlt || route.title}
          priority
          caption={route.title}
          className="route-detail-image"
        />
      )}

      <p className="route-detail-desc">{route.description}</p>

      <GPXButton slug={route.slug} variant="detail" />

      <p className="route-back">
        <Link href="/fr/routes">← Tous les itinéraires</Link>
      </p>

      <Gallery photos={photoProps} />
    </article>
  );
}
