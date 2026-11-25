"use client";

import { resendSubscriberConfirmation, deleteSubscriber } from "@/app/actions/admin-subscribers";

/**
 * Actions par ligne de la liste des souscripteurs (brique N1).
 * Renvoyer : souscripteurs pending uniquement (garde 1 h dans l'action).
 * Supprimer : effacement RGPD (souscripteur + journal e-mails), confirmé.
 */
export default function SubscriberRowActions({
  subscriberId,
  pending,
}: {
  subscriberId: string;
  pending: boolean;
}) {
  return (
    <div className="cf-admin__row-actions">
      {pending && (
        <form action={resendSubscriberConfirmation}>
          <input type="hidden" name="id" value={subscriberId} />
          <button type="submit" className="cf-admin__row-toggle">
            Renvoyer
          </button>
        </form>
      )}
      <form
        action={deleteSubscriber}
        onSubmit={(e) => {
          if (
            !window.confirm(
              "Supprimer définitivement ce souscripteur ?\n\n" +
                "Son adresse disparaîtra de la base ainsi que les lignes du journal des e-mails qui la référencent (droit à l'effacement RGPD). Action irréversible."
            )
          ) {
            e.preventDefault();
          }
        }}
      >
        <input type="hidden" name="id" value={subscriberId} />
        <button type="submit" className="cf-admin__row-delete">
          Supprimer
        </button>
      </form>
    </div>
  );
}
