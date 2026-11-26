"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import GpxPreview from "@/app/admin/routes/gpx-preview";
import {
  deleteTrace,
  moveTraceToBuffer,
  renameTrace,
  selectTrace,
  type TraceActionResult,
} from "@/app/actions/admin-traces-lists";

/**
 * Brique S3 « Agent Strava » (spec §7) : les 3 listes côte à côte, ascenseur
 * indépendant par liste, tri du plus récent au plus ancien (données déjà
 * triées et paginées côté serveur, 50 lignes par page).
 *
 * Les boutons [>>] de transfert vivent ENTRE les colonnes et agissent sur la
 * ligne cochée de la liste de gauche (pas de retour arrière, acte volontaire).
 * Chaque ligne déplacée disparaît immédiatement de sa liste (UI optimiste) ;
 * si l'action échoue côté serveur, la ligne revient et l'erreur s'affiche.
 */

export interface TraceRow {
  id: string;
  localTitle: string;
  startTime: string;
  distanceM: number | null;
}

export interface TraceListData {
  rows: TraceRow[];
  total: number;
  page: number;
  pages: number;
}

const frDateTime = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", {
    timeZone: "Europe/Paris",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const frKms = (m: number | null) =>
  m ? `${(m / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} kms` : "";

const CONFIRM_DELETE =
  "Supprimer ce tracé définitivement ? Il ne sera jamais réimporté par les synchronisations.";

const PAGES_KEYS = ["new", "selected", "buffer"] as const;
type ListKey = (typeof PAGES_KEYS)[number];

/** Pagination serveur (50 lignes par liste) : liens conservant l'état des
 * pages des autres listes et la recherche courante de la liste 1. */
function Pager({
  listKey,
  data,
  pages,
  q,
}: {
  listKey: ListKey;
  data: TraceListData;
  pages: Record<ListKey, number>;
  q: string;
}) {
  if (data.pages <= 1) return null;
  const href = (p: number) => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    for (const key of PAGES_KEYS) {
      sp.set(`p_${key}`, String(key === listKey ? p : pages[key]));
    }
    return `/admin/traces?${sp.toString()}`;
  };
  return (
    <footer className="cf-traces__pager">
      {data.page > 1 ? <Link href={href(data.page - 1)}>‹ Précédent</Link> : <span />}
      <span>
        Page {data.page} / {data.pages}
      </span>
      {data.page < data.pages ? <Link href={href(data.page + 1)}>Suivant ›</Link> : <span />}
    </footer>
  );
}

/** Une ligne : horodatage, titre, distance, actions propres à sa liste. */
function Row({
  listKey,
  row,
  gone,
  checkable,
  checked,
  onCheck,
  editingRow,
  onRenameOpen,
  onRename,
  onDelete,
  onVoir,
}: {
  listKey: ListKey;
  row: TraceRow;
  gone: boolean;
  checkable: boolean;
  checked: boolean;
  onCheck: () => void;
  editingRow: boolean;
  onRenameOpen: () => void;
  onRename: (title: string) => void;
  onCancelEdit: () => void;
  onDelete: () => void;
  onVoir: () => void;
}) {
  return (
    <li className="cf-traces__row" data-gone={gone ? "true" : undefined}>
      <div className="cf-traces__row-main">
        {checkable ? (
          <input
            type="checkbox"
            className="cf-traces__check"
            checked={checked}
            onChange={onCheck}
            aria-label={`Cocher « ${row.localTitle} »`}
          />
        ) : null}
        <span className="cf-traces__row-time">{frDateTime(row.startTime)}</span>
        <span className="cf-traces__row-title">— {row.localTitle}</span>
        {frKms(row.distanceM) ? (
          <span className="cf-traces__row-kms">· {frKms(row.distanceM)}</span>
        ) : null}
      </div>
      {!editingRow ? (
        <div className="cf-traces__row-actions">
          {listKey !== "buffer" ? (
            <button type="button" className="cf-traces__mini" onClick={onRenameOpen}>
              Renommer
            </button>
          ) : null}
          {listKey === "selected" ? (
            <>
              <button type="button" className="cf-traces__mini" onClick={onVoir}>
                Voir
              </button>
              <button
                type="button"
                className="cf-traces__mini"
                disabled
                title="Éditeur de tracé : brique future"
              >
                Modifier
              </button>
            </>
          ) : null}
          <button type="button" className="cf-traces__mini" onClick={onDelete}>
            Supprimer
          </button>
        </div>
      ) : (
        <form
          className="cf-traces__rename"
          onSubmit={(e) => {
            e.preventDefault();
            const title = String(new FormData(e.currentTarget).get("title") ?? "").trim();
            onRename(title);
          }}
        >
          <input
            name="title"
            defaultValue={row.localTitle}
            maxLength={120}
            autoFocus
            aria-label="Nouveau titre du tracé"
          />
          <button type="submit" className="cf-traces__mini">
            OK
          </button>
          <button type="button" className="cf-traces__mini" onClick={onCancelEdit}>
            Annuler
          </button>
        </form>
      )}
    </li>
  );
}

export default function TraceBoard({
  lists,
  q,
  maptilerKey,
  connected,
}: {
  lists: { new: TraceListData; selected: TraceListData; buffer: TraceListData };
  q: string;
  maptilerKey: string;
  connected: boolean;
}) {
  const [checkedNew, setCheckedNew] = useState<string | null>(null);
  const [checkedSelected, setCheckedSelected] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id: string } | null>(null);
  const [hidden, setHidden] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [voir, setVoir] = useState<{ id: string; title: string } | null>(null);
  const [, startTransition] = useTransition();

  /** Exécute une action serveur ; la ligne s'efface tout de suite, revient si échec. */
  function act(
    action: (fd: FormData) => Promise<TraceActionResult>,
    fd: FormData,
    hideId: string | null,
  ) {
    setError(null);
    if (hideId) setHidden((h) => [...h, hideId]);
    startTransition(async () => {
      const res = await action(fd);
      if (!res.ok) {
        if (hideId) setHidden((h) => h.filter((x) => x !== hideId));
        setError(res.error ?? "Erreur inconnue.");
      }
    });
  }

  const transfer = (
    id: string | null,
    action: (fd: FormData) => Promise<TraceActionResult>,
    clearCheck: () => void,
  ) => {
    if (!id) return;
    clearCheck();
    setEditing(null);
    const fd = new FormData();
    fd.set("traceId", id);
    act(action, fd, id);
  };

  const remove = (id: string) => {
    if (!window.confirm(CONFIRM_DELETE)) return;
    const fd = new FormData();
    fd.set("traceId", id);
    act(deleteTrace, fd, id);
  };

  const rename = (id: string, title: string) => {
    const fd = new FormData();
    fd.set("traceId", id);
    fd.set("title", title);
    act(renameTrace, fd, null);
    setEditing(null);
  };

  const emptyText = (listKey: ListKey) => {
    if (listKey === "new") {
      if (q) return "Aucun tracé ne correspond à cette recherche.";
      return connected
        ? "Aucun nouveau tracé : « Synchroniser maintenant » pour en importer."
        : "Connecte Strava puis synchronise pour voir tes tracés.";
    }
    if (listKey === "selected") return "Aucun tracé sélectionné. Coche un tracé à gauche puis [>>].";
    return "Le stock tampon est vide.";
  };

  const pages: Record<ListKey, number> = {
    new: lists.new.page,
    selected: lists.selected.page,
    buffer: lists.buffer.page,
  };

  const renderList = (listKey: ListKey, title: string) => {
    const data = lists[listKey];
    const checkable = listKey !== "buffer";
    return (
      <div className="cf-traces__col">
        <header className="cf-traces__col-head">
          <h2>{title}</h2>
          <span className="cf-admin__badge cf-admin__badge--draft">{data.total}</span>
        </header>
        {listKey === "new" ? (
          <form className="cf-traces__search" action="/admin/traces" method="get">
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Rechercher par titre"
              aria-label="Rechercher par titre"
            />
            <button type="submit" className="cf-traces__mini">
              OK
            </button>
          </form>
        ) : null}
        <div className="cf-traces__col-scroll">
          {data.rows.length === 0 ? (
            <p className="cf-traces__empty">{emptyText(listKey)}</p>
          ) : (
            <ul className="cf-traces__rows">
              {data.rows.map((t) => (
                <Row
                  key={t.id}
                  listKey={listKey}
                  row={t}
                  gone={hidden.includes(t.id)}
                  checkable={checkable}
                  checked={listKey === "new" ? checkedNew === t.id : checkedSelected === t.id}
                  editingRow={editing?.id === t.id && listKey !== "buffer"}
                  onCheck={() => {
                    if (listKey === "new") setCheckedNew(checkedNew === t.id ? null : t.id);
                    else setCheckedSelected(checkedSelected === t.id ? null : t.id);
                  }}
                  onRenameOpen={() => setEditing({ id: t.id })}
                  onCancelEdit={() => setEditing(null)}
                  onRename={(title) => rename(t.id, title)}
                  onDelete={() => remove(t.id)}
                  onVoir={() => setVoir({ id: t.id, title: t.localTitle })}
                />
              ))}
            </ul>
          )}
        </div>
        <Pager listKey={listKey} data={data} pages={pages} q={q} />
      </div>
    );
  };

  return (
    <>
      {error ? (
        <p className="cf-traces__flash cf-traces__flash--error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="cf-traces__grid">
        {renderList("new", "Tracés Strava")}

        {/* Transfert liste 1 -> 2 : bouton [>>] entre les colonnes, ligne cochée */}
        <div className="cf-traces__mid">
          <button
            type="button"
            className="cf-traces__mid-btn"
            disabled={!checkedNew}
            title={
              checkedNew
                ? "Sélectionner : télécharger le GPX et passer en « Sélectionnés »"
                : "Coche d'abord un tracé à gauche"
            }
            onClick={() => transfer(checkedNew, selectTrace, () => setCheckedNew(null))}
          >
            &gt;&gt;
          </button>
        </div>

        {renderList("selected", "Sélectionnés")}

        {/* Transfert liste 2 -> 3 : bouton [>>] entre les colonnes, ligne cochée */}
        <div className="cf-traces__mid">
          <button
            type="button"
            className="cf-traces__mid-btn"
            disabled={!checkedSelected}
            title={
              checkedSelected
                ? "Passer au stock tampon « Prêts à publier »"
                : "Coche d'abord un tracé à gauche"
            }
            onClick={() =>
              transfer(checkedSelected, moveTraceToBuffer, () => setCheckedSelected(null))
            }
          >
            &gt;&gt;
          </button>
        </div>

        {renderList("buffer", "Prêts à publier")}
      </div>

      {/* Aperçu [Voir] : réutilise le viewer GPX existant, lit gpxContent servie
          par la route admin (jamais un fichier public). */}
      {voir ? (
        <div
          className="cf-traces__modal"
          role="dialog"
          aria-modal="true"
          aria-label={`Aperçu du tracé ${voir.title}`}
          onClick={(e) => {
            if (e.target === e.currentTarget) setVoir(null);
          }}
        >
          <div className="cf-traces__modal-panel">
            <div className="cf-traces__modal-head">
              <strong>{voir.title}</strong>
              <button type="button" className="cf-traces__mini" onClick={() => setVoir(null)}>
                Fermer
              </button>
            </div>
            <TraceGpxViewer maptilerKey={maptilerKey} traceId={voir.id} />
          </div>
        </div>
      ) : null}
    </>
  );
}

/** Charge le GPX du tracé depuis la route admin et l'ouvre dans le viewer. */
function TraceGpxViewer({ maptilerKey, traceId }: { maptilerKey: string; traceId: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setFile(null);
    setError(null);
    let cancelled = false;
    fetch(`/api/admin/traces/${traceId}/gpx`)
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(String(r.status)))))
      .then((text) => {
        if (!cancelled) {
          setFile(new File([text], "trace.gpx", { type: "application/gpx+xml" }));
        }
      })
      .catch(() => {
        if (!cancelled) setError("Lecture du GPX impossible : réessaie.");
      });
    return () => {
      cancelled = true;
    };
  }, [traceId]);

  if (error) {
    return (
      <p className="cf-admin-login__error" role="alert">
        {error}
      </p>
    );
  }
  if (!file) return <p className="cf-admin__hint">Lecture du GPX…</p>;
  return <GpxPreview file={file} maptilerKey={maptilerKey} />;
}
