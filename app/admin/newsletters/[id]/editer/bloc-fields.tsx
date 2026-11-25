"use client";

import { BLOCK_TYPE_LABELS, type NlBlock, type NlPhoto } from "@/lib/newsletters";

/**
 * N3.9 (1/2) : réglages du bloc SÉLECTIONNÉ, affichés dans la colonne
 * de droite de l'éditeur. Reprise à l'identique des champs de l'ancien
 * panneau « Blocs de l'e-mail » (N3/N3.7), un seul bloc à la fois : le
 * bloc cliqué dans le canvas WYSIWYG. Les champs restent utilisables
 * sur un bloc masqué (invisible dans l'e-mail, éditable ici).
 */
export default function BlocFields({
  block,
  index,
  patchBlock,
  patchPhoto,
  addPhoto,
  removePhoto,
}: {
  block: NlBlock;
  index: number;
  patchBlock: (i: number, patch: Record<string, unknown>) => void;
  patchPhoto: (i: number, pi: number, patch: Partial<NlPhoto>) => void;
  addPhoto: (i: number) => void;
  removePhoto: (i: number, pi: number) => void;
}) {
  return (
    <div className="cf-nl__fields">
      <h3>{BLOCK_TYPE_LABELS[block.type]}</h3>

      {(block.type === "intro" || block.type === "texte") && (
        <label>
          {block.type === "intro" ? "Édito" : "Texte libre"}
          <textarea
            value={block.body}
            rows={6}
            placeholder="Deux paragraphes séparés par une ligne vide."
            onChange={(e) => patchBlock(index, { body: e.target.value })}
          />
        </label>
      )}

      {block.type === "events" && (
        <>
          <label>
            Titre du bloc
            <input
              type="text"
              value={block.title ?? ""}
              onChange={(e) => patchBlock(index, { title: e.target.value })}
            />
          </label>
          <p className="cf-nl__hint">
            {block.cards.length} sortie{block.cards.length > 1 ? "s" : ""}
            {block.cards.length > 1 ? "s" : ""} figée
            {block.cards.length > 1 ? "s" : ""} à la génération —
            détails visibles à droite.
          </p>
        </>
      )}

      {block.type === "route" && (
        <>
          <label>
            Titre du bloc
            <input
              type="text"
              value={block.title ?? ""}
              onChange={(e) => patchBlock(index, { title: e.target.value })}
            />
          </label>
          <label>
            Nom du parcours (affiché sous la vignette)
            <input
              type="text"
              value={block.card.title}
              onChange={(e) =>
                patchBlock(index, {
                  card: { ...block.card, title: e.target.value },
                })
              }
            />
          </label>
          <label>
            Commune (titre de la colonne)
            <input
              type="text"
              value={block.card.townshipLabel}
              onChange={(e) =>
                patchBlock(index, {
                  card: { ...block.card, townshipLabel: e.target.value },
                })
              }
            />
          </label>
          <label>
            Vignette (URL — vide pour masquer)
            <input
              type="text"
              value={block.card.imageUrl ?? ""}
              placeholder="https://…"
              onChange={(e) =>
                patchBlock(index, {
                  card: {
                    ...block.card,
                    imageUrl: e.target.value || null,
                  },
                })
              }
            />
          </label>
          <label>
            Lien du bouton « Accédez »
            <input
              type="text"
              value={block.card.url}
              placeholder="https://…/fr/routes/…"
              onChange={(e) =>
                patchBlock(index, {
                  card: { ...block.card, url: e.target.value },
                })
              }
            />
          </label>
          <label>
            Note de rédaction (facultatif)
            <textarea
              value={block.note ?? ""}
              rows={2}
              onChange={(e) => patchBlock(index, { note: e.target.value })}
            />
          </label>
          <p className="cf-nl__hint">
            Itinéraire « {block.card.title} » ({block.card.townshipLabel}),
            figé à la création et retouchable ici : commune, nom,
            vignette et lien alimentent la colonne du rendu.
          </p>
        </>
      )}

      {block.type === "album" && (
        <>
          <label>
            Titre du bloc
            <input
              type="text"
              value={block.title ?? ""}
              onChange={(e) => patchBlock(index, { title: e.target.value })}
            />
          </label>
          {block.photos.map((p, pi) => (
            <div className="cf-nl__photo" key={pi}>
              <input
                type="text"
                value={p.url}
                placeholder="URL de la photo"
                onChange={(e) => patchPhoto(index, pi, { url: e.target.value })}
              />
              <input
                type="text"
                value={p.alt ?? ""}
                placeholder="Texte alternatif"
                onChange={(e) => patchPhoto(index, pi, { alt: e.target.value })}
              />
              <input
                type="text"
                value={p.caption ?? ""}
                placeholder="Légende"
                onChange={(e) =>
                  patchPhoto(index, pi, { caption: e.target.value })
                }
              />
              <button type="button" onClick={() => removePhoto(index, pi)}>
                Retirer
              </button>
            </div>
          ))}
          <button type="button" onClick={() => addPhoto(index)}>
            Ajouter une photo
          </button>
        </>
      )}

      {block.type === "image" && (
        <>
          <label>
            URL de l&apos;image
            <input
              type="text"
              value={block.src}
              placeholder="https://…"
              onChange={(e) => patchBlock(index, { src: e.target.value })}
            />
          </label>
          <label>
            Texte alternatif
            <input
              type="text"
              value={block.alt ?? ""}
              onChange={(e) => patchBlock(index, { alt: e.target.value })}
            />
          </label>
          <label>
            Lien au clic (facultatif)
            <input
              type="text"
              value={block.href ?? ""}
              placeholder="https://…"
              onChange={(e) => patchBlock(index, { href: e.target.value })}
            />
          </label>
          <label>
            Largeur en pixels (vide = 172)
            <input
              type="number"
              min={1}
              value={block.width ?? ""}
              onChange={(e) =>
                patchBlock(index, {
                  width:
                    e.target.value === "" ? undefined : Number(e.target.value),
                })
              }
            />
          </label>
        </>
      )}

      {block.type === "bouton" && (
        <>
          <label>
            Libellé du bouton
            <input
              type="text"
              value={block.label}
              placeholder="Accédez"
              onChange={(e) => patchBlock(index, { label: e.target.value })}
            />
          </label>
          <label>
            Lien du bouton
            <input
              type="text"
              value={block.href}
              placeholder="https://…"
              onChange={(e) => patchBlock(index, { href: e.target.value })}
            />
          </label>
          <p className="cf-nl__hint">
            Bouton vert du modèle (fond #4d6b4b, coins 8 px).
          </p>
        </>
      )}

      {block.type === "separateur" && (
        <p className="cf-nl__hint">
          Trait horizontal vert 2 px, à l&apos;identique du séparateur
          du modèle Mailchimp.
        </p>
      )}

      {block.type === "adhesion" && (
        <p className="cf-nl__hint">
          Bloc automatique : invitation à adhérer, bouton vers la page
          d&apos;adhésion du site.
        </p>
      )}

      {block.hidden && (
        <p className="cf-nl__hint">
          Bloc masqué : invisible dans l&apos;e-mail et dans l&apos;aperçu.
          Réaffichez-le depuis la liste « Blocs masqués » sous l&apos;aperçu.
        </p>
      )}
    </div>
  );
}
