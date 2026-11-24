"use client";

import { useActionState, useState } from "react";
import type { RouteFormState } from "@/app/actions/admin-routes";
import { composeDetailsRaw } from "@/lib/details";
import { normalizeSlug } from "@/lib/slug";
import GpxPreview from "./gpx-preview";

type Commune = { id: string; name: string };
type Difficulty = "facile" | "moyen" | "difficile" | null;
type PhotoRow = { key: number };

/**
 * Formulaire itinéraire complet (B3) — champs à l'identique du CMS Framer :
 * Title, Status (toggle Publié), Slug (auto-éditable), Details (composée,
 * surchargable), GPX Upload, Description, Route Image, Township,
 * Photo Gallery (+), Has Photo Album (toggle).
 * Réutilisable tel quel pour l'édition (B4).
 */
export default function RouteForm({
  communes,
  action,
  maptilerKey,
  submitLabel = "Créer l'itinéraire",
}: {
  communes: Commune[];
  action: (prev: RouteFormState, fd: FormData) => Promise<RouteFormState>;
  maptilerKey: string;
  submitLabel?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {} as RouteFormState);
  const [communeId, setCommuneId] = useState("");
  const [townshipLabel, setTownshipLabel] = useState("");
  const [title, setTitle] = useState("");
  const [slugInput, setSlugInput] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [distance, setDistance] = useState("");
  const [elevation, setElevation] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [detailsOverride, setDetailsOverride] = useState("");
  const [published, setPublished] = useState(false);
  const [hasAlbum, setHasAlbum] = useState(false);
  const [photoRows, setPhotoRows] = useState<PhotoRow[]>([]);
  const [gpxFile, setGpxFile] = useState<File | null>(null);

  const communeName = communes.find((c) => c.id === communeId)?.name ?? "";
  const autoSlug = normalizeSlug(title);
  const slug = slugTouched ? slugInput : autoSlug;
  const detailsPreview = composeDetailsRaw(
    distance === "" ? null : Number(distance.replace(",", ".")),
    elevation === "" ? null : Number(elevation),
    (difficulty || null) as Difficulty
  );

  return (
    <form action={formAction} className="cf-admin__form">
      {state?.error ? (
        <p className="cf-admin-login__error" role="alert">{state.error}</p>
      ) : null}

      <label>
        Titre *
        <input
          name="title"
          type="text"
          required
          placeholder="Ex. Panoramas d'automne"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </label>

      <label>
        Slug
        <input
          name="slug"
          type="text"
          value={slug}
          onChange={(e) => {
            setSlugTouched(true);
            setSlugInput(e.target.value);
          }}
          placeholder="Auto-généré depuis le titre"
        />
        <span className="cf-admin__hint">
          Normalisé (sans accents) : /fr/routes/{autoSlug || "…"}
        </span>
      </label>

      <div className="cf-admin__form-row">
        <label>
          Commune *
          <select
            name="communeId"
            required
            value={communeId}
            onChange={(e) => {
              setCommuneId(e.target.value);
              const name = communes.find((c) => c.id === e.target.value)?.name;
              if (name) setTownshipLabel((cur) => (cur === "" || cur === communeName ? name : cur));
            }}
          >
            <option value="">— Choisir —</option>
            {communes.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
        <label>
          Libellé affiché *
          <input
            name="townshipLabel"
            type="text"
            required
            value={townshipLabel}
            onChange={(e) => setTownshipLabel(e.target.value)}
            placeholder="Défaut : nom INSEE, libre pour un libellé historique"
          />
        </label>
      </div>

      <div className="cf-admin__form-row">
        <label>
          Distance (km)
          <input
            name="distanceKm"
            type="text"
            inputMode="decimal"
            value={distance}
            onChange={(e) => setDistance(e.target.value)}
            placeholder="Ex. 12"
          />
        </label>
        <label>
          Dénivelé (m)
          <input
            name="elevationGainM"
            type="text"
            inputMode="numeric"
            value={elevation}
            onChange={(e) => setElevation(e.target.value)}
            placeholder="Ex. 280"
          />
        </label>
        <label>
          Niveau
          <select name="difficulty" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
            <option value="">—</option>
            <option value="facile">facile</option>
            <option value="moyen">moyen</option>
            <option value="difficile">difficile</option>
          </select>
        </label>
      </div>

      <label>
        Ligne détails
        <input
          name="detailsRaw"
          type="text"
          value={detailsOverride}
          onChange={(e) => setDetailsOverride(e.target.value)}
          placeholder={detailsPreview ?? "Composée automatiquement depuis les 3 champs"}
        />
        <span className="cf-admin__hint">
          Laisser vide pour la ligne automatique
          {detailsPreview ? ` : « ${detailsPreview} »` : " (renseignez distance/dénivelé/niveau)."}
        </span>
      </label>

      <label>
        Description *
        <textarea
          name="description"
          rows={8}
          required
          placeholder="Texte de présentation de l'itinéraire (page publique)."
        />
      </label>

      <div className="cf-admin__form-row">
        <label>
          Fichier GPX (.gpx, max 10 Mo)
          <input
            name="gpxFile"
            type="file"
            accept=".gpx,.xml"
            onChange={(e) => setGpxFile(e.target.files?.[0] ?? null)}
          />
        </label>
        <label>
          Photo principale (JPG/PNG/WebP, max 4 Mo)
          <input name="imageFile" type="file" accept=".jpg,.jpeg,.png,.webp" />
        </label>
      </div>
      <label>
        Texte alternatif de la photo principale
        <input name="imageAlt" type="text" placeholder="Ex. Le tracé vu depuis le village" />
      </label>

      <GpxPreview
        file={gpxFile}
        maptilerKey={maptilerKey}
        onUseMetrics={(m) => {
          setDistance(m.distanceKm > 0 ? String(Math.round(m.distanceKm * 10) / 10) : "");
          setElevation(m.elevationGainM > 0 ? String(m.elevationGainM) : "");
        }}
      />

      <div className="cf-admin__album">
        <div className="cf-admin__form-toggles">
          <label className="cf-admin__toggle">
            <input
              type="checkbox"
              name="hasPhotoAlbum"
              checked={hasAlbum}
              onChange={(e) => setHasAlbum(e.target.checked)}
            />
            A un album photo (badge public)
          </label>
          <label className="cf-admin__toggle">
            <input
              type="checkbox"
              name="published"
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
            />
            Publié (sinon brouillon)
          </label>
        </div>

        <p className="cf-admin__form-legend">Album photos</p>
        {photoRows.map((row, i) => (
          <div className="cf-admin__photo-row" key={row.key}>
            <label>
              Fichier {i + 1}
              <input name={`photo.file-${i}`} type="file" accept=".jpg,.jpeg,.png,.webp" required />
            </label>
            <label>
              Titre
              <input name={`photo.title-${i}`} type="text" placeholder="Ex. Au sommet" />
            </label>
            <label>
              Texte alternatif
              <input name={`photo.alt-${i}`} type="text" placeholder="Ex. Vue sur la vallée" />
            </label>
            <button
              type="button"
              className="cf-admin__photo-remove"
              onClick={() => setPhotoRows((rows) => rows.filter((r) => r.key !== row.key))}
            >
              Retirer
            </button>
          </div>
        ))}
        <button
          type="button"
          className="cf-admin__photo-add"
          onClick={() => setPhotoRows((rows) => [...rows, { key: Date.now() + rows.length }])}
        >
          + Ajouter une photo (max 4 Mo)
        </button>
      </div>

      <div className="cf-admin__form-actions">
        <button type="submit" disabled={pending}>
          {pending ? "Enregistrement…" : submitLabel}
        </button>
        <span className="cf-admin__hint">
          {published ? "Sera visible publiquement dès l'enregistrement." : "Créé en brouillon — publication possible ensuite."}
        </span>
      </div>
    </form>
  );
}
