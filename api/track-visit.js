const { supabaseRequest } = require("./_lib/supabase");

function json(res, statusCode, body) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return json(res, 405, { error: "Method not allowed" });
  }

  try {
    await supabaseRequest("site_visits", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        path: req.body?.path || req.headers.referer || "/",
        referrer: req.headers.referer || null,
        user_agent: req.headers["user-agent"] || "unknown",
        ip_address: req.headers["x-forwarded-for"] || req.socket.remoteAddress || null,
      }),
    });

    return json(res, 200, { ok: true });
  } catch (error) {
    console.error(error);
    return json(res, 500, { error: "Unable to track visit" });
  }
};
