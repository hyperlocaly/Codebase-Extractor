import nodemailer, { type Transporter, type SendMailOptions } from "nodemailer";
import { config } from "../../config";
import { logger } from "../../lib/logger";

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (!config.email.smtpHost) return null;

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.email.smtpHost,
      port: config.email.smtpPort,
      secure: config.email.smtpPort === 465,
      auth: config.email.smtpUser
        ? { user: config.email.smtpUser, pass: config.email.smtpPass ?? "" }
        : undefined,
    });
  }

  return transporter;
}

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(payload: EmailPayload): Promise<boolean> {
  const t = getTransporter();
  if (!t) {
    logger.warn({ to: payload.to, subject: payload.subject }, "SMTP not configured — email skipped");
    return false;
  }

  try {
    const msg: SendMailOptions = {
      from: `"${config.email.fromName}" <${config.email.fromAddress}>`,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text ?? payload.html.replace(/<[^>]+>/g, ""),
    };

    const info = await t.sendMail(msg);
    logger.info({ to: payload.to, messageId: info.messageId }, "Email sent");
    return true;
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logger.error({ to: payload.to, err: errMsg }, "Email send failed");
    return false;
  }
}

export const emailTemplates = {
  verificationCode(code: string, expiresInMinutes: number): { subject: string; html: string } {
    return {
      subject: "Verify your email address",
      html: `
        <h2>Verify your email</h2>
        <p>Your verification code is:</p>
        <h1 style="font-size:36px;letter-spacing:8px;font-family:monospace">${code}</h1>
        <p>This code expires in <strong>${expiresInMinutes} minutes</strong>.</p>
        <p>If you did not request this, you can safely ignore this email.</p>
      `,
    };
  },

  claimApproved(businessName: string): { subject: string; html: string } {
    return {
      subject: `Your claim for ${businessName} has been approved`,
      html: `
        <h2>Claim Approved!</h2>
        <p>Your claim request for <strong>${businessName}</strong> has been approved.</p>
        <p>You can now manage this business listing from your dashboard.</p>
      `,
    };
  },

  claimRejected(businessName: string, reason?: string): { subject: string; html: string } {
    return {
      subject: `Your claim for ${businessName} was not approved`,
      html: `
        <h2>Claim Not Approved</h2>
        <p>Your claim request for <strong>${businessName}</strong> was not approved.</p>
        ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ""}
        <p>Please contact support if you believe this is an error.</p>
      `,
    };
  },

  reviewModerated(businessName: string, action: string): { subject: string; html: string } {
    return {
      subject: "Your review has been moderated",
      html: `
        <h2>Review Update</h2>
        <p>Your review for <strong>${businessName}</strong> has been ${action}.</p>
      `,
    };
  },

  verificationStatusChanged(businessName: string, status: string): { subject: string; html: string } {
    return {
      subject: `Verification update for ${businessName}`,
      html: `
        <h2>Verification Status Update</h2>
        <p>The verification status for <strong>${businessName}</strong> has been updated to: <strong>${status}</strong>.</p>
      `,
    };
  },

  passwordReset(token: string, expiresInMinutes: number): { subject: string; html: string } {
    return {
      subject: "Reset your password",
      html: `
        <h2>Password Reset Request</h2>
        <p>We received a request to reset your password. Use the token below to complete the reset:</p>
        <h1 style="font-size:24px;letter-spacing:4px;font-family:monospace;word-break:break-all">${token}</h1>
        <p>This token expires in <strong>${expiresInMinutes} minutes</strong>.</p>
        <p>If you did not request a password reset, you can safely ignore this email.</p>
      `,
    };
  },
};
