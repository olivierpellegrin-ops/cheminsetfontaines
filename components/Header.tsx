"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { NAV_LINKS } from "@/lib/site";

/**
 * Header reproduit du composant Framer « Association Layout » + Mobile
 * Navigation (menu hamburger, même liens, même libellés).
 */
export default function Header() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "var(--forest)",
      }}
    >
      {/* Barre Framer d'origine : pleine largeur, padding 18px 48px,
          PAS de logo visible (ancre « Chemins et Fontaines Logo » vide
          dans le HTML source), liens Fira Sans 18px/500 blancs. */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: 32,
          padding: "18px 48px",
        }}
      >

        {/* Navigation desktop */}
        <nav aria-label="Navigation principale" className="desktop-nav" style={{ display: "flex", alignItems: "center", gap: 32 }}>
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              style={{
                fontSize: 18,
                fontWeight: 500,
                color: pathname === l.href ? "var(--parchment)" : "#fff",
              }}
            >
              {l.label}
            </Link>
          ))}
          <Link href="/fr/newsletters" style={{ fontSize: 18, fontWeight: 500, color: "#fff" }}>
            Newsletters
          </Link>
          <span style={{ fontSize: 18, fontWeight: 600, color: "rgba(255, 255, 255, 0.85)" }}>FR / EN</span>
        </nav>

        {/* Bouton menu mobile */}
        <button
          aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="mobile-toggle"
          style={{ background: "none", border: "none", cursor: "pointer", padding: 8 }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M4 5h16M4 12h16M4 19h16"
              stroke="#fff"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      {/* Menu mobile */}
      {open && (
        <nav
          aria-label="Navigation mobile"
          style={{ borderTop: "1px solid rgba(255, 255, 255, 0.15)", background: "var(--forest)" }}
        >
          <div className="container" style={{ display: "flex", flexDirection: "column", padding: "12px 24px" }}>
            {[...NAV_LINKS, { href: "/fr/newsletters", label: "Newsletters" }].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                style={{ padding: "12px 0", fontSize: 16, fontWeight: 500, color: "#fff" }}
              >
                {l.label}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
