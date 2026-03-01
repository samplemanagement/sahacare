const crypto = require("node:crypto");
const { getEnv } = require("./env");

const COOKIE_NAME = "__Host-sahacare_admin";
const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;

function safeEqual(a, b) {
  const aBuf = Buffer.from(String(a));
  const bBuf = Buffer.from(String(b));
  if (aBuf.length !== bBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(aBuf, bBuf);
}

function parseCookies(req) {
  const raw = req.headers.cookie || "";
  const entries = raw.split(";").map((item) => item.trim()).filter(Boolean);
  const cookies = {};

  for (const entry of entries) {
    const index = entry.indexOf("=");
    if (index === -1) {
      continue;
    }
    const key = entry.slice(0, index);
    const value = entry.slice(index + 1);
    cookies[key] = decodeURIComponent(value);
  }

  return cookies;
}

function getSessionSecret() {
  return process.env.ADMIN_SESSION_SECRET || getEnv("ADMIN_API_KEY");
}

function signPayload(payload) {
  const secret = getSessionSecret();
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

function createSessionToken() {
  const exp = Date.now() + SESSION_MAX_AGE_SECONDS * 1000;
  const payload = JSON.stringify({ exp });
  const payloadBase64 = Buffer.from(payload).toString("base64url");
  const signature = signPayload(payloadBase64);
  return `${payloadBase64}.${signature}`;
}

function verifySessionToken(token) {
  if (!token || !token.includes(".")) {
    return false;
  }

  const [payloadBase64, signature] = token.split(".");
  const expectedSignature = signPayload(payloadBase64);
  if (!safeEqual(expectedSignature, signature)) {
    return false;
  }

  try {
    const payload = JSON.parse(Buffer.from(payloadBase64, "base64url").toString("utf8"));
    return Number(payload.exp) > Date.now();
  } catch (_error) {
    return false;
  }
}

function setSessionCookie(res, token) {
  const cookie = [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Strict",
    `Max-Age=${SESSION_MAX_AGE_SECONDS}`,
  ].join("; ");

  res.setHeader("Set-Cookie", cookie);
}

function clearSessionCookie(res) {
  const cookie = [
    `${COOKIE_NAME}=`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Strict",
    "Max-Age=0",
  ].join("; ");

  res.setHeader("Set-Cookie", cookie);
}

function isAdminRequestAuthorized(req) {
  const cookies = parseCookies(req);
  const sessionToken = cookies[COOKIE_NAME];
  return verifySessionToken(sessionToken);
}

function authenticateAdminKey(rawKey) {
  const expected = getEnv("ADMIN_API_KEY");
  return safeEqual(String(rawKey || ""), expected);
}

module.exports = {
  authenticateAdminKey,
  clearSessionCookie,
  createSessionToken,
  isAdminRequestAuthorized,
  setSessionCookie,
};
