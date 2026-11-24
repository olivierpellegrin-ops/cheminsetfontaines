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
 */
export default async function NewRoutePage() {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");

  const communes = await prisma.commune.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <section>
      <h1>Nouvel itinéraire</h1>
      <RouteForm
        communes={communes}
        action={createRoute}
        maptilerKey={process.env.MAPTILER_KEY ?? ""}
      />
    </section>
  );
}
