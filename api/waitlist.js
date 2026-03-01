const { EmailSendError, sendEmail } = require("./_lib/email");
const { getEnv } = require("./_lib/env");
const { json, parseJsonBody, getClientIp } = require("./_lib/http");
const { supabaseRequest, logEvent } = require("./_lib/supabase");

const VALID_ROLES = new Set(["adult-child-caregiver", "parent-elder-user"]);

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isEmailTestModeRestriction(error) {
  if (!(error instanceof EmailSendError)) {
    return false;
  }

  const message = (error.providerMessage || "").toLowerCase();
  return error.statusCode === 403 && message.includes("testing emails to your own email address");
}

async function recordAttempt({ email, ipAddress, accepted, reason }) {
  await supabaseRequest("waitlist_attempts", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      email,
      ip_address: ipAddress,
      accepted,
      reason,
    }),
  });
}

async function isRateLimited({ email, ipAddress }) {
  const maxPerHour = Number(process.env.WAITLIST_MAX_ATTEMPTS_PER_HOUR || 8);
  const windowStartIso = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const emailPath =
    `waitlist_attempts?select=id&email=eq.${encodeURIComponent(email)}` +
    `&created_at=gte.${encodeURIComponent(windowStartIso)}`;

  const emailRows = await supabaseRequest(emailPath, { method: "GET" });
  if (emailRows.length >= maxPerHour) {
    return true;
  }

  if (!ipAddress) {
    return false;
  }

  const ipPath =
    `waitlist_attempts?select=id&ip_address=eq.${encodeURIComponent(ipAddress)}` +
    `&created_at=gte.${encodeURIComponent(windowStartIso)}`;

  const ipRows = await supabaseRequest(ipPath, { method: "GET" });
  return ipRows.length >= maxPerHour;
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    await logEvent({
      eventType: "waitlist_method_not_allowed",
      route: "/api/waitlist",
      statusCode: 405,
      details: { method: req.method },
    });
    return json(res, 405, { error: "Method not allowed" });
  }

  try {
    const body = await parseJsonBody(req);
    const email = String(body.email || "").trim().toLowerCase();
    const role = String(body.role || "").trim();
    const honeypot = String(body.company || "").trim();
    const ipAddress = getClientIp(req);

    if (honeypot) {
      await recordAttempt({ email, ipAddress, accepted: false, reason: "honeypot_triggered" });
      await logEvent({
        eventType: "waitlist_honeypot_triggered",
        route: "/api/waitlist",
        statusCode: 400,
        details: { ipAddress },
      });
      return json(res, 400, { error: "Invalid request." });
    }

    if (!email || !role || !VALID_ROLES.has(role) || !isValidEmail(email)) {
      await recordAttempt({ email, ipAddress, accepted: false, reason: "validation_error" });
      await logEvent({
        eventType: "waitlist_validation_error",
        route: "/api/waitlist",
        statusCode: 400,
        details: { emailPresent: Boolean(email), role },
      });
      return json(res, 400, { error: "Valid email and role are required." });
    }

    if (await isRateLimited({ email, ipAddress })) {
      await recordAttempt({ email, ipAddress, accepted: false, reason: "rate_limited" });
      await logEvent({
        eventType: "waitlist_rate_limited",
        route: "/api/waitlist",
        statusCode: 429,
        details: { email, ipAddress },
      });
      return json(res, 429, {
        error: "Too many requests. Please try again in a bit.",
        code: "RATE_LIMITED",
      });
    }

    await supabaseRequest("waitlist_leads?on_conflict=email", {
      method: "POST",
      headers: {
        Prefer: "resolution=merge-duplicates,return=representation",
      },
      body: JSON.stringify([
        {
          email,
          role,
          source: req.headers.referer || "direct",
          user_agent: req.headers["user-agent"] || "unknown",
          ip_address: ipAddress,
          status: "new",
          updated_at: new Date().toISOString(),
        },
      ]),
    });

    await recordAttempt({ email, ipAddress, accepted: true, reason: "accepted" });

    const founderEmail = getEnv("FOUNDER_EMAIL");

    try {
      await sendEmail({
        to: [email],
        subject: "You are on the SahaCare waitlist",
        text: "Thanks for joining the SahaCare waitlist. We will reach out with early access updates soon.",
        html:
          "<p>Thanks for joining the <strong>SahaCare waitlist</strong>.</p><p>We will reach out with early access updates soon.</p>",
      });
    } catch (error) {
      let responseBody = {
        error: "Your signup was saved, but we could not send confirmation email right now.",
        code: "EMAIL_DELIVERY_FAILED",
      };

      if (isEmailTestModeRestriction(error)) {
        responseBody = {
          error:
            "Signup saved, but email delivery is blocked by Resend test mode. Verify your sending domain in Resend.",
          code: "EMAIL_TEST_MODE_RESTRICTED",
        };
      }

      await logEvent({
        eventType: "waitlist_user_email_failed",
        route: "/api/waitlist",
        statusCode: 503,
        details: {
          email,
          message: error.message,
          providerMessage: error.providerMessage || null,
        },
      });

      // Attempt founder alert even when user confirmation fails.
      try {
        await sendEmail({
          to: [founderEmail],
          subject: "Waitlist signup saved but user email failed",
          text: `Signup saved for ${email} (${role}), but user confirmation email failed.`,
          html: `<p><strong>Signup saved but user email failed</strong></p><p>Email: ${email}<br/>Role: ${role}</p>`,
        });
      } catch (_notifyError) {
        // No-op: failure is already logged above.
      }

      return json(res, 503, responseBody);
    }

    try {
      await sendEmail({
        to: [founderEmail],
        subject: "New SahaCare waitlist signup",
        text: `New signup: ${email} (${role})`,
        html: `<p><strong>New waitlist signup</strong></p><p>Email: ${email}<br/>Role: ${role}</p>`,
      });
    } catch (error) {
      await logEvent({
        eventType: "waitlist_founder_email_failed",
        route: "/api/waitlist",
        statusCode: 500,
        details: { email, message: error.message },
      });
    }

    await logEvent({
      eventType: "waitlist_signup_success",
      route: "/api/waitlist",
      statusCode: 200,
      details: { role },
    });

    return json(res, 200, { ok: true, message: "Joined waitlist successfully." });
  } catch (error) {
    console.error(error);
    await logEvent({
      eventType: "waitlist_signup_error",
      route: "/api/waitlist",
      statusCode: 500,
      details: { message: error.message },
    });
    return json(res, 500, { error: "Unable to process waitlist request." });
  }
};
