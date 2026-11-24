"use client";

import { useEffect, useRef, useState } from "react";
import { gpx } from "@mapbox/togeojson";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

/**
 * Viewer GPX intégré au back-office (Spec « viewer GPX 3D satellite »).
 * V1.1 :
 * - tracé jaune avec liseré sombre (lisibilité satellite),
 * - viseur 1200×800 (ratio 3:2) en pointillé épais, FIXE au centre :
 *   c'est le tracé qu'on déplace (pan/zoom) pour le cadrer dans le viseur,
 * - relief 3D (DEM MapTiler) + inclinaison (clic droit) + rotation,
 * - « Utiliser dans le formulaire » : capture exacte du viseur en 1200×800
 *   (instance MapLibre cachée, mêmes centre/zoom/bearing/pitch), PNG avec
 *   attribution légale, qui alimente la photo principale du formulaire.
 * Le GPX est parsé en local : rien n'est envoyé ailleurs que les tuiles.
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

const CAPTURE_W = 1200;
const CAPTURE_H = 800;
const ELEV_NOISE_THRESHOLD = 3; // seuil anti-bruit (m)
const TRACE_COLOR = "#ffd500";

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

/** Ajoute le tracé (liseré sombre + jaune) sur une carte MapLibre. */
function addTrace(map: maplibregl.Map, line: [number, number][]) {
  map.addSource("gpx", {
    type: "geojson",
    data: {
      type: "Feature",
      properties: {},
      geometry: { type: "LineString", coordinates: line },
    },
  });
  map.addLayer({
    id: "gpx-casing",
    type: "line",
    source: "gpx",
    layout: { "line-cap": "round", "line-join": "round" },
    paint: { "line-color": "rgba(20,20,20,0.85)", "line-width": 7 },
  });
  map.addLayer({
    id: "gpx-line",
    type: "line",
    source: "gpx",
    layout: { "line-cap": "round", "line-join": "round" },
    paint: { "line-color": TRACE_COLOR, "line-width": 4 },
  });
}

/** Cadrage automatique sur l'emprise du trace, marge 15 %. */
function fitToTraceBounds(map: maplibregl.Map, metrics: GpxMetrics) {
  const lons = metrics.points.map((p) => p.lng);
  const lats = metrics.points.map((p) => p.lat);
  const padX = (Math.max(...lons) - Math.min(...lons)) * 0.25 + 0.005;
  const padY = (Math.max(...lats) - Math.min(...lats)) * 0.25 + 0.003;
  map.fitBounds([
    [Math.min(...lons) - padX, Math.min(...lats) - padY],
    [Math.max(...lons) + padX, Math.max(...lats) + padY],
  ]);
}

/** Active le relief 3D (DEM MapTiler terrain-rgb) sur une carte. */
function addTerrain(map: maplibregl.Map, key: string) {
  map.addSource("maptiler-terrain", {
    type: "raster-dem",
    tiles: [`https://api.maptiler.com/tiles/terrain-rgb-v2/{z}/{x}/{y}.png?key=${key}`],
    tileSize: 256,
    maxzoom: 12,
  });
  map.setTerrain({ source: "maptiler-terrain", exaggeration: 1 });
}

export type ViewerCamera = {
  lng: number;
  lat: number;
  zoom: number;
  bearing: number;
  pitch: number;
};

export default function GpxPreview({
  file,
  maptilerKey,
  onUseMetrics,
  fallbackGpxUrl,
  presetCamera,
}: {
  file: File | null;
  maptilerKey: string;
  onUseMetrics: (
    m: { distanceKm: number; elevationGainM: number },
    capturePng: string | null,
    cameraJson: string | null
  ) => void;
  /** Edition : GPX local deja enregistree, recharge comme trace initiale */
  fallbackGpxUrl?: string | null;
  /** Edition : etat camera sauvegarde avec la capture precedente */
  presetCamera?: ViewerCamera | null;
}) {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const crosshairRef = useRef<HTMLDivElement | null>(null);
  const hoverMarker = useRef<maplibregl.Marker | null>(null);
  const [metrics, setMetrics] = useState<GpxMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [capturePending, setCapturePending] = useState(false);
  // Edition : le viewer se nourrit du fichier choisi OU de la trace locale
  const [fallbackFile, setFallbackFile] = useState<File | null>(null);
  const effectiveFile = file ?? fallbackFile;
  const presetRef = useRef<ViewerCamera | null>(presetCamera ?? null);

  // Edition sans re-selection : charger la trace locale enregistree
  useEffect(() => {
    setFallbackFile(null);
    if (file || !fallbackGpxUrl) return;
    let cancelled = false;
    fetch(fallbackGpxUrl)
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error("absent"))))
      .then((text) => {
        if (!cancelled) {
          setFallbackFile(new File([text], "trace-enregistree.gpx", { type: "application/gpx+xml" }));
        }
      })
      .catch(() => {
        /* pas de trace locale disponible */
        if (!cancelled) {
          setError("GPX local introuvable — sélectionnez le fichier GPX pour afficher le tracé.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [file, fallbackGpxUrl]);

  // Parsing local du GPX (fichier choisi ou trace locale)
  useEffect(() => {
    setMetrics(null);
    setError(null);
    setHoverIdx(null);
    if (!effectiveFile) return;
    if (effectiveFile.size > 10 * 1024 * 1024) {
      setError(
        `« ${file.name} » dépasse la limite de 10 Mo (${(file.size / 1048576).toFixed(1)} Mo). Exportez un GPX allégé (sans extensions fréquence cardiaque/cadence) pour alléger le tracé.`
      );
      return;
    }
    let cancelled = false;
    effectiveFile
      .text()
      .then((text) => {
        const doc = new DOMParser().parseFromString(text, "application/xml");
        if (doc.querySelector("parsererror")) {
          throw new Error("Fichier GPX illisible (XML invalide).");
        }
        const fc = gpx(doc);
        const feature = fc.features.find(
          (f) =>
            f.geometry &&
            (f.geometry.type === "LineString" || f.geometry.type === "MultiLineString")
        );
        if (!feature || !feature.geometry) {
          throw new Error("Aucune trace (<trk>) trouvée dans ce GPX.");
        }
        const coords: [number, number, number?][] =
          feature.geometry.type === "LineString"
            ? (feature.geometry.coordinates as [number, number, number?][])
            : ((feature.geometry.coordinates as [number, number, number?][][]) ).flat();
        if (coords.length < 2) throw new Error("Trace trop courte (moins de 2 points).");
        const times: (string | null)[] =
          ((feature.properties as Record<string, unknown> | null)?.coordTimes as
            | (string | null)[]
            | undefined) ?? [];
        if (!cancelled) setMetrics(computeMetrics(coords, times));
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Erreur de lecture du GPX.");
      });
    return () => {
      cancelled = true;
    };
  }, [effectiveFile]);

  // Carte satellite MapLibre (2D/3D) + viseur
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
    map.addControl(
      new maplibregl.ScaleControl({ unit: "metric" }),
      "bottom-left"
    );
    map.dragRotate.enable();
    map.touchZoomRotate.enableRotation();
    map.on("load", () => {
      addTrace(
        map,
        metrics.points.map((p) => [p.lng, p.lat])
      );
      addTerrain(map, maptilerKey);
      if (presetRef.current) {
        // Re-ouvrir dans la position de la derniere capture (recadrage)
        map.jumpTo({
          center: [presetRef.current.lng, presetRef.current.lat],
          zoom: presetRef.current.zoom,
          bearing: presetRef.current.bearing,
          pitch: presetRef.current.pitch,
        });
      } else {
        fitToTraceBounds(map, metrics);
      }
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

  /**
   * Capture du viseur en PNG 1200×800 :
   * instance MapLibre cachée (preserveDrawingBuffer), même centre/zoom/
   * bearing/pitch que la vue courante cadrée sur le viseur, tracé jaune,
   * attribution légale incrustée via canvas 2D.
   */
  async function captureViseur(): Promise<{ dataUrl: string; camera: ViewerCamera } | null> {
    const map = mapRef.current;
    const container = mapContainer.current;
    const crosshair = crosshairRef.current;
    if (!map || !container || !crosshair || !metrics) return null;

    const cRect = container.getBoundingClientRect();
    const vRect = crosshair.getBoundingClientRect();
    const centerX = (vRect.left + vRect.right) / 2 - cRect.left;
    const centerY = (vRect.top + vRect.bottom) / 2 - cRect.top;
    const center = map.unproject([centerX, centerY]);
    const zoom = map.getZoom() + Math.log2(CAPTURE_W / vRect.width);
    const bearing = map.getBearing();
    const pitch = map.getPitch();

    const off = document.createElement("div");
    off.style.cssText = `position:fixed;left:-${CAPTURE_W * 2}px;top:0;width:${CAPTURE_W}px;height:${CAPTURE_H}px;`;
    document.body.appendChild(off);
    const cap = new maplibregl.Map({
      container: off,
      style: `https://api.maptiler.com/maps/satellite/style.json?key=${maptilerKey}`,
      center,
      zoom,
      bearing,
      pitch,
      interactive: false,
      attributionControl: false,
      preserveDrawingBuffer: true,
    });
    try {
      await new Promise<void>((resolve) => cap.on("load", () => resolve()));
      addTrace(
        cap,
        metrics.points.map((p) => [p.lng, p.lat])
      );
      addTerrain(cap, maptilerKey);
      // attendre que toutes les tuiles visibles soient rendues (5 s max)
      await new Promise<void>((resolve) => {
        const t = setTimeout(resolve, 5000);
        cap.once("idle", () => {
          clearTimeout(t);
          resolve();
        });
      });

      const src = cap.getCanvas();
      const out = document.createElement("canvas");
      out.width = CAPTURE_W;
      out.height = CAPTURE_H;
      const ctx = out.getContext("2d");
      if (!ctx) return null;
      ctx.drawImage(src, 0, 0, CAPTURE_W, CAPTURE_H);
      // Attribution légale incrustée (obligation de licence MapTiler/OSM)
      ctx.fillStyle = "rgba(255,255,255,0.78)";
      ctx.fillRect(CAPTURE_W - 320, CAPTURE_H - 22, 312, 18);
      ctx.fillStyle = "#333";
      ctx.font = "12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("© MapTiler · © OpenStreetMap contributors", CAPTURE_W - 164, CAPTURE_H - 9);
      // JPEG qualité 0.9 : une vue satellite 1200×800 en PNG dépasse 4 Mo,
      // en JPEG compressé elle fait ~300-500 Ko (limite app. de 4 Mo respectée)
      return {
        dataUrl: out.toDataURL("image/jpeg", 0.9),
        camera: { lng: center.lng, lat: center.lat, zoom, bearing, pitch },
      };
    } finally {
      cap.remove();
      off.remove();
    }
  }

  async function handleUse() {
    if (!metrics) return;
    setCapturePending(true);
    let res: { dataUrl: string; camera: ViewerCamera } | null = null;
    try {
      res = await captureViseur();
    } catch {
      res = null;
    }
    setCapturePending(false);
    onUseMetrics(
      {
        distanceKm: Math.round(metrics.distanceKm * 100) / 100,
        elevationGainM: Math.round(metrics.gainM),
      },
      res ? res.dataUrl : null,
      res ? JSON.stringify(res.camera) : null
    );
  }

  // Creation : visible des qu'un fichier est choisi.
  // Edition : visible aussi sans re-selection grace au GPX local enregistre.
  if (!file && !fallbackGpxUrl) return null;

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
            <div className="cf-admin__gpx-mapwrap">
              <div ref={mapContainer} className="cf-admin__gpx-map" />
              {/* Viseur 1200×800 (ratio 3:2), fixe : cadrer le tracé dedans */}
              <div ref={crosshairRef} className="cf-admin__gpx-crosshair">
                <span className="cf-admin__gpx-crosshair-label">1200 × 800</span>
              </div>
            </div>
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
              <button type="button" className="cf-admin__gpx-use" onClick={handleUse} disabled={capturePending}>
                {capturePending ? "Capture en cours…" : "Utiliser dans le formulaire"}
              </button>
              <button
                type="button"
                className="cf-admin__gpx-refit"
                onClick={() => {
                  const map = mapRef.current;
                  if (map && metrics) fitToTraceBounds(map, metrics);
                }}
              >
                Recadrer sur le tracé
              </button>
              <p className="cf-admin__hint">
                La capture prend le contenu du viseur (1200×800) comme photo principale et
                reporte distance et D+. Niveau à votre main. Incliner la vue : clic droit (ou
                Ctrl+clic glisser) ; le relief 3D est actif.
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
