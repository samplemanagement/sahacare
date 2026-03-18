const { getEnv } = require("./env");

class EmailSendError extends Error {
  constructor(message, { statusCode, providerMessage } = {}) {
    super(message);
    this.name = "EmailSendError";
    this.statusCode = statusCode;
    this.providerMessage = providerMessage;
  }
}

async function sendEmail({ to, subject, html, text, from, replyTo }) {
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
      reply_to: replyTo,
    }),
  });

  if (!response.ok) {
    const textBody = await response.text();
    throw new EmailSendError(`Resend failed (${response.status})`, {
      statusCode: response.status,
      providerMessage: textBody,
    });
  }

  return response.json();
}

module.exports = {
  sendEmail,
  EmailSendError,
};
