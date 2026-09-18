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
        
        // Send the action message to the client
        if (action) {
          client.postMessage({ type: 'CALL_ACTION', action: action });
        } else {
          // Default click (body click) - just focus, maybe answer by default or do nothing
          client.postMessage({ type: 'CALL_ACTION', action: 'focus' });
        }
      }
    })
  );
});
