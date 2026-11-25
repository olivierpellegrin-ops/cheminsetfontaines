"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
import NewsletterCanvas from "./newsletter-canvas";
import BlocFields from "./bloc-fields";

/**
 * Concepteur du numéro courant (brique N3, spec §6.2/§6.3) : l'en-tête
 * (titre, résumé, couverture, à la une) + les blocs réordonnables
 * (↑/↓), masquables, supprimables ; les blocs texte et album peuvent
 * être ajoutés à la main. Les blocs events/route/adhesion sont FIGÉS à
 * la génération : seule leur note de rédaction est éditable ici.
 *
 * N3.6 : blocs de composition du modèle Mailchimp ajoutables à la main
 * (image, bouton, séparateur) pour les numéros exceptionnels.
 * N3.7 : les fiches d'itinéraire (nom, commune, vignette, lien) sont
 * retouchables ici — le modèle standard se personnalise bloc par bloc.
 * N3.8 : bouton « Annuler » (tête de page + à côté d'« Enregistrer »),
 * avec garde anti-perte si des modifications ne sont pas enregistrées.
 * N3.8b (retour d'Olivier) : « Enregistrer » et « Annuler » sur une même
 * ligne, en petit et classique — plus de deux gros boutons empilés.
 * N3.9 (1/2) : WYSIWYG façon Mailchimp — l'ancien panneau « Blocs de
 * l'e-mail » et l'iframe d'aperçu laissent place au CANVAS : le rendu
 * RÉEL du moteur affiché dans la page, vivant (chaque frappe se voit
 * immédiatement), survol = barre d'actions par bloc, clic = réglages du
 * bloc dans la colonne de droite. Enregistrer garde l'empreinte à jour
 * pour la garde anti-perte.
 * N3.9 (2/2) : glisser-déposer par la poignée ⠿ de la barre d'actions
 * (déposer avant/après le bloc visé, trait ochre de repère) et édition
 * des textes EN PLACE dans le canvas (paragraphes, titres, colonnes
 * d'itinéraire — commit au changement de focus, Entrée désactivée : la
 * structure des paragraphes reste dans la colonne de droite).
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
  siteUrl,
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
  siteUrl: string;
  testedAtIso: string | null;
  testUpToDate: boolean;
}) {
  const [blocks, setBlocks] = useState<NlBlock[]>(initialBlocks);
  const [saveState, onSave, saving] = useActionState(saveNewsletter, null);
  const [testState, onTest, testing] = useActionState(sendNewsletterTest, null);
  const [enteteTouchee, setEnteteTouchee] = useState(false);
  // Titre et libellé suivis dans l'état : le canvas les reflète VIVANT.
  const [titre, setTitre] = useState(initialTitle);
  const [libelle, setLibelle] = useState(initialPublicationLabel);
  // Bloc sélectionné dans le canvas (index dans le tableau complet) :
  // ses réglages s'affichent dans la colonne de droite.
  const [selection, setSelection] = useState<number | null>(null);
  // Empreinte de la dernière version ENREGISTRÉE (ou initiale) : sert de
  // point de comparaison à « Annuler » — après un enregistrement réussi,
  // les blocs édités redeviennent la référence et aucun confirmation
  // inutile n'est demandée.
  const [blocsEnregistres, setBlocsEnregistres] = useState(() =>
    JSON.stringify(initialBlocks)
  );
  const router = useRouter();

  // « Annuler » (retour d'Olivier du 25/11) : visibilité du bouton à côté
  // d'« Enregistrer » ET en tête de page. Garde anti-perte : si les blocs
  // édités diffèrent de la version en base ou qu'un champ d'en-tête a
  // bougé, une confirmation est demandée avant d'abandonner.
  const blocsModifies = JSON.stringify(blocks) !== blocsEnregistres;

  const annulerModifications = () => {
    if (
      (blocsModifies || enteteTouchee) &&
      !window.confirm(
        "Des modifications ne sont pas enregistrées.\n\n" +
          "Annuler et revenir à la liste des numéros ?"
      )
    ) {
      return;
    }
    router.push("/admin/newsletters");
  };

  // Après un enregistrement réussi : l'empreinte enregistrée rattrape
  // l'état courant (la garde « Annuler » ne demande plus confirmation).
  useEffect(() => {
    if (saveState?.ok) {
      setBlocsEnregistres(JSON.stringify(blocks));
      setEnteteTouchee(false);
    }
  }, [saveState]);

  const patchBlock = (i: number, patch: Record<string, unknown>) =>
    setBlocks((bs) =>
      bs.map((b, j) => (j === i ? ({ ...b, ...patch } as NlBlock) : b))
    );

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

  const move = (i: number, dir: -1 | 1) => {
    setBlocks((bs) => {
      const j = i + dir;
      if (j < 0 || j >= bs.length) return bs;
      const copy = [...bs];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
    // La sélection suit le bloc déplacé.
    setSelection((s) => (s === i ? i + dir : s));
  };

  // N3.9 (2/2) : glisser-déposer du canvas — le bloc tenu par sa poignée
  // ⠿ est déposé avant (moitié haute) ou après (moitié basse) le bloc
  // visé. Le déplacement travaille sur le tableau COMPLET (les blocs
  // masqués comptent dans les index), exactement comme ↑/↓.
  const deplacer = (from: number, to: number, pos: "avant" | "apres") => {
    if (from === to) return;
    setBlocks((bs) => {
      if (from < 0 || from >= bs.length || to < 0 || to >= bs.length) return bs;
      const copy = [...bs];
      const [deplace] = copy.splice(from, 1);
      let at = pos === "apres" ? to + 1 : to;
      if (from < at) at -= 1;
      copy.splice(at, 0, deplace);
      return copy;
    });
    // Position d'arrivée du bloc déplacé, pour que la sélection le suive.
    const arrivee =
      pos === "apres" ? (from <= to ? to : to + 1) : from < to ? to - 1 : to;
    setSelection((s) => (s === from ? arrivee : s));
  };

  const dupliquerBloc = (i: number) => {
    setBlocks((bs) => {
      if (i < 0 || i >= bs.length) return bs;
      const copie = JSON.parse(JSON.stringify(bs[i])) as NlBlock;
      const next = [...bs];
      next.splice(i + 1, 0, copie);
      return next;
    });
    setSelection(i + 1);
  };

  const masquerBloc = (i: number) =>
    setBlocks((bs) =>
      bs.map((b, j) => (j === i ? { ...b, hidden: !b.hidden } : b))
    );

  const supprimerBloc = (i: number) => {
    const b = blocks[i];
    if (!b) return;
    if (
      !window.confirm(
        "Supprimer le bloc « " +
          BLOCK_TYPE_LABELS[b.type] +
          " » de ce numéro ?"
      )
    ) {
      return;
    }
    setBlocks((bs) => bs.filter((_, j) => j !== i));
    setSelection((s) =>
      s === null ? null : s === i ? null : s > i ? s - 1 : s
    );
  };

  // Nouveau bloc : ajouté en fin de tableau ET sélectionné d'office,
  // ses réglages s'ouvrent immédiatement dans la colonne de droite.
  const ajouter = (b: NlBlock) => {
    const index = blocks.length;
    setBlocks((bs) => [...bs, b]);
    setSelection(index);
  };

  const addText = () => ajouter({ type: "texte", title: "", body: "" });

  const addAlbum = () => ajouter({ type: "album", title: "", photos: [] });

  const addImage = () =>
    ajouter({ type: "image", src: "", alt: "", href: "", width: 172 });

  const addBouton = () => ajouter({ type: "bouton", label: "", href: "" });

  const addSeparateur = () => ajouter({ type: "separateur" });

  // Borne de la pile des blocs VISIBLES : les flèches du canvas se
  // désactivent sur le premier/dernier bloc affiché.
  const visiblesIdx: number[] = [];
  blocks.forEach((b, i) => {
    if (!b.hidden) visiblesIdx.push(i);
  });
  const premierVisible = visiblesIdx.length > 0 ? visiblesIdx[0] : 0;
  const dernierVisible =
    visiblesIdx.length > 0 ? visiblesIdx[visiblesIdx.length - 1] : -1;

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
          <button
            type="button"
            className="cf-admin__btn-cancel"
            onClick={annulerModifications}
          >
            Annuler
          </button>
        </div>
      </div>

      <div className="cf-nl__layout">
        {/* Colonne gauche : l'en-tête du numéro + le test d'envoi. */}
        <div className="cf-nl__col">
          <h2>Numéro</h2>
          <form
            action={onSave}
            className="cf-nl__save"
            onChange={() => setEnteteTouchee(true)}
          >
            <input type="hidden" name="id" value={id} />
            <input
              type="hidden"
              name="blocks"
              value={JSON.stringify(blocks)}
            />
            <label>
              Titre du numéro
              <input
                type="text"
                name="title"
                value={titre}
                onChange={(e) => {
                  setTitre(e.target.value);
                  setEnteteTouchee(true);
                }}
              />
            </label>
            <label>
              Numéro (libellé affiché dans la liste et l&apos;archive)
              <input
                type="text"
                name="publicationLabel"
                value={libelle}
                onChange={(e) => {
                  setLibelle(e.target.value);
                  setEnteteTouchee(true);
                }}
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
            <div className="cf-nl__actions">
              <button type="submit" disabled={saving}>
                {saving ? "Enregistrement…" : "Enregistrer"}
              </button>
              <button
                type="button"
                className="cf-admin__btn-cancel"
                onClick={annulerModifications}
              >
                Annuler
              </button>
            </div>
            {saveState && <p role="status">{saveState.message}</p>}
          </form>

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

          <p className="cf-nl__hint">
            <a
              className="cf-nl__apercu-lien"
              href={"/admin/newsletters/" + id + "/apercu"}
              target="_blank"
              rel="noreferrer"
            >
              Ouvrir l&apos;aperçu fidèle (rendu e-mail complet)
            </a>
          </p>
        </div>

        {/* Colonne centrale : le CANVAS — rendu réel vivant du moteur. */}
        <div className="cf-nl__col cf-nl__col--canvas">
          <h2>Aperçu éditable</h2>
          <p className="cf-nl__hint">
            Rendu vivant, identique à l&apos;e-mail : chaque modification
            se voit immédiatement. Survolez un bloc pour agir, attrapez
            la poignée ⠿ pour le déplacer, cliquez-le pour ouvrir ses
            réglages à droite, et éditez ses textes directement à leur
            place.
          </p>
          <NewsletterCanvas
            title={titre}
            publicationLabel={libelle}
            blocks={blocks}
            siteUrl={siteUrl}
            selection={selection}
            premierVisible={premierVisible}
            dernierVisible={dernierVisible}
            onSelect={setSelection}
            onMove={move}
            onReorder={deplacer}
            onDuplicate={dupliquerBloc}
            onToggleHidden={masquerBloc}
            onRemove={supprimerBloc}
            onPatch={patchBlock}
          />
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
          {blocks.some((b) => b.hidden) && (
            <div className="cf-nl__masques">
              <h3>Blocs masqués (absents de l&apos;e-mail)</h3>
              <ul>
                {blocks.map((b, i) =>
                  b.hidden ? (
                    <li key={i}>
                      <span>{BLOCK_TYPE_LABELS[b.type]}</span>
                      <button type="button" onClick={() => masquerBloc(i)}>
                        Réafficher
                      </button>
                    </li>
                  ) : null
                )}
              </ul>
            </div>
          )}
        </div>

        {/* Colonne droite : réglages du bloc sélectionné. */}
        <div className="cf-nl__col cf-nl__col--reglages">
          <h2>Réglages du bloc</h2>
          {selection !== null && blocks[selection] ? (
            <BlocFields
              block={blocks[selection]}
              index={selection}
              patchBlock={patchBlock}
              patchPhoto={patchPhoto}
              addPhoto={addPhoto}
              removePhoto={removePhoto}
            />
          ) : (
            <p className="cf-nl__hint">
              Cliquez sur un bloc dans l&apos;aperçu : ses réglages
              s&apos;affichent ici. Les liens de l&apos;e-mail sont
              neutralisés dans le canvas, aucune navigation involontaire.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
