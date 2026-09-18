export const formatLastSeen = (status, lastSeenTimestamp) => {
  if (status === 'online') {
    return 'Online';
  }

  if (!lastSeenTimestamp) {
    return 'Offline';
  }

  // Convert Firebase Timestamp or ISO string to Date
  let lastSeenDate;
  if (lastSeenTimestamp.toDate) {
    lastSeenDate = lastSeenTimestamp.toDate();
  } else if (typeof lastSeenTimestamp === 'string') {
    lastSeenDate = new Date(lastSeenTimestamp);
  } else {
    lastSeenDate = new Date(lastSeenTimestamp);
  }

  const now = new Date();
  const diffInMs = now - lastSeenDate;
  const diffInMins = Math.floor(diffInMs / 60000);

  if (diffInMins < 1) {
    return 'Last seen just now';
  }
  
  if (diffInMins < 60) {
    return `Last seen ${diffInMins} min${diffInMins > 1 ? 's' : ''} ago`;
  }
  
  const diffInHours = Math.floor(diffInMins / 60);
  if (diffInHours < 24) {
    return `Last seen ${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  }

  // Check if it's yesterday
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (lastSeenDate.getDate() === yesterday.getDate() && 
      lastSeenDate.getMonth() === yesterday.getMonth() && 
      lastSeenDate.getFullYear() === yesterday.getFullYear()) {
    return `Last seen yesterday at ${lastSeenDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }

  // Otherwise return date
  return `Last seen ${lastSeenDate.toLocaleDateString()} at ${lastSeenDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
};
