import { getEmailFrom, hasEmailConfig } from "@/lib/email/config";

interface SendEmailInput {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(input: SendEmailInput) {
  if (!hasEmailConfig()) {
    console.warn(
      "[email] RESEND_API_KEY is not set — skipping email:",
      input.subject
    );
    return { skipped: true as const };
  }

  const recipients = Array.isArray(input.to) ? input.to : [input.to];
  const uniqueRecipients = [...new Set(recipients.map((r) => r.trim().toLowerCase()))].filter(
    Boolean
  );

  if (uniqueRecipients.length === 0) {
    return { skipped: true as const };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: getEmailFrom(),
      to: uniqueRecipients,
      subject: input.subject,
      html: input.html,
      text: input.text,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error("[email] Resend error:", response.status, body);
    return { error: `Email delivery failed (${response.status})` };
  }

  return { success: true as const };
}
