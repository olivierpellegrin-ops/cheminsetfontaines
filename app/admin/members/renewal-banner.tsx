"use client";

import { sendRenewalReminders } from "@/app/actions/admin-members";

/**
 * Bandeau du rappel de renouvellement (brique N2, spec §5.1) : visible
 * seulement si la cohorte éligible n'est pas vide. L'action applique la
 * garde des 30 jours par membre ; le compteur affiché la respecte aussi.
 */
export default function RenewalBanner({
  count,
  season,
}: {
  count: number;
  season: number;
}) {
  if (count === 0) return null;

  return (
    <form
      action={sendRenewalReminders}
      onSubmit={(e) => {
        if (
          !window.confirm(
            `Envoyer le rappel de renouvellement ${season} à ${count} membre${count > 1 ? "s" : ""} sans cotisation ?\n\n` +
              "Un e-mail leur sera envoyé ; jamais plus d'un rappel tous les 30 jours par membre."
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <button type="submit" className="cf-admin__row-edit">
        Envoyer le rappel de renouvellement ({count} à renouveler)
      </button>
    </form>
  );
}
