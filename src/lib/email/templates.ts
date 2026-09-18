import { getAppUrl } from "@/lib/email/config";

function layout(title: string, body: string) {
  const appUrl = getAppUrl();
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="padding:24px 28px;background:linear-gradient(135deg,#4f46e5,#312e81);">
              <p style="margin:0;font-size:13px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:#c7d2fe;">Collection & Recovery</p>
              <h1 style="margin:8px 0 0;font-size:22px;line-height:1.3;color:#ffffff;">${title}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;font-size:15px;line-height:1.6;color:#334155;">
              ${body}
              <p style="margin:28px 0 0;padding-top:20px;border-top:1px solid #e2e8f0;font-size:12px;color:#94a3b8;">
                <a href="${appUrl}" style="color:#6366f1;text-decoration:none;">Open dashboard</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function pendingSignupAdminEmail(input: {
  adminName?: string;
  newUserName: string;
  newUserEmail: string;
  clientName: string;
  adminUrl: string;
}) {
  const greeting = input.adminName ? `Hi ${input.adminName},` : "Hello,";
  const html = layout(
    "New user awaiting approval",
    `<p style="margin:0 0 16px;">${greeting}</p>
     <p style="margin:0 0 16px;">A new user registered for <strong>${input.clientName}</strong> and is waiting for approval in the Admin panel.</p>
     <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 20px;background:#fffbeb;border:1px solid #fde68a;border-radius:12px;">
       <tr><td style="padding:16px 18px;">
         <p style="margin:0 0 6px;font-size:13px;color:#92400e;font-weight:600;">New registration</p>
         <p style="margin:0;font-size:15px;color:#0f172a;"><strong>${input.newUserName}</strong></p>
         <p style="margin:4px 0 0;font-size:14px;color:#64748b;">${input.newUserEmail}</p>
       </td></tr>
     </table>
     <p style="margin:0 0 20px;">Assign their role, agency, and team, then activate the account so they can access the dashboard.</p>
     <a href="${input.adminUrl}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 18px;border-radius:10px;">Review pending approvals</a>`
  );

  const text = `${greeting}\n\n${input.newUserName} (${input.newUserEmail}) registered for ${input.clientName} and is waiting for approval.\n\nReview: ${input.adminUrl}`;

  return { html, text, subject: `New signup pending approval — ${input.clientName}` };
}

export function pendingSignupUserEmail(input: {
  userName: string;
  clientName: string;
}) {
  const html = layout(
    "Registration received",
    `<p style="margin:0 0 16px;">Hi ${input.userName},</p>
     <p style="margin:0 0 16px;">Your account for <strong>${input.clientName}</strong> has been created successfully.</p>
     <p style="margin:0 0 16px;">Your Client Admin has been notified. Once they assign your role and activate your account, you can sign in and access the dashboard.</p>
     <p style="margin:0;">You can keep this tab open on the pending approval screen, or sign out and return later.</p>`
  );

  const text = `Hi ${input.userName},\n\nYour account for ${input.clientName} was created. Your administrator has been notified and will activate your access soon.`;

  return { html, text, subject: `Registration received — ${input.clientName}` };
}

export function unassignedSignupAdminEmail(input: {
  newUserName: string;
  newUserEmail: string;
  adminUrl: string;
}) {
  const html = layout(
    "Unassigned signup needs review",
    `<p style="margin:0 0 16px;">A new user registered without a client assignment and needs platform review.</p>
     <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 20px;background:#fff1f2;border:1px solid #fecdd3;border-radius:12px;">
       <tr><td style="padding:16px 18px;">
         <p style="margin:0 0 6px;font-size:13px;color:#be123c;font-weight:600;">Unassigned user</p>
         <p style="margin:0;font-size:15px;color:#0f172a;"><strong>${input.newUserName}</strong></p>
         <p style="margin:4px 0 0;font-size:14px;color:#64748b;">${input.newUserEmail}</p>
       </td></tr>
     </table>
     <p style="margin:0 0 20px;">Assign them to the correct client, set role/agency/team, and activate their account.</p>
     <a href="${input.adminUrl}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 18px;border-radius:10px;">Open Admin panel</a>`
  );

  const text = `${input.newUserName} (${input.newUserEmail}) registered without a client assignment.\n\nReview: ${input.adminUrl}`;

  return { html, text, subject: "Unassigned signup needs platform review" };
}

export function userApprovedEmail(input: {
  userName: string;
  clientName: string;
  loginUrl: string;
}) {
  const html = layout(
    "Your account is active",
    `<p style="margin:0 0 16px;">Hi ${input.userName},</p>
     <p style="margin:0 0 16px;">Good news — your account for <strong>${input.clientName}</strong> has been approved and activated.</p>
     <p style="margin:0 0 20px;">You can now sign in and access the Collection & Recovery dashboard.</p>
     <a href="${input.loginUrl}" style="display:inline-block;background:#059669;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 18px;border-radius:10px;">Sign in to dashboard</a>`
  );

  const text = `Hi ${input.userName},\n\nYour account for ${input.clientName} is now active.\n\nSign in: ${input.loginUrl}`;

  return { html, text, subject: `Account approved — ${input.clientName}` };
}
