import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Tableau de bord minimal (B0) : compteurs + derniers itinéraires modifiés.
 * La liste et le CRUD arrivent en B1/B2.
 */
export default async function AdminHome() {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");

  const [routeCount, eventCount, newsletterCount] = await Promise.all([
    prisma.route.count(),
    prisma.event.count(),
    prisma.newsletter.count(),
  ]);
  const lastRoutes = await prisma.route.findMany({
    orderBy: { updatedAt: "desc" },
    take: 3,
    select: { id: true, title: true, townshipLabel: true, status: true, updatedAt: true },
  });

  return (
    <section>
      <h1>Bonjour {session.user.name}</h1>
      <ul className="cf-admin__stats">
        <li><strong>{routeCount}</strong> itinéraires</li>
        <li><strong>{eventCount}</strong> sorties</li>
        <li><strong>{newsletterCount}</strong> newsletters</li>
      </ul>
      <h2>Derniers itinéraires modifiés</h2>
      <p><a href="/admin/routes" className="cf-admin__allroutes">Voir tous les itinéraires →</a></p>
      <table className="cf-admin__table">
        <thead><tr><th>Titre</th><th>Commune</th><th>Statut</th><th>Maj</th></tr></thead>
        <tbody>
          {lastRoutes.map((r) => (
            <tr key={r.id}>
              <td>{r.title}</td>
              <td>{r.townshipLabel}</td>
              <td>{r.status === "published" ? "publié" : "brouillon"}</td>
              <td>{r.updatedAt.toLocaleDateString("fr-FR")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
