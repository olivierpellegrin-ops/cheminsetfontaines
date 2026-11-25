import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import SubscriberRowActions from "./subscriber-row-actions";

/**
 * Brique N1 (spec §5.2) : liste des souscripteurs à la newsletter —
 * filtre par statut, source visible, garde anti-renvoi lisible
 * (dernier e-mail envoyé), renvoi de la confirmation pour les pending,
 * suppression RGPD unitaire (+ journal EmailOutbox).
 *
 * Statuts : pending (en attente de clic), subscribed (confirmé,
 * recevra la newsletter), unsubscribed (désinscrit), invalid (rejet SMTP,
 * passé automatiquement lors de l'envoi de masse N4).
 */
export default async function AdminSubscribersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");

  const sp = await searchParams;
  const status: "pending" | "subscribed" | "unsubscribed" | "invalid" | undefined =
    sp.status === "pending" ||
    sp.status === "subscribed" ||
    sp.status === "unsubscribed" ||
    sp.status === "invalid"
      ? sp.status
      : undefined;

  const [subscribers, totalCount, subscribedCount, pendingCount] = await Promise.all([
    prisma.subscriber.findMany({
      ...(status ? { where: { status } } : {}),
      orderBy: { createdAt: "desc" },
    }),
    prisma.subscriber.count(),
    prisma.subscriber.count({ where: { status: "subscribed" } }),
    prisma.subscriber.count({ where: { status: "pending" } }),
  ]);

  const STATUS_LABELS: Record<string, string> = {
    pending: "en attente",
    subscribed: "inscrit",
    unsubscribed: "désinscrit",
    invalid: "invalide",
  };
  // Réutilise les badges de la liste itinéraires : published = vert (inscrit),
  // draft = gris (en attente) ; les autres statuts restent neutres.
  const statusBadge = (s: string) =>
    s === "subscribed" ? "cf-admin__badge--published" : s === "pending" ? "cf-admin__badge--draft" : "";

  const frDate = (d: Date | null) =>
    d ? d.toLocaleDateString("fr-FR") + " " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "—";

  return (
    <section>
      <div className="cf-admin__head">
        <h1>Souscripteurs</h1>
        <div className="cf-admin__head-right">
          <span className="cf-admin__count">
            {subscribers.length} affiché{subscribers.length > 1 ? "s" : ""} · {subscribedCount} inscrit
            {subscribedCount > 1 ? "s" : ""} · {pendingCount} en attente (sur {totalCount})
          </span>
        </div>
      </div>

      <form className="cf-admin__filters" method="get">
        <label>
          Statut{" "}
          <select name="status" defaultValue={status ?? "all"}>
            <option value="all">Tous</option>
            <option value="subscribed">Inscrits</option>
            <option value="pending">En attente</option>
            <option value="unsubscribed">Désinscrits</option>
            <option value="invalid">Invalides</option>
          </select>
        </label>
        <button type="submit">Filtrer</button>
        {status ? <a href="/admin/subscribers">Réinitialiser</a> : null}
      </form>

      {subscribers.length === 0 ? (
        <p className="cf-admin__empty">
          Aucun souscripteur ne correspond à ces filtres. L&apos;import de
          l&apos;audience Mailchimp se fait une fois, en local, par le script
          <code> scripts/import-mailchimp.ts</code> (le fichier CSV ne va jamais dans le repo).
        </p>
      ) : (
        <table className="cf-admin__table">
          <thead>
            <tr>
              <th>Adresse</th>
              <th>Nom</th>
              <th>Source</th>
              <th>Statut</th>
              <th>Confirmé le</th>
              <th>Dernier e-mail</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {subscribers.map((s) => (
              <tr key={s.id}>
                <td className="cf-admin__cell-title">{s.email}</td>
                <td>
                  {[s.firstName, s.lastName].filter(Boolean).join(" ") || "—"}
                </td>
                <td>{s.source}</td>
                <td>
                  <span className={`cf-admin__badge ${statusBadge(s.status)}`}>
                    {STATUS_LABELS[s.status] ?? s.status}
                  </span>
                </td>
                <td>{s.confirmedAt ? s.confirmedAt.toLocaleDateString("fr-FR") : "—"}</td>
                <td>{frDate(s.lastEmailAt)}</td>
                <td>
                  <SubscriberRowActions subscriberId={s.id} pending={s.status === "pending"} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="cf-admin__hint">
        « Renvoyer » (en attente uniquement) renvoie l&apos;e-mail de confirmation
        avec un nouveau lien, au plus une fois par heure et par adresse.
        « Supprimer » applique le droit à l&apos;effacement : la ligne du
        souscripteur et les e-mails journalisés qui la référencent disparaissent.
      </p>
    </section>
  );
}
