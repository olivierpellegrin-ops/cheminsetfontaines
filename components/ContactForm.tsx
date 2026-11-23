"use client";

import { useActionState } from "react";
import { sendMessage, type FormState } from "@/app/actions";

/**
 * Formulaire de contact à l'identique du composant Framer « Contact
 * Form » (copie HTTrack fr/contact.html) : carte fond #f4f1e8,
 * radius 16, padding 24, gap 12 ; champs SANS libellé visible
 * (placeholders « Votre nom », « vous@exemple.fr », « Votre
 * message »), fond blanc, bordure 1px #d2dccb, radius 8, hauteur
 * 44px (textarea 112px), Fira Sans 14px/400, padding 12px ;
 * bouton pleine largeur fond ochre rgb(193,138,33), radius pill
 * 100px, padding 12px 20px, texte 14px semibold #163C32 ; honeypot
 * « website » invisible comme l'original. Statut aria-live : 14px,
 * hauteur 1.4, #1F4D2D (style inline d'origine).
 */
export default function ContactForm() {
  const [state, action, pending] = useActionState<FormState | null, FormData>(
    sendMessage,
    null
  );

  return (
    <form action={action} className="contact-form">
      <input
        className="contact-input"
        type="text"
        name="name"
        required
        placeholder="Votre nom"
        aria-label="Votre nom"
        autoComplete="name"
      />
      <input
        className="contact-input"
        type="email"
        name="email"
        required
        placeholder="vous@exemple.fr"
        aria-label="Votre adresse e-mail"
        autoComplete="email"
      />
      <textarea
        className="contact-input contact-textarea"
        name="message"
        required
        rows={3}
        placeholder="Votre message"
        aria-label="Votre message"
      />

      <input
        className="contact-honeypot"
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="one-time-code"
        aria-hidden="true"
      />

      <button type="submit" className="contact-submit" disabled={pending}>
        {pending ? "Envoi…" : "Envoyer le message"}
      </button>

      {state && (
        <p
          role="status"
          className="contact-status"
          data-ok={state.ok ? "true" : "false"}
        >
          {state.message}
        </p>
      )}
    </form>
  );
}
