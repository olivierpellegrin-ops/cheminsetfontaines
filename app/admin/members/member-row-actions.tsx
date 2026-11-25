"use client";

import {
  deleteMember,
  markMemberSeasonPaid,
  sendMemberRenewalReminder,
} from "@/app/actions/admin-members";

/**
 * Actions par ligne de la liste des membres (brique N2), libellés courts
 * (retouche recette Olivier du 25/11) :
 * Cotisation reçue : membres actifs sans saison en cours (enregistre le
 * règlement, sans e-mail — la bienvenue ne part qu'à la création).
 * Relance : envoie le rappel de renouvellement à CE membre (gardes de
 * lib/renewal.ts : ~11 mois après le dernier règlement, 30 jours entre
 * deux relances, évaluées aussi côté action).
 * Supprimer : effacement RGPD complet (membre, saisons, demandes, journal
 * e-mails), confirmé.
 */
export default function MemberRowActions({
  memberId,
  needsRenewal,
  canRelance,
}: {
  memberId: string;
  needsRenewal: boolean;
  canRelance: boolean;
}) {
  return (
    <div className="cf-admin__row-actions">
      {needsRenewal && (
        <form action={markMemberSeasonPaid}>
          <input type="hidden" name="id" value={memberId} />
          <button
            type="submit"
            className="cf-admin__row-edit"
            title="Enregistre la cotisation de la saison en cours"
          >
            Cotisation reçue
          </button>
        </form>
      )}
      {needsRenewal && canRelance && (
        <form
          action={sendMemberRenewalReminder}
          onSubmit={(e) => {
            if (
              !window.confirm(
                "Envoyer le rappel de renouvellement à ce membre ?\n\n" +
                  "Un e-mail lui sera envoyé ; jamais plus d'un rappel tous les 30 jours par membre."
              )
            ) {
              e.preventDefault();
            }
          }}
        >
          <input type="hidden" name="id" value={memberId} />
          <button
            type="submit"
            className="cf-admin__row-toggle"
            title="Rappel de renouvellement individuel"
          >
            Relance
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
