"use client";

import { useActionState, useEffect, useState } from "react";
import { requestMembership, type FormState } from "@/app/actions";

/**
 * Modale « Membership Registration » reproduite à l'identique du HTML
 * original (enregistrement complet de la page live, 23/11/2026) :
 * fond parchemin #f4f1e8, radius 18px, largeur 640px (mobile 342px),
 * padding 32px (mobile 20px), gap 18px ; backdrop #0a1d17 quasi opaque ;
 * champs 44px fond blanc, bordure #d2dccb, radius 8, Fira Sans 14px,
 * PLACEHOLDERS sans libellés ; civilité sans placeholder (Madame par
 * défaut) ; Code postal + Ville côte à côte ; bouton ochre pleine
 * largeur radius 100px, texte 14px/600 vert ; bouton « Fermer » texte
 * en bas ; honeypots originaux (website, company + 9 autres) conservés.
 * Déclenchée par le CTA « Adhérer à l'association » (prop label).
 * Brique N2 (spec §4.2/§5.1, validée par Olivier le 25/11/2026) : deux
 * cases ajoutées SOUS le formulaire, jamais cochées par défaut (RGPD) :
 * « nouvelles du sentier » (double opt-in, source adhesion) et droit à
 * l'image. Styles inline : aucun ajout dans globals.css.
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

  const checkStyle = {
    marginTop: 3,
    width: 16,
    height: 16,
    accentColor: "#163c32",
    flexShrink: 0,
  } as const;
  const checkLabelStyle = {
    display: "flex",
    gap: 10,
    alignItems: "flex-start",
    fontSize: 13,
    lineHeight: "18px",
    color: "#43534a",
    cursor: "pointer",
  } as const;

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
            <h3 className="modal-member__title">
              Bienvenue parmi les marcheurs !
            </h3>
            <p className="modal-member__subtitle">
              Quelques pas suffisent pour rejoindre l&apos;aventure : remplissez ce
              formulaire et nous vous recontacterons avec plaisir.
            </p>

            <form action={action} className="modal-member__form">
              <select
                name="civilite"
                className="modal-member__input"
                defaultValue="Madame"
              >
                <option value="Madame">Madame</option>
                <option value="Monsieur">Monsieur</option>
                <option value="Autre">Autre</option>
              </select>
              <input
                name="firstName"
                type="text"
                placeholder="Prénom"
                autoComplete="given-name"
                className="modal-member__input"
              />
              <input
                name="lastName"
                type="text"
                placeholder="Nom"
                autoComplete="family-name"
                className="modal-member__input"
              />
              <input
                name="address"
                type="text"
                placeholder="Adresse"
                autoComplete="street-address"
                className="modal-member__input"
              />
              <input
                name="email"
                type="email"
                required
                placeholder="Adresse e-mail"
                autoComplete="email"
                className="modal-member__input"
              />
              <input
                name="phone"
                type="tel"
                placeholder="Numéro de téléphone"
                autoComplete="tel"
                className="modal-member__input"
              />
              <div className="modal-member__city">
                <input
                  name="postalCode"
                  type="text"
                  placeholder="Code postal"
                  inputMode="numeric"
                  autoComplete="postal-code"
                  className="modal-member__input"
                />
                <input
                  name="city"
                  type="text"
                  placeholder="Ville"
                  autoComplete="address-level2"
                  className="modal-member__input"
                />
              </div>
              <select
                name="country"
                className="modal-member__input"
                defaultValue="France"
              >
                <option value="France">France</option>
                <option value="Belgique">Belgique</option>
                <option value="Suisse">Suisse</option>
                <option value="Autre">Autre</option>
              </select>

              {/* Brique N2 : deux consentements jamais cochés par défaut. */}
              <label style={checkLabelStyle}>
                <input type="checkbox" name="newsletter" style={checkStyle} />
                <span>
                  Je souhaite recevoir les nouvelles du sentier (1 e-mail par
                  mois, désinscription en 1 clic)
                </span>
              </label>
              <label style={checkLabelStyle}>
                <input type="checkbox" name="photoConsent" style={checkStyle} />
                <span>
                  J&apos;autorise l&apos;association à publier des photos de
                  sorties où j&apos;apparaît (site et réseaux sociaux)
                </span>
              </label>

              {/* Honeypots repris à l'identique de la modale Framer
                  (website et company sont ceux vérifiés par l'action) */}
              {[
                "website",
                "company",
                "message",
                "subject",
                "title",
                "description",
                "feedback",
                "notes",
                "details",
                "remarks",
                "comments",
              ].map((h) => (
                <input
                  key={h}
                  type="text"
                  name={h}
                  tabIndex={-1}
                  autoComplete="one-time-code"
                  aria-hidden="true"
                  className="modal-member__honeypot"
                />
              ))}

              <button
                type="submit"
                className="modal-member__submit"
                disabled={pending}
              >
                {pending ? "Envoi…" : "Envoyer la demande d’adhésion"}
              </button>
            </form>

            {state && !state.ok && (
              <p role="alert" className="modal-member__error">
                {state.message}
              </p>
            )}

            <button
              type="button"
              className="modal-member__close"
              onClick={() => setOpen(false)}
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </>
  );
}
