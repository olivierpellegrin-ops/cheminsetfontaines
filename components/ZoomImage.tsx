"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";

/**
 * Photo cliquable + lightbox plein écran (reproduit l'overlay Framer :
 * clic sur une photo d'itinéraire — vignette de liste ou image de
 * fiche — ouverture plein écran, Échap ou clic sur le fond pour
 * fermer). Le bouton trigger reprend le style de l'image via className
 * (.card-image / .route-detail-image) : l'image est recadrée dedans,
 * arrondis hérités, cursor zoom-in.
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
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Agrandir : ${caption ?? alt}`}
        className={"zoom-trigger " + (className ?? "")}
      >
        <Image src={src} alt={alt} width={width} height={height} priority={priority} />
      </button>

      {open && (
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
              src={src}
              alt={alt}
              width={1600}
              height={1067}
              style={{ width: "100%", height: "auto", borderRadius: 14 }}
            />
            {caption ? (
              <figcaption
                style={{
                  color: "var(--parchment)",
                  textAlign: "center",
                  marginTop: 12,
                  fontSize: 15,
                }}
              >
                {caption}
              </figcaption>
            ) : null}
          </figure>
          <button
            type="button"
            onClick={close}
            aria-label="Fermer"
            style={{ position: "absolute", top: 20, right: 20, ...navBtnStyle }}
          >
            ✕
          </button>
        </div>
      )}
    </>
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
