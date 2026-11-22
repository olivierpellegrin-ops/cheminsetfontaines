"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { NAV_LINKS, SITE } from "@/lib/site";

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
        background: "var(--parchment)",
        borderBottom: "1px solid var(--border-mid)",
      }}
    >
      <div
        className="container"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: 72,
        }}
      >
        <Link href="/fr" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Logo : « Chemins & Fontaines » en display serif + point ochre */}
          <span
            aria-hidden
            style={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: "var(--ochre)",
              display: "inline-block",
            }}
          />
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 20 }}>
            {SITE.name.includes("&") ? "Chemins & Fontaines" : SITE.name}
          </span>
        </Link>

        {/* Navigation desktop */}
        <nav aria-label="Navigation principale" className="desktop-nav">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              style={{
                fontSize: 15,
                fontWeight: 500,
                color: pathname === l.href ? "var(--ochre)" : "var(--forest)",
              }}
            >
              {l.label}
            </Link>
          ))}
          <Link href="/fr" style={{ fontSize: 15, fontWeight: 500, color: "var(--moss)" }}>
            Newsletters
          </Link>
          <span style={{ fontSize: 15, color: "var(--text-muted)" }}>FR / EN</span>
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
              stroke="var(--forest)"
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
          style={{ borderTop: "1px solid var(--border-mid)", background: "var(--parchment)" }}
        >
          <div className="container" style={{ display: "flex", flexDirection: "column", padding: "12px 24px" }}>
            {[...NAV_LINKS, { href: "/fr/newsletters", label: "Newsletters" }].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                style={{ padding: "12px 0", fontSize: 16, fontWeight: 500 }}
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
