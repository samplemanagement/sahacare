const { getEnv } = require("../_lib/env");
const { logEvent, supabaseRequest } = require("../_lib/supabase");

function json(res, statusCode, body) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

function isAuthorized(req) {
  const adminKey = req.headers["x-admin-key"];
  return adminKey && adminKey === getEnv("ADMIN_API_KEY");
}

module.exports = async (req, res) => {
  if (!isAuthorized(req)) {
    await logEvent({
      eventType: "admin_unauthorized",
      route: "/api/admin/leads",
      statusCode: 401,
      details: { method: req.method },
    });
    return json(res, 401, { error: "Unauthorized" });
  }

  try {
    if (req.method === "GET") {
      const rows = await supabaseRequest(
        "waitlist_leads?select=id,email,role,status,source,created_at&order=created_at.desc",
        { method: "GET" },
      );
      return json(res, 200, { ok: true, leads: rows });
    }

    if (req.method === "PATCH") {
      const { id, status } = req.body || {};
      if (!id || !status) {
        return json(res, 400, { error: "id and status are required" });
      }

      const validStatuses = ["new", "contacted", "interviewed", "pilot_candidate"];
      if (!validStatuses.includes(status)) {
        return json(res, 400, { error: "Invalid status" });
      }

      await supabaseRequest(`waitlist_leads?id=eq.${id}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ status, updated_at: new Date().toISOString() }),
      });

      await logEvent({
        eventType: "lead_status_updated",
        route: "/api/admin/leads",
        statusCode: 200,
        details: { id, status },
      });

      return json(res, 200, { ok: true });
    }

    return json(res, 405, { error: "Method not allowed" });
  } catch (error) {
    console.error(error);
    await logEvent({
      eventType: "admin_leads_error",
      route: "/api/admin/leads",
      statusCode: 500,
      details: { message: error.message },
    });
    return json(res, 500, { error: "Unable to process admin request" });
  }
};
