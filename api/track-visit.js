const { json, parseJsonBody, getClientIp } = require("./_lib/http");
const { supabaseRequest } = require("./_lib/supabase");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return json(res, 405, { error: "Method not allowed" });
  }

  try {
    const body = await parseJsonBody(req);
    await supabaseRequest("site_visits", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        path: body.path || req.headers.referer || "/",
        referrer: req.headers.referer || null,
        user_agent: req.headers["user-agent"] || "unknown",
        ip_address: getClientIp(req),
      }),
    });

    return json(res, 200, { ok: true });
  } catch (error) {
    console.error(error);
    return json(res, 500, { error: "Unable to track visit" });
  }
};
