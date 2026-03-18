const { sendEmail } = require("./_lib/email");
const { getEnv } = require("./_lib/env");
const { json, parseJsonBody, getClientIp } = require("./_lib/http");
const { logEvent } = require("./_lib/supabase");

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    await logEvent({
      eventType: "contact_method_not_allowed",
      route: "/api/contact",
      statusCode: 405,
      details: { method: req.method },
    });
    return json(res, 405, { error: "Method not allowed" });
  }

  try {
    const body = await parseJsonBody(req);
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const message = String(body.message || "").trim();
    const honeypot = String(body.company || "").trim();
    const ipAddress = getClientIp(req);

    if (honeypot) {
      await logEvent({
        eventType: "contact_honeypot_triggered",
        route: "/api/contact",
        statusCode: 400,
        details: { ipAddress },
      });
      return json(res, 400, { error: "Invalid request." });
    }

    if (!name || !isValidEmail(email) || !message) {
      await logEvent({
        eventType: "contact_validation_error",
        route: "/api/contact",
        statusCode: 400,
        details: { emailPresent: Boolean(email), namePresent: Boolean(name) },
      });
      return json(res, 400, { error: "Name, valid email, and message are required." });
    }

    if (message.length > 4000) {
      return json(res, 400, { error: "Message is too long." });
    }

    await sendEmail({
      to: [getEnv("FOUNDER_EMAIL")],
      subject: `New SahaCare contact message from ${name}`,
      replyTo: email,
      text:
        `Name: ${name}\n` +
        `Email: ${email}\n` +
        `IP: ${ipAddress || "unknown"}\n\n` +
        `${message}`,
      html:
        `<p><strong>New SahaCare contact message</strong></p>` +
        `<p>Name: ${name}<br/>Email: ${email}<br/>IP: ${ipAddress || "unknown"}</p>` +
        `<p>${message.replace(/\n/g, "<br/>")}</p>`,
    });

    await logEvent({
      eventType: "contact_message_sent",
      route: "/api/contact",
      statusCode: 200,
      details: { email },
    });

    return json(res, 200, { ok: true });
  } catch (error) {
    console.error(error);
    await logEvent({
      eventType: "contact_message_error",
      route: "/api/contact",
      statusCode: 500,
      details: { message: error.message },
    });
    return json(res, 500, { error: "Unable to send your message right now." });
  }
};
