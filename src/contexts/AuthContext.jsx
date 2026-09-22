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
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { ref, set, onDisconnect, serverTimestamp as rtdbServerTimestamp, onValue } from 'firebase/database';
import { auth, db, rtdb } from '../firebase';

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
          createdAt: new Date().toISOString()
        }, { merge: true });
      }
    } catch (error) {
      console.error("Error saving user to Firestore (check your Firebase Rules!):", error);
    }
  };

  const updateUserStatus = async (user, status) => {
    if (!user) return;
    try {
      // 1. Write to RTDB (Source of Truth)
      const userStatusRef = ref(rtdb, `/status/${user.uid}`);
      await set(userStatusRef, {
        status: status,
        lastSeen: rtdbServerTimestamp()
      });

      // 2. Write to Firestore as a fallback
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        status: status,
        lastSeen: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      console.error("Error updating user status:", error);
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
      try {
        const myStatusRef = ref(rtdb, `/status/${currentUser.uid}`);
        await onDisconnect(myStatusRef).cancel();
      } catch (e) {
        console.warn("Could not cancel onDisconnect hook", e);
      }
      await updateUserStatus(currentUser, 'offline');
    }
    return signOut(auth);
  };

  useEffect(() => {
    let unsubscribeConnected;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        // Do not await this to avoid race conditions with rapid auth state changes
        saveUserToFirestore(user).catch(e => console.error("Error saving user", e));
        
        // Setup RTDB Presence
        const myStatusRef = ref(rtdb, `/status/${user.uid}`);
        const connectedRef = ref(rtdb, '.info/connected');
        
        unsubscribeConnected = onValue(connectedRef, (snap) => {
          if (snap.val() === true) {
            // We're connected (or reconnected)! Set up the disconnect hook.
            onDisconnect(myStatusRef).set({
              status: 'offline',
              lastSeen: rtdbServerTimestamp()
            }).then(() => {
              // Now that the disconnect hook is set, declare ourselves online/away.
              const currentStatus = document.visibilityState === 'visible' ? 'online' : 'away';
              set(myStatusRef, {
                status: currentStatus,
                lastSeen: rtdbServerTimestamp()
              });
              
              // Keep Firestore roughly in sync for fallback usage
              setDoc(doc(db, 'users', user.uid), {
                status: currentStatus,
                lastSeen: serverTimestamp()
              }, { merge: true }).catch(() => {});
            });
          }
        });
      } else {
        if (unsubscribeConnected) {
          unsubscribeConnected();
          unsubscribeConnected = null;
        }
      }
      
      setCurrentUser(user);
      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeConnected) unsubscribeConnected();
    };
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (currentUser) {
        updateUserStatus(currentUser, document.visibilityState === 'visible' ? 'online' : 'away');
      }
    };

    const handleFocus = () => {
      if (currentUser) {
        updateUserStatus(currentUser, 'online');
      }
    };

    const handleBlur = () => {
      if (currentUser) {
        updateUserStatus(currentUser, 'away');
      }
    };

    const handleBeforeUnload = () => {
      if (currentUser) {
        updateUserStatus(currentUser, 'offline');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
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
