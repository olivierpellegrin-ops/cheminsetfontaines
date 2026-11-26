import { prisma } from "@/lib/prisma";
import { STRAVA_API, getValidAccessToken } from "@/lib/strava";

/**
 * Brique S2 « Agent Strava » (spec cf-spec-agent-strava, §6) : moteur de
 * synchronisation des activités Strava vers la liste 1 « Tracés Strava ».
 *
 *   - ne lit JAMAIS autre chose que /athlete/activities (zéro écriture Strava) ;
 *   - filtre Marche/Randonnée (sport_type Walk | Hike), les autres types sont
 *     comptés puis ignorés, jamais stockés ;
 *   - anti-doublon : upsert par stravaId ; un tracé DELETED/SELECTED/BUFFER/
 *     CONSUMED n'est jamais réimporté ni modifié (tombestones) ;
 *   - first run : tout l'historique (after=0) ; ensuite after = lastSyncAt-48h
 *     (marge pour les activités Garmin publiées en retard) ;
 *   - garde-fou quota : 429 -> pause Retry-After (max 60 s) puis un retry.
 *
 * Le même moteur sert le bouton manuel (server action syncStrava) et le cron
 * hebdo GitHub Actions dimanche 22 h (brique S5, endpoint /api/cron/strava/sync).
 */

/** Seules ces activités sont candidates au site (décision D3). */
const WANTED_SPORTS = new Set(["Walk", "Hike"]);
const PER_PAGE = 200;
const MAX_PAGES = 50;

export interface StravaActivity {
  id: number;
  name: string;
  sport_type: string;
  /** ISO 8601 UTC (l'affichage convertit en Europe/Paris, cf. page Tracés). */
  start_date: string;
  /** mètres */
  distance: number;
  total_elevation_gain: number;
}

export interface SyncReport {
  ok: boolean;
  firstRun: boolean;
  imported: number;
  updated: number;
  ignored: number;
  filtered: number;
  scanned: number;
  pages: number;
  startedAt: string;
  durationMs: number;
}

async function fetchActivitiesPage(
  accessToken: string,
  afterEpoch: number,
  page: number,
): Promise<StravaActivity[]> {
  const params = new URLSearchParams({
    after: String(afterEpoch),
    per_page: String(PER_PAGE),
    page: String(page),
  });
  const url = `${STRAVA_API}/athlete/activities?${params.toString()}`;
  let res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (res.status === 429) {
    const wait = Math.min(Number(res.headers.get("retry-after") ?? "15"), 60);
    await new Promise((resolve) => setTimeout(resolve, wait * 1000));
    res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
  }
  if (res.status === 401) {
    throw new Error("Jetons Strava refusés (401) : Déconnecte puis reconnecte Strava.");
  }
  if (!res.ok) {
    throw new Error(`Strava /athlete/activities en échec (${res.status}).`);
  }
  return (await res.json()) as StravaActivity[];
}

export async function runStravaSync(): Promise<SyncReport> {
  const startedAt = new Date();
  const credential = await prisma.stravaCredential.findFirst();
  if (!credential) {
    throw new Error("Aucun compte Strava connecté (bouton « Connecter Strava »).");
  }

  const firstRun = !credential.lastSyncAt;
  const afterEpoch = credential.lastSyncAt
    ? Math.floor((credential.lastSyncAt.getTime() - 48 * 3600 * 1000) / 1000)
    : 0;

  const accessToken = await getValidAccessToken();

  const report: SyncReport = {
    ok: false,
    firstRun,
    imported: 0,
    updated: 0,
    ignored: 0,
    filtered: 0,
    scanned: 0,
    pages: 0,
    startedAt: startedAt.toISOString(),
    durationMs: 0,
  };

  let page = 1;
  while (page <= MAX_PAGES) {
    const activities = await fetchActivitiesPage(accessToken, afterEpoch, page);
    report.pages += 1;

    for (const activity of activities) {
      report.scanned += 1;

      if (!WANTED_SPORTS.has(activity.sport_type)) {
        report.filtered += 1;
        continue;
      }

      const existing = await prisma.stravaTrace.findUnique({
        where: { stravaId: String(activity.id) },
      });

      if (!existing) {
        await prisma.stravaTrace.create({
          data: {
            stravaId: String(activity.id),
            stravaTitle: activity.name,
            localTitle: activity.name,
            titleSource: "strava",
            sportType: activity.sport_type,
            startTime: new Date(activity.start_date),
            distanceM: activity.distance,
            elevDiffM: activity.total_elevation_gain,
            status: "NEW",
            syncedAt: startedAt,
          },
        });
        report.imported += 1;
      } else if (existing.status === "NEW" && existing.titleSource === "strava") {
        // Titre encore vu côté Strava uniquement : la sync peut le rafraîchir
        // (spec §4, règle de gestion). Aucun autre statut n'est jamais touché.
        await prisma.stravaTrace.update({
          where: { id: existing.id },
          data: {
            stravaTitle: activity.name,
            localTitle: activity.name,
            startTime: new Date(activity.start_date),
            distanceM: activity.distance,
            elevDiffM: activity.total_elevation_gain,
            syncedAt: startedAt,
          },
        });
        report.updated += 1;
      } else {
        report.ignored += 1;
      }
    }

    if (activities.length < PER_PAGE) break;
    page += 1;
  }

  report.durationMs = Date.now() - startedAt.getTime();
  report.ok = true;

  await prisma.stravaCredential.update({
    where: { id: credential.id },
    data: {
      lastSyncAt: startedAt,
      lastSyncSummary: JSON.stringify(report),
    },
  });

  return report;
}
