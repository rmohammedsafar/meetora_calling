import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp, updateDoc, arrayUnion } from 'firebase/firestore';
import { getToken, onMessage } from 'firebase/messaging';
import { auth, db, messaging } from '../firebase';

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Helper to save user to Firestore
  const saveUserToFirestore = async (user, additionalData = {}) => {
    if (!user) return;
    
    try {
      const userRef = doc(db, 'users', user.uid);
      const email = user.email || additionalData.email || '';
      const fallbackName = email ? email.split('@')[0] : 'User';
      const displayName = additionalData.displayName || user.displayName || fallbackName;

      const userData = {
        uid: user.uid,
        email: email,
        displayName: displayName,
        photoURL: user.photoURL || additionalData.photoURL || null,
        status: additionalData.status || 'online',
        lastSeen: serverTimestamp(),
        updatedAt: new Date().toISOString()
      };

      await setDoc(userRef, userData, { merge: true });
    } catch (error) {
      console.error("Error saving user to Firestore:", error);
    }
  };

  const registerFCMToken = async (user) => {
    try {
      if (!('Notification' in window)) {
        console.warn("Notifications not supported in this browser.");
        return;
      }
      
      let permission = Notification.permission;
      if (permission === 'default') {
        permission = await Notification.requestPermission();
      }

      if (permission === 'granted' && 'serviceWorker' in navigator) {
        // Ensure the firebase messaging service worker is ready
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        await navigator.serviceWorker.ready;

        const currentToken = await getToken(messaging, { 
          vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
          serviceWorkerRegistration: registration
        });

        if (currentToken) {
          console.log("FCM registration successful. Token acquired:", currentToken.substring(0, 15) + "...");
          const userRef = doc(db, 'users', user.uid);
          await setDoc(userRef, {
            fcmTokens: arrayUnion(currentToken)
          }, { merge: true });
        } else {
          console.warn("No FCM registration token received.");
        }
      } else {
        console.warn("Notification permission status:", permission);
      }
    } catch (error) {
      console.error("Error registering FCM token:", error);
    }
  };

  // Foreground notification handler (when tab is open but not focused)
  useEffect(() => {
    if (!('Notification' in window)) return;

    const unsubscribeOnMessage = onMessage(messaging, (payload) => {
      console.log('[AuthContext] Foreground FCM message received:', payload);

      if (payload.data && payload.data.type === 'call_cancelled') {
        return;
      }

      if (payload.data && payload.data.type === 'incoming_call') {
        if (Notification.permission === 'granted') {
          const title = payload.notification?.title || 'Incoming Voice Call';
          const options = {
            body: payload.notification?.body || 'Someone is calling you on Meetora',
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            tag: 'call-' + payload.data.callId,
            requireInteraction: true,
            renotify: true,
            data: payload.data,
            actions: [
              { action: 'answer', title: 'Answer' },
              { action: 'decline', title: 'Decline' }
            ]
          };
          navigator.serviceWorker.ready.then(reg => reg.showNotification(title, options));
        }
        return;
      }

      // If document is not visible, show desktop notification
      if (document.visibilityState !== 'visible' && Notification.permission === 'granted') {
        const isCall = payload.data && payload.data.type === 'incoming_call';
        const title = payload.notification?.title || (isCall ? 'Incoming Call' : 'New Notification');
        const options = {
          body: payload.notification?.body || (isCall ? 'Tap to answer call on Meetora' : ''),
          icon: '/favicon.ico',
          tag: isCall ? ('call-' + payload.data.callId) : undefined,
          renotify: true,
          requireInteraction: isCall ? true : false,
          data: payload.data
        };

        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.ready.then(reg => {
            reg.showNotification(title, options);
          });
        } else {
          const notif = new Notification(title, options);
          notif.onclick = () => {
            window.focus();
            notif.close();
          };
        }
      }
    });

    return () => {
      unsubscribeOnMessage();
    };
  }, []);

  const updateUserStatus = async (user, status) => {
    if (!user) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        status: status,
        lastSeen: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      console.error("Error updating user status in Firestore:", error);
    }
  };

  // Sign Up
  const signup = async (email, password, fullName) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    // Update profile with full name
    await updateProfile(userCredential.user, {
      displayName: fullName
    });
    // Save to Firestore
    await saveUserToFirestore(userCredential.user, { displayName: fullName });
    return userCredential;
  };

  // Log In
  const login = (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  // Google Login
  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    await saveUserToFirestore(result.user);
    return result;
  };

  // Log Out
  const logout = async () => {
    if (currentUser) {
      await updateUserStatus(currentUser, 'offline');
    }
    return signOut(auth);
  };

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        saveUserToFirestore(user).catch(e => console.error("Error saving user", e));
        registerFCMToken(user);
        
        // Set initial presence status in Firestore
        const currentStatus = document.visibilityState === 'visible' ? 'online' : 'away';
        updateUserStatus(user, currentStatus);
      }
      
      setCurrentUser(user);
      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
    };
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    const handleVisibilityChange = () => {
      const isVisible = document.visibilityState === 'visible';
      updateUserStatus(currentUser, isVisible ? 'online' : 'away');
    };

    const handlePageHide = () => {
      updateUserStatus(currentUser, 'away');
    };

    const handlePageShow = () => {
      const isVisible = document.visibilityState === 'visible';
      updateUserStatus(currentUser, isVisible ? 'online' : 'away');
    };

    const handleBeforeUnload = () => {
      updateUserStatus(currentUser, 'offline');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('pageshow', handlePageShow);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [currentUser]);

  const value = {
    currentUser,
    signup,
    login,
    loginWithGoogle,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
