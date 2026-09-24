// Capture before routing or effects can remove the notification deep link.
const params = new URLSearchParams(window.location.search);
export const notificationIntent = {
  action: params.get('callAction'),
  callId: params.get('callId'),
  expiresAt: Date.now() + 60000,
};

export function isNotificationAnswer(callId) {
  return notificationIntent.action === 'answer' &&
    notificationIntent.callId === callId && Date.now() < notificationIntent.expiresAt;
}
