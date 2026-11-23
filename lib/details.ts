/**
 * Ligne détails historique Framer recomposée depuis les champs structurés :
 * "12 kms - dénivellé 280 m - niveau facile".
 * Partagé entre la Server Action (serveur) et l'aperçu du formulaire (client).
 */
export function composeDetailsRaw(
  distanceKm: number | null,
  elevationGainM: number | null,
  difficulty: "facile" | "moyen" | "difficile" | null
): string | null {
  const parts: string[] = [];
  const d = Number(distanceKm?.toFixed(1));
  const e = Math.round(elevationGainM ?? 0);
  if (distanceKm != null) parts.push(`${d} kms`);
  if (elevationGainM != null) parts.push(`dénivellé ${e}m`);
  if (difficulty) parts.push(`niveau ${difficulty}`);
  return parts.length > 0 ? parts.join(" - ") : null;
}
