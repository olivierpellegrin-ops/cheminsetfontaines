"use client";

import { sendRenewalReminders } from "@/app/actions/admin-members";

/**
 * Bandeau des relances de cotisation (brique N2) : visible seulement si
 * la cohorte éligible n'est pas vide. Le compteur suit la règle
 * « anniversaire » (lib/renewal.ts) : membres sans cotisation de la
 * saison dont le dernier règlement date de plus de ~11 mois, sans
 * relance depuis 30 jours (l'action re-vérifie toutes les gardes).
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
            `Envoyer le rappel de renouvellement ${season} à ${count} membre${count > 1 ? "s" : ""} ?\n\n` +
              "Seuls les membres sans cotisation " + `${season}` + " dont le dernier règlement date de plus de 11 mois recevront un e-mail (règle anniversaire). " +
              "Jamais plus d'un rappel tous les 30 jours par membre."
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <button type="submit" className="cf-admin__row-edit">
        Envoyer les relances ({count} éligible{count > 1 ? "s" : ""})
      </button>
    </form>
  );
}
