"use client";

import { toggleRouteStatus, deleteRoute } from "@/app/actions/admin-routes";

/**
 * B4 : actions par ligne de la liste. La suppression demande une
 * confirmation (cascade irréversible : photos + fichiers disque).
 */
export default function RouteRowActions({
  routeId,
  status,
}: {
  routeId: string;
  status: "published" | "draft";
}) {
  return (
    <div className="cf-admin__row-actions">
      <a href={`/admin/routes/${routeId}`} className="cf-admin__row-edit">
        Modifier
      </a>
      <form action={toggleRouteStatus}>
        <input type="hidden" name="id" value={routeId} />
        <button type="submit" className="cf-admin__row-toggle">
          {status === "published" ? "Dépublier" : "Publier"}
        </button>
      </form>
      <form
        action={deleteRoute}
        onSubmit={(e) => {
          if (
            !window.confirm(
              "Supprimer définitivement cet itinéraire ?\n\nPhotos d'album, GPX et image principale seront également supprimés du disque. Action irréversible."
            )
          ) {
            e.preventDefault();
          }
        }}
      >
        <input type="hidden" name="id" value={routeId} />
        <button type="submit" className="cf-admin__row-delete">
          Supprimer
        </button>
      </form>
    </div>
  );
}
