import { redirect } from "next/navigation";

// Le site Framer sert la home sous /fr ; pas d'auto-redirection /fr <-> /en
// (Automatic locale redirect désactivé dans Framer : même comportement).
export default function RootPage() {
  redirect("/fr");
}
