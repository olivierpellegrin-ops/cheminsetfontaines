import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Tableau de bord minimal (B0) : compteurs (itinéraires, sorties,
 * newsletters, souscripteurs inscrits brique N1, adhérents actifs et
 * demandes à traiter brique N2) + derniers itinéraires modifiés.
 */
export default async function AdminHome() {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");

  const [
    routeCount,
    eventCount,
    newsletterCount,
    subscriberCount,
    memberActiveCount,
    memberToHandleCount,
  ] = await Promise.all([
    prisma.route.count(),
    prisma.event.count(),
    prisma.newsletter.count({
      where: { status: { in: ["brouillon", "pret"] } },
    }),
    prisma.subscriber.count({ where: { status: "subscribed" } }),
    prisma.member.count({ where: { status: "actif" } }),
    prisma.membershipRequest.count({
      where: { confirmedAt: { not: null }, handledAt: null },
    }),
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
        <li>
          <strong>{newsletterCount}</strong>{" "}
          <a href="/admin/newsletters">newsletters en préparation</a>
        </li>
        <li>
          <strong>{subscriberCount}</strong>{" "}
          <a href="/admin/subscribers">souscripteurs inscrits</a>
        </li>
        <li>
          <strong>{memberActiveCount}</strong>{" "}
          <a href="/admin/members">adhérents actifs</a>
        </li>
        <li>
          <strong>{memberToHandleCount}</strong>{" "}
          <a href="/admin/members">demandes d&apos;adhésion à traiter</a>
        </li>
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
