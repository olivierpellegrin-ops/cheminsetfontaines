import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { disconnectStrava } from "@/app/actions/admin-traces";
import { syncStrava } from "@/app/actions/admin-traces-sync";
import TraceBoard, { type TraceListData } from "./trace-board";
import "./traces.css";

/**
 * Brique S0→S3 « Agent Strava » (spec cf-spec-agent-strava du 26/11/2026) :
 * les 3 listes côte à côte sur un même écran, chacune avec son propre
 * ascenseur, tri du plus récent au plus ancien.
 *   - S1 : connexion OAuth Strava (bandeau, déconnexion/révocation) ;
 *   - S2 : « Synchroniser maintenant » + bilan et dernière synchro ;
 *   - S3 : actions de ligne, boutons [>>] entre les colonnes, renommage,
 *     suppression (tombestone), aperçu GPX depuis gpxContent.
 * Recherche par titre sur la liste 1 (la plus chargée), pagination serveur
 * de 50 lignes par liste, compteurs réels par statut.
 */

const PAGE_SIZE = 50;

const frDateTime = (d: Date) =>
  d.toLocaleString("fr-FR", {
    timeZone: "Europe/Paris",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

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
  searchParams: Promise<{
    strava?: string;
    sync?: string;
    imp?: string;
    maj?: string;
    ign?: string;
    filt?: string;
    msg?: string;
    q?: string;
    p_new?: string;
    p_selected?: string;
    p_buffer?: string;
  }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");

  const sp = await searchParams;
  const flash = sp.strava ? FLASH_MESSAGES[sp.strava] : undefined;
  const syncFlash =
    sp.sync === "ok"
      ? {
          kind: "ok" as const,
          text: `Synchro terminée : ${sp.imp ?? 0} nouveau(x) tracé(s), ${sp.maj ?? 0} mis à jour, ${
            sp.ign ?? 0
          } déjà traité(s), ${sp.filt ?? 0} activité(s) hors randonnée ignorée(s).`,
        }
      : sp.sync === "err"
        ? { kind: "error" as const, text: `Échec de la synchronisation : ${sp.msg ?? "erreur inconnue"}` }
        : undefined;
  const shownFlash = syncFlash ?? flash;

  // Recherche par titre : liste 1 uniquement (la plus chargée, spec §7).
  const q = sp.q?.trim() ?? "";
  const qFilter = q
    ? {
        OR: [
          { localTitle: { contains: q, mode: "insensitive" } },
          { stravaTitle: { contains: q, mode: "insensitive" } },
        ],
      }
    : {};

  const [newTotal, selectedTotal, bufferTotal, credential] = await Promise.all([
    prisma.stravaTrace.count({ where: { status: "NEW", ...qFilter } }),
    prisma.stravaTrace.count({ where: { status: "SELECTED" } }),
    prisma.stravaTrace.count({ where: { status: "BUFFER" } }),
    prisma.stravaCredential.findFirst(),
  ]);

  const listPage = (raw: string | undefined, pages: number) =>
    Math.min(Math.max(1, Number(raw) || 1), pages);
  const pagesOf = (total: number) => Math.max(1, Math.ceil(total / PAGE_SIZE));
  const selectedPages = pagesOf(selectedTotal);
  const bufferPages = pagesOf(bufferTotal);
  const newPages = pagesOf(newTotal);
  const pNew = listPage(sp.p_new, newPages);
  const pSelected = listPage(sp.p_selected, selectedPages);
  const pBuffer = listPage(sp.p_buffer, bufferPages);

  const traceSelect = {
    id: true,
    localTitle: true,
    startTime: true,
    distanceM: true,
  } as const;

  const [newRows, selectedRows, bufferRows] = await Promise.all([
    prisma.stravaTrace.findMany({
      where: { status: "NEW", ...qFilter },
      orderBy: { startTime: "desc" },
      skip: (pNew - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: traceSelect,
    }),
    prisma.stravaTrace.findMany({
      where: { status: "SELECTED" },
      orderBy: { startTime: "desc" },
      skip: (pSelected - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: traceSelect,
    }),
    prisma.stravaTrace.findMany({
      where: { status: "BUFFER" },
      orderBy: { startTime: "desc" },
      skip: (pBuffer - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: traceSelect,
    }),
  ]);

  const toList = (
    rows: { id: string; localTitle: string; startTime: Date; distanceM: number | null }[],
    total: number,
    page: number,
    pages: number,
  ): TraceListData => ({
    rows: rows.map((r) => ({
      id: r.id,
      localTitle: r.localTitle,
      startTime: r.startTime.toISOString(),
      distanceM: r.distanceM,
    })),
    total,
    page,
    pages,
  });

  return (
    <section className="cf-admin__traces">
      <div className="cf-admin__head">
        <h1>Tracés Strava</h1>
      </div>

      <div className="cf-traces__bar">
        <span className="cf-traces__bar-status">
          {credential
            ? `Connecté à Strava en tant que ${credential.athleteName}${
                credential.lastSyncAt ? ` — dernière synchro : ${frDateTime(credential.lastSyncAt)}` : ""
              }`
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
        {credential ? (
          <form action={syncStrava}>
            <button type="submit" className="cf-traces__bar-btn">
              Synchroniser maintenant
            </button>
          </form>
        ) : (
          <button type="button" className="cf-traces__bar-btn" disabled title="Connecte d'abord Strava">
            Synchroniser maintenant
          </button>
        )}
      </div>

      {shownFlash ? (
        <p className={`cf-traces__flash cf-traces__flash--${shownFlash.kind}`}>{shownFlash.text}</p>
      ) : null}

      <TraceBoard
        lists={{
          new: toList(newRows, newTotal, pNew, newPages),
          selected: toList(selectedRows, selectedTotal, pSelected, selectedPages),
          buffer: toList(bufferRows, bufferTotal, pBuffer, bufferPages),
        }}
        q={q}
        maptilerKey={process.env.MAPTILER_KEY ?? ""}
        connected={Boolean(credential)}
      />
    </section>
  );
}
