/**
 * Push Notification Library
 *
 * Server-side utilities for sending web push notifications.
 */

import webpush from 'web-push';

// Configure VAPID keys
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(
    'mailto:info@regularupkeep.com',
    vapidPublicKey,
    vapidPrivateKey
  );
}

export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  notificationId?: string;
  actions?: Array<{ action: string; title: string }>;
  requireInteraction?: boolean;
  renotify?: boolean;
}

/**
 * Check if push notifications are configured
 */
export function isPushConfigured(): boolean {
  return !!(vapidPublicKey && vapidPrivateKey);
}

/**
 * Send a push notification to a subscription
 */
export async function sendPushNotification(
  subscription: PushSubscription,
  payload: PushPayload
): Promise<{ success: boolean; error?: string }> {
  if (!isPushConfigured()) {
    return { success: false, error: 'Push notifications not configured' };
  }

  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: subscription.keys,
      },
      JSON.stringify(payload)
    );

    return { success: true };
  } catch (error: unknown) {
    const err = error as { statusCode?: number; message?: string };

    // Handle expired/invalid subscriptions
    if (err.statusCode === 410 || err.statusCode === 404) {
      return { success: false, error: 'subscription_expired' };
    }

    console.error('Push notification error:', err.message);
    return { success: false, error: err.message || 'Unknown error' };
  }
}

/**
 * Send push notifications to multiple subscriptions
 */
export async function sendPushNotifications(
  subscriptions: PushSubscription[],
  payload: PushPayload
): Promise<{
  sent: number;
  failed: number;
  expired: string[];
}> {
  const results = await Promise.allSettled(
    subscriptions.map((sub) => sendPushNotification(sub, payload))
  );

  let sent = 0;
  let failed = 0;
  const expired: string[] = [];

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      if (result.value.success) {
        sent++;
      } else {
        failed++;
        if (result.value.error === 'subscription_expired') {
          expired.push(subscriptions[index].endpoint);
        }
      }
    } else {
      failed++;
    }
  });

  return { sent, failed, expired };
}

/**
 * Create notification payloads for different notification types
 */
export const notificationPayloads = {
  taskDue: (taskTitle: string, propertyName: string, taskId: string): PushPayload => ({
    title: 'Maintenance Task Due',
    body: `${taskTitle} is due at ${propertyName}`,
    url: `/app/calendar?task=${taskId}`,
    tag: `task-${taskId}`,
    actions: [
      { action: 'view', title: 'View Task' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  }),

  taskOverdue: (taskTitle: string, propertyName: string, taskId: string): PushPayload => ({
    title: 'Overdue Maintenance Task',
    body: `${taskTitle} at ${propertyName} is overdue`,
    url: `/app/calendar?task=${taskId}`,
    tag: `task-overdue-${taskId}`,
    requireInteraction: true,
    actions: [
      { action: 'view', title: 'View Task' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  }),

  bookingConfirmed: (serviceName: string, date: string, bookingId: string): PushPayload => ({
    title: 'Booking Confirmed',
    body: `Your ${serviceName} is confirmed for ${date}`,
    url: `/app/requests/${bookingId}`,
    tag: `booking-${bookingId}`,
  }),

  providerArriving: (providerName: string, eta: string, bookingId: string): PushPayload => ({
    title: 'Provider On The Way',
    body: `${providerName} is arriving in ${eta}`,
    url: `/app/requests/${bookingId}`,
    tag: `arrival-${bookingId}`,
    requireInteraction: true,
  }),

  newMessage: (senderName: string, preview: string, threadId: string): PushPayload => ({
    title: `Message from ${senderName}`,
    body: preview.length > 100 ? preview.substring(0, 97) + '...' : preview,
    url: `/app/messages/${threadId}`,
    tag: `message-${threadId}`,
    renotify: true,
  }),

  quoteReceived: (providerName: string, amount: string, requestId: string): PushPayload => ({
    title: 'New Quote Received',
    body: `${providerName} quoted ${amount} for your service request`,
    url: `/app/requests/${requestId}`,
    tag: `quote-${requestId}`,
  }),

  // Provider notifications
  newJob: (customerName: string, category: string, jobId: string): PushPayload => ({
    title: 'New Job Available',
    body: `${customerName} needs ${category} service`,
    url: `/provider/jobs/${jobId}`,
    tag: `job-${jobId}`,
    requireInteraction: true,
    actions: [
      { action: 'view', title: 'View Job' },
      { action: 'dismiss', title: 'Pass' },
    ],
  }),

  jobAssigned: (address: string, scheduledDate: string, jobId: string): PushPayload => ({
    title: 'Job Assigned',
    body: `New job at ${address} on ${scheduledDate}`,
    url: `/provider/jobs/${jobId}`,
    tag: `assigned-${jobId}`,
  }),
};
