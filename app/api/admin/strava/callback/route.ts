import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { saveCredential, stravaExchangeCode, verifyState, STRAVA_SCOPE } from "@/lib/strava";

/**
 * Brique S1 : retour d'autorisation Strava. Vérifie la session admin et
 * l'état CSRF signé, échange le code, chiffre puis enregistre le jeton.
 * Redirige vers /admin/traces?strava=<statut> (message flash de la page).
 */
export async function GET(req: NextRequest) {
  const toTraces = (status: string) => {
    const url = new URL("/admin/traces", req.nextUrl.origin);
    url.searchParams.set("strava", status);
    return NextResponse.redirect(url);
  };

  const session = await auth();
  if (!session?.user) return toTraces("non-autorise");

  const denied = req.nextUrl.searchParams.get("error");
  if (denied) return toTraces("refuse");

  const state = req.nextUrl.searchParams.get("state") ?? "";
  if (!verifyState(state)) return toTraces("etat-invalide");

  const code = req.nextUrl.searchParams.get("code") ?? "";
  if (!code) return toTraces("code-manquant");

  try {
    const tokens = await stravaExchangeCode(code, req.nextUrl.origin);
    await saveCredential(tokens, STRAVA_SCOPE);
    return toTraces("connecte");
  } catch {
    return toTraces("echec");
  }
}
