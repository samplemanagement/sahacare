const { json } = require("./_lib/http");
const { logEvent, supabaseRequest } = require("./_lib/supabase");

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    return json(res, 405, { error: "Method not allowed" });
  }

  const checks = {
    timestamp: new Date().toISOString(),
    env: {
      supabaseUrl: Boolean(process.env.SUPABASE_URL),
      supabaseServiceKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      resendApiKey: Boolean(process.env.RESEND_API_KEY),
      emailFrom: Boolean(process.env.EMAIL_FROM),
      founderEmail: Boolean(process.env.FOUNDER_EMAIL),
      adminApiKey: Boolean(process.env.ADMIN_API_KEY),
    },
    services: {
      database: false,
    },
  };

  let status = "ok";
  let statusCode = 200;

  try {
    await supabaseRequest("waitlist_leads?select=id&limit=1", { method: "GET" });
    checks.services.database = true;
  } catch (error) {
    status = "degraded";
    statusCode = 503;
    await logEvent({
      eventType: "health_db_check_failed",
      route: "/api/health",
      statusCode,
      details: { message: error.message },
    });
  }

  return json(res, statusCode, {
    status,
    checks,
  });
};
