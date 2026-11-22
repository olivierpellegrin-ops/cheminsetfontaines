"use client";

import { useActionState } from "react";
import { sendMessage, type FormState } from "@/app/actions";

/** Formulaire de contact (page /fr/contact) : Nom, Email, Message. */
export default function ContactForm() {
  const [state, action, pending] = useActionState<FormState | null, FormData>(
    sendMessage,
    null
  );

  return (
    <form action={action} style={{ display: "grid", gap: 14, maxWidth: 560 }}>
      <label style={labelStyle}>
        Nom
        <input name="name" required placeholder="Votre nom" autoComplete="name" style={inputStyle} />
      </label>
      <label style={labelStyle}>
        Email
        <input name="email" type="email" required autoComplete="email" style={inputStyle} />
      </label>
      <label style={labelStyle}>
        Message
        <textarea name="message" required placeholder="Votre message" rows={5} style={{ ...inputStyle, resize: "vertical" }} />
      </label>

      <input type="text" name="website" tabIndex={-1} autoComplete="off" style={honeypotStyle} />

      <button type="submit" className="btn btn-ochre" disabled={pending}>
        {pending ? "Envoi…" : "Envoyer le message"}
      </button>

      {state && (
        <p role="status" style={{ fontSize: 14, color: state.ok ? "var(--moss)" : "var(--ochre)" }}>
          {state.message}
        </p>
      )}
    </form>
  );
}

const labelStyle: React.CSSProperties = { fontSize: 14, display: "grid", gap: 4 };
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
