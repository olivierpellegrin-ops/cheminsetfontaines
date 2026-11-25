"use client";

import { useState } from "react";
import {
  NewsletterContenu,
  type NlInlineEdit,
  type WrapBlock,
} from "@/emails/newsletter-mensuelle";
import { BLOCK_TYPE_LABELS, type NlBlock } from "@/lib/newsletters";

/**
 * N3.9 (1/2) : canvas WYSIWYG de l'éditeur — le rendu RÉEL des composants
 * du moteur (NewsletterContenu) affiché DANS la page admin, avec une
 * surcouche d'édition par bloc posée via wrapBlock : au survol, un cadre
 * pointillé + une barre d'actions (monter, descendre, dupliquer,
 * masquer, supprimer) ; au clic, le bloc est sélectionné et ses
 * réglages s'ouvrent dans la colonne de droite.
 *
 * N3.9 (2/2) : glisser-déposer + édition en place.
 *   - La POIGNÉE ⠿ de la barre d'actions (et elle seule) est draggable :
 *     le corps du bloc ne l'est pas, ses textes restent sélectionnables
 *     et éditables à la souris. Le repère de dépôt est la moitié
 *     haute (avant) ou basse (après) du bloc visé, signalé par un trait
 *     ochre ; tant qu'on survole autre chose, le bloc tenu s'atténue.
 *   - Le moteur reçoit « inline » : les paragraphes, titres et colonnes
 *     d'itinéraire deviennent éditables EN PLACE (contentEditable,
 *     commit sur blur) — chaque frappe se voit directement.
 *
 * L'aperçu est VIVANT : il lit l'état des blocs en cours d'édition.
 * Les liens de l'e-mail sont neutralisés (aucune navigation depuis le
 * canvas). Blocs masqués : invisibles ici (comme dans l'e-mail),
 * réaffichables depuis la liste dédiée de l'éditeur.
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
  onReorder,
  onDuplicate,
  onToggleHidden,
  onRemove,
  onPatch,
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
  onReorder: (from: number, to: number, pos: "avant" | "apres") => void;
  onDuplicate: (index: number) => void;
  onToggleHidden: (index: number) => void;
  onRemove: (index: number) => void;
  onPatch: NlInlineEdit;
}) {
  // Bloc tenu par la poignée ⠿ et repère de dépôt courant (purement
  // visuels, le déplacement réel part du onDrop avec valeurs fraîches).
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropAt, setDropAt] = useState<{
    index: number;
    pos: "avant" | "apres";
  } | null>(null);

  const wrap: WrapBlock = (index, block, children) => {
    const classes =
      "cf-wys__bloc" +
      (selection === index ? " is-selected" : "") +
      (dragIndex === index ? " is-dragging" : "") +
      (dropAt && dropAt.index === index
        ? dropAt.pos === "avant"
          ? " is-drop-avant"
          : " is-drop-apres"
        : "");
    return (
      <div
        key={"wys-" + index}
        className={classes}
        onClick={() => onSelect(index)}
        onDragOver={(e) => {
          if (dragIndex === null) return;
          e.preventDefault();
          const rect = e.currentTarget.getBoundingClientRect();
          const pos =
            e.clientY < rect.top + rect.height / 2 ? "avant" : "apres";
          setDropAt((d) =>
            d && d.index === index && d.pos === pos
              ? d
              : { index, pos }
          );
        }}
        onDrop={(e) => {
          e.preventDefault();
          if (dragIndex !== null && dragIndex !== index) {
            const rect = e.currentTarget.getBoundingClientRect();
            const pos =
              e.clientY < rect.top + rect.height / 2 ? "avant" : "apres";
            onReorder(dragIndex, index, pos);
          }
          setDragIndex(null);
          setDropAt(null);
        }}
      >
        {children}
        <div className="cf-wys__toolbar" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            title="Glisser pour déplacer le bloc"
            className="cf-wys__grip"
            draggable
            onDragStart={(e) => {
              e.dataTransfer.effectAllowed = "move";
              e.dataTransfer.setData("text/plain", "cf-wys-" + index);
              setDragIndex(index);
            }}
            onDragEnd={() => {
              setDragIndex(null);
              setDropAt(null);
            }}
          >
            ⠿
          </button>
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
  };

  return (
    <div className="cf-wys">
      <NewsletterContenu
        title={title}
        publicationLabel={publicationLabel}
        blocks={blocks}
        siteUrl={siteUrl}
        unsubscribeUrl={siteUrl + "/fr/newsletters"}
        wrapBlock={wrap}
        inline={onPatch}
      />
    </div>
  );
}
