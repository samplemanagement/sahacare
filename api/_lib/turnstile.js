async function verifyTurnstileToken({ token, ip }) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    return { ok: true, skipped: true };
  }

  if (!token) {
    return { ok: false, code: "MISSING_TURNSTILE_TOKEN" };
  }

  const params = new URLSearchParams();
  params.set("secret", secret);
  params.set("response", token);
  if (ip) {
    params.set("remoteip", ip);
  }

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    return { ok: false, code: "TURNSTILE_VERIFY_HTTP_ERROR" };
  }

  const body = await response.json();
  if (!body.success) {
    return {
      ok: false,
      code: "TURNSTILE_FAILED",
      errors: body["error-codes"] || [],
    };
  }

  return { ok: true, skipped: false };
}

module.exports = {
  verifyTurnstileToken,
};
