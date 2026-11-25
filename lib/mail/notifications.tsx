import { render } from "@react-email/render";
import { ContactNotification } from "@/emails/contact-notification";
import { SITE } from "@/lib/site";
import { sendMail, type SendMailResult } from "./service";

/**
 * Notifications transactionnelles (brique N0). Chaque nouvelle notification
 * (N1 : nl_confirmation, nl_bienvenue ; N2 : e-mails adhérents) vit ici :
 * gabarit React Email dans emails/ + une fonction qui rend et envoie.
 */

const CONTACT_URL = SITE.baseUrl + "/fr/contact";

/** E-mail n°1 (spec §5.3) : prévient le bureau d'un message de contact. */
export async function notifyContactMessage(input: {
  name: string;
  email: string;
  message: string;
}): Promise<SendMailResult> {
  const receivedAt = new Date();
  const element = (
    <ContactNotification
      name={input.name}
      email={input.email}
      message={input.message}
      receivedAt={receivedAt}
      contactUrl={CONTACT_URL}
    />
  );
  try {
    const [html, text] = await Promise.all([
      render(element),
      render(element, { plainText: true }),
    ]);
    return sendMail({
      kind: "contact_notification",
      to: SITE.notifyEmail,
      replyTo: input.email,
      subject: `Message du site : ${input.name}`,
      html,
      text,
    });
  } catch (err) {
    // Rendu impossible : ne jamais bloquer le parcours du visiteur.
    console.error("[mail] Rendu de contact_notification impossible :", err);
    return { status: "failed", id: "", error: String(err).slice(0, 500) };
  }
}
