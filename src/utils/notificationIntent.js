// Capture before routing or effects can remove the notification deep link.
const params = new URLSearchParams(window.location.search);
export const notificationIntent = {
  action: params.get('callAction'),
  callId: params.get('callId'),
  expiresAt: Date.now() + 60000,
};

export async function loadNotificationIntent() {
  try {
    const cache = await caches.open('meetora-call-action');
    const response = await cache.match('/__call-action');
    const pending = response && await response.json();
    if (pending?.callId && pending.expiresAt > Date.now() &&
        ['answer', 'decline'].includes(pending.action)) {
      Object.assign(notificationIntent, pending);
    }
  } catch (error) {
    console.warn('Could not restore notification action:', error.name);
  }
  return notificationIntent;
}

export function isNotificationAnswer(callId) {
  return notificationIntent.action === 'answer' &&
    notificationIntent.callId === callId && Date.now() < notificationIntent.expiresAt;
}
