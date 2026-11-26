import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { disconnectStrava } from "@/app/actions/admin-traces";
import "./traces.css";

/**
 * Brique S0+S1 « Agent Strava » (spec cf-spec-agent-strava du 26/11/2026) :
 * les 3 listes côte à côte sur un même écran, chacune avec son propre
 * ascenseur, tri du plus récent au plus ancien.
 *   - S1 (livrée) : connexion OAuth Strava (« Connecter Strava », état du
 *     compte dans le bandeau, déconnexion avec révocation des jetons) ;
 *   - S2 : la synchronisation (« Synchroniser maintenant » reste inactif) ;
 *   - S3 : les actions de ligne et les boutons [>>] entre les colonnes.
 */

const frDateTime = (d: Date) =>
  d.toLocaleString("fr-FR", {
    timeZone: "Europe/Paris",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const frKms = (m: number | null) =>
  m ? `${(m / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} kms` : "";

const FLASH_MESSAGES: Record<string, { text: string; kind: "ok" | "error" }> = {
  connecte: { text: "Compte Strava connecté.", kind: "ok" },
  refuse: { text: "Connexion refusée côté Strava.", kind: "error" },
  "etat-invalide": { text: "Session d'autorisation expirée, réessaie.", kind: "error" },
  "code-manquant": { text: "Code d'autorisation absent, réessaie.", kind: "error" },
  echec: { text: "Échec de l'échange avec Strava, réessaie.", kind: "error" },
  "non-autorise": { text: "Session admin expirée, reconnecte-toi.", kind: "error" },
};

export default async function AdminTracesPage({
  searchParams,
}: {
  searchParams: Promise<{ strava?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");

  const sp = await searchParams;
  const flash = sp.strava ? FLASH_MESSAGES[sp.strava] : undefined;

  const [newTraces, selectedTraces, bufferTraces, credential] = await Promise.all([
    prisma.stravaTrace.findMany({
      where: { status: "NEW" },
      orderBy: { startTime: "desc" },
      take: 50,
    }),
    prisma.stravaTrace.findMany({
      where: { status: "SELECTED" },
      orderBy: { startTime: "desc" },
      take: 50,
    }),
    prisma.stravaTrace.findMany({
      where: { status: "BUFFER" },
      orderBy: { startTime: "desc" },
      take: 50,
    }),
    prisma.stravaCredential.findFirst(),
  ]);

  return (
    <section className="cf-admin__traces">
      <div className="cf-admin__head">
        <h1>Tracés Strava</h1>
      </div>

      <div className="cf-traces__bar">
        <span className="cf-traces__bar-status">
          {credential
            ? `Connecté à Strava en tant que ${credential.athleteName}`
            : "Non connecté à Strava"}
        </span>
        {credential ? (
          <form action={disconnectStrava}>
            <button type="submit" className="cf-traces__bar-btn cf-traces__bar-btn--secondary">
              Déconnecter
            </button>
          </form>
        ) : (
          <Link className="cf-traces__bar-btn" href="/api/admin/strava/connect">
            Connecter Strava
          </Link>
        )}
        <button type="button" className="cf-traces__bar-btn" disabled title="Brique S2">
          Synchroniser maintenant
        </button>
      </div>

      {flash ? (
        <p className={`cf-traces__flash cf-traces__flash--${flash.kind}`}>{flash.text}</p>
      ) : null}

      <div className="cf-traces__grid">
        {(
          [
            { key: "new", title: "Tracés Strava", traces: newTraces },
            { key: "selected", title: "Sélectionnés", traces: selectedTraces },
            { key: "buffer", title: "Prêts à publier", traces: bufferTraces },
          ] as const
        ).map((list, i) => (
          <div key={list.key} className="cf-traces__col">
            <header className="cf-traces__col-head">
              <h2>{list.title}</h2>
              <span className="cf-admin__badge cf-admin__badge--draft">{list.traces.length}</span>
            </header>
            <div className="cf-traces__col-scroll">
              {list.traces.length === 0 ? (
                <p className="cf-traces__empty">
                  {i === 0
                    ? "Aucun tracé pour l'instant — la synchronisation arrive avec la brique S2."
                    : "Liste vide."}
                </p>
              ) : (
                <ul className="cf-traces__rows">
                  {list.traces.map((t) => (
                    <li key={t.id} className="cf-traces__row">
                      <span className="cf-traces__row-time">{frDateTime(t.startTime)}</span>
                      <span className="cf-traces__row-title">— {t.localTitle}</span>
                      {frKms(t.distanceM) ? (
                        <span className="cf-traces__row-kms">· {frKms(t.distanceM)}</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
