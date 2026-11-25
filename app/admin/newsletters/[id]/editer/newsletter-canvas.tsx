"use client";

import { NewsletterContenu, type WrapBlock } from "@/emails/newsletter-mensuelle";
import { BLOCK_TYPE_LABELS, type NlBlock } from "@/lib/newsletters";

/**
 * N3.9 (1/2) : canvas WYSIWYG de l'éditeur — le rendu RÉEL des composants
 * du moteur (NewsletterContenu) affiché DANS la page admin, avec une
 * surcouche d'édition par bloc posée via wrapBlock : au survol, un cadre
 * pointillé + une barre d'actions (monter, descendre, dupliquer,
 * masquer, supprimer) ; au clic, le bloc est sélectionné et ses
 * réglages s'ouvrent dans la colonne de droite.
 *
 * L'aperçu est VIVANT : il lit l'état des blocs en cours d'édition,
 * chaque frappe se voit immédiatement (plus d'iframe à rafraîchir après
 * enregistrement). Les liens de l'e-mail sont neutralisés (aucune
 * navigation depuis le canvas). Blocs masqués : invisibles ici (comme
 * dans l'e-mail), réaffichables depuis la liste dédiée de l'éditeur.
 */
export default function NewsletterCanvas({
  title,
  publicationLabel,
  blocks,
  siteUrl,
  selection,
  premierVisible,
  dernierVisible,
  onSelect,
  onMove,
  onDuplicate,
  onToggleHidden,
  onRemove,
}: {
  title: string;
  publicationLabel: string;
  blocks: NlBlock[];
  siteUrl: string;
  selection: number | null;
  premierVisible: number;
  dernierVisible: number;
  onSelect: (index: number) => void;
  onMove: (index: number, dir: -1 | 1) => void;
  onDuplicate: (index: number) => void;
  onToggleHidden: (index: number) => void;
  onRemove: (index: number) => void;
}) {
  const wrap: WrapBlock = (index, block, children) => (
    <div
      key={"wys-" + index}
      className={"cf-wys__bloc" + (selection === index ? " is-selected" : "")}
      onClick={() => onSelect(index)}
    >
      {children}
      <div className="cf-wys__toolbar" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          title="Monter"
          disabled={index === premierVisible}
          onClick={() => onMove(index, -1)}
        >
          ↑
        </button>
        <button
          type="button"
          title="Descendre"
          disabled={index === dernierVisible}
          onClick={() => onMove(index, 1)}
        >
          ↓
        </button>
        <button
          type="button"
          title="Dupliquer"
          onClick={() => onDuplicate(index)}
        >
          ⧉
        </button>
        <button
          type="button"
          title="Masquer dans l'e-mail"
          onClick={() => onToggleHidden(index)}
        >
          {block.hidden ? "Réafficher" : "Masquer"}
        </button>
        <button
          type="button"
          title={"Supprimer le bloc « " + BLOCK_TYPE_LABELS[block.type] + " »"}
          className="cf-wys__del"
          onClick={() => onRemove(index)}
        >
          ✕
        </button>
      </div>
    </div>
  );

  return (
    <div className="cf-wys">
      <NewsletterContenu
        title={title}
        publicationLabel={publicationLabel}
        blocks={blocks}
        siteUrl={siteUrl}
        unsubscribeUrl={siteUrl + "/fr/newsletters"}
        wrapBlock={wrap}
      />
    </div>
  );
}
