const { isAdminRequestAuthorized } = require("../_lib/admin-auth");
const { supabaseRequest } = require("../_lib/supabase");

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    res.statusCode = 405;
    return res.end("Method not allowed");
  }

  if (!isAdminRequestAuthorized(req)) {
    res.statusCode = 401;
    return res.end("Unauthorized");
  }

  try {
    const rows = await supabaseRequest(
      "waitlist_leads?select=email,role,status,source,created_at&order=created_at.desc",
      { method: "GET" },
    );

    const csv = [
      ["email", "role", "status", "source", "created_at"].join(","),
      ...rows.map((row) =>
        [row.email, row.role, row.status, row.source || "", row.created_at]
          .map((v) => `"${String(v).replaceAll('"', '""')}"`)
          .join(","),
      ),
    ].join("\n");

    res.statusCode = 200;
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=waitlist-leads.csv");
    res.end(csv);
  } catch (error) {
    console.error(error);
    res.statusCode = 500;
    res.end("Unable to export CSV");
  }
};
