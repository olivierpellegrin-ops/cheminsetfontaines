"use client";

import { deleteNewsletterDraft, duplicateNewsletter } from "@/app/actions/admin-newsletters";

/**
 * Actions par ligne de la liste des numéros (brique N3 + retour Olivier
 * du 25/11) : « Dupliquer » copie la conception dans un brouillon neuf
 * (newsletter exceptionnelle — permis aussi sur un numéro déjà envoyé
 * pour reprendre une conception) ; la suppression RGPD ne concerne que
 * les numéros NON envoyés (l'outbox du numéro est nettoyée avec lui) ;
 * les numéros déjà envoyés ou archivés sont conservés.
 */
export default function NewsletterRowActions({
  newsletterId,
  sent,
}: {
  newsletterId: string;
  sent: boolean;
}) {
  return (
    <>
      <form action={duplicateNewsletter}>
        <input type="hidden" name="id" value={newsletterId} />
        <button type="submit" className="cf-admin__row-toggle">
          Dupliquer
        </button>
      </form>
      {!sent && (
        <form
          action={deleteNewsletterDraft}
          onSubmit={(e) => {
            if (
              !window.confirm(
                "Supprimer définitivement ce numéro de newsletter ?\n\n" +
                  "Les blocs, le snapshot et les essais envoyés (outbox) seront effacés. Action irréversible."
              )
            ) {
              e.preventDefault();
            }
          }}
        >
          <input type="hidden" name="id" value={newsletterId} />
          <button type="submit" className="cf-admin__row-delete">
            Supprimer
          </button>
        </form>
      )}
    </>
  );
}
