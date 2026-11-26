import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { signState, stravaAppConfigured, stravaAuthorizeUrl } from "@/lib/strava";

/**
 * Brique S1 : amorçage de la connexion OAuth Strava.
 * Clic sur « Connecter Strava » → redirection vers la page d'autorisation
 * Strava (scope activity:read_all, décision D2). Admin uniquement.
 * NB : cette route est sous /api/admin/... : le middleware du back-office ne
 * la matche PAS (matcher /admin/:path*), c'est voulu (leçon B0 : ne jamais
 * intercepter les callbacks d'auth).
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  if (!stravaAppConfigured()) {
    return NextResponse.json(
      { error: "STRAVA_CLIENT_ID / STRAVA_CLIENT_SECRET absents de l'environnement (docs/SECRETS.md)" },
      { status: 500 },
    );
  }
  const state = signState();
  return NextResponse.redirect(stravaAuthorizeUrl(req.nextUrl.origin, state));
}
