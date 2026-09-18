self.addEventListener('notificationclick', function(event) {
  const notification = event.notification;
  const action = event.action;

  notification.close();

  // Find the open client window and send a message, then focus it
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      if (clientList.length > 0) {
        let client = clientList[0];
        // Focus the first available client
        client.focus();
        
        // Send the action message to the client if it's a call
        if (notification.data && notification.data.type === 'message') {
          // If it's a message notification, navigate to messages page
          if ('navigate' in client) {
            client.navigate('/app/messages');
          }
        } else {
          // It's a call notification
          if (action) {
            client.postMessage({ type: 'CALL_ACTION', action: action });
          } else {
            // Default click (body click) - just focus
            client.postMessage({ type: 'CALL_ACTION', action: 'focus' });
          }
        }
      } else if (notification.data && notification.data.type === 'message') {
        // If no client is open, open a new window to the messages page
        clients.openWindow('/app/messages');
      }
    })
  );
});
