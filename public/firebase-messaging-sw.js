importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBudqrie2HF6JDWEG4eiyoLJAptOqNndnk",
  authDomain: "meetora-39ab0.firebaseapp.com",
  projectId: "meetora-39ab0",
  storageBucket: "meetora-39ab0.firebasestorage.app",
  messagingSenderId: "108142058844",
  appId: "1:108142058844:web:c0dd0f00be7f8a725db599"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);

  // If the caller cancelled the call, dismiss the notification automatically
  if (payload.data && payload.data.type === 'call_cancelled') {
    const callTag = 'call-' + payload.data.callId;
    self.registration.getNotifications({ tag: callTag }).then((notifications) => {
      notifications.forEach(n => n.close());
    });
    return;
  }

  const isCall = payload.data && payload.data.type === 'incoming_call';
  const notificationTitle = payload.notification?.title || (isCall ? 'Incoming Call' : 'New Notification');
  const notificationOptions = {
    body: payload.notification?.body || (isCall ? 'Tap to answer call on Meetora' : ''),
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: isCall ? ('call-' + payload.data.callId) : undefined,
    renotify: true,
    requireInteraction: isCall ? true : false,
    vibrate: isCall ? [500, 250, 500, 250, 500, 250, 500] : [200, 100, 200],
    data: payload.data
  };

  if (isCall) {
    notificationOptions.actions = [
      { action: 'answer', title: 'Answer' },
      { action: 'decline', title: 'Decline' }
    ];
  }

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// When user taps on the notification, focus or open the Meetora app
self.addEventListener('notificationclick', (event) => {
  const action = event.action || 'open';
  const notificationData = event.notification.data || {};
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus().then(() => {
            if (action === 'answer' || action === 'decline') {
              client.postMessage({ type: 'CALL_ACTION', action, callId: notificationData.callId });
            }
          });
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/').then((client) => {
          if (client && (action === 'answer' || action === 'decline')) {
            client.postMessage({ type: 'CALL_ACTION', action, callId: notificationData.callId });
          }
        });
      }
    })
  );
});
