import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Brique S3 : sert le GPX d'un tracé (colonne gpxContent, jamais un fichier)
 * à l'aperçu GPX existant du back-office (bouton [Voir], liste « Sélectionnés »).
 * Admin uniquement : la route vit sous /api/admin/** que le middleware ne
 * matche pas (leçon B0), la session est donc vérifiée ici.
 * Les tracés sont privés avant publication : cette route n'est jamais publique.
 */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return new Response("Non autorisé.", { status: 401 });
  }
  const { id } = await ctx.params;
  const trace = await prisma.stravaTrace.findUnique({
    where: { id },
    select: { gpxContent: true },
  });
  if (!trace?.gpxContent) {
    return new Response("GPX introuvable pour ce tracé.", { status: 404 });
  }
  return new Response(trace.gpxContent, {
    headers: {
      "Content-Type": "application/gpx+xml; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
