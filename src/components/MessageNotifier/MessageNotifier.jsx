import React, { useEffect, useRef } from 'react';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';

const MessageNotifier = () => {
  const { currentUser } = useAuth();
  const initialLoadDone = useRef(false);
  const processedMessageIds = useRef(new Set());

  useEffect(() => {
    if (!currentUser) return;

    // Check if notifications are supported and allowed
    if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }

    const messagesRef = collection(db, 'messages');
    // Only listen to messages where the current user is a participant
    const q = query(
      messagesRef,
      where('participants', 'array-contains', currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!initialLoadDone.current) {
        // First snapshot contains all existing matching docs. Skip them.
        initialLoadDone.current = true;
        snapshot.docs.forEach(doc => processedMessageIds.current.add(doc.id));
        return;
      }

      snapshot.docChanges().forEach(async (change) => {
        if (change.type === 'added') {
          const messageId = change.doc.id;
          const data = change.doc.data();

          // Don't notify if we already processed this message or if we sent it
          if (processedMessageIds.current.has(messageId) || data.senderId === currentUser.uid) {
            return;
          }
          processedMessageIds.current.add(messageId);

          // Only notify for actual text messages (not call_log)
          if (data.type === 'text') {
            // Check if tab is hidden
            if (document.visibilityState !== 'visible' && 'Notification' in window && Notification.permission === 'granted') {
              
              // Fetch sender's name
              let senderName = 'Someone';
              try {
                const userSnap = await getDoc(doc(db, 'users', data.senderId));
                if (userSnap.exists()) {
                  senderName = userSnap.data().displayName || 'Someone';
                }
              } catch (e) {
                console.warn('Could not fetch sender name', e);
              }

              // Use Service Worker if available for the action click
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.ready.then(registration => {
                  registration.showNotification(`New Message from ${senderName}`, {
                    body: data.text,
                    icon: '/favicon.ico',
                    tag: 'msg-' + data.senderId,
                    renotify: true, // Forces the notification to pop up again even if the tag is the same
                    data: { type: 'message' } // Pass data to identify this as a message notification in sw.js
                  });
                });
              } else {
                // Fallback for browsers without SW support
                const notification = new Notification(`New Message from ${senderName}`, {
                  body: data.text,
                  icon: '/favicon.ico',
                  tag: 'msg-' + data.senderId,
                  renotify: true // Forces the notification to pop up again
                });
                notification.onclick = () => {
                  window.focus();
                  notification.close();
                };
              }
            }
          }
        }
      });
    });

    return () => unsubscribe();
  }, [currentUser]);

  return null; // Headless component
};

export default MessageNotifier;
