import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createRoute } from "@/app/actions/admin-routes";
import RouteForm from "../route-form";

/**
 * B2/B3 : création manuelle d'un itinéraire, avec aperçu GPX (viewer V1).
 * La clé MapTiler est lue côté serveur et passée en prop : elle n'est
 * jamais embarquée dans le bundle public du site (usage admin uniquement,
 * restriction par Origins à acter au déploiement).
 *
 * Brique S4 « tampon vers itinéraire » : /admin/routes/new?trace=<id> ouvre
 * le même formulaire PRÉ-REMPLI depuis un tracé Strava « Prêt à publier »
 * (titre + GPX de la base). Aucun formulaire dédié : on transmet un titre
 * et un GPX au composant existant (décision §3 du canvas cf-spec-agent-strava).
 */
export default async function NewRoutePage({
  searchParams,
}: {
  searchParams: Promise<{ trace?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");

  const sp = await searchParams;

  // S4 : la trace doit être en stock tampon (BUFFER) avec son GPX en base ;
  // toute autre état (déjà consommée, GPX absent…) renvoie aux tracés.
  let stravaPrefill: { traceId: string; title: string } | undefined;
  if (sp.trace) {
    const trace = await prisma.stravaTrace.findUnique({
      where: { id: sp.trace },
      select: { id: true, localTitle: true, status: true, gpxContent: true },
    });
    if (!trace || trace.status !== "BUFFER" || !trace.gpxContent) {
      redirect("/admin/traces");
    }
    stravaPrefill = { traceId: trace.id, title: trace.localTitle };
  }

  const communes = await prisma.commune.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <section>
      <h1>Nouvel itinéraire</h1>
      {stravaPrefill ? (
        <p className="cf-admin__hint">
          Création depuis le tracé Strava « {stravaPrefill.title} » : titre et GPX sont
          pré-remplis. À l&apos;enregistrement, la trace passe « publié » dans la liste
          repliée des tracés, liée à cet itinéraire.
        </p>
      ) : null}
      <RouteForm
        communes={communes}
        action={createRoute}
        maptilerKey={process.env.MAPTILER_KEY ?? ""}
        stravaPrefill={stravaPrefill}
      />
    </section>
  );
}
