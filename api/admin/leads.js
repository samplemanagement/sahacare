const { isAdminRequestAuthorized } = require("../_lib/admin-auth");
const { json, parseJsonBody } = require("../_lib/http");
const { logEvent, supabaseRequest } = require("../_lib/supabase");

function isValidUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

module.exports = async (req, res) => {
  if (!isAdminRequestAuthorized(req)) {
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
      const { id, status } = await parseJsonBody(req);
      if (!id || !status) {
        return json(res, 400, { error: "id and status are required" });
      }

      const validStatuses = ["new", "contacted", "interviewed", "pilot_candidate"];
      if (!validStatuses.includes(status) || !isValidUuid(id)) {
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
