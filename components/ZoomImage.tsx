"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Photo cliquable + lightbox plein écran, à l'identique du site Framer
 * original : clic (curseur zoom-in) -> image GRANDE et COMPLÈTE
 * (hauteur 90vh, largeur plafonnée à 96vw pour les panoramiques,
 * jamais recadrée, ratio réel respecté), Échap ou clic sur le fond
 * pour fermer. L'overlay est rendu via un portail document.body
 * (comme le <div id="overlay"> racine de Framer) avec zIndex 9999,
 * sur un fond vert-noir semi-transparent rgba(9, 30, 23, 0.88)
 * (teinte mesurée sur l'original à partir de l'écran publié).
 * Radius 14 et ombre 0 12px 40px rgba(0, 0, 0, 0.35) (specs
 * RoutePhotoGallery.tsx d'origine), sans bouton ni légende visibles
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
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setNatural(null);
  }, []);

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

  // Ajustement mesuré sur l'original : l'image agrandie remplit la
  // hauteur d'écran (90vh), plafonnée à 96vw en largeur, en respectant
  // le ratio réel de la photo (au chargement). Sans dimension
  // explicite, l'image resterait à la taille du fichier servi et le
  // zoom paraîtrait petit.
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
              backgroundColor: "rgba(9, 30, 23, 0.88)",
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
