"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";

type Photo = { title: string; imageUrl: string; imageAlt: string | null };

/**
 * Galerie photo des fiches — comportement du composant Framer
 * RoutePhotoGallery.tsx reproduit : grille responsive 3/2/1 colonnes,
 * ratio 4:3, rayon 14 px, lightbox clavier (Échap pour fermer, flèches
 * pour naviguer).
 */
export default function Gallery({ photos }: { photos: Photo[] }) {
  const [index, setIndex] = useState<number | null>(null);

  const close = useCallback(() => setIndex(null), []);
  const prev = useCallback(
    () => setIndex((i) => (i === null ? null : (i + photos.length - 1) % photos.length)),
    [photos.length]
  );
  const next = useCallback(
    () => setIndex((i) => (i === null ? null : (i + 1) % photos.length)),
    [photos.length]
  );

  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, close, prev, next]);

  if (photos.length === 0) return null;

  return (
    <section aria-label="Album photos" style={{ marginTop: 32 }}>
      <div
        style={{
          display: "grid",
          gap: 16,
          gridTemplateColumns: "1fr",
        }}
        className="gallery-grid"
        id="album"
      >
        {photos.map((p, i) => (
          <button
            key={p.imageUrl}
            onClick={() => setIndex(i)}
            aria-label={`Agrandir : ${p.title}`}
            style={{
              border: "none",
              padding: 0,
              cursor: "zoom-in",
              borderRadius: 14,
              overflow: "hidden",
              background: "none",
            }}
          >
            <Image
              src={p.imageUrl}
              alt={p.imageAlt || p.title}
              width={1200}
              height={800}
              style={{ width: "100%", height: "auto", aspectRatio: "4 / 3", objectFit: "cover" }}
            />
          </button>
        ))}
      </div>

      {index !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Photo agrandie"
          onClick={close}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            background: "rgba(22, 60, 50, 0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <figure style={{ maxWidth: "min(1100px, 92vw)" }} onClick={(e) => e.stopPropagation()}>
            <Image
              src={photos[index].imageUrl}
              alt={photos[index].imageAlt || photos[index].title}
              width={1600}
              height={1067}
              style={{ width: "100%", height: "auto", borderRadius: 14 }}
            />
            <figcaption
              style={{
                color: "var(--parchment)",
                textAlign: "center",
                marginTop: 12,
                fontSize: 15,
              }}
            >
              {photos[index].title}
            </figcaption>
          </figure>
          <button
            type="button"
            onClick={close}
            aria-label="Fermer"
            style={{ position: "absolute", top: 20, right: 20, ...navBtnStyle }}
          >
            ✕
          </button>
          <button
            type="button"
            onClick={prev}
            aria-label="Photo précédente"
            style={{ position: "absolute", left: 16, ...navBtnStyle }}
          >
            ‹
          </button>
          <button
            type="button"
            onClick={next}
            aria-label="Photo suivante"
            style={{ position: "absolute", right: 16, ...navBtnStyle }}
          >
            ›
          </button>
        </div>
      )}
    </section>
  );
}

const navBtnStyle: React.CSSProperties = {
  background: "rgba(244, 241, 232, 0.15)",
  color: "var(--parchment)",
  border: "1px solid rgba(244,241,232,0.4)",
  borderRadius: "50%",
  width: 44,
  height: 44,
  fontSize: 20,
  cursor: "pointer",
};
