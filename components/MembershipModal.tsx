"use client";

import { useActionState, useEffect, useState } from "react";
import { requestMembership, type FormState } from "@/app/actions";

/**
 * Modale « Membership Registration » reproduite à l'identique de la
 * modale Framer d'origine (capture 23/11/2026, le HTML de la modale
 * n'est pas dans la copie HTTrack) : blanche, large, 2 colonnes
 * (texte à gauche, formulaire à droite), croix de fermeture grise
 * en haut à droite, arrière-plan site flouté, champs empilés avec
 * bordures fines, bouton ochre « Envoyer la demande d'adhésion »
 * aligné à droite, select civilité « Choisir », honeypots conservés.
 * Déclenchée par le CTA « Adhérer à l'association » (prop label).
 */
export default function MembershipModal({ label }: { label: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<FormState | null, FormData>(
    requestMembership,
    null
  );

  useEffect(() => {
    if (state?.ok) setOpen(false);
  }, [state]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button className="btn btn-ochre btn-sm" onClick={() => setOpen(true)}>
        {label}
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Membership Registration"
          className="modal-backdrop"
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div className="modal-member">
            <button
              type="button"
              aria-label="Fermer"
              className="modal-member__close"
              onClick={() => setOpen(false)}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                <path
                  d="M2 2 L14 14 M14 2 L2 14"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </button>

            <div className="modal-member__text">
              <h3 className="modal-member__title">
                Bienvenue parmi les marcheurs&nbsp;!
              </h3>
              <p className="modal-member__subtitle">
                Quelques pas suffisent pour rejoindre l&apos;aventure : remplissez
                ce formulaire et nous vous recontacterons avec plaisir.
              </p>
            </div>

            <form action={action} className="modal-member__form">
              <label className="modal-member__field">
                Civilité
                <select name="civilite" defaultValue="" required>
                  <option value="" disabled>
                    Choisir
                  </option>
                  <option value="Madame">Madame</option>
                  <option value="Monsieur">Monsieur</option>
                  <option value="Autre">Autre</option>
                </select>
              </label>
              <label className="modal-member__field">
                Prénom
                <input name="firstName" type="text" autoComplete="given-name" />
              </label>
              <label className="modal-member__field">
                Nom
                <input name="lastName" type="text" autoComplete="family-name" />
              </label>
              <label className="modal-member__field">
                Adresse
                <input name="address" type="text" autoComplete="street-address" />
              </label>
              <label className="modal-member__field">
                Email*
                <input name="email" type="email" required autoComplete="email" />
              </label>
              <label className="modal-member__field">
                Téléphone
                <input name="phone" type="tel" autoComplete="tel" />
              </label>
              <label className="modal-member__field">
                Code postal
                <input
                  name="postalCode"
                  inputMode="numeric"
                  autoComplete="postal-code"
                />
              </label>
              <label className="modal-member__field">
                Ville
                <input name="city" type="text" autoComplete="address-level2" />
              </label>
              <label className="modal-member__field">
                Pays
                <select name="country" defaultValue="France">
                  <option>France</option>
                  <option>Belgique</option>
                  <option>Suisse</option>
                  <option>Autre</option>
                </select>
              </label>

              {/* Honeypots repris à l'identique de la modale Framer */}
              <input
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                className="modal-member__honeypot"
              />
              <input
                type="text"
                name="company"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                className="modal-member__honeypot"
              />

              <button
                type="submit"
                className="btn btn-ochre modal-member__submit"
                disabled={pending}
              >
                {pending ? "Envoi…" : "Envoyer la demande d'adhésion"}
              </button>

              {state && !state.ok && (
                <p role="alert" className="modal-member__error">
                  {state.message}
                </p>
              )}
            </form>
          </div>
        </div>
      )}
    </>
  );
}
