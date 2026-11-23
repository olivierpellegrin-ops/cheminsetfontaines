"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Photo cliquable + lightbox plein écran, à l'identique du site Framer
 * original : clic (curseur zoom-in) → ouverture plein écran, Échap ou
 * clic sur le fond pour fermer. L'overlay est rendu via un portail
 * document.body (comme le <div id="overlay"> racine de Framer) avec
 * zIndex 9999, pour ne pas être capturé par les ancêtres overflow
 * hidden des cartes. Specs de RoutePhotoGallery.tsx d'origine : image
 * max 96vw x 90vh en object-fit contain, radius 14, ombre
 * 0 12px 40px rgba(0, 0, 0, 0.35), sans bouton ni légende visibles
 * (caption sert uniquement au libellé d'accessibilité). Le bouton
 * trigger reprend le style de l'image via className (.route-img /
 * .card-image / .route-detail-image).
 */
export default function ZoomImage({
  src,
  alt,
  caption,
  width = 1200,
  height = 800,
  priority = false,
  className,
}: {
  src: string;
  alt: string;
  caption?: string;
  width?: number;
  height?: number;
  priority?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  const lightbox =
    open && mounted
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
              backgroundColor: "rgba(22, 60, 50, 0.85)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 24,
            }}
          >
            <Image
              src={src}
              alt={alt}
              width={1600}
              height={1067}
              onClick={(e) => e.stopPropagation()}
              style={{
                maxWidth: "96vw",
                maxHeight: "90vh",
                width: "auto",
                height: "auto",
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
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={"Agrandir : " + (caption ?? alt)}
        className={"zoom-trigger " + (className ?? "")}
      >
        <Image src={src} alt={alt} width={width} height={height} priority={priority} />
      </button>
      {lightbox}
    </>
  );
}
