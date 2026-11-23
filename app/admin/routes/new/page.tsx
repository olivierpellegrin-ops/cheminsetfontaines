import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createRoute } from "@/app/actions/admin-routes";
import RouteForm from "../route-form";

/**
 * B2 : création manuelle d'un itinéraire (draft par défaut).
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
      <RouteForm communes={communes} action={createRoute} />
    </section>
  );
}
