import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateRoute } from "@/app/actions/admin-routes";
import RouteForm, { type RouteFormInitial } from "../route-form";

/**
 * B4 : édition d'un itinéraire existant. Le même formulaire que la création,
 * hydraté depuis la base ; fichiers laissés vides = inchangés.
 */

/** viewerCamera (Json) -> objet caméra typé ou null si incomplet. */
function normalizeCamera(
  vc: unknown
): { lng: number; lat: number; zoom: number; bearing: number; pitch: number } | null {
  if (typeof vc !== "object" || vc === null) return null;
  const o = vc as Record<string, unknown>;
  const nums = [o.lng, o.lat, o.zoom, o.bearing, o.pitch];
  if (nums.every((n) => typeof n === "number" && Number.isFinite(n))) {
    return {
      lng: o.lng as number,
      lat: o.lat as number,
      zoom: o.zoom as number,
      bearing: o.bearing as number,
      pitch: o.pitch as number,
    };
  }
  return null;
}

export default async function EditRoutePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");

  const { id } = await params;
  const [route, communes] = await Promise.all([
    prisma.route.findUnique({
      where: { id },
      include: {
        _count: { select: { photos: true } },
        photos: {
          orderBy: { createdAt: "asc" },
          select: { id: true, title: true, imageUrl: true, imageAlt: true },
        },
      },
    }),
    prisma.commune.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  if (!route) notFound();

  const initial: RouteFormInitial = {
    id: route.id,
    title: route.title,
    slug: route.slug,
    communeId: route.communeId,
    townshipLabel: route.townshipLabel,
    distanceKm: route.distanceKm,
    elevationGainM: route.elevationGainM,
    difficulty: route.difficulty,
    detailsRaw: route.detailsRaw,
    description: route.description,
    published: route.status === "published",
    hasPhotoAlbum: route.hasPhotoAlbum,
    imageUrl: route.imageUrl,
    gpxFileName: route.gpxFileName,
    gpxUrl: route.gpxUrl,
    imageAlt: route.imageAlt,
    photoCount: route._count.photos,
    photos: route.photos,
    viewerCamera: normalizeCamera(route.viewerCamera),
  };

  return (
    <section>
      <h1>Modifier l&apos;itinéraire</h1>
      <p className="cf-admin__hint">
        « {route.title} » — actuellement {route.status === "published" ? "publié" : "brouillon"}.
        Les champs de fichiers laissés vides conservent les fichiers actuels.
      </p>
      <RouteForm
        communes={communes}
        action={updateRoute}
        maptilerKey={process.env.MAPTILER_KEY ?? ""}
        initial={initial}
        submitLabel="Enregistrer les modifications"
      />
    </section>
  );
}
