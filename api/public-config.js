const { json } = require("./_lib/http");

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    return json(res, 405, { error: "Method not allowed" });
  }

  return json(res, 200, {
    turnstileSiteKey: process.env.TURNSTILE_SITE_KEY || "",
  });
};
