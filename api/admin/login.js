const { authenticateAdminKey, createSessionToken, setSessionCookie } = require("../_lib/admin-auth");
const { json, parseJsonBody } = require("../_lib/http");
const { logEvent } = require("../_lib/supabase");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return json(res, 405, { error: "Method not allowed" });
  }

  const body = await parseJsonBody(req);
  const adminKey = body.adminKey || "";

  if (!authenticateAdminKey(adminKey)) {
    await logEvent({
      eventType: "admin_login_failed",
      route: "/api/admin/login",
      statusCode: 401,
      details: {},
    });
    return json(res, 401, { error: "Unauthorized" });
  }

  const token = createSessionToken();
  setSessionCookie(res, token);

  await logEvent({
    eventType: "admin_login_success",
    route: "/api/admin/login",
    statusCode: 200,
    details: {},
  });

  return json(res, 200, { ok: true });
};
