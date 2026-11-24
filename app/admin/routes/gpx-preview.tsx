"use client";

import { useEffect, useRef, useState } from "react";
import { gpx } from "@mapbox/togeojson";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

/**
 * Viewer GPX intégré au back-office (Spec « viewer GPX 3D satellite », V1).
 * V1 = 2D satellite + métriques + profil d'altitude + pré-remplissage du
 * formulaire. La vue 3D et la capture 1200×800 arrivent en V2.
 * Le GPX est parsé en local dans le navigateur : rien n'est envoyé
 * ailleurs que les requêtes de tuiles MapTiler (RGPD).
 */

export type GpxMetrics = {
  distanceKm: number;
  gainM: number;
  lossM: number;
  maxEleM: number | null;
  minEleM: number | null;
  durationS: number | null;
  avgSpeedKmh: number | null;
  points: { lng: number; lat: number; ele: number; t: number | null }[];
};

const ELEV_NOISE_THRESHOLD = 3; // seuil anti-bruit (m)

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function computeMetrics(
  coords: [number, number, number?][],
  times: (string | null)[]
): GpxMetrics {
  const points = coords.map((c, i) => ({
    lng: c[0],
    lat: c[1],
    ele: c[2] ?? 0,
    t: times[i] ? new Date(times[i] as string).getTime() : null,
  }));
  let distanceKm = 0;
  let gainM = 0;
  let lossM = 0;
  let refEle = points.length > 0 ? points[0].ele : 0;
  let maxEleM: number | null = null;
  let minEleM: number | null = null;
  for (let i = 1; i < points.length; i++) {
    distanceKm += haversineKm(points[i - 1], points[i]);
    const ele = points[i].ele;
    maxEleM = maxEleM == null ? ele : Math.max(maxEleM, ele);
    minEleM = minEleM == null ? ele : Math.min(minEleM, ele);
    const d = ele - refEle;
    if (Math.abs(d) >= ELEV_NOISE_THRESHOLD) {
      if (d > 0) gainM += d;
      else lossM += -d;
      refEle = ele;
    }
  }
  let durationS: number | null = null;
  let avgSpeedKmh: number | null = null;
  const first = points[0]?.t;
  const last = points[points.length - 1]?.t;
  if (first != null && last != null && last > first) {
    durationS = Math.round((last - first) / 1000);
    avgSpeedKmh = distanceKm / (durationS / 3600);
  }
  return { distanceKm, gainM, lossM, maxEleM, minEleM, durationS, avgSpeedKmh, points };
}

function fmtDuration(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return [h, m, sec].map((n) => String(n).padStart(2, "0")).join(":");
}

export default function GpxPreview({
  file,
  maptilerKey,
  onUseMetrics,
}: {
  file: File | null;
  maptilerKey: string;
  onUseMetrics: (m: { distanceKm: number; elevationGainM: number }) => void;
}) {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const hoverMarker = useRef<maplibregl.Marker | null>(null);
  const [metrics, setMetrics] = useState<GpxMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  // Parsing local du GPX
  useEffect(() => {
    setMetrics(null);
    setError(null);
    setHoverIdx(null);
    if (!file) return;
    let cancelled = false;
    file
      .text()
      .then((text) => {
        const doc = new DOMParser().parseFromString(text, "application/xml");
        if (doc.querySelector("parsererror")) {
          throw new Error("Fichier GPX illisible (XML invalide).");
        }
        const fc = gpx(doc);
        const feature = fc.features.find(
          (f) => f.geometry && (f.geometry.type === "LineString" || f.geometry.type === "MultiLineString")
        );
        if (!feature || !feature.geometry) {
          throw new Error("Aucune trace (<trk>) trouvée dans ce GPX.");
        }
        const coords: [number, number, number?][] =
          feature.geometry.type === "LineString"
            ? (feature.geometry.coordinates as [number, number, number?][])
            : (feature.geometry.coordinates.flat() as [number, number, number?][]);
        if (coords.length < 2) throw new Error("Trace trop courte (moins de 2 points).");
        const times: (string | null)[] =
          ((feature.properties as Record<string, unknown> | null)?.coordTimes as (string | null)[] | undefined) ??
          [];
        if (!cancelled) setMetrics(computeMetrics(coords, times));
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Erreur de lecture du GPX.");
      });
    return () => {
      cancelled = true;
    };
  }, [file]);

  // Carte satellite MapLibre
  useEffect(() => {
    if (!metrics || !mapContainer.current || !maptilerKey) return;
    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: `https://api.maptiler.com/maps/satellite/style.json?key=${maptilerKey}`,
      center: [metrics.points[0].lng, metrics.points[0].lat],
      zoom: 12,
      attributionControl: { compact: true },
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");
    map.on("load", () => {
      const line = metrics.points.map((p) => [p.lng, p.lat]);
      map.addSource("gpx", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: { type: "LineString", coordinates: line },
        },
      });
      map.addLayer({
        id: "gpx-line",
        type: "line",
        source: "gpx",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": "#163c32",
          "line-width": 4,
        },
      });
      // Cadrage automatique, marge 15 %
      const lons = line.map((c) => c[0]);
      const lats = line.map((c) => c[1]);
      const padX = (Math.max(...lons) - Math.min(...lons)) * 0.25 + 0.005;
      const padY = (Math.max(...lats) - Math.min(...lats)) * 0.25 + 0.003;
      map.fitBounds(
        [
          [Math.min(...lons) - padX, Math.min(...lats) - padY],
          [Math.max(...lons) + padX, Math.max(...lats) + padY],
        ]
      );
      const first = metrics.points[0];
      const last = metrics.points[metrics.points.length - 1];
      new maplibregl.Marker({ color: "#1c6b3a" })
        .setLngLat([first.lng, first.lat])
        .setPopup(new maplibregl.Popup({ offset: 12 }).setText("Départ"))
        .addTo(map);
      new maplibregl.Marker({ color: "#a3252c" })
        .setLngLat([last.lng, last.lat])
        .setPopup(new maplibregl.Popup({ offset: 12 }).setText("Arrivée"))
        .addTo(map);
    });
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [metrics, maptilerKey]);

  // Point survolé dans le profil -> marqueur sur la carte
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (hoverIdx == null) {
      hoverMarker.current?.remove();
      hoverMarker.current = null;
      return;
    }
    const p = metrics?.points[hoverIdx];
    if (!p) return;
    if (!hoverMarker.current) {
      hoverMarker.current = new maplibregl.Marker({ color: "#c18a21" }).setLngLat([p.lng, p.lat]);
      hoverMarker.current.addTo(map);
    } else {
      hoverMarker.current.setLngLat([p.lng, p.lat]);
    }
  }, [hoverIdx, metrics]);

  if (!file) return null;

  return (
    <div className="cf-admin__gpx">
      <p className="cf-admin__form-legend">Aperçu GPX</p>
      {!maptilerKey ? (
        <p className="cf-admin-login__error" role="alert">
          Clé MapTiler absente du .env (MAPTILER_KEY) : la carte ne peut pas s&apos;afficher.
        </p>
      ) : null}
      {error ? (
        <p className="cf-admin-login__error" role="alert">{error}</p>
      ) : null}
      {metrics ? (
        <>
          <div className="cf-admin__gpx-layout">
            <div ref={mapContainer} className="cf-admin__gpx-map" />
            <div className="cf-admin__gpx-side">
              <h3>Métriques</h3>
              <ul className="cf-admin__gpx-stats">
                <li><span>Distance</span><strong>{metrics.distanceKm.toFixed(2)} km</strong></li>
                <li><span>D+</span><strong>{Math.round(metrics.gainM)} m</strong></li>
                <li><span>D-</span><strong>{Math.round(metrics.lossM)} m</strong></li>
                {metrics.maxEleM != null && metrics.minEleM != null ? (
                  <>
                    <li><span>Point haut</span><strong>{Math.round(metrics.maxEleM)} m</strong></li>
                    <li><span>Point bas</span><strong>{Math.round(metrics.minEleM)} m</strong></li>
                  </>
                ) : null}
                {metrics.durationS != null ? (
                  <>
                    <li><span>Durée</span><strong>{fmtDuration(metrics.durationS)}</strong></li>
                    {metrics.avgSpeedKmh != null ? (
                      <li><span>Vitesse moy.</span><strong>{Math.round(metrics.avgSpeedKmh * 10) / 10} km/h</strong></li>
                    ) : null}
                  </>
                ) : null}
              </ul>
              <button
                type="button"
                className="cf-admin__gpx-use"
                onClick={() =>
                  onUseMetrics({
                    distanceKm: Math.round(metrics.distanceKm * 100) / 100,
                    elevationGainM: Math.round(metrics.gainM),
                  })
                }
              >
                Utiliser dans le formulaire
              </button>
              <p className="cf-admin__hint">
                La distance et le D+ seront reportés dans les champs du formulaire ; le niveau reste à qualifier par vous.
              </p>
            </div>
          </div>
          <div className="cf-admin__gpx-profile">
            <svg
              viewBox="0 0 1000 120"
              preserveAspectRatio="none"
              onMouseLeave={() => setHoverIdx(null)}
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const ratio = (e.clientX - rect.left) / rect.width;
                setHoverIdx(
                  Math.min(
                    metrics.points.length - 1,
                    Math.max(0, Math.round(ratio * (metrics.points.length - 1)))
                  )
                );
              }}
            >
              {(() => {
                const eles = metrics.points.map((p) => p.ele);
                const min = Math.min(...eles);
                const max = Math.max(...eles);
                const span = Math.max(1, max - min);
                const pts = metrics.points
                  .map(
                    (p, i) =>
                      `${(i / (metrics.points.length - 1)) * 1000},${115 - ((p.ele - min) / span) * 105}`
                  )
                  .join(" ");
                return (
                  <>
                    <polyline points={pts} fill="none" stroke="#587551" strokeWidth={2} />
                    {hoverIdx != null && metrics.points[hoverIdx] ? (
                      (() => {
                        const p = metrics.points[hoverIdx];
                        const x = (hoverIdx / (metrics.points.length - 1)) * 1000;
                        const y = 115 - ((p.ele - min) / span) * 105;
                        return (
                          <>
                            <line x1={x} y1={0} x2={x} y2={120} stroke="#c18a21" strokeWidth={1} />
                            <circle cx={x} cy={y} r={4} fill="#c18a21" />
                          </>
                        );
                      })()
                    ) : null}
                  </>
                );
              })()}
            </svg>
            <p className="cf-admin__hint">
              {hoverIdx != null && metrics.points[hoverIdx]
                ? (() => {
                    let d = 0;
                    for (let i = 1; i <= hoverIdx; i++)
                      d += haversineKm(metrics.points[i - 1], metrics.points[i]);
                    const p = metrics.points[hoverIdx];
                    return `${d.toFixed(1)} km · ${Math.round(p.ele)} m d'altitude`;
                  })()
                : "Profil d'altitude — survolez pour situer un point sur la carte."}
            </p>
          </div>
        </>
      ) : !error ? (
        <p className="cf-admin__hint">Lecture du GPX…</p>
      ) : null}
    </div>
  );
}
