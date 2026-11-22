"use client";

import { useActionState, useEffect, useState } from "react";
import { requestMembership, type FormState } from "@/app/actions";

/**
 * Modale « Membership Registration » (Q3) reproduite à l'identique du
 * HTML Framer fourni : titre « Bienvenue parmi les marcheurs ! », 9 champs
 * + honeypots « website » et « company », bouton ochre pleine largeur.
 * Le composant est déclenché par le CTA « Adhérer à l'association » (prop
 * `label` paramétrable pour la home / la page dons).
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
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button className="btn btn-ochre" onClick={() => setOpen(true)}>
        {label}
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Membership Registration"
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            background: "rgba(22, 60, 50, 0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            className="card"
            style={{
              maxWidth: 560,
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              border: "none",
            }}
          >
            <div style={{ padding: "28px 28px 8px" }}>
              <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 30, color: "var(--forest)" }}>
                Bienvenue parmi les marcheurs !
              </h3>
              <p style={{ color: "var(--text-muted)", fontSize: 15, marginTop: 8 }}>
                Quelques pas suffisent pour rejoindre l&apos;aventure : remplissez ce
                formulaire et nous vous recontacterons avec plaisir.
              </p>
            </div>

            <form action={action} style={{ padding: "16px 28px 28px", display: "grid", gap: 12 }}>
              <div style={{ ...rowStyle }}>
                <label style={labelStyle}>
                  Civilité
                  <select name="civilite" defaultValue="" style={inputStyle}>
                    <option value="" disabled>
                      Choisir
                    </option>
                    <option value="Madame">Madame</option>
                    <option value="Monsieur">Monsieur</option>
                    <option value="Autre">Autre</option>
                  </select>
                </label>
                <label style={labelStyle}>
                  Prénom
                  <input name="firstName" type="text" autoComplete="given-name" style={inputStyle} />
                </label>
              </div>

              <label style={labelStyle}>
                Nom
                <input name="lastName" type="text" autoComplete="family-name" style={inputStyle} />
              </label>
              <label style={labelStyle}>
                Adresse
                <input name="address" type="text" autoComplete="street-address" style={inputStyle} />
              </label>
              <label style={labelStyle}>
                Email*
                <input name="email" type="email" required autoComplete="email" style={inputStyle} />
              </label>
              <label style={labelStyle}>
                Téléphone
                <input name="phone" type="tel" autoComplete="tel" style={inputStyle} />
              </label>
              <div style={rowStyle}>
                <label style={labelStyle}>
                  Code postal
                  <input name="postalCode" inputMode="numeric" autoComplete="postal-code" style={inputStyle} />
                </label>
                <label style={labelStyle}>
                  Ville
                  <input name="city" type="text" autoComplete="address-level2" style={inputStyle} />
                </label>
              </div>
              <label style={labelStyle}>
                Pays
                <select name="country" defaultValue="France" style={inputStyle}>
                  <option>France</option>
                  <option>Belgique</option>
                  <option>Suisse</option>
                  <option>Autre</option>
                </select>
              </label>

              {/* Honeypots repris à l'identique de la modale Framer */}
              <input type="text" name="website" tabIndex={-1} autoComplete="off" style={honeypotStyle} />
              <input type="text" name="company" tabIndex={-1} autoComplete="off" style={honeypotStyle} />

              <button
                type="submit"
                className="btn btn-ochre"
                disabled={pending}
                style={{ width: "100%", fontWeight: 600, fontSize: 14 }}
              >
                {pending ? "Envoi…" : "Envoyer la demande d'adhésion"}
              </button>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="btn-ghost btn"
                style={{ fontSize: 14 }}
              >
                Fermer
              </button>

              {state && !state.ok && (
                <p role="alert" style={{ fontSize: 14, color: "var(--ochre)" }}>
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

const rowStyle: React.CSSProperties = {
  display: "grid",
  gap: 12,
  gridTemplateColumns: "1fr",
};
const labelStyle: React.CSSProperties = {
  fontSize: 14,
  display: "grid",
  gap: 4,
  color: "var(--forest)",
};
const inputStyle: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid var(--border-mid)",
  background: "#fff",
  fontSize: 15,
  color: "var(--forest)",
};
const honeypotStyle: React.CSSProperties = {
  position: "absolute",
  left: -5000,
  opacity: 0,
  height: 1,
  width: 1,
};
