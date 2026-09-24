// Register before Firebase so our call actions own their click handling.
self.addEventListener('notificationclick', handleNotificationClick);
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
    return self.registration.getNotifications({ tag: callTag }).then((notifications) => {
      notifications.forEach(n => n.close());
    });
  }

  const isCall = payload.data && payload.data.type === 'incoming_call';
  const notificationTitle = payload.notification?.title || (isCall ? 'Incoming Call' : 'New Notification');
  const notificationOptions = {
    body: payload.notification?.body || (isCall ? 'Tap to answer call on Meetora' : ''),
    icon: '/favicon.svg',
    badge: '/favicon.svg',
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

  // Firebase awaits this promise to keep the push event alive on mobile.
  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// When user taps on the notification, focus or open the Meetora app
function handleNotificationClick(event) {
  const action = event.action || 'open';
  const rawData = event.notification.data || {};
  // Automatically displayed FCM notifications wrap application data.
  const notificationData = rawData.FCM_MSG?.data || rawData;
  if (notificationData.type === 'incoming_call') event.stopImmediatePropagation();
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus().then(async () => {
            if (action === 'answer' || action === 'decline') {
              const message = { type: 'CALL_ACTION', action, callId: notificationData.callId };
              // Mobile Chrome may resume the page after focus. Send once now
              // and once shortly after React has had time to attach its
              // service-worker message listener.
              // Keep the worker alive and retry until the page acknowledges
              // receipt. A suspended mobile tab can take longer than one second.
              for (let attempt = 0; attempt < 10; attempt += 1) {
                const received = await new Promise(resolve => {
                  const channel = new MessageChannel();
                  const finish = value => {
                    clearTimeout(timer);
                    channel.port1.close();
                    resolve(value);
                  };
                  const timer = setTimeout(() => finish(false), 1000);
                  channel.port1.onmessage = () => finish(true);
                  client.postMessage(message, [channel.port2]);
                });
                if (received) break;
              }
            }
          });
        }
      }
      if (clients.openWindow) {
        const actionUrl = (action === 'answer' || action === 'decline')
          ? `/?callAction=${encodeURIComponent(action)}&callId=${encodeURIComponent(notificationData.callId || '')}`
          : '/';
        return clients.openWindow(actionUrl).then((client) => {
          if (client && (action === 'answer' || action === 'decline')) {
            client.postMessage({ type: 'CALL_ACTION', action, callId: notificationData.callId });
          }
        });
      }
    })
  );
}
