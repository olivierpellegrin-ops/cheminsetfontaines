"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

type Photo = { title: string; imageUrl: string; imageAlt: string | null };

/**
 * Galerie photo des fiches — à l'identique du composant Framer
 * RoutePhotoGallery.tsx : grille 3 colonnes (.album-grid CSS), photos
 * portrait aspect-ratio 0.75 (object-position top), radius 14, cursor
 * zoom-in ; lightbox plein écran au clic : overlay via un portail
 * document.body (zIndex 9999, comme le <div id="overlay"> racine) sur
 * un fond vert-noir rgba(9, 30, 23, 0.88) ; l'image agrandie est GRANDE
 * et COMPLÈTE (hauteur 90vh, largeur plafonnée à 96vw, ratio réel
 * respecté via naturalWidth/naturalHeight), radius 14, ombre
 * 0 12px 40px rgba(0, 0, 0, 0.35) (specs d'origine) ; Échap ou clic sur
 * le fond pour fermer, sans flèches ni bouton ni légende visibles.
 */
export default function Gallery({ photos }: { photos: Photo[] }) {
  const [index, setIndex] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const close = useCallback(() => {
    setIndex(null);
    setNatural(null);
  }, []);

  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, close]);

  if (photos.length === 0) return null;

  const fitted = natural
    ? {
        width: "min(96vw, calc(90vh * " + natural.w / natural.h + "))",
        height: "auto",
      }
    : {
        maxWidth: "96vw",
        maxHeight: "90vh",
        width: "auto",
        height: "auto",
      };

  const lightbox =
    index !== null && mounted
      ? createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Photo agrandie"
            onClick={close}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 9999,
              backgroundColor: "rgba(9, 30, 23, 0.88)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 24,
            }}
          >
            <Image
              src={photos[index].imageUrl}
              alt={photos[index].imageAlt || photos[index].title}
              width={1600}
              height={2133}
              onLoad={(e) => {
                const t = e.currentTarget;
                if (t.naturalWidth > 0 && t.naturalHeight > 0) {
                  setNatural({ w: t.naturalWidth, h: t.naturalHeight });
                }
              }}
              onClick={(e) => e.stopPropagation()}
              style={{
                ...fitted,
                objectFit: "contain",
                borderRadius: 14,
                boxShadow: "0 12px 40px rgba(0, 0, 0, 0.35)",
              }}
            />
          </div>,
          document.body
        )
      : null;

  return (
    <section aria-label="Album photos" id="album" className="album-wrap">
      <div className="album-grid">
        {photos.map((p, i) => (
          <button
            key={p.imageUrl + "-" + i}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={"Agrandir : " + p.title}
            className="album-photo"
          >
            <Image
              src={p.imageUrl}
              alt={p.imageAlt || p.title}
              width={1200}
              height={1600}
              className="album-photo-img"
            />
          </button>
        ))}
      </div>
      {lightbox}
    </section>
  );
}
