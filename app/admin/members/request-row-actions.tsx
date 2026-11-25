"use client";

import {
  deleteMembershipRequest,
  markCotisationReceived,
  resendMembershipConfirmation,
} from "@/app/actions/admin-members";

/**
 * Actions par ligne de la liste des demandes d'adhésion (brique N2),
 * libellés courts (retouche recette Olivier du 25/11) :
 * « En attente » (état, demande non confirmée) + Renvoyer ;
 * Cotisation reçue : demandes confirmées non traitées ;
 * Supprimer : effacement RGPD confirmé.
 */
export default function RequestRowActions({
  requestId,
  confirmed,
  handled,
}: {
  requestId: string;
  confirmed: boolean;
  handled: boolean;
}) {
  return (
    <div className="cf-admin__row-actions">
      {!confirmed && !handled && (
        <>
          <span className="cf-admin__badge cf-admin__badge--draft">En attente</span>
          <form action={resendMembershipConfirmation}>
            <input type="hidden" name="id" value={requestId} />
            <button type="submit" className="cf-admin__row-toggle">
              Renvoyer
            </button>
          </form>
        </>
      )}
      {confirmed && !handled && (
        <form action={markCotisationReceived}>
          <input type="hidden" name="id" value={requestId} />
          <button
            type="submit"
            className="cf-admin__row-edit"
            title="Enregistre la cotisation et crée ou met à jour le membre"
          >
            Cotisation reçue
          </button>
        </form>
      )}
      <form
        action={deleteMembershipRequest}
        onSubmit={(e) => {
          if (
            !window.confirm(
              "Supprimer définitivement cette demande d'adhésion ?\n\n" +
                "Les données saisies (coordonnées, consentements) seront effacées de la base (droit à l'effacement RGPD). " +
                "Si la cotisation a déjà été validée, le membre reste en base. Action irréversible."
            )
          ) {
            e.preventDefault();
          }
        }}
      >
        <input type="hidden" name="id" value={requestId} />
        <button type="submit" className="cf-admin__row-delete">
          Supprimer
        </button>
      </form>
    </div>
  );
}
