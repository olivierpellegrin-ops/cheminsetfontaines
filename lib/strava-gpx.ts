import { getValidAccessToken, STRAVA_API } from "@/lib/strava";

/**
 * Brique S3 « Agent Strava » (spec cf-spec-agent-strava, §2 et §4) : récupération
 * du GPX d'une activité via l'API Streams (latlng, altitude, time) puis génération
 * du GPX 1.1 par nos soins — il n'existe PAS d'endpoint officiel d'export GPX
 * pour les activités (seul /routes/{id}/export_gpx existe, pour les routes).
 *
 * - appelé uniquement au passage liste 1 -> liste 2 (bouton [>>]) : le GPX n'est
 *   « payé » en quota que pour les tracés réellement retenus (D4 : gpxContent
 *   en base, jamais sous public/ où il serait devinable par URL) ;
 * - garde-fou quota : 429 -> pause Retry-After (max 60 s) puis un retry (même
 *   mécanique que la synchronisation, lib/strava-sync.ts) ;
 * - robustesse réseau (recette 26/11 : « fetch failed » bare de Node) : délai
 *   de 45 s, un retry automatique, et en cas d'échec réel le bandeau nomme la
 *   cause (ECONNRESET, ENOTFOUND, délai dépassé…) au lieu d'un fetch failed.
 * - le GPX généré porte le titre local : c'est lui qui alimente l'aperçu
 *   « [Voir] » (Métriques identiques au viewer : D+ à ±3 m de bruit près).
 */

/**
 * Réponse de l'API Streams avec key_by_type=true : une map indexée par type
 * de flux DONT LES VALEURS SONT LES OBJETS DE FLUX ({ type, data }), pas les
 * tableaux bruts (docs officielles : strava.github.io/api/v3/streams).
 * Le 26/11, lire streams.latlng comme un tableau donnait latlng.length =
 * undefined : garde « length < 2 » franchie sans lever, boucle jamais
 * exécutée, GPX à <trkseg> VIDE stocké en sélection comme en
 * retéléchargement — cause racine des « Aucune trace (<trk>) » du viewer.
 * On accepte les DEUX formes par sécurité.
 */
type StreamData<T> = { data?: T[] } | T[];

interface StravaStreams {
  latlng?: StreamData<[number, number]>;
  altitude?: StreamData<number>;
  time?: StreamData<number>;
}

/** Normalise un flux : tableau brut ou objet { type, data } -> tableau de données. */
function streamData<T>(stream: StreamData<T> | undefined): T[] {
  if (Array.isArray(stream)) return stream;
  const data = stream?.data;
  return Array.isArray(data) ? data : [];
}

/** Délai max d'un appel Streams (les longues activités peuvent être lourdes). */
const STREAMS_TIMEOUT_MS = 45_000;

/**
 * Fetch Strava robuste : deux tentatives espacées de 2 s, et si le réseau
 * lâche vraiment, on remonte la CAUSE de l'échec (error.cause de Node,
 * invisible sinon) au lieu du « fetch failed » du 26/11.
 */
async function stravaGet(url: string, accessToken: string): Promise<Response> {
  const causes: string[] = [];
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      return await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
        signal: AbortSignal.timeout(STREAMS_TIMEOUT_MS),
      });
    } catch (error) {
      const cause: unknown = (error as { cause?: unknown }).cause;
      causes.push(
        typeof (cause as { code?: unknown })?.code === "string"
          ? String((cause as { code: string }).code)
          : cause instanceof Error
            ? cause.message
            : error instanceof Error
              ? error.message
              : "cause inconnue",
      );
      if (attempt === 1) await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
  throw new Error(
    `Strava injoignable (${causes.join(", puis ")}) : vérifie la connexion internet puis réessaie.`,
  );
}

async function fetchStreams(accessToken: string, stravaId: string): Promise<StravaStreams> {
  const url = `${STRAVA_API}/activities/${stravaId}/streams?keys=latlng,altitude,time&key_by_type=true`;
  let res = await stravaGet(url, accessToken);
  if (res.status === 429) {
    const wait = Math.min(Number(res.headers.get("retry-after") ?? "15"), 60);
    await new Promise((resolve) => setTimeout(resolve, wait * 1000));
    res = await stravaGet(url, accessToken);
  }
  if (res.status === 401) {
    throw new Error("Jetons Strava refusés (401) : Déconnecte puis reconnecte Strava.");
  }
  if (!res.ok) {
    throw new Error(`Strava Streams en échec (${res.status}) : réessaie dans un instant.`);
  }
  return (await res.json()) as StravaStreams;
}

function xmlEscape(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

/**
 * Retourne le contenu GPX 1.1 complet de l'activité (une seule trace, titrée).
 * Les points hors latlng sont ignorés ; ele est inclus quand Strava le fournit.
 * ATTENTION flux « time » : Strava renvoie des SECONDES CUMULÉES depuis le
 * départ (0, 1, 2…), PAS des dates — on les recompose en ISO 8601 à partir de
 * startedAt (StravaTrace.startTime). Écrites telles quelles le 26/11, elles
 * étaient lues comme des ANNÉES par le viewer (new Date("5497") = an 5497,
 * durées absurdes type 70810320:00:00, vitesse moyenne à 0).
 */
export async function fetchTraceGpx(
  stravaId: string,
  title: string,
  startedAt?: Date
): Promise<string> {
  const accessToken = await getValidAccessToken();
  const streams = await fetchStreams(accessToken, stravaId);
  const latlng = streamData(streams.latlng);
  if (latlng.length < 2) {
    throw new Error("Strava n'a renvoyé aucun point de trace pour cette activité.");
  }
  const altitude = streamData(streams.altitude);
  const time = streamData(streams.time);

  const points: string[] = [];
  for (let i = 0; i < latlng.length; i++) {
    let pt = `    <trkpt lat="${latlng[i][0].toFixed(6)}" lon="${latlng[i][1].toFixed(6)}">`;
    if (altitude[i] != null) pt += `<ele>${altitude[i].toFixed(1)}</ele>`;
    if (startedAt && i < time.length) {
      const date = new Date(startedAt.getTime() + time[i] * 1000);
      pt += `<time>${date.toISOString()}</time>`;
    }
    pt += "</trkpt>";
    points.push(pt);
  }

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<gpx version="1.1" creator="Chemins et Fontaines" xmlns="http://www.topografix.com/GPX/1/1">',
    "<trk>",
    `  <name>${xmlEscape(title)}</name>`,
    "  <trkseg>",
    ...points,
    "  </trkseg>",
    "</trk>",
    "</gpx>",
    "",
  ].join("\n");
}
