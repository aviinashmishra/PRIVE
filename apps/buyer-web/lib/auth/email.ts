// Transactional email. SMTP via nodemailer when SMTP_HOST is set (Mailpit in the
// Docker stack, any real provider in production); otherwise the message is printed
// to the server console so the flow stays testable with zero config.
import nodemailer, { type Transporter } from "nodemailer";
import { appUrl } from "./config";

let transporter: Transporter | null | undefined;
let verified = false;

function getTransport(): Transporter | null {
  if (transporter !== undefined) return transporter;
  const host = process.env.SMTP_HOST;
  if (!host) {
    transporter = null;
    console.warn("✉ SMTP_HOST is not set — auth emails will be printed to these logs instead of sent.");
    return null;
  }
  if (process.env.SMTP_USER && !process.env.SMTP_PASS) {
    console.warn("✉ SMTP_USER is set but SMTP_PASS is EMPTY — sends will fail until SMTP_PASS is configured.");
  }
  transporter = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: (process.env.SMTP_PASS || "").replace(/\s+/g, "") }
      : undefined,
  });
  return transporter;
}

const FROM = () => process.env.EMAIL_FROM || "Prive Exchange <no-reply@prive.exchange>";

function logEmailToConsole(reason: string, to: string, subject: string, text: string): void {
  console.log(
    [
      `┌─ 📧 Email (${reason}) ─`,
      `│ To: ${to}`,
      `│ Subject: ${subject}`,
      ...text.split("\n").map((l) => `│ ${l}`),
      "└────────────────────────────────────────────────────────",
    ].join("\n"),
  );
}

async function send(to: string, subject: string, text: string, html: string): Promise<void> {
  const t = getTransport();
  if (!t) {
    logEmailToConsole("SMTP not configured — printed to console", to, subject, text);
    return;
  }
  try {
    if (!verified) {
      // one-time connection/credential check with a clear log line either way
      await t.verify();
      verified = true;
      console.log(`✉ SMTP ready: ${process.env.SMTP_HOST}:${process.env.SMTP_PORT || 587} as ${process.env.SMTP_USER || "(no auth)"}`);
    }
    await t.sendMail({ from: FROM(), to, subject, text, html });
    console.log(`✉ Sent "${subject}" to ${to}`);
  } catch (err) {
    // Never lose the OTP: log the failure loudly AND print the message content so
    // it can be recovered from the service logs while SMTP is being fixed.
    console.error(`✉ SMTP SEND FAILED (${process.env.SMTP_HOST}): ${String(err)}`);
    logEmailToConsole("SMTP send FAILED — content printed as fallback", to, subject, text);
  }
}

function shell(title: string, bodyHtml: string): string {
  return `<!doctype html><body style="margin:0;background:#F4F7F5;font-family:Segoe UI,Arial,sans-serif;padding:32px 16px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
  <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #E3EAE5;border-radius:16px;overflow:hidden">
    <tr><td style="background:linear-gradient(135deg,#0E7C55,#0A5C3F);padding:20px 28px">
      <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:.02em">Prive Exchange</span>
      <span style="color:#CBE8DA;font-size:11px;display:block;margin-top:2px;letter-spacing:.14em;text-transform:uppercase">Carbon markets, verified</span>
    </td></tr>
    <tr><td style="padding:28px">
      <h1 style="margin:0 0 12px;font-size:18px;color:#122019">${title}</h1>
      ${bodyHtml}
      <p style="margin:20px 0 0;font-size:12px;color:#7C8A81">If you didn't request this, you can safely ignore this email.</p>
    </td></tr>
  </table>
  </td></tr></table></body>`;
}

export async function sendVerificationEmail(to: string, code: string): Promise<void> {
  const text = `Your Prive Exchange verification code is: ${code}\nIt expires in 15 minutes.`;
  const html = shell(
    "Verify your email",
    `<p style="margin:0 0 16px;font-size:14px;color:#41504A">Enter this code to activate your account. It expires in 15 minutes.</p>
     <div style="background:#F0F7F3;border:1px solid #CBE8DA;border-radius:12px;padding:16px;text-align:center">
       <span style="font-size:30px;font-weight:700;letter-spacing:.35em;color:#0A5C3F;font-family:Consolas,monospace">${code}</span>
     </div>`,
  );
  await send(to, `${code} is your Prive Exchange verification code`, text, html);
}

export async function sendPasswordResetEmail(to: string, token: string): Promise<void> {
  const link = `${appUrl()}/reset-password?token=${token}&email=${encodeURIComponent(to)}`;
  const text = `Reset your Prive Exchange password:\n${link}\nThe link expires in 30 minutes.`;
  const html = shell(
    "Reset your password",
    `<p style="margin:0 0 16px;font-size:14px;color:#41504A">Click the button below to choose a new password. The link expires in 30 minutes.</p>
     <div style="text-align:center"><a href="${link}" style="display:inline-block;background:#0E7C55;color:#ffffff;font-size:14px;font-weight:600;padding:12px 24px;border-radius:999px;text-decoration:none">Reset password</a></div>
     <p style="margin:16px 0 0;font-size:12px;color:#7C8A81;word-break:break-all">Or paste this link into your browser:<br>${link}</p>`,
  );
  await send(to, "Reset your Prive Exchange password", text, html);
}
