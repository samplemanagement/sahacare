const { clearSessionCookie } = require("../_lib/admin-auth");
const { json } = require("../_lib/http");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return json(res, 405, { error: "Method not allowed" });
  }

  clearSessionCookie(res);
  return json(res, 200, { ok: true });
};
