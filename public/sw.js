/**
 * Service Worker for RegularUpkeep Push Notifications
 *
 * Handles push notification display and click events.
 */

// Cache version for future updates
const CACHE_VERSION = 'v1';

// Listen for push events
self.addEventListener('push', (event) => {
  if (!event.data) {
    console.log('Push event without data');
    return;
  }

  try {
    const data = event.data.json();

    const options = {
      body: data.body || 'You have a new notification',
      icon: '/brand/regularupkeep-mascot.png',
      badge: '/brand/regularupkeep-mascot.png',
      vibrate: [100, 50, 100],
      data: {
        url: data.url || '/app',
        notificationId: data.notificationId,
      },
      actions: data.actions || [
        { action: 'view', title: 'View' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
      tag: data.tag || 'regularupkeep-notification',
      renotify: data.renotify || false,
      requireInteraction: data.requireInteraction || false,
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'RegularUpkeep', options)
    );
  } catch (error) {
    console.error('Error processing push notification:', error);
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const action = event.action;
  const notificationData = event.notification.data;

  if (action === 'dismiss') {
    return;
  }

  // Open the app or specific URL
  const urlToOpen = notificationData?.url || '/app';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window open
      for (const client of clientList) {
        if (client.url.includes('regularupkeep.com') && 'focus' in client) {
          client.focus();
          if (urlToOpen !== '/app') {
            client.navigate(urlToOpen);
          }
          return;
        }
      }

      // Open new window if none found
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  const notificationData = event.notification.data;

  // Could track analytics here if needed
  console.log('Notification closed:', notificationData?.notificationId);
});

// Service worker install event
self.addEventListener('install', (event) => {
  console.log('Service Worker installing');
  self.skipWaiting();
});

// Service worker activate event
self.addEventListener('activate', (event) => {
  console.log('Service Worker activated');
  event.waitUntil(clients.claim());
});
