import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { renderNewsletter } from "@/lib/newsletter-engine";

export const dynamic = "force-dynamic";

/**
 * Aperçu fidèle d'un numéro (brique N3) : même moteur de rendu que
 * l'e-mail (lib/newsletter-engine.tsx), affiché dans l'iframe de
 * l'éditeur. Session obligatoire ; jamais indexé.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");

  const { id } = await params;
  const nl = await prisma.newsletter.findUnique({ where: { id } });
  if (!nl) {
    return new Response("Numéro introuvable.", { status: 404 });
  }

  const { html } = await renderNewsletter(nl);
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
