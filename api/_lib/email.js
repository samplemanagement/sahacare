const { getEnv } = require("./env");

async function sendEmail({ to, subject, html, text, from }) {
  const apiKey = getEnv("RESEND_API_KEY");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: from || getEnv("EMAIL_FROM"),
      to,
      subject,
      html,
      text,
    }),
  });

  if (!response.ok) {
    const textBody = await response.text();
    throw new Error(`Resend failed (${response.status}): ${textBody}`);
  }

  return response.json();
}

module.exports = {
  sendEmail,
};
