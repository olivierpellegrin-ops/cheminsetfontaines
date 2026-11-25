"use client";

import { deleteMember, markMemberSeasonPaid } from "@/app/actions/admin-members";

/**
 * Actions par ligne de la liste des membres (brique N2).
 * Cotisation reçue : membres actifs sans saison en cours (renouvellement
 * direct, sans e-mail — la bienvenue ne part qu'à la création).
 * Supprimer : effacement RGPD complet (membre, saisons, demandes, journal
 * e-mails), confirmé.
 */
export default function MemberRowActions({
  memberId,
  needsRenewal,
  season,
}: {
  memberId: string;
  needsRenewal: boolean;
  season: number;
}) {
  return (
    <div className="cf-admin__row-actions">
      {needsRenewal && (
        <form action={markMemberSeasonPaid}>
          <input type="hidden" name="id" value={memberId} />
          <button type="submit" className="cf-admin__row-edit">
            Cotisation reçue (saison {season})
          </button>
        </form>
      )}
      <form
        action={deleteMember}
        onSubmit={(e) => {
          if (
            !window.confirm(
              "Supprimer définitivement ce membre ?\n\n" +
                "Le membre, ses saisons, ses demandes d'adhésion et les lignes du journal des e-mails qui le référencent seront effacés (droit à l'effacement RGPD). " +
                "Action irréversible."
            )
          ) {
            e.preventDefault();
          }
        }}
      >
        <input type="hidden" name="id" value={memberId} />
        <button type="submit" className="cf-admin__row-delete">
          Supprimer
        </button>
      </form>
    </div>
  );
}
