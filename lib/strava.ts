import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { prisma } from "@/lib/prisma";

/**
 * Client OAuth Strava — brique S1 de l'agent Strava
 * (spec cf-spec-agent-strava, §6 et §8). Aucun secret ici : les identifiants
 * applicatifs viennent de l'environnement (`STRAVA_CLIENT_ID`,
 * `STRAVA_CLIENT_SECRET`, docs/SECRETS.md) et les jetons d'accès/refresh sont
 * stockés en base CHIFFRÉS (AES-256-GCM, clé dérivée d'AUTH_SECRET).
 */

export const STRAVA_OAUTH = "https://www.strava.com/oauth";
export const STRAVA_API = "https://www.strava.com/api/v3";

/** Scope demandé (décision D2 validée : traces privées incluses). */
export const STRAVA_SCOPE = "activity:read_all";

export class StravaNotConfiguredError extends Error {
  constructor() {
    super("STRAVA_CLIENT_ID / STRAVA_CLIENT_SECRET absents de l'environnement (docs/SECRETS.md)");
  }
}
export class StravaNotConnectedError extends Error {
  constructor() {
    super("Aucun compte Strava connecté");
  }
}

/* ------------------------- chiffrement des jetons ------------------------- */

const encKey = () =>
  createHash("sha256")
    .update(`${process.env.AUTH_SECRET ?? ""}:strava-tokens`)
    .digest();

/** Chiffre un jeton : `v1.<iv>.<tag>.<chiffré>` (base64url). */
export function encryptToken(value: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encKey(), iv);
  const data = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString("base64url")}.${tag.toString("base64url")}.${data.toString("base64url")}`;
}

export function decryptToken(payload: string): string {
  const [version, ivB64, tagB64, dataB64] = payload.split(".");
  if (version !== "v1" || !ivB64 || !tagB64 || !dataB64) {
    throw new Error("Jeton Strava illisible (format inconnu)");
  }
  const decipher = createDecipheriv("aes-256-gcm", encKey(), Buffer.from(ivB64, "base64url"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(dataB64, "base64url")), decipher.final()]).toString("utf8");
}

/* ----------------------------- configuration ----------------------------- */

export function stravaAppConfigured(): boolean {
  return Boolean(process.env.STRAVA_CLIENT_ID && process.env.STRAVA_CLIENT_SECRET);
}

/** Origine publique du site (APP_BASE_URL prioritaire, sinon origine requête). */
function publicOrigin(requestOrigin: string): string {
  const fromEnv = process.env.APP_BASE_URL?.replace(/\/+$/, "");
  return fromEnv && fromEnv.length > 0 ? fromEnv : requestOrigin.replace(/\/+$/, "");
}

export function stravaCallbackUrl(requestOrigin: string): string {
  return `${publicOrigin(requestOrigin)}/api/admin/strava/callback`;
}

export function stravaAuthorizeUrl(requestOrigin: string, state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID ?? "",
    redirect_uri: stravaCallbackUrl(requestOrigin),
    response_type: "code",
    approval_prompt: "auto",
    scope: STRAVA_SCOPE,
    state,
  });
  return `${STRAVA_OAUTH}/authorize?${params.toString()}`;
}

/* ------------------------------ état CSRF ------------------------------- */
/** `horodatage.hmac`, valable 10 minutes (AUTH_SECRET). */
export function signState(): string {
  const ts = Date.now().toString();
  const mac = createHmac("sha256", process.env.AUTH_SECRET ?? "").update(ts).digest("base64url");
  return `${ts}.${mac}`;
}

export function verifyState(state: string): boolean {
  const [ts, mac] = state.split(".");
  if (!ts || !mac) return false;
  const expected = createHmac("sha256", process.env.AUTH_SECRET ?? "").update(ts).digest("base64url");
  if (expected.length !== mac.length) return false;
  const ok = timingSafeEqual(Buffer.from(expected), Buffer.from(mac));
  return ok && Date.now() - Number(ts) < 10 * 60 * 1000;
}

/* -------------------------------- OAuth ---------------------------------- */

export interface StravaAthlete {
  id: number;
  firstname?: string;
  lastname?: string;
}

export interface StravaTokenSet {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  athlete: StravaAthlete;
}

interface StravaTokenResponse {
  token_type: string;
  expires_at: number;
  refresh_token: string;
  access_token: string;
  athlete: StravaAthlete;
}

async function stravaTokenRequest(body: Record<string, string>): Promise<StravaTokenResponse> {
  if (!stravaAppConfigured()) throw new StravaNotConfiguredError();
  const res = await fetch(`${STRAVA_OAUTH}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      ...body,
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Strava /oauth/token en échec (${res.status})`);
  }
  return (await res.json()) as StravaTokenResponse;
}

/** Échange du code d'autorisation (après le clic « Autoriser » chez Strava). */
export async function stravaExchangeCode(code: string, requestOrigin: string): Promise<StravaTokenSet> {
  const r = await stravaTokenRequest({
    grant_type: "authorization_code",
    code,
    redirect_uri: stravaCallbackUrl(requestOrigin),
  });
  return {
    accessToken: r.access_token,
    refreshToken: r.refresh_token,
    expiresAt: new Date(r.expires_at * 1000),
    athlete: r.athlete,
  };
}

/** Rafraîchit l'access token (valide 6 h ; refresh indéfini tant que non révoqué). */
export async function stravaRefresh(refreshToken: string): Promise<StravaTokenSet> {
  const r = await stravaTokenRequest({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
  return {
    accessToken: r.access_token,
    refreshToken: r.refresh_token,
    expiresAt: new Date(r.expires_at * 1000),
    athlete: r.athlete,
  };
}

/**
 * Révocation best-effort (l'app disparaît du compte Strava si la requête passe ;
 * l'échec n'empêche pas la déconnexion locale).
 */
export async function stravaRevoke(accessToken: string): Promise<void> {
  await fetch(`${STRAVA_OAUTH}/deauthorize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ access_token: accessToken }),
    cache: "no-store",
  });
}

export interface StoredCredential {
  id: string;
  athleteId: string;
  athleteName: string;
  scope: string;
  expiresAt: Date;
  accessToken: string;
  refreshToken: string;
}

export function athleteDisplayName(a: StravaAthlete): string {
  const name = `${a.firstname ?? ""} ${a.lastname ?? ""}`.trim();
  return name.length > 0 ? name : `athlète ${a.id}`;
}

/** Upsert du singleton (un seul athlète : le bureau). */
export async function saveCredential(tokens: StravaTokenSet, scope: string): Promise<string> {
  await prisma.stravaCredential.upsert({
    where: { athleteId: String(tokens.athlete.id) },
    create: {
      athleteId: String(tokens.athlete.id),
      athleteName: athleteDisplayName(tokens.athlete),
      accessToken: encryptToken(tokens.accessToken),
      refreshToken: encryptToken(tokens.refreshToken),
      expiresAt: tokens.expiresAt,
      scope,
    },
    update: {
      athleteName: athleteDisplayName(tokens.athlete),
      accessToken: encryptToken(tokens.accessToken),
      refreshToken: encryptToken(tokens.refreshToken),
      expiresAt: tokens.expiresAt,
      scope,
    },
  });
  return athleteDisplayName(tokens.athlete);
}

/** Lit les identifiants en clair (déchiffrés), jetons valides pour l'API. */
export async function loadCredential(): Promise<StoredCredential | null> {
  const cred = await prisma.stravaCredential.findFirst();
  if (!cred) return null;
  return {
    id: cred.id,
    athleteId: cred.athleteId,
    athleteName: cred.athleteName,
    scope: cred.scope,
    expiresAt: cred.expiresAt,
    accessToken: decryptToken(cred.accessToken),
    refreshToken: decryptToken(cred.refreshToken),
  };
}

/**
 * Jeton d'accès valide (rafraîchi si < 120 s de marge).
 * Utilisé par la synchronisation (S2) et l'API Streams (S3).
 */
export async function getValidAccessToken(): Promise<string> {
  const cred = await loadCredential();
  if (!cred) throw new StravaNotConnectedError();
  if (cred.expiresAt.getTime() - Date.now() <= 120_000) {
    const fresh = await stravaRefresh(cred.refreshToken);
    await prisma.stravaCredential.update({
      where: { id: cred.id },
      data: {
        accessToken: encryptToken(fresh.accessToken),
        refreshToken: encryptToken(fresh.refreshToken),
        expiresAt: fresh.expiresAt,
      },
    });
    return fresh.accessToken;
  }
  return cred.accessToken;
}
