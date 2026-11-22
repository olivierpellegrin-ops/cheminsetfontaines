import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";

/**
 * Téléchargement GPX avec nommage lisible (logique du composant
 * NamedGPXDownload.tsx portée côté serveur) :
 * 1. si public/gpx/<slug>.gpx existe (traces committées localement,
 *    cf. docs/MEDIA.md), le fichier est servi en pièce jointe avec le
 *    « GPX File » Framer d'origine en Content-Disposition ;
 * 2. sinon, redirection 302 vers l'asset Framer (comportement identique
 *    à l'ancien site, zéro rupture pendant la migration).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const route = await prisma.route.findUnique({
    where: { slug },
    select: { gpxFileName: true, gpxUrl: true },
  });

  if (!route) {
    return NextResponse.json({ error: "Itinéraire introuvable" }, { status: 404 });
  }

  const fileName =
    (route.gpxFileName?.trim() || "") !== ""
      ? route.gpxFileName!.trim()
      : `${slug}.gpx`;

  try {
    const filePath = path.join(process.cwd(), "public", "gpx", `${slug}.gpx`);
    const gpx = await readFile(filePath, "utf-8");
    return new NextResponse(gpx, {
      status: 200,
      headers: {
        "Content-Type": "application/gpx+xml",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    // pas de fichier local : fallback Framer
  }

  if (route.gpxUrl) {
    return NextResponse.redirect(route.gpxUrl, 302);
  }

  return NextResponse.json(
    { error: "Aucune trace GPX disponible pour cet itinéraire" },
    { status: 404 }
  );
}
