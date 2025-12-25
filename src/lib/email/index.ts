/**
 * Email Service using Resend
 *
 * Handles all outgoing emails for the platform.
 */

import { Resend } from "resend";

// Lazy-loaded Resend client (avoid instantiation at module load)
let resendClient: Resend | null = null;

function getResendClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    return null;
  }
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

// From address (update domain once verified)
const FROM_EMAIL = process.env.EMAIL_FROM || "RegularUpkeep <notifications@regularupkeep.com>";

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

/**
 * Send an email using Resend
 */
export async function sendEmail(options: SendEmailOptions): Promise<{ success: boolean; id?: string; error?: string }> {
  const resend = getResendClient();
  if (!resend) {
    console.warn("[Email] RESEND_API_KEY not configured, skipping email");
    return { success: false, error: "Email service not configured" };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      replyTo: options.replyTo,
    });

    if (error) {
      console.error("[Email] Send failed:", error);
      return { success: false, error: error.message };
    }

    console.log("[Email] Sent successfully:", data?.id);
    return { success: true, id: data?.id };
  } catch (err) {
    console.error("[Email] Exception:", err);
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Send a batch of emails
 */
export async function sendBatchEmails(
  emails: SendEmailOptions[]
): Promise<{ sent: number; failed: number; errors: string[] }> {
  const results = { sent: 0, failed: 0, errors: [] as string[] };

  for (const email of emails) {
    const result = await sendEmail(email);
    if (result.success) {
      results.sent++;
    } else {
      results.failed++;
      if (result.error) results.errors.push(result.error);
    }
  }

  return results;
}
