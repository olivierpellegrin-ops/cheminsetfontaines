"use client";

import { deleteNewsletterDraft } from "@/app/actions/admin-newsletters";

/**
 * Actions par ligne de la liste des numéros (brique N3) : seule la
 * suppression d'un numéro NON envoyé est offerte ici (RGPD : purge des
 * essais, l'outbox du numéro est nettoyée avec lui) ; les numéros déjà
 * envoyés ou archivés sont conservés.
 */
export default function NewsletterRowActions({
  newsletterId,
  sent,
}: {
  newsletterId: string;
  sent: boolean;
}) {
  if (sent) return null;
  return (
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
  );
}
