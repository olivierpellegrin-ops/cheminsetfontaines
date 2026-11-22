import Link from "next/link";
import { FOOTER_LINKS, SITE } from "@/lib/site";

/** Footer « Association Footer » (data-framer-name) reproduit à l'identique. */
export default function Footer() {
  return (
    <footer style={{ background: "var(--forest)", color: "var(--parchment)", marginTop: 64 }}>
      <div
        className="container"
        style={{
          display: "grid",
          gap: 32,
          padding: "56px 24px 32px",
          gridTemplateColumns: "1fr",
        }}
      >
        <div>
          <p style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 24, marginBottom: 8 }}>
            Chemins et Fontaines
          </p>
          <p style={{ fontSize: 15, opacity: 0.85 }}>{SITE.baseline}</p>
          <p style={{ fontSize: 15, opacity: 0.85, marginTop: 4 }}>{SITE.location}</p>

          <p style={{ marginTop: 24, fontSize: 14, opacity: 0.85 }}>Rejoignez-nous sur</p>
          <a
            href={SITE.facebookUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Page Facebook de l'association"
            style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 15, color: "var(--ochre)" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M13.5 21v-7h2.4l.4-3h-2.8V9.1c0-.9.3-1.5 1.5-1.5h1.4V4.9c-.3 0-1.2-.1-2.2-.1-2.2 0-3.7 1.3-3.7 3.8V11H8v3h2.5v7h3Z" />
            </svg>
            Facebook
          </a>
        </div>

        <div>
          <p style={{ fontSize: 13, letterSpacing: "0.12em", textTransform: "uppercase", opacity: 0.7, marginBottom: 12 }}>
            Explorer
          </p>
          <ul style={{ listStyle: "none", display: "grid", gap: 8 }}>
            {FOOTER_LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} style={{ fontSize: 15, opacity: 0.9 }}>
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div
        className="container"
        style={{
          borderTop: "1px solid rgba(244,241,232,0.18)",
          padding: "20px 24px 28px",
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <p style={{ fontSize: 14, opacity: 0.7 }}>
          © 2026 Chemins et Fontaines · Tous droits réservés
        </p>
        <p style={{ fontSize: 14, opacity: 0.7 }}>FR / EN</p>
      </div>
    </footer>
  );
}
