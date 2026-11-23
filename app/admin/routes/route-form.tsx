"use client";

import { useActionState, useState } from "react";
import type { RouteFormState } from "@/app/actions/admin-routes";
import { composeDetailsRaw } from "@/lib/details";

type Commune = { id: string; name: string };
type Difficulty = "facile" | "moyen" | "difficile" | null;

/**
 * Formulaire itinéraire (B2 : création ; réutilisé tel quel en B4 pour l'édition).
 * - prè-remplit le libellé affiché avec le nom INSEE au choix de commune ;
 * - montre en direct la ligne détails qui sera composée côté serveur.
 */
export default function RouteForm({
  communes,
  action,
  submitLabel = "Créer l'itinéraire",
}: {
  communes: Commune[];
  action: (prev: RouteFormState, fd: FormData) => Promise<RouteFormState>;
  submitLabel?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {} as RouteFormState);
  const [communeId, setCommuneId] = useState("");
  const [townshipLabel, setTownshipLabel] = useState("");
  const [distance, setDistance] = useState("");
  const [elevation, setElevation] = useState("");
  const [difficulty, setDifficulty] = useState("");

  const communeName = communes.find((c) => c.id === communeId)?.name ?? "";
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
        <input name="title" type="text" required placeholder="Ex. Panoramas d'automne" />
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
              if (name) setTownshipLabel((cur) => cur === "" || cur === communeName ? name : cur);
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

      <p className="cf-admin__form-preview">
        Ligne détails enregistrée&nbsp;:{" "}
        <strong>{detailsPreview ?? "(vide — composée automatiquement depuis les 3 champs)"}</strong>
      </p>

      <label>
        Description *
        <textarea name="description" rows={8} required placeholder="Texte de présentation de l'itinéraire (page publique)." />
      </label>

      <div className="cf-admin__form-actions">
        <button type="submit" disabled={pending}>
          {pending ? "Enregistrement…" : submitLabel}
        </button>
        <span className="cf-admin__hint">Créé en brouillon — la publication est une action séparée.</span>
      </div>
    </form>
  );
}
