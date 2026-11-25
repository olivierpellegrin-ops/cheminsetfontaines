"use client";

import { useActionState, useEffect, useState } from "react";
import {
  markNewsletterReady,
  saveNewsletter,
  sendNewsletterTest,
  type NlFormState,
} from "@/app/actions/admin-newsletters";
import {
  BLOCK_TYPE_LABELS,
  type NlBlock,
  type NlPhoto,
} from "@/lib/newsletters";

/**
 * Concepteur du numéro courant (brique N3, spec §6.2/§6.3) : l'en-tête
 * (titre, résumé, couverture, à la une) + les blocs réordonnables
 * (↑/↓), masquables, supprimables ; les blocs texte et album peuvent
 * être ajoutés à la main. Les blocs events/route/adhesion sont FIGÉS à
 * la génération : seule leur note de rédaction est éditable ici.
 *
 * N3.6 : blocs de composition du modèle Mailchimp ajoutables à la main
 * (image, bouton, séparateur) pour les numéros exceptionnels.
 *
 * Toute modification des blocs invalide le test d'envoi de la version
 * précédente (empreinte calculée côté serveur) ; le numéro repasse
 * « prêt » → « brouillon » à l'enregistrement.
 */
export default function NewsletterEditor({
  id,
  initialTitle,
  initialPublicationLabel,
  initialSummary,
  initialCoverImageUrl,
  initialFeatured,
  initialStatus,
  initialBlocks,
  testedAtIso,
  testUpToDate,
}: {
  id: string;
  initialTitle: string;
  initialPublicationLabel: string;
  initialSummary: string;
  initialCoverImageUrl: string;
  initialFeatured: string;
  initialStatus: string;
  initialBlocks: NlBlock[];
  testedAtIso: string | null;
  testUpToDate: boolean;
}) {
  const [blocks, setBlocks] = useState<NlBlock[]>(initialBlocks);
  const [saveState, onSave, saving] = useActionState(saveNewsletter, null);
  const [testState, onTest, testing] = useActionState(sendNewsletterTest, null);
  const [previewKey, setPreviewKey] = useState(0);

  // L'aperçu suit la version en base : rafraîchi après chaque enregistrement.
  useEffect(() => {
    if (saveState?.ok) setPreviewKey((k) => k + 1);
  }, [saveState]);

  const patchBlock = (i: number, patch: Record<string, unknown>) =>
    setBlocks((bs) =>
      bs.map((b, j) => (j === i ? ({ ...b, ...patch } as NlBlock) : b))
    );

  const move = (i: number, dir: -1 | 1) =>
    setBlocks((bs) => {
      const j = i + dir;
      if (j < 0 || j >= bs.length) return bs;
      const copy = [...bs];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });

  const removeBlock = (i: number) =>
    setBlocks((bs) => bs.filter((_, j) => j !== i));

  const addText = () =>
    setBlocks((bs) => [...bs, { type: "texte", title: "", body: "" }]);

  const addAlbum = () =>
    setBlocks((bs) => [...bs, { type: "album", title: "", photos: [] }]);

  const addImage = () =>
    setBlocks((bs) => [
      ...bs,
      { type: "image", src: "", alt: "", href: "", width: 172 },
    ]);

  const addBouton = () =>
    setBlocks((bs) => [...bs, { type: "bouton", label: "", href: "" }]);

  const addSeparateur = () =>
    setBlocks((bs) => [...bs, { type: "separateur" }]);

  const patchPhoto = (i: number, pi: number, patch: Partial<NlPhoto>) =>
    setBlocks((bs) =>
      bs.map((b, j) => {
        if (j !== i || b.type !== "album") return b;
        return {
          ...b,
          photos: b.photos.map((p, k) => (k === pi ? { ...p, ...patch } : p)),
        };
      })
    );

  const addPhoto = (i: number) =>
    setBlocks((bs) =>
      bs.map((b, j) =>
        j === i && b.type === "album"
          ? { ...b, photos: [...b.photos, { url: "" }] }
          : b
      )
    );

  const removePhoto = (i: number, pi: number) =>
    setBlocks((bs) =>
      bs.map((b, j) => {
        if (j !== i || b.type !== "album") return b;
        return { ...b, photos: b.photos.filter((_, k) => k !== pi) };
      })
    );

  const statusBadge =
    initialStatus === "brouillon"
      ? { label: "brouillon", cls: "cf-admin__badge--draft" }
      : initialStatus === "pret"
        ? { label: "prêt", cls: "" }
        : { label: initialStatus === "valide_envoyee" ? "envoyée" : "archivée", cls: "cf-admin__badge--published" };

  return (
    <section className="cf-admin__nl-editor">
      <div className="cf-admin__head">
        <h1>Éditer le numéro</h1>
        <div className="cf-admin__head-right">
          <span className={`cf-admin__badge ${statusBadge.cls}`}>
            {statusBadge.label}
          </span>
        </div>
      </div>

      <div className="cf-nl__layout">
        <div className="cf-nl__main">
          <form action={onSave} className="cf-nl__save">
            <input type="hidden" name="id" value={id} />
            <input
              type="hidden"
              name="blocks"
              value={JSON.stringify(blocks)}
            />
            <label>
              Titre du numéro
              <input type="text" name="title" defaultValue={initialTitle} />
            </label>
            <label>
              Numéro (libellé affiché dans la liste et l&apos;archive)
              <input
                type="text"
                name="publicationLabel"
                defaultValue={initialPublicationLabel}
              />
            </label>
            <label>
              Résumé
              <textarea name="summary" defaultValue={initialSummary} rows={2} />
            </label>
            <label>
              Image de couverture (URL — vide pour masquer)
              <input
                type="text"
                name="coverImageUrl"
                defaultValue={initialCoverImageUrl}
              />
            </label>
            <label>
              À la une (texte « Featured » sous le titre)
              <input type="text" name="featured" defaultValue={initialFeatured} />
            </label>
            <button type="submit" disabled={saving}>
              {saving ? "Enregistrement…" : "Enregistrer"}
            </button>
            {saveState && <p role="status">{saveState.message}</p>}
          </form>

          <h2>Blocs de l&apos;e-mail</h2>
          <p className="cf-nl__hint">
            Ordre, masquage et retraits s&apos;enregistrent avec le bouton
            « Enregistrer ». Les blocs sorties/itinéraire/adhésion sont figés
            à la génération (garde anti-erreur : le site peut bouger, pas le numéro).
          </p>
          <div>
            {blocks.map((b, i) => (
              <div
                key={i}
                className={"cf-nl__block" + (b.hidden ? " cf-nl__ghost" : "")}
              >
                <div className="cf-nl__block-head">
                  <h3>{BLOCK_TYPE_LABELS[b.type]}</h3>
                  <button
                    type="button"
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    title="Monter"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, 1)}
                    disabled={i === blocks.length - 1}
                    title="Descendre"
                  >
                    ↓
                  </button>
                  <button type="button" onClick={() => removeBlock(i)}>
                    Supprimer
                  </button>
                  <button
                    type="button"
                    onClick={() => patchBlock(i, { hidden: !b.hidden })}
                  >
                    {b.hidden ? "Réafficher" : "Masquer"}
                  </button>
                </div>

                {(b.type === "intro" || b.type === "texte") && (
                  <label>
                    {b.type === "intro" ? "Édito" : "Texte libre"}
                    <textarea
                      value={b.body}
                      rows={4}
                      disabled={b.hidden}
                      placeholder="Deux paragraphes séparés par une ligne vide."
                      onChange={(e) => patchBlock(i, { body: e.target.value })}
                    />
                  </label>
                )}

                {b.type === "events" && (
                  <>
                    <label>
                      Titre du bloc
                      <input
                        type="text"
                        value={b.title ?? ""}
                        disabled={b.hidden}
                        onChange={(e) =>
                          patchBlock(i, { title: e.target.value })
                        }
                      />
                    </label>
                    <p className="cf-nl__hint">
                      {b.cards.length} sortie{b.cards.length > 1 ? "s" : ""}{" "}
                      figée{b.cards.length > 1 ? "s" : ""} à la génération —
                      détails visibles dans l&apos;aperçu.
                    </p>
                  </>
                )}

                {b.type === "route" && (
                  <>
                    <label>
                      Titre du bloc
                      <input
                        type="text"
                        value={b.title ?? ""}
                        disabled={b.hidden}
                        onChange={(e) =>
                          patchBlock(i, { title: e.target.value })
                        }
                      />
                    </label>
                    <label>
                      Note de rédaction (facultatif)
                      <textarea
                        value={b.note ?? ""}
                        rows={2}
                        disabled={b.hidden}
                        onChange={(e) =>
                          patchBlock(i, { note: e.target.value })
                        }
                      />
                    </label>
                    <p className="cf-nl__hint">
                      Itinéraire « {b.card.title} » ({b.card.townshipLabel}),
                      figé à la génération.
                    </p>
                  </>
                )}

                {b.type === "album" && (
                  <>
                    <label>
                      Titre du bloc
                      <input
                        type="text"
                        value={b.title ?? ""}
                        disabled={b.hidden}
                        onChange={(e) =>
                          patchBlock(i, { title: e.target.value })
                        }
                      />
                    </label>
                    {b.photos.map((p, pi) => (
                      <div className="cf-nl__photo" key={pi}>
                        <input
                          type="text"
                          value={p.url}
                          placeholder="URL de la photo"
                          disabled={b.hidden}
                          onChange={(e) =>
                            patchPhoto(i, pi, { url: e.target.value })
                          }
                        />
                        <input
                          type="text"
                          value={p.alt ?? ""}
                          placeholder="Texte alternatif"
                          disabled={b.hidden}
                          onChange={(e) =>
                            patchPhoto(i, pi, { alt: e.target.value })
                          }
                        />
                        <input
                          type="text"
                          value={p.caption ?? ""}
                          placeholder="Légende"
                          disabled={b.hidden}
                          onChange={(e) =>
                            patchPhoto(i, pi, { caption: e.target.value })
                          }
                        />
                        <button type="button" onClick={() => removePhoto(i, pi)}>
                          Retirer
                        </button>
                      </div>
                    ))}
                    <button type="button" onClick={() => addPhoto(i)}>
                      Ajouter une photo
                    </button>
                  </>
                )}

                {b.type === "image" && (
                  <>
                    <label>
                      URL de l&apos;image
                      <input
                        type="text"
                        value={b.src}
                        disabled={b.hidden}
                        placeholder="https://…"
                        onChange={(e) => patchBlock(i, { src: e.target.value })}
                      />
                    </label>
                    <label>
                      Texte alternatif
                      <input
                        type="text"
                        value={b.alt ?? ""}
                        disabled={b.hidden}
                        onChange={(e) => patchBlock(i, { alt: e.target.value })}
                      />
                    </label>
                    <label>
                      Lien au clic (facultatif)
                      <input
                        type="text"
                        value={b.href ?? ""}
                        disabled={b.hidden}
                        placeholder="https://…"
                        onChange={(e) => patchBlock(i, { href: e.target.value })}
                      />
                    </label>
                    <label>
                      Largeur en pixels (vide = 172)
                      <input
                        type="number"
                        min={1}
                        value={b.width ?? ""}
                        disabled={b.hidden}
                        onChange={(e) =>
                          patchBlock(i, {
                            width:
                              e.target.value === ""
                                ? undefined
                                : Number(e.target.value),
                          })
                        }
                      />
                    </label>
                  </>
                )}

                {b.type === "bouton" && (
                  <>
                    <label>
                      Libellé du bouton
                      <input
                        type="text"
                        value={b.label}
                        disabled={b.hidden}
                        placeholder="Accédez"
                        onChange={(e) =>
                          patchBlock(i, { label: e.target.value })
                        }
                      />
                    </label>
                    <label>
                      Lien du bouton
                      <input
                        type="text"
                        value={b.href}
                        disabled={b.hidden}
                        placeholder="https://…"
                        onChange={(e) => patchBlock(i, { href: e.target.value })}
                      />
                    </label>
                    <p className="cf-nl__hint">
                      Bouton vert du modèle (fond #4d6b4b, coins 8 px).
                    </p>
                  </>
                )}

                {b.type === "separateur" && (
                  <p className="cf-nl__hint">
                    Trait horizontal vert 2 px, à l&apos;identique du
                    séparateur du modèle Mailchimp.
                  </p>
                )}

                {b.type === "adhesion" && (
                  <p className="cf-nl__hint">
                    Bloc automatique : invitation à adhérer, bouton vers la
                    page d&apos;adhésion du site.
                  </p>
                )}
              </div>
            ))}
          </div>
          <div className="cf-nl__add">
            <button type="button" onClick={addText}>
              Ajouter un bloc texte
            </button>
            <button type="button" onClick={addAlbum}>
              Ajouter un bloc album
            </button>
            <button type="button" onClick={addImage}>
              Ajouter une image
            </button>
            <button type="button" onClick={addBouton}>
              Ajouter un bouton
            </button>
            <button type="button" onClick={addSeparateur}>
              Ajouter un séparateur
            </button>
          </div>
        </div>

        <aside className="cf-nl__side">
          <h2>Test d&apos;envoi</h2>
          <p className="cf-nl__hint">
            {testedAtIso
              ? testUpToDate
                ? "Le test à jour valide cette version des blocs."
                : "Le dernier test est OBSOLÈTE : les blocs ont changé depuis."
              : "Aucun test envoyé pour ce numéro."}
          </p>
          <form action={onTest}>
            <input type="hidden" name="id" value={id} />
            <label>
              Adresse de test
              <input type="email" name="to" placeholder="prenom@exemple.fr" />
            </label>
            <button type="submit" disabled={testing}>
              {testing ? "Envoi…" : "Envoyer le test"}
            </button>
            {testState && (
              <p role="status" className="cf-nl__hint">
                {testState.message}
              </p>
            )}
          </form>

          {initialStatus === "brouillon" && (
            <form action={markNewsletterReady}>
              <input type="hidden" name="id" value={id} />
              <button type="submit" className="cf-admin__row-edit">
                Marquer comme prêt
              </button>
              <p className="cf-nl__hint">
                Relecture terminée : prêt pour la validation. L&apos;envoi
                réel aux souscripteurs arrive avec la brique N4.
              </p>
            </form>
          )}

          <h2>Aperçu</h2>
          <p className="cf-nl__hint">
            Rendu fidèle (même moteur que l&apos;e-mail). Se rafraîchit après
            chaque enregistrement :
          </p>
          <iframe
            key={previewKey}
            src={"/admin/newsletters/" + id + "/apercu"}
            className="cf-nl__preview"
            title="Aperçu de la newsletter"
          />
        </aside>
      </div>
    </section>
  );
}
