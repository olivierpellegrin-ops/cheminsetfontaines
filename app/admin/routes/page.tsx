import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import RouteRowActions from "./route-row-actions";

/**
 * B1 : liste des itinéraires — filtres statut et commune, tri par dernière
 * modification. B4 : actions Modifier / Publier-Dépublier / Supprimer.
 */
export default async function AdminRoutesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; commune?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");

  const sp = await searchParams;
  const status = sp.status === "published" || sp.status === "draft" ? sp.status : undefined;
  const communeId = sp.commune && sp.commune !== "all" ? sp.commune : undefined;
  const where = {
    ...(status ? { status } : {}),
    ...(communeId ? { communeId } : {}),
  };

  const [routes, communes] = await Promise.all([
    prisma.route.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      include: { commune: { select: { name: true } } },
    }),
    prisma.commune.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  const publishedCount = routes.filter((r) => r.status === "published").length;

  return (
    <section>
      <div className="cf-admin__head">
        <h1>Itinéraires</h1>
        <div className="cf-admin__head-right">
          <span className="cf-admin__count">
            {routes.length} affiché{routes.length > 1 ? "s" : ""} · {publishedCount} publié
            {publishedCount > 1 ? "s" : ""}
          </span>
          <Link href="/admin/routes/new" className="cf-admin__btn-primary">
            + Nouvel itinéraire
          </Link>
        </div>
      </div>

      <form className="cf-admin__filters" method="get">
        <label>
          Statut{" "}
          <select name="status" defaultValue={status ?? "all"}>
            <option value="all">Tous</option>
            <option value="published">Publiés</option>
            <option value="draft">Brouillons</option>
          </select>
        </label>
        <label>
          Commune{" "}
          <select name="commune" defaultValue={communeId ?? "all"}>
            <option value="all">Toutes</option>
            {communes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <button type="submit">Filtrer</button>
        {status || communeId ? <Link href="/admin/routes">Réinitialiser</Link> : null}
      </form>

      {routes.length === 0 ? (
        <p className="cf-admin__empty">Aucun itinéraire ne correspond à ces filtres.</p>
      ) : (
        <table className="cf-admin__table">
          <thead>
            <tr>
              <th>Titre</th>
              <th>Commune</th>
              <th>Statut</th>
              <th>Maj</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {routes.map((r) => (
              <tr key={r.id}>
                <td className="cf-admin__cell-title">{r.title}</td>
                <td>{r.townshipLabel}</td>
                <td>
                  <span className={`cf-admin__badge cf-admin__badge--${r.status}`}>
                    {r.status === "published" ? "publié" : "brouillon"}
                  </span>
                </td>
                <td>{r.updatedAt.toLocaleDateString("fr-FR")}</td>
                <td>
                  <RouteRowActions routeId={r.id} status={r.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="cf-admin__hint">
        Édition, publication et suppression actives (B4). La suppression efface aussi
        les fichiers disque (GPX, image principale, album).
      </p>
    </section>
  );
}
