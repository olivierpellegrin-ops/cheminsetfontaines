"use client";

import Link from "next/link";
import { useActionState } from "react";
import { subscribe, type FormState } from "@/app/actions";

/**
 * Bloc « Les nouvelles du sentier » (home) — champs identiques au
 * formulaire Mailchimp intégré (EMAIL + Prénom + Nom de famille),
 * rebranché en local (double opt-in interne brique N1), honeypot conservé.
 * Variante dark : rendu dans le bandeau vert forêt (.funds-news Framer),
 * labels #F4F1E8, boutons ochre « S'inscrire » / « Voir les archives ».
 */
export default function NewsletterForm({ dark = false }: { dark?: boolean }) {
  const [state, action, pending] = useActionState<FormState | null, FormData>(
    subscribe,
    null
  );

  const labelStyle = dark
    ? { fontSize: 14, display: "grid", gap: 4, color: "#f4f1e8", textAlign: "left" as const }
    : { fontSize: 14, display: "grid", gap: 4 };

  const fieldStyle = dark ? { ...inputStyle, ...darkInput } : inputStyle;

  return (
    <form
      action={action}
      style={{
        display: "grid",
        gap: 12,
        maxWidth: 520,
        width: "100%",
        margin: dark ? "0 auto" : undefined,
      }}
    >
      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
        <label style={labelStyle}>
          Prénom
          <input name="firstName" type="text" autoComplete="given-name" style={fieldStyle} />
        </label>
        <label style={labelStyle}>
          Nom de famille
          <input name="lastName" type="text" autoComplete="family-name" style={fieldStyle} />
        </label>
      </div>
      <label style={labelStyle}>
        Adresse e-mail*
        <input name="email" type="email" required autoComplete="email" style={fieldStyle} />
      </label>

      {/* honeypot anti-spam (reproduit du formulaire Mailchimp/Framer) */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" style={honeypotStyle} />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: dark ? "center" : undefined,
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <button type="submit" className="btn btn-ochre btn-sm" disabled={pending}>
          {pending ? "Envoi…" : "S'inscrire"}
        </button>
        <Link href="/fr/newsletters" className="btn btn-ochre btn-sm">
          Voir les archives
        </Link>
      </div>

      {state && (
        <p
          role="status"
          style={{
            margin: 0,
            fontSize: 14,
            color: state.ok ? (dark ? "#d2dccb" : "var(--moss)") : "var(--ochre)",
          }}
        >
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

const darkInput: React.CSSProperties = {
  background: "rgba(244, 241, 232, 0.12)",
  borderColor: "rgba(244, 241, 232, 0.35)",
  color: "#f4f1e8",
};

const honeypotStyle: React.CSSProperties = {
  position: "absolute",
  left: -5000,
  opacity: 0,
  height: 1,
  width: 1,
};
