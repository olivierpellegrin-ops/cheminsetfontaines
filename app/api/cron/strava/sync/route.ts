import { NextRequest, NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";
import { runStravaSync } from "@/lib/strava-sync";

/**
 * Brique S2 (activée par le workflow GitHub Actions en S5) : synchro hebdo
 * du dimanche 22 h (Paris). Protégé par le secret partagé STRAVA_SYNC_SECRET
 * (en-tête X-Strava-Sync), comparaison en temps constant via empreintes
 * SHA-256. Renvoie le bilan JSON — lisible dans les logs du workflow Actions.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.STRAVA_SYNC_SECRET;
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "STRAVA_SYNC_SECRET absent : cron non configuré (brique S5)." },
      { status: 503 },
    );
  }

  const provided = req.headers.get("x-strava-sync") ?? "";
  const providedHash = createHash("sha256").update(provided).digest();
  const secretHash = createHash("sha256").update(secret).digest();
  if (provided.length === 0 || !timingSafeEqual(providedHash, secretHash)) {
    return NextResponse.json({ ok: false, error: "Non autorisé." }, { status: 401 });
  }

  try {
    const report = await runStravaSync();
    return NextResponse.json(report);
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "erreur inconnue" },
      { status: 500 },
    );
  }
}
