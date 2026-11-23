import Link from "next/link";
import { FOOTER_LINKS, SITE } from "@/lib/site";

/** Footer « Association Footer » (data-framer-name) reproduit à l'identique.
 *  Relevés HTTrack 23/11/2026 : .framer-24m9fj (fond #163c32, colonne
 *  centrée, gap 28, padding 48px 72px 24px), contenu max 1080 en
 *  space-between, colonne gauche 45% (gap 10), colonne droite Explorer,
 *  divider 1px #f4f1e833, ligne légale 13px centrée. */
export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer__content">
        <div className="footer__details">
          <p className="footer__name">Chemins et Fontaines</p>
          <p className="footer__purpose">{SITE.baseline}</p>
          <p className="footer__location">{SITE.location}</p>
          <a
            className="footer__facebook"
            href={SITE.facebookUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Page Facebook de l'association"
          >
            <span className="footer__facebook-label">Rejoignez-nous sur</span>
            <svg
              className="footer__facebook-icon"
              viewBox="0 0 16 16"
              aria-hidden
              fill="currentColor"
            >
              <path d="M 6.067 15.765 L 6.067 10.445 L 4.418 10.445 L 4.418 8 L 6.067 8 L 6.067 6.947 C 6.067 4.223 7.299 2.961 9.973 2.961 C 10.24 2.961 10.609 2.989 10.951 3.03 C 11.207 3.057 11.461 3.1 11.712 3.16 L 11.712 5.377 C 11.567 5.363 11.422 5.355 11.277 5.353 C 11.114 5.348 10.951 5.346 10.788 5.347 C 10.317 5.347 9.949 5.411 9.671 5.553 C 9.485 5.647 9.329 5.79 9.219 5.967 C 9.047 6.247 8.969 6.631 8.969 7.135 L 8.969 8 L 11.582 8 L 11.325 9.402 L 11.133 10.445 L 8.969 10.445 L 8.969 15.941 C 12.931 15.463 16 12.09 16 8 C 16 3.582 12.418 0 8 0 C 3.582 0 0 3.582 0 8 C 0 11.752 2.583 14.9 6.067 15.765 Z" />
            </svg>
          </a>
        </div>

        <nav className="footer__links">
          <p className="footer__heading">Explorer</p>
          {FOOTER_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="footer__link">
              {l.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="footer__divider" aria-hidden />

      <p className="footer__legal">© 2026 Chemins et Fontaines · Tous droits réservés</p>
    </footer>
  );
}
