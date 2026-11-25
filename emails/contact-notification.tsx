import { Heading } from "@react-email/heading";
import { Link } from "@react-email/link";
import { Section } from "@react-email/section";
import { Text } from "@react-email/text";
import { BaseEmail } from "./base";

/**
 * contact_notification : prévient le bureau (contact@cheminsetfontaines.fr)
 * d'un message reçu via le formulaire de contact. Reply-To = visiteur,
 * pour répondre directement depuis le logiciel de messagerie.
 * Brique N0 « Remplacement Mailchimp » (spec du 25/11/2026, e-mail n°1).
 */

const FR_DATE = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "Europe/Paris",
});

export function ContactNotification({
  name,
  email,
  message,
  receivedAt,
  contactUrl,
}: {
  name: string;
  email: string;
  message: string;
  receivedAt: Date;
  contactUrl: string;
}) {
  const when = FR_DATE.format(receivedAt);
  return (
    <BaseEmail
      preview={`Message de ${name} via le formulaire de contact du site`}
      footerNote="Message automatique envoyé depuis le formulaire de contact du site www.cheminsetfontaines.fr. Utilisez « Répondre » : votre réponse part directement à l'expéditeur."
    >
      <Heading
        as="h1"
        style={{
          margin: "0 0 16px",
          fontSize: "22px",
          lineHeight: "28px",
          color: "#163c32",
        }}
      >
        Nouveau message de contact
      </Heading>
      <Text style={{ margin: "0 0 4px", fontSize: "14px" }}>
        <strong>De :</strong> {name}
      </Text>
      <Text style={{ margin: "0 0 4px", fontSize: "14px" }}>
        <strong>Adresse :</strong>{" "}
        <Link href={`mailto:${email}`} style={{ color: "#163c32" }}>
          {email}
        </Link>
      </Text>
      <Text
        style={{
          margin: "0 0 16px",
          fontSize: "14px",
          color: "#43534a",
        }}
      >
        Reçu le {when}.
      </Text>
      <Section
        style={{
          backgroundColor: "#f2f6f1",
          border: "1px solid #d2dccb",
          borderRadius: "10px",
          padding: "16px",
          margin: "0 0 16px",
        }}
      >
        <Text
          style={{
            margin: 0,
            fontSize: "14px",
            lineHeight: "22px",
            whiteSpace: "pre-wrap",
            color: "#163c32",
          }}
        >
          {message}
        </Text>
      </Section>
      <Text style={{ margin: 0, fontSize: "13px", color: "#43534a" }}>
        Page du formulaire :{" "}
        <Link href={contactUrl} style={{ color: "#163c32" }}>
          {contactUrl}
        </Link>
      </Text>
    </BaseEmail>
  );
}
