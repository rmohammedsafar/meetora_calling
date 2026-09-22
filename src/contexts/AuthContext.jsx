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
import { getToken } from 'firebase/messaging';
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
      const userSnap = await getDoc(userRef);

      // Only create/update if not exists or if we want to ensure latest data
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || additionalData.displayName || 'Anonymous',
          photoURL: user.photoURL || null,
          status: 'online',
          lastSeen: serverTimestamp(),
          createdAt: new Date().toISOString()
        }, { merge: true });
      }
    } catch (error) {
      console.error("Error saving user to Firestore (check your Firebase Rules!):", error);
    }
  };

  const registerFCMToken = async (user) => {
    try {
      if (!('Notification' in window)) return;
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const currentToken = await getToken(messaging, { 
          vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY 
        });
        if (currentToken) {
          const userRef = doc(db, 'users', user.uid);
          await updateDoc(userRef, {
            fcmTokens: arrayUnion(currentToken)
          });
        }
      }
    } catch (error) {
      console.error("Error registering FCM token:", error);
    }
  };

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
