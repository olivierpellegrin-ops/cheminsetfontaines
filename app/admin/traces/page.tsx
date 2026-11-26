import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import "./traces.css";

/**
 * Brique S0 « Agent Strava » (spec cf-spec-agent-strava du 26/11/2026) :
 * squelette de l'environnement « Tracés » — les 3 listes côte à côte sur un
 * même écran, chacune avec son propre ascenseur, tri du plus récent au plus
 * ancien. S0 ne fait que poser le décor :
 *   - S1 branchera la connexion Strava (bouton « Connecter Strava » inactif) ;
 *   - S2 branchera la synchronisation (bouton « Synchroniser » inactif) ;
 *   - S3 branchera les actions de ligne et les boutons [>>].
 * Aucune action n'est encore active : la page affiche des listes vides
 * (modèle StravaTrace prêt après `npx prisma db push`).
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

export default async function AdminTracesPage() {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");

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
            : "Non connecté à Strava (brique S1 : « Connecter Strava »)"}
        </span>
        <button type="button" className="cf-traces__bar-btn" disabled title="Brique S1">
          Connecter Strava
        </button>
        <button type="button" className="cf-traces__bar-btn" disabled title="Brique S2">
          Synchroniser maintenant
        </button>
      </div>

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
