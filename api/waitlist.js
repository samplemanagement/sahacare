const { sendEmail } = require("./_lib/email");
const { getEnv } = require("./_lib/env");
const { supabaseRequest, logEvent } = require("./_lib/supabase");

function json(res, statusCode, body) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
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
    const { email, role } = req.body || {};

    if (!email || !role || !isValidEmail(email)) {
      await logEvent({
        eventType: "waitlist_validation_error",
        route: "/api/waitlist",
        statusCode: 400,
        details: { emailPresent: Boolean(email), rolePresent: Boolean(role) },
      });
      return json(res, 400, { error: "Valid email and role are required." });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedRole = String(role).trim();

    // Upsert the lead so duplicate submissions update role/metadata and stay idempotent.
    await supabaseRequest("waitlist_leads?on_conflict=email", {
      method: "POST",
      headers: {
        Prefer: "resolution=merge-duplicates,return=representation",
      },
      body: JSON.stringify([
        {
          email: normalizedEmail,
          role: normalizedRole,
          source: req.headers.referer || "direct",
          user_agent: req.headers["user-agent"] || "unknown",
          ip_address: req.headers["x-forwarded-for"] || req.socket.remoteAddress || null,
          status: "new",
        },
      ]),
    });

    const founderEmail = getEnv("FOUNDER_EMAIL");

    const userEmailPromise = sendEmail({
      to: [normalizedEmail],
      subject: "You are on the SahaCare waitlist",
      text: "Thanks for joining the SahaCare waitlist. We will reach out with early access updates soon.",
      html:
        "<p>Thanks for joining the <strong>SahaCare waitlist</strong>.</p><p>We will reach out with early access updates soon.</p>",
    });

    const founderEmailPromise = sendEmail({
      to: [founderEmail],
      subject: "New SahaCare waitlist signup",
      text: `New signup: ${normalizedEmail} (${normalizedRole})`,
      html: `<p><strong>New waitlist signup</strong></p><p>Email: ${normalizedEmail}<br/>Role: ${normalizedRole}</p>`,
    });

    await Promise.all([userEmailPromise, founderEmailPromise]);

    await logEvent({
      eventType: "waitlist_signup_success",
      route: "/api/waitlist",
      statusCode: 200,
      details: { role: normalizedRole },
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
