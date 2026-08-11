import { createHmac, timingSafeEqual } from "node:crypto";

// Minimal HMAC-signed session token for this demo app: "<username>.<expiry>.<sig>".
// No refresh, no forgot-password — a valid cookie is the whole session.
const SECRET = process.env.AUTH_SECRET || "skbzs-demo-secret";
export const SESSION_COOKIE = "sms_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const b64 = (s) => Buffer.from(s, "utf8").toString("base64url");
const unb64 = (s) => Buffer.from(s, "base64url").toString("utf8");
const sign = (payload) => createHmac("sha256", SECRET).update(payload).digest("base64url");

export function createToken(username) {
  const payload = `${b64(username)}.${Date.now() + SESSION_TTL_MS}`;
  return `${payload}.${sign(payload)}`;
}

// Returns the username for a valid, unexpired token; null otherwise.
export function verifyToken(token) {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [user64, expiry, sig] = parts;
  const expected = sign(`${user64}.${expiry}`);
  try {
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  } catch {
    return null;
  }
  if (Number(expiry) < Date.now()) return null;
  try { return unb64(user64); } catch { return null; }
}

export function sessionCookie(token) {
  // Secure is omitted so the demo also works on plain-http LAN hosts.
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL_MS / 1000}`;
}

export function clearSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}
