"use client";

/**
 * Bouton « Télécharger le GPX » — logique du composant Framer
 * NamedGPXDownload.tsx : on récupère l'URL du GPX auprès de
 * /api/gpx/<slug>, puis on déclenche le téléchargement avec le nom
 * de fichier d'origine (l'API force le Content-Disposition ; le
 * fallback ouvre l'URL dans un nouvel onglet si le navigateur
 * bloque le Blob). Style « à l'identique Framer » selon la page :
 * - home : bg #e8eee4, radius 10, padding 10/8, 14px ;
 * - liste itinéraires (fr/routes) : blanc, radius 8, padding 10/12, 12px ;
 * - détail itinéraire : pastille ochre, radius 100, padding 12/20, 14px.
 */
export default function GPXButton({
  slug,
  variant = "home",
}: {
  slug: string;
  variant?: "home" | "list" | "detail";
}) {
  async function handleClick() {
    const url = "/api/gpx/" + encodeURIComponent(slug);
    try {
      const res = await fetch(url, { method: "GET" });
      if (!res.ok) throw new Error("gpx indisponible");
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename\\*=UTF-8''([^;]+)/);
      const fileName = match
        ? decodeURIComponent(match[1])
        : slug + ".gpx";

      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      // fallback : ouverture dans un nouvel onglet (302 vers l'asset Framer)
      window.open(url, "_blank", "noopener");
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={variant === "home" ? "btn-gpx" : "btn-gpx btn-gpx--" + variant}
    >
      Télécharger le GPX
    </button>
  );
}
