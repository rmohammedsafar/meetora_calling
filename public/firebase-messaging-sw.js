importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// We need to initialize the app in the service worker with the config
// However, since we don't have access to process.env here easily without a bundler plugin,
// we have to rely on a dynamic approach or hardcode it. 
// A typical workaround is to pass the config or generate this file dynamically.
// For now, you will need to replace these with your actual config values manually
// or inject them during your build process.

firebase.initializeApp({
  apiKey: "AIzaSyBudqrie2HF6JDWEG4eiyoLJAptOqNndnk", // From your .env
  authDomain: "meetora-39ab0.firebaseapp.com",
  projectId: "meetora-39ab0",
  storageBucket: "meetora-39ab0.firebasestorage.app",
  messagingSenderId: "108142058844",
  appId: "1:108142058844:web:c0dd0f00be7f8a725db599"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/favicon.ico',
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
