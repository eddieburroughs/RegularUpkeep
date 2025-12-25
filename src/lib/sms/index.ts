/**
 * SMS Notification Library
 *
 * Sends SMS notifications via Twilio.
 */

import twilio from "twilio";

// Twilio configuration
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

// Initialize Twilio client lazily
let twilioClient: twilio.Twilio | null = null;

function getClient(): twilio.Twilio | null {
  if (!accountSid || !authToken) {
    return null;
  }
  if (!twilioClient) {
    twilioClient = twilio(accountSid, authToken);
  }
  return twilioClient;
}

/**
 * Check if SMS is configured
 */
export function isSmsConfigured(): boolean {
  return !!(accountSid && authToken && fromNumber);
}

/**
 * Format phone number to E.164 format
 */
export function formatPhoneNumber(phone: string): string | null {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, "");

  // Handle US numbers
  if (digits.length === 10) {
    return `+1${digits}`;
  }

  // Handle numbers with country code
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }

  // Already has country code
  if (digits.length > 10) {
    return `+${digits}`;
  }

  return null;
}

/**
 * Validate phone number format
 */
export function isValidPhoneNumber(phone: string): boolean {
  const formatted = formatPhoneNumber(phone);
  return formatted !== null && formatted.length >= 11;
}

export interface SendSmsResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send an SMS message
 */
export async function sendSms(
  to: string,
  body: string
): Promise<SendSmsResult> {
  const client = getClient();

  if (!client || !fromNumber) {
    return { success: false, error: "SMS not configured" };
  }

  const formattedTo = formatPhoneNumber(to);
  if (!formattedTo) {
    return { success: false, error: "Invalid phone number" };
  }

  try {
    const message = await client.messages.create({
      body,
      from: fromNumber,
      to: formattedTo,
    });

    return {
      success: true,
      messageId: message.sid,
    };
  } catch (error: unknown) {
    const err = error as { message?: string; code?: number };
    console.error("SMS send error:", err.message);

    return {
      success: false,
      error: err.message || "Failed to send SMS",
    };
  }
}

/**
 * Send SMS to multiple recipients
 */
export async function sendBulkSms(
  recipients: Array<{ phone: string; body: string }>
): Promise<{
  sent: number;
  failed: number;
  errors: string[];
}> {
  const results = await Promise.allSettled(
    recipients.map(({ phone, body }) => sendSms(phone, body))
  );

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  results.forEach((result, index) => {
    if (result.status === "fulfilled" && result.value.success) {
      sent++;
    } else {
      failed++;
      const errorMsg =
        result.status === "fulfilled"
          ? result.value.error
          : result.reason?.message;
      errors.push(`${recipients[index].phone}: ${errorMsg}`);
    }
  });

  return { sent, failed, errors };
}

/**
 * Pre-built SMS templates
 */
export const smsTemplates = {
  taskReminder: (taskTitle: string, dueDate: string): string =>
    `RegularUpkeep: "${taskTitle}" is due ${dueDate}. View at app.regularupkeep.com/app/calendar`,

  taskOverdue: (taskTitle: string, propertyName: string): string =>
    `RegularUpkeep: "${taskTitle}" at ${propertyName} is overdue. Complete it now at app.regularupkeep.com/app/calendar`,

  bookingConfirmed: (serviceName: string, date: string, time: string): string =>
    `RegularUpkeep: Your ${serviceName} is confirmed for ${date} at ${time}. Details at app.regularupkeep.com/app/requests`,

  providerArriving: (providerName: string, eta: string): string =>
    `RegularUpkeep: ${providerName} is on the way! ETA: ${eta}`,

  newMessage: (senderName: string): string =>
    `RegularUpkeep: New message from ${senderName}. View at app.regularupkeep.com/app/messages`,

  quoteReceived: (providerName: string, amount: string): string =>
    `RegularUpkeep: ${providerName} quoted ${amount}. Review at app.regularupkeep.com/app/requests`,

  // Provider SMS
  newJobAvailable: (category: string, location: string): string =>
    `RegularUpkeep: New ${category} job in ${location}. View at app.regularupkeep.com/provider/jobs`,

  jobAssigned: (address: string, date: string): string =>
    `RegularUpkeep: Job assigned at ${address} for ${date}. Details at app.regularupkeep.com/provider/jobs`,
};
