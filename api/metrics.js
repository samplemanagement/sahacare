const { json } = require("./_lib/http");
const { supabaseRequest } = require("./_lib/supabase");

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    return json(res, 405, { error: "Method not allowed" });
  }

  try {
    const [leadRows, visitRows] = await Promise.all([
      supabaseRequest("waitlist_leads?select=id", { method: "GET" }),
      supabaseRequest("site_visits?select=id", { method: "GET" }),
    ]);

    return json(res, 200, {
      ok: true,
      totalLeads: leadRows.length,
      totalVisits: visitRows.length,
    });
  } catch (error) {
    console.error(error);
    return json(res, 500, { error: "Unable to fetch metrics" });
  }
};
