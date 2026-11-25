import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import MemberRowActions from "./member-row-actions";
import RequestRowActions from "./request-row-actions";
import RenewalBanner from "./renewal-banner";
import "./members.css";

/**
 * Brique N2 (spec §5.1/§4.2/§10) : pilotage des adhérents — demandes
 * d'adhésion (filtres en attente / confirmées / traitées, renvoi de la
 * confirmation, validation de la cotisation, suppression RGPD) et
 * membres (statut, saisons payées, droit à l'image, rappels de
 * renouvellement, export CSV).
 * Le statut « à renouveler » est DÉRIVÉ (membre actif sans cotisation
 * de la saison en cours) : jamais stocké, recalculé ici.
 */
export default async function AdminMembersPage({
  searchParams,
}: {
  searchParams: Promise<{ requests?: string; mstatut?: string; saison?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");

  const sp = await searchParams;
  const reqFilter =
    sp.requests === "attente" ||
    sp.requests === "confirmees" ||
    sp.requests === "traitees"
      ? sp.requests
      : "all";

  const requestWhere: {
    confirmedAt?: null | { not: null };
    handledAt?: null | { not: null };
  } = {};
  if (reqFilter === "attente") {
    requestWhere.confirmedAt = null;
  } else if (reqFilter === "confirmees") {
    requestWhere.confirmedAt = { not: null };
    requestWhere.handledAt = null;
  } else if (reqFilter === "traitees") {
    requestWhere.handledAt = { not: null };
  }

  const [requests, members] = await Promise.all([
    prisma.membershipRequest.findMany({
      where: requestWhere,
      orderBy: { createdAt: "desc" },
    }),
    prisma.member.findMany({
      include: { years: { orderBy: { season: "desc" } } },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
  ]);

  const currentSeason = new Date().getFullYear();
  const REMINDER_GUARD_MS = 30 * 24 * 60 * 60 * 1000;

  const hasCurrentSeason = (m: (typeof members)[number]) =>
    m.years.some((y) => y.season === currentSeason);

  // Cohorte « à renouveler » éligible au rappel : actifs sans cotisation
  // de la saison, sans rappel depuis 30 jours (l'action porte la garde).
  const reminderEligible = members.filter(
    (m) =>
      m.status === "actif" &&
      !hasCurrentSeason(m) &&
      (!m.lastReminderAt ||
        Date.now() - m.lastReminderAt.getTime() > REMINDER_GUARD_MS)
  ).length;

  // Filtres d'affichage des membres (dérivés, jamais stockés).
  const mstatut =
    sp.mstatut === "actif" || sp.mstatut === "sorti" || sp.mstatut === "renouveler"
      ? sp.mstatut
      : "all";
  const saison =
    sp.saison && !Number.isNaN(Number(sp.saison)) ? Number(sp.saison) : null;
  const visibleMembers = members.filter((m) => {
    if (mstatut === "actif" && m.status !== "actif") return false;
    if (mstatut === "sorti" && m.status !== "sorti") return false;
    if (mstatut === "renouveler" && !(m.status === "actif" && !hasCurrentSeason(m)))
      return false;
    if (saison !== null && !m.years.some((y) => y.season === saison)) return false;
    return true;
  });

  const seasons = [
    ...new Set(members.flatMap((m) => m.years.map((y) => y.season))),
  ].sort((a, b) => b - a);
  const toRenewCount = members.filter(
    (m) => m.status === "actif" && !hasCurrentSeason(m)
  ).length;

  const frDate = (d: Date | null) =>
    d
      ? d.toLocaleDateString("fr-FR") +
        " " +
        d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
      : "—";

  return (
    <section className="cf-admin__members">
      <div className="cf-admin__head">
        <h1>Adhérents</h1>
        <div className="cf-admin__head-right">
          <a className="cf-admin__row-edit" href="/admin/members/export">
            Export CSV
          </a>
        </div>
      </div>

      <h2>Demandes d&apos;adhésion</h2>
      <form className="cf-admin__filters" method="get">
        <label>
          Demandes{" "}
          <select name="requests" defaultValue={reqFilter}>
            <option value="all">Toutes</option>
            <option value="attente">En attente de confirmation</option>
            <option value="confirmees">Confirmées (à traiter)</option>
            <option value="traitees">Traitées</option>
          </select>
        </label>
        {mstatut !== "all" && <input type="hidden" name="mstatut" value={mstatut} />}
        {saison !== null && <input type="hidden" name="saison" value={saison} />}
        <button type="submit">Filtrer</button>
        {reqFilter !== "all" ? (
          <a href="/admin/members">Réinitialiser</a>
        ) : null}
      </form>
      {requests.length === 0 ? (
        <p className="cf-admin__empty">
          Aucune demande dans ce filtre. Les demandes entrent par la modale
          d&apos;adhésion du site ; le bouton « Cotisation reçue » valide
          l&apos;adhésion et crée le membre (uniquement après confirmation de
          l&apos;e-mail par le demandeur).
        </p>
      ) : (
        <table className="cf-admin__table">
          <thead>
            <tr>
              <th>Nom</th>
              <th>E-mail</th>
              <th>Téléphone</th>
              <th>Demandé le</th>
              <th>Confirmé le</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => {
              const statut = r.handledAt
                ? "traitée"
                : r.confirmedAt
                  ? "à traiter (cotisation)"
                  : "en attente de confirmation";
              const badge = r.handledAt
                ? ""
                : r.confirmedAt
                  ? "cf-admin__badge--published"
                  : "cf-admin__badge--draft";
              return (
                <tr key={r.id}>
                  <td className="cf-admin__cell-title">
                    {[r.civilite, r.firstName, r.lastName].filter(Boolean).join(" ") || "—"}
                  </td>
                  <td>{r.email}</td>
                  <td>{r.phone || "—"}</td>
                  <td>{r.createdAt.toLocaleDateString("fr-FR")}</td>
                  <td>{r.confirmedAt ? r.confirmedAt.toLocaleDateString("fr-FR") : "—"}</td>
                  <td>
                    <span className={`cf-admin__badge ${badge}`}>{statut}</span>
                  </td>
                  <td>
                    <RequestRowActions
                      requestId={r.id}
                      confirmed={Boolean(r.confirmedAt)}
                      handled={Boolean(r.handledAt)}
                      season={currentSeason}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <h2>Membres</h2>
      <p className="cf-admin__count">
        {members.length} membre{members.length > 1 ? "s" : ""} · {toRenewCount} à renouveler
        pour la saison {currentSeason}
      </p>
      <RenewalBanner count={reminderEligible} season={currentSeason} />
      <form className="cf-admin__filters" method="get">
        <label>
          Statut{" "}
          <select name="mstatut" defaultValue={mstatut}>
            <option value="all">Tous</option>
            <option value="actif">Actifs</option>
            <option value="renouveler">À renouveler ({toRenewCount})</option>
            <option value="sorti">Sortis</option>
          </select>
        </label>
        <label>
          Saison payée{" "}
          <select name="saison" defaultValue={saison !== null ? String(saison) : "all"}>
            <option value="all">Toutes</option>
            {seasons.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        {reqFilter !== "all" && (
          <input type="hidden" name="requests" value={reqFilter} />
        )}
        <button type="submit">Filtrer</button>
        {mstatut !== "all" || saison !== null ? (
          <a href="/admin/members">Réinitialiser</a>
        ) : null}
      </form>
      {visibleMembers.length === 0 ? (
        <p className="cf-admin__empty">
          Aucun membre ne correspond à ces filtres. Les membres naissent des
          demandes d&apos;adhésion dont la cotisation a été validée.
        </p>
      ) : (
        <table className="cf-admin__table">
          <thead>
            <tr>
              <th>Nom</th>
              <th>E-mail</th>
              <th>Statut</th>
              <th>Dernière saison</th>
              <th>Droit à l&apos;image</th>
              <th>Dernier rappel</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleMembers.map((m) => {
              const renouveler = m.status === "actif" && !hasCurrentSeason(m);
              return (
                <tr key={m.id}>
                  <td className="cf-admin__cell-title">
                    {[m.civilite, m.firstName, m.lastName].filter(Boolean).join(" ") || "—"}
                  </td>
                  <td>{m.email}</td>
                  <td>
                    <span
                      className={`cf-admin__badge ${m.status === "actif" ? "cf-admin__badge--published" : ""}`}
                    >
                      {m.status === "actif" ? "actif" : "sorti"}
                    </span>
                    {renouveler && (
                      <span className="cf-admin__badge cf-admin__badge--draft">
                        à renouveler
                      </span>
                    )}
                  </td>
                  <td>{m.years[0]?.season ?? "—"}</td>
                  <td>{m.photoConsent ? "oui" : "non"}</td>
                  <td>{frDate(m.lastReminderAt)}</td>
                  <td>
                    <MemberRowActions
                      memberId={m.id}
                      needsRenewal={renouveler}
                      season={currentSeason}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}
