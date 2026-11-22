"use client";

import Link from "next/link";
import { useActionState } from "react";
import { subscribe, type FormState } from "@/app/actions";

/**
 * Bloc « Les nouvelles du sentier » (home) — champs identiques au
 * formulaire Mailchimp intégré (EMAIL + Prénom + Nom de famille),
 * rebranché en local (Brevo en v0.2), honeypot conservé.
 */
export default function NewsletterForm() {
  const [state, action, pending] = useActionState<FormState | null, FormData>(
    subscribe,
    null
  );

  return (
    <form action={action} style={{ display: "grid", gap: 12, maxWidth: 520 }}>
      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
        <label style={{ fontSize: 14, display: "grid", gap: 4 }}>
          Prénom
          <input name="firstName" type="text" autoComplete="given-name" style={inputStyle} />
        </label>
        <label style={{ fontSize: 14, display: "grid", gap: 4 }}>
          Nom de famille
          <input name="lastName" type="text" autoComplete="family-name" style={inputStyle} />
        </label>
      </div>
      <label style={{ fontSize: 14, display: "grid", gap: 4 }}>
        Adresse e-mail*
        <input name="email" type="email" required autoComplete="email" style={inputStyle} />
      </label>

      {/* honeypot anti-spam (reproduit du formulaire Mailchimp/Framer) */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" style={honeypotStyle} />

      <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
        <button type="submit" className="btn btn-ochre" disabled={pending}>
          {pending ? "Envoi…" : "S'inscrire"}
        </button>
        <Link href="/fr/newsletters" className="link-more">
          Voir les archives
        </Link>
      </div>

      {state && (
        <p role="status" style={{ fontSize: 14, color: state.ok ? "var(--moss)" : "var(--ochre)" }}>
          {state.message}
        </p>
      )}
    </form>
  );
}

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
  tabIndex: -1,
};
