const { getEnv } = require("./env");

async function supabaseRequest(path, options = {}, useServiceRole = true) {
  const url = `${getEnv("SUPABASE_URL")}/rest/v1/${path}`;
  const apiKey = useServiceRole
    ? getEnv("SUPABASE_SERVICE_ROLE_KEY")
    : getEnv("SUPABASE_ANON_KEY");

  const headers = {
    apikey: apiKey,
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase request failed (${response.status}): ${text}`);
  }

  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

async function logEvent({ eventType, route, statusCode, details }) {
  try {
    await supabaseRequest("event_logs", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        event_type: eventType,
        route,
        status_code: statusCode,
        details,
      }),
    });
  } catch (error) {
    console.error("Failed to write event log", error.message);
  }
}

module.exports = {
  supabaseRequest,
  logEvent,
};
