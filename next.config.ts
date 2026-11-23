import type { NextConfig } from "next";

/**
 * Anciens slugs Framer (accentués / tirets multiples) -> slugs normalisés.
 * Décision Q2 (23/11/2026) : normalisation + redirections 301 systématiques
 * pour préserver le référencement. Q8 : aucune autre redirection Framer n'existe.
 */
const LEGACY_SLUGS: Array<{ from: string; to: string }> = [
  {
    from: "/fr/routes/afm-téléthon-2026---randonnée-12-kms",
    to: "/fr/routes/afm-telethon-2026-randonnee-12-kms",
  },
  {
    from: "/fr/routes/afm-téléthon-2026---randonnée-6-kms",
    to: "/fr/routes/afm-telethon-2026-randonnee-6-kms",
  },
];

const nextConfig: NextConfig = {
  images: {
    // v0.1 : les images restent servies par framerusercontent (copie à l'identique).
    // v0.2 : files locaux sous /public/photos (voir docs/MEDIA.md).
    remotePatterns: [
      { protocol: "https", hostname: "framerusercontent.com" },
    ],
  },
  async redirects() {
    return LEGACY_SLUGS.map(({ from, to }) => ({
      source: from,
      destination: to,
      permanent: true, // 301
    }));
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
