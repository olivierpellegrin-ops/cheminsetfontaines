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
 * Valeurs initiales en mode édition (B4) : hydratent le formulaire depuis
 * l'itinéraire existant. Absentes = mode création.
 */
export type RouteFormInitial = {
  id: string;
  title: string;
  slug: string;
  communeId: string;
  townshipLabel: string;
  distanceKm: number | null;
  elevationGainM: number | null;
  difficulty: Difficulty;
  detailsRaw: string;
  description: string;
  published: boolean;
  hasPhotoAlbum: boolean;
  imageUrl: string | null;
  gpxFileName: string | null;
  gpxUrl: string | null;
  imageAlt: string | null;
  photoCount: number;
};

/**
 * Formulaire itinéraire complet (B3) — champs à l'identique du CMS Framer :
 * Title, Status (toggle Publié), Slug (auto-éditable), Details (composée,
 * surchargable), GPX Upload, Description, Route Image, Township,
 * Photo Gallery (+), Has Photo Album (toggle).
 * Réutilisé tel quel en B4 pour l'édition (prop initial).
 */
export default function RouteForm({
  communes,
  action,
  maptilerKey,
  initial,
  submitLabel,
}: {
  communes: Commune[];
  action: (prev: RouteFormState, fd: FormData) => Promise<RouteFormState>;
  maptilerKey: string;
  initial?: RouteFormInitial;
  submitLabel?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {} as RouteFormState);
  const [communeId, setCommuneId] = useState(initial?.communeId ?? "");
  const [townshipLabel, setTownshipLabel] = useState(initial?.townshipLabel ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [slugInput, setSlugInput] = useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(initial?.slug));
  const [distance, setDistance] = useState(
    initial?.distanceKm != null ? String(initial.distanceKm) : ""
  );
  const [elevation, setElevation] = useState(
    initial?.elevationGainM != null ? String(initial.elevationGainM) : ""
  );
  const [difficulty, setDifficulty] = useState(initial?.difficulty ?? "");
  const [detailsOverride, setDetailsOverride] = useState(initial?.detailsRaw ?? "");
  const [published, setPublished] = useState(initial?.published ?? false);
  const [hasAlbum, setHasAlbum] = useState(initial?.hasPhotoAlbum ?? false);
  const [photoRows, setPhotoRows] = useState<PhotoRow[]>([]);
  const [gpxFile, setGpxFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(initial?.imageUrl ?? null);
  const [captureDataUrl, setCaptureDataUrl] = useState<string | null>(null);
  const [imageAlt, setImageAlt] = useState(initial?.imageAlt ?? "");

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
      {initial ? <input type="hidden" name="routeId" value={initial.id} /> : null}
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
          defaultValue={initial?.description ?? ""}
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
          {initial?.gpxFileName ? (
            <span className="cf-admin__hint">
              GPX actuel : « {initial.gpxFileName} » (fichier local servi au téléchargement public) —
              laissez vide pour le conserver, un nouveau fichier le remplace.
            </span>
          ) : initial?.gpxUrl ? (
            <span className="cf-admin__hint">
              GPX actuel : fichier Framer distant (téléchargé par redirection) —
              laissez vide pour le conserver, un upload local le remplace.
            </span>
          ) : null}
        </label>
        <label>
          Photo principale (JPG/PNG/WebP, max 4 Mo)
          <input
            name="imageFile"
            type="file"
            accept=".jpg,.jpeg,.png,.webp"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              if (f && f.size > 4 * 1024 * 1024) {
                e.target.value = "";
                setImagePreview(null);
                window.alert(`« ${f.name} » dépasse 4 Mo. Choisissez une image plus légère.`);
                return;
              }
              setCaptureDataUrl(null); // une photo manuelle remplace la capture
              setImagePreview(f ? URL.createObjectURL(f) : null);
            }}
          />
          {imagePreview ? (
            <span className="cf-admin__img-preview">
              <img src={imagePreview} alt="Aperçu photo principale" />
              <em>Photo définie — envoyée avec le formulaire</em>
            </span>
          ) : null}
        </label>
      </div>
      <label>
        Texte alternatif de la photo principale
        <input
          name="imageAlt"
          type="text"
          value={imageAlt}
          onChange={(e) => setImageAlt(e.target.value)}
          placeholder="Ex. Le tracé vu depuis le village"
        />
      </label>
      {/* Capture GPX 1200×800 transportée en data URL (photo principale) */}
      <input type="hidden" name="captureDataUrl" value={captureDataUrl ?? ""} />

      <GpxPreview
        file={gpxFile}
        maptilerKey={maptilerKey}
        onUseMetrics={async (m, capturePng) => {
          setDistance(m.distanceKm > 0 ? String(Math.round(m.distanceKm * 10) / 10) : "");
          setElevation(m.elevationGainM > 0 ? String(m.elevationGainM) : "");
          // Capture 1200×800 du viseur -> photo principale, transportée en
          // data URL via champ caché (pas d'injection DOM dans l'input file,
          // qui produisait un multipart malformé « Unexpected end of form »).
          if (capturePng) {
            const input = document.querySelector<HTMLInputElement>('input[name="imageFile"]');
            if (input) input.value = "";
            setCaptureDataUrl(capturePng);
            setImagePreview(capturePng);
          }
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

        <p className="cf-admin__form-legend">
          Album photos
          {initial?.photoCount
            ? ` — ${initial.photoCount} photo${initial.photoCount > 1 ? "s" : ""} existante${initial.photoCount > 1 ? "s" : ""} conservée${initial.photoCount > 1 ? "s" : ""} ; les nouvelles s'ajoutent à la suite`
            : ""}
        </p>
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
          {pending
            ? "Enregistrement…"
            : (submitLabel ?? (initial ? "Enregistrer" : "Créer l'itinéraire"))}
        </button>
        <a href="/admin/routes" className="cf-admin__btn-cancel">
          Annuler
        </a>
        <span className="cf-admin__hint">
          Après création, retour automatique à la liste des itinéraires.
        </span>
      </div>
    </form>
  );
}
