export function hasEmailConfig() {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

export function getEmailFrom() {
  return (
    process.env.EMAIL_FROM?.trim() ||
    "Collection Dashboard <onboarding@resend.dev>"
  );
}

export function getAppUrl() {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel}`;

  return "http://localhost:3000";
}
