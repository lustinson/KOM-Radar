import "server-only";

import { createHash } from "node:crypto";

import { EncryptJWT, jwtDecrypt } from "jose";
import type { RequestCookies, ResponseCookies } from "next/dist/compiled/@edge-runtime/cookies";

import { getServerEnv } from "@/lib/config/env";
import { refreshStravaSession } from "@/lib/strava/oauth";
import type { ClientSession, StravaSession } from "@/lib/types/auth";

const SESSION_COOKIE_NAME = "kom_radar_session";
const OAUTH_STATE_COOKIE_NAME = "kom_radar_oauth_state";
const POST_AUTH_REDIRECT_COOKIE_NAME = "kom_radar_post_auth_redirect";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;
const REFRESH_LEEWAY_SECONDS = 5 * 60;

function getSessionSecretKey() {
  const { SESSION_SECRET } = getServerEnv();
  return createHash("sha256").update(SESSION_SECRET).digest();
}

function getCookieBaseOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

function clearCookie(cookieStore: Pick<ResponseCookies, "set">, cookieName: string) {
  cookieStore.set(cookieName, "", getCookieBaseOptions(0));
}

async function encryptSession(session: StravaSession) {
  return new EncryptJWT({ session })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .encrypt(getSessionSecretKey());
}

async function decryptSession(value: string) {
  const { payload } = await jwtDecrypt(value, getSessionSecretKey());
  return payload.session as StravaSession;
}

export async function readSessionCookie(cookieStore: Pick<RequestCookies, "get">) {
  const cookieValue = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!cookieValue) {
    return null;
  }

  try {
    return await decryptSession(cookieValue);
  } catch {
    return null;
  }
}

export async function writeSessionCookie(cookieStore: Pick<ResponseCookies, "set">, session: StravaSession) {
  const encryptedSession = await encryptSession(session);
  cookieStore.set(SESSION_COOKIE_NAME, encryptedSession, getCookieBaseOptions(SESSION_TTL_SECONDS));
}

export function clearSessionCookie(cookieStore: Pick<ResponseCookies, "set">) {
  clearCookie(cookieStore, SESSION_COOKIE_NAME);
}

export function writeOauthStateCookie(cookieStore: Pick<ResponseCookies, "set">, state: string) {
  cookieStore.set(OAUTH_STATE_COOKIE_NAME, state, getCookieBaseOptions(10 * 60));
}

export function readOauthStateCookie(cookieStore: Pick<RequestCookies, "get">) {
  return cookieStore.get(OAUTH_STATE_COOKIE_NAME)?.value ?? null;
}

export function clearOauthStateCookie(cookieStore: Pick<ResponseCookies, "set">) {
  clearCookie(cookieStore, OAUTH_STATE_COOKIE_NAME);
}

export function writePostAuthRedirectCookie(cookieStore: Pick<ResponseCookies, "set">, redirectTo: string) {
  cookieStore.set(POST_AUTH_REDIRECT_COOKIE_NAME, redirectTo, getCookieBaseOptions(10 * 60));
}

export function readPostAuthRedirectCookie(cookieStore: Pick<RequestCookies, "get">) {
  return cookieStore.get(POST_AUTH_REDIRECT_COOKIE_NAME)?.value ?? null;
}

export function clearPostAuthRedirectCookie(cookieStore: Pick<ResponseCookies, "set">) {
  clearCookie(cookieStore, POST_AUTH_REDIRECT_COOKIE_NAME);
}

export function toClientSession(session: StravaSession | null): ClientSession {
  return {
    authenticated: session !== null,
    athlete: session?.athlete ?? null,
    expiresAt: session?.expiresAt ?? null,
  };
}

export async function ensureFreshSession(
  requestCookies: Pick<RequestCookies, "get">,
  responseCookies: Pick<ResponseCookies, "set">,
) {
  const session = await readSessionCookie(requestCookies);

  if (!session) {
    return null;
  }

  if (session.expiresAt - Math.floor(Date.now() / 1000) > REFRESH_LEEWAY_SECONDS) {
    return session;
  }

  try {
    const refreshedSession = await refreshStravaSession(session.refreshToken);
    await writeSessionCookie(responseCookies, refreshedSession);
    return refreshedSession;
  } catch {
    clearSessionCookie(responseCookies);
    return null;
  }
}
