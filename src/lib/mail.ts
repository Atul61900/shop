import { siteConfig } from "./config";

/**
 * Minimal transactional email over SMTP.
 *
 * When SMTP is not configured (the default in development) we log the message
 * instead of silently dropping it, so password-reset flows remain testable
 * end-to-end without wiring up a mail provider first.
 */

type Mail = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

function isSmtpConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER);
}

async function deliver({ to, subject, text, html }: Mail) {
  if (!isSmtpConfigured()) {
    // Reset links and order details must never reach production logs: without
    // SMTP configured, a deployed server would print tokens where log
    // aggregators can read them. Log only in development.
    if (process.env.NODE_ENV === "production") {
      console.error("[mail] SMTP not configured — message dropped (no token logged).");
      return { sent: false, reason: "smtp_not_configured" as const };
    }
    console.info(
      [
        "",
        "─────────────────────────────────────────────",
        `[mail] SMTP not configured — logging instead`,
        `[mail] to:      ${to}`,
        `[mail] subject: ${subject}`,
        "",
        text,
        "─────────────────────────────────────────────",
        "",
      ].join("\n"),
    );
    return { sent: false, reason: "smtp_not_configured" as const };
  }

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;

  // Imported lazily so nodemailer is only required when actually sending.
  const nodemailer = (await import("nodemailer")).default;

  const transport = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT ?? 587),
    secure: Number(SMTP_PORT ?? 587) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  await transport.sendMail({ from: SMTP_FROM, to, subject, text, html });
  return { sent: true as const };
}

const shell = (title: string, body: string, cta?: { label: string; url: string }) => `
<div style="background:#05070B;padding:40px 20px;font-family:Inter,system-ui,sans-serif;color:#e1e2e9">
  <div style="max-width:560px;margin:0 auto;background:#0B0F17;border:1px solid rgba(255,255,255,0.08);padding:32px">
    <div style="font-family:'Space Grotesk',system-ui,sans-serif;font-size:18px;font-weight:700;letter-spacing:-0.02em;color:#fff">
      KMRC<span style="color:#00DAF3"> Service Center</span>
    </div>
    <div style="height:1px;background:rgba(255,255,255,0.08);margin:24px 0"></div>
    <h1 style="font-family:'Space Grotesk',system-ui,sans-serif;font-size:24px;margin:0 0 16px;color:#fff">${title}</h1>
    <div style="font-size:15px;line-height:1.6;color:#94A3B8">${body}</div>
    ${
      cta
        ? `<div style="margin-top:28px"><a href="${cta.url}" style="display:inline-block;background:#0052FF;color:#fff;text-decoration:none;padding:14px 24px;font-family:'Space Grotesk',sans-serif;font-size:13px;font-weight:600;letter-spacing:0.02em">${cta.label}</a></div>
           <div style="margin-top:20px;font-size:12px;color:#64748B;word-break:break-all">${cta.url}</div>`
        : ""
    }
    <div style="height:1px;background:rgba(255,255,255,0.08);margin:28px 0"></div>
    <div style="font-size:12px;color:#64748B">
      ${siteConfig.name} · ${siteConfig.address.line1}, ${siteConfig.address.line2}<br>
      ${siteConfig.contact.phoneDisplay} · ${siteConfig.contact.email}
    </div>
  </div>
</div>`;

export async function sendPasswordResetEmail(params: { to: string; name: string; token: string }) {
  const url = `${siteConfig.url}/reset-password?token=${encodeURIComponent(params.token)}`;

  return deliver({
    to: params.to,
    subject: "Reset your KMRC password",
    text: `Hi ${params.name},\n\nUse this link to choose a new password. It expires in 1 hour.\n\n${url}\n\nIf you did not request this, you can safely ignore this email.`,
    html: shell(
      "Reset your password",
      `Hi ${params.name},<br><br>Use the button below to choose a new password. This link expires in <strong>1 hour</strong> and can only be used once.<br><br>If you did not request this, you can safely ignore this email.`,
      { label: "Choose a new password", url },
    ),
  });
}

export async function sendOrderConfirmationEmail(params: {
  to: string;
  name: string;
  orderNumber: string;
  total: string;
  itemCount: number;
  paymentMethod: string;
}) {
  return deliver({
    to: params.to,
    subject: `Order ${params.orderNumber} confirmed`,
    text: `Hi ${params.name},\n\nThanks for your order. We have received ${params.itemCount} item(s) totalling ${params.total}.\n\nOrder reference: ${params.orderNumber}\nPayment method: ${params.paymentMethod}\n\nTrack it any time at ${siteConfig.url}/account/orders`,
    html: shell(
      `Order ${params.orderNumber} confirmed`,
      `Hi ${params.name},<br><br>Thanks for your order. We have received <strong>${params.itemCount}</strong> item(s) totalling <strong>${params.total}</strong>, payable by <strong>${params.paymentMethod}</strong>.<br><br>You can follow its progress from your account at any time.`,
      { label: "View your order", url: `${siteConfig.url}/account/orders` },
    ),
  });
}