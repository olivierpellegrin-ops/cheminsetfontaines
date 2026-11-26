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
 * - le GPX généré porte le titre local : c'est lui qui alimente l'aperçu
 *   « [Voir] » (Métriques identiques au viewer : D+ à ±3 m de bruit près).
 */

interface StravaStreams {
  latlng?: [number, number][];
  altitude?: number[];
  time?: string[];
}

async function fetchStreams(accessToken: string, stravaId: string): Promise<StravaStreams> {
  const url = `${STRAVA_API}/activities/${stravaId}/streams?keys=latlng,altitude,time&key_by_type=true`;
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
 * Les points hors latlng sont ignorés ; ele et time sont inclus quand Strava
 * les fournit (l'aperçu en déduit durée et vitesse moyenne).
 */
export async function fetchTraceGpx(stravaId: string, title: string): Promise<string> {
  const accessToken = await getValidAccessToken();
  const streams = await fetchStreams(accessToken, stravaId);
  const latlng = streams.latlng;
  if (!latlng || latlng.length < 2) {
    throw new Error("Strava n'a renvoyé aucun point de trace pour cette activité.");
  }
  const altitude = streams.altitude ?? [];
  const time = streams.time ?? [];

  const points: string[] = [];
  for (let i = 0; i < latlng.length; i++) {
    let pt = `    <trkpt lat="${latlng[i][0].toFixed(6)}" lon="${latlng[i][1].toFixed(6)}">`;
    if (i < altitude.length) pt += `<ele>${altitude[i].toFixed(1)}</ele>`;
    if (i < time.length) pt += `<time>${time[i]}</time>`;
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
  ].join("
");
}
