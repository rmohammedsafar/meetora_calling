import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { VactClient } from '../utils/vactClient';
import { isNotificationAnswer, loadNotificationIntent } from '../utils/notificationIntent';
import { useAuth } from './AuthContext';
import { playIncomingRingtone, playOutgoingRingtone, stopRingtone } from '../utils/ringtone';
import { doc, setDoc, serverTimestamp, addDoc, collection, onSnapshot, getDoc, getDocFromServer, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

const CallContext = createContext();

export const useCall = () => {
  return useContext(CallContext);
};

export const CallProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const [vact, setVact] = useState(null);
  const [activeCall, setActiveCall] = useState(null);
  const activeCallRef = React.useRef(null);

  // Keep ref in sync with state for use inside closures
  useEffect(() => {
    activeCallRef.current = activeCall;
  }, [activeCall]);
  const [incomingCalls, setIncomingCalls] = useState([]);
  const incomingCallsRef = useRef([]);
  const setIncomingCallsWithRef = (calls) => {
    incomingCallsRef.current = typeof calls === 'function' ? calls(incomingCallsRef.current) : calls;
    setIncomingCalls(calls);
  };
  const [isVactConnected, setIsVactConnected] = useState(false);
  const isTransitioningRef = useRef(false);

  // Load handled calls from localStorage to survive page reloads
  const handledCallStorageKey = 'meetora:handled-call-ids';
  const getHandledCallIds = () => {
    try {
      return new Set(JSON.parse(localStorage.getItem(handledCallStorageKey) || '[]'));
    } catch {
      return new Set();
    }
  };
  const addHandledCallId = (id) => {
    const ids = getHandledCallIds();
    ids.add(id);
    // Keep only the most recent 50 to avoid infinite growth
    const idsArray = [...ids].slice(-50);
    localStorage.setItem(handledCallStorageKey, JSON.stringify(idsArray));
  };
  const hasHandledCall = (id) => getHandledCallIds().has(id);
  const setUserCallStatus = (status) => {
    if (!currentUser) return;
    setDoc(doc(db, 'users', currentUser.uid), { callStatus: status }, { merge: true }).catch(() => {});
  };

  useEffect(() => {
    let isCancelled = false;
    let client = null;
    const onNotificationAction = async (event) => {
      if (event.data?.type !== 'CALL_ACTION') return;
      await loadNotificationIntent();
      if (!isCancelled) client?.emitIncoming();
    };
    navigator.serviceWorker?.addEventListener('message', onNotificationAction);

    // Only connect if we have a logged-in user
    if (!currentUser) {
      navigator.serviceWorker?.removeEventListener('message', onNotificationAction);
      if (vact) {
        if (typeof vact.disconnect === 'function') vact.disconnect();
        setIsVactConnected(false);
      }
      return;
    }

    const initVact = async () => {
      try {
        // Hardcoded for testing to bypass Vite caching issues
        const appId = 'vact_app_12c938ca7ac6f7708669a1f9';
        if (!appId) {
          console.warn('VITE_VACT_APP_ID is missing from .env');
          return;
        }

        client = new VactClient(appId);
        const sessionStartedAt = Date.now();
        // Firestore timestamp/status validation below handles stale VACT
        // events, so new calls do not need to wait through a startup timer.

        // Track ringing calls globally
        client.onIncomingCalls((calls) => {
          // Cleanup can run while token exchange or event polling is pending.
          // An obsolete client must never clear the current client's popup.
          if (isCancelled) return;
          const validIncoming = (calls || []).filter(c =>
            c &&
            c.fromUserId !== currentUser.uid &&
            !hasHandledCall(c.id)
          );

          // VACT replays every call that was already ringing when this
          // session connects. Keep those calls out of the UI; they belong to
          // the previous page session and are ghost calls after a reload.
          if (validIncoming.length === 0) {
            if (incomingCallsRef.current.length > 0) {
              console.log("No active incoming calls. Stopping ringtone.");
              setIncomingCallsWithRef([]);
              stopRingtone();
            }
            return;
          }

          // If we are already on a call or currently placing one, auto-decline
          // incoming calls as busy. The transition check closes the race
          // before React updates activeCallRef after vact.call().
          if (activeCallRef.current || isTransitioningRef.current) {
            validIncoming.forEach(incoming => {
              addHandledCallId(incoming.id);
              incoming.decline().catch(console.error);
              const type = incoming.video ? 'video' : 'audio';
              const threadId = [currentUser.uid, incoming.fromUserId].sort().join('_');
              setDoc(doc(db, 'call_logs', incoming.id), {
                callerId: incoming.fromUserId,
                calleeId: currentUser.uid,
                status: 'busy',
                type,
                durationSeconds: 0,
                timestamp: serverTimestamp(),
              }, { merge: true }).catch(console.error);
            });
            return;
          }

          // Pick the first incoming call and ring immediately
          const incomingToRing = validIncoming[0];

          // VACT may emit the same ringing set repeatedly while the call is
          // waiting. Keep the existing popup and ringtone for that same ID.
          if (incomingCallsRef.current[0]?.id === incomingToRing.id) {
            return;
          }

          // VACT can deliver an old event after the startup quarantine. Use
          // the Firestore call timestamp as a second server-side age check
          // before showing the in-page popup.
          const verifyAndShowIncoming = async () => {
            try {
              await loadNotificationIntent();
              let callSnap = await getDocFromServer(doc(db, 'calls', incomingToRing.id));
              // The caller writes Firestore immediately after VACT creates the
              // call. Allow a short propagation window, but never show an
              // incoming call with no verified Firestore record.
              for (let attempt = 0; attempt < 5 && !callSnap.exists(); attempt += 1) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                callSnap = await getDocFromServer(doc(db, 'calls', incomingToRing.id));
              }
              if (isCancelled || hasHandledCall(incomingToRing.id)) return;
              const data = callSnap.exists() ? callSnap.data() : null;
              const createdAt = data?.createdAt;
              const isStale = createdAt?.toMillis && createdAt.toMillis() < sessionStartedAt &&
                !isNotificationAnswer(incomingToRing.id);
              const wrongRecipient = data?.calleeId !== currentUser.uid;
              if (!data || data.status !== 'ringing' || isStale || wrongRecipient) {
                // Hiding a replay is a local decision, not a user decline.
                // The notification action may still be arriving on resume.
                console.info('Incoming call withheld', incomingToRing.id, {
                  status: data?.status, isStale, wrongRecipient,
                });
                return;
              }
              console.log("Ringing incoming call from:", incomingToRing.fromUserId, "ID:", incomingToRing.id);
              // Keep simultaneous calls available for notification actions;
              // the UI still presents the first one.
              if (activeCallRef.current || isTransitioningRef.current ||
                  !client.incoming.has(incomingToRing.id)) return;
              setIncomingCallsWithRef([incomingToRing]);
              playIncomingRingtone();
            } catch (error) {
              // Fail closed: an unverified event must never become a ghost
              // popup. The caller can place a fresh call if needed.
              console.warn('Incoming call verification unavailable:', error.code || error.name);
            }
          };
          verifyAndShowIncoming();
        });

        // Get an access token from our custom backend
        // In a real app, you would pass an auth token (like Firebase ID token) to secure this endpoint
        const response = await fetch('https://meetora-calling.onrender.com/api/vact-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId: currentUser.uid })
        });

        if (!response.ok) {
          throw new Error('Backend failed to generate token (Status ' + response.status + ')');
        }

        const data = await response.json();
        const accessToken = data.accessToken;

        if (isCancelled) return;

        console.log("Attempting to connect to VACT with App ID:", appId, "and token:", accessToken);

        try {
          await client.connect(accessToken);
        } catch (connErr) {
          throw new Error('connect() failed! AppID: ' + appId + ' | Token: ' + accessToken + ' | Reason: ' + connErr.message);
        }

        // The VACT session is connected now. Do not make the UI wait for the
        // separate startup-call cleanup window below.
        if (!isCancelled) {
          setVact(client);
          setIsVactConnected(true);
          console.log('Successfully connected to VACT as', currentUser.uid);
        }

        // Handle token expiration automatically
        client.onSessionExpired = async () => {
          console.log("VACT session expired, fetching new token...");
          try {
            const res = await fetch('https://meetora-calling.onrender.com/api/vact-token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: currentUser.uid })
            });
            if (res.ok) {
              const d = await res.json();
              await client.renew(d.accessToken);
              console.log("Token renewed successfully!");
            }
          } catch (e) {
            console.error("Failed to renew token", e);
          }
        };

        if (isCancelled) {
          client.disconnect();
        }

      } catch (error) {
        console.error('Failed to initialize VACT client:', error);
        alert('VACT Init Error: ' + error.message);
      }
    };

    initVact();

    return () => {
      isCancelled = true;
      navigator.serviceWorker?.removeEventListener('message', onNotificationAction);
      if (client && typeof client.disconnect === 'function') {
        client.disconnect();
      }
    };
  }, [currentUser]);

  const [callState, setCallState] = useState('idle');
  const callStartTimes = useRef({});

  const writeCallLog = async (call, status, duration = 0) => {
    try {
      const callerId = call.isCaller ? currentUser.uid : call.otherUserId;
      const calleeId = call.isCaller ? call.otherUserId : currentUser.uid;
      const hasLocalVideo = call.localStream?.getVideoTracks().length > 0;
      const hasRemoteVideo = call.remoteStream?.getVideoTracks().length > 0;
      const type = (hasLocalVideo || hasRemoteVideo) ? 'video' : 'audio';

      const logRef = doc(db, 'call_logs', call.id);
      await setDoc(logRef, {
        callerId,
        calleeId,
        status, 
        type,
        durationSeconds: duration,
        timestamp: serverTimestamp(),
      }, { merge: true });

      // If we are the caller (to prevent duplicate messages), write to chat history
      // Wait, if caller is offline, maybe it doesn't get written? For simplicity, we just have the caller write it if it's completed or missed timeout.
      // Actually, if we just let the caller write the chat log, it won't duplicate.
      if (call.isCaller) {
        const threadId = [callerId, calleeId].sort().join('_');
        await addDoc(collection(db, 'messages'), {
          threadId,
          participants: [callerId, calleeId],
          type: 'call_log',
          status,
          callType: type,
          durationSeconds: duration,
          senderId: callerId,
          timestamp: serverTimestamp(),
        });
      }
    } catch (e) {
      console.error('Failed to write call log', e);
    }
  };

  const handleCallDisconnect = (call) => {
    if (call) {
      setCallState(call.state);
      
      let unsubscribeBusyListener = null;
      let wasBusy = false;
      let rtcDisconnectTimer = null;
      let hasConnected = false;
      
      // Monitor WebRTC native connection state for fast drop on ungraceful exits
      // We only arm this AFTER the call has successfully connected to avoid breaking slow setups
      if (call.pc) {
        call.pc.addEventListener('iceconnectionstatechange', () => {
          console.log('[WebRTC Debug] iceConnectionState changed to:', call.pc.iceConnectionState);
        });
        
        call.pc.addEventListener('connectionstatechange', () => {
          console.log('[WebRTC Debug] connectionState changed to:', call.pc.connectionState);
          
          if (call.pc.connectionState === 'connected') {
            hasConnected = true;
            if (rtcDisconnectTimer) {
              console.log('Peer recovered connection!');
              clearTimeout(rtcDisconnectTimer);
              rtcDisconnectTimer = null;
            }
          } else if (hasConnected && call.pc.connectionState === 'disconnected') {
            console.warn('Peer disconnected. Waiting 5s for recovery...');
            rtcDisconnectTimer = setTimeout(() => {
              if (call.pc && call.pc.connectionState !== 'connected') {
                console.error('Peer did not recover. Dropping call.');
                if (typeof call.end === 'function') call.end();
                setCallState('failed');
                if (activeCallRef.current?.id === call.id) {
                  setActiveCall(null);
                }
              }
            }, 5000);
          }
        });
      }
      
      if (call.isCaller) {
        // Listen to see if the callee marks the call as "busy"
        unsubscribeBusyListener = onSnapshot(doc(db, 'call_logs', call.id), (docSnap) => {
          if (docSnap.exists() && docSnap.data().status === 'busy') {
            wasBusy = true;
            alert('The person you called is currently busy on another call.');
            if (unsubscribeBusyListener) {
              unsubscribeBusyListener();
              unsubscribeBusyListener = null;
            }
          }
        });
      }

      call.onState = (state) => {
        setCallState(state);
        
        if (state === 'connected') {
          if (unsubscribeBusyListener) {
            unsubscribeBusyListener();
            unsubscribeBusyListener = null;
          }
          stopRingtone();
          
          // Only set start time if it doesn't exist to prevent resetting on network reconnects
          if (!callStartTimes.current[call.id]) {
            callStartTimes.current[call.id] = Date.now();
          }
        }
        
        if (state === 'ended' || state === 'failed') {
          if (unsubscribeBusyListener) {
            unsubscribeBusyListener();
            unsubscribeBusyListener = null;
          }
          stopRingtone();
          
          
          let status = wasBusy ? 'busy' : 'missed';
          let duration = 0;
          
          if (callStartTimes.current[call.id]) {
            status = 'completed';
            duration = Math.floor((Date.now() - callStartTimes.current[call.id]) / 1000);
            delete callStartTimes.current[call.id];
          }
          
          // Write log for caller and callee
          writeCallLog(call, status, duration);

          // Mark call as ended in calls collection
          updateDoc(doc(db, 'calls', call.id), {
            status: 'ended',
            endedAt: serverTimestamp()
          }).catch(() => {});

      setActiveCall(null);
      setCallState('idle');
      localStorage.removeItem('meetora:call-busy');
      setUserCallStatus('available');
    }
      };
    }
  };

  // Helper to place a call
  const placeCall = async (targetUserId, options = { video: true, isReconnect: false }) => {
    if (!vact) throw new Error('VACT client not initialized');
    if (activeCallRef.current || isTransitioningRef.current) {
      throw new Error('Already on a call or transitioning');
    }


    // Auto-decline pending incoming calls if the user decides to place a new call instead of answering
    if (incomingCalls.length > 0) {
      incomingCalls.forEach(c => {
        c.decline().catch(console.error);
        addHandledCallId(c.id);
      });
      setIncomingCallsWithRef([]);
      stopRingtone();
    }

    isTransitioningRef.current = true;
    localStorage.setItem('meetora:call-busy', 'true');
    setUserCallStatus('busy');
    let callStarted = false;
    try {
      const call = await vact.call(targetUserId, options);
      callStarted = true;
      
      // Save active call in Firestore: triggers FCM push and enables instant cancellation sync
      setDoc(doc(db, 'calls', call.id), {
        callId: call.id,
        callerId: currentUser.uid,
        callerName: currentUser.displayName || 'Someone',
        calleeId: targetUserId,
        type: options.video ? 'video' : 'audio',
        status: 'ringing',
        createdAt: serverTimestamp()
      }).catch(err => console.warn('Failed to write call doc to Firestore', err));

      playOutgoingRingtone();
      handleCallDisconnect(call);
      setActiveCall(call);
      return call;
    } catch (error) {
      console.error('Call failed:', error);
      throw error;
    } finally {
      isTransitioningRef.current = false;
      if (!callStarted) {
        localStorage.removeItem('meetora:call-busy');
        setUserCallStatus('available');
      }
    }
  };

  // Helper to accept a call
  const acceptCall = async (incomingCall) => {
    if (isTransitioningRef.current) return;
    isTransitioningRef.current = true;
    // Mark it before the asynchronous SDK accept so a repeated event cannot
    // put the same ringing call back into the popup during the transition.
    addHandledCallId(incomingCall.id);
    stopRingtone();
    setIncomingCallsWithRef(prev => prev.filter(c => c.id !== incomingCall.id));
    try {
      const call = await incomingCall.accept({ video: incomingCall.video, audio: true });
      
      updateDoc(doc(db, 'calls', incomingCall.id), {
        status: 'connected',
        connectedAt: serverTimestamp()
      }).catch(() => {});

      // Auto-decline any other ghost calls to prevent them popping up later
      incomingCalls.forEach(c => {
        if (c.id !== incomingCall.id) {
          c.decline().catch(e => console.warn('Ghost decline failed', e));
          addHandledCallId(c.id);
        }
      });
      handleCallDisconnect(call);
      setActiveCall(call);
      localStorage.setItem('meetora:call-busy', 'true');
      setUserCallStatus('busy');
      return call;
    } catch (error) {
      console.error('Failed to accept call:', error);
      throw error;
    } finally {
      isTransitioningRef.current = false;
    }
  };

  // Helper to decline a call
  const declineCall = async (incomingCall) => {
    addHandledCallId(incomingCall.id);
    stopRingtone();
    try {
      await incomingCall.decline();

      updateDoc(doc(db, 'calls', incomingCall.id), {
        status: 'declined',
        declinedAt: serverTimestamp()
      }).catch(() => {});
      
      // Write explicitly declined log
      const logRef = doc(db, 'call_logs', incomingCall.id);
      await setDoc(logRef, {
        callerId: incomingCall.fromUserId,
        calleeId: currentUser.uid,
        status: 'declined',
        type: incomingCall.video ? 'video' : 'audio',
        durationSeconds: 0,
        timestamp: serverTimestamp(),
      }, { merge: true });

      // Callee writes the declined message log since they initiated the decline
      const threadId = [currentUser.uid, incomingCall.fromUserId].sort().join('_');
      await addDoc(collection(db, 'messages'), {
        threadId,
        participants: [currentUser.uid, incomingCall.fromUserId],
        type: 'call_log',
        status: 'declined',
        callType: incomingCall.video ? 'video' : 'audio',
        durationSeconds: 0,
        senderId: incomingCall.fromUserId, // Consider the caller as the sender for missed/declined calls UI
        timestamp: serverTimestamp(),
      });
      
      // Auto-decline any other duplicate ghost calls from the same person
      incomingCalls.forEach(c => {
        if (c.id !== incomingCall.id && c.fromUserId === incomingCall.fromUserId) {
          c.decline().catch(e => console.warn('Ghost decline failed', e));
          addHandledCallId(c.id);
        }
      });
      setIncomingCallsWithRef(prev => prev.filter(c => c.id !== incomingCall.id));
    } catch (error) {
      console.error('Failed to decline call:', error);
    }
  };

  // Helper to end active call
  const endCall = () => {
    stopRingtone();
    if (activeCall) {
      if (activeCall.id) {
        updateDoc(doc(db, 'calls', activeCall.id), {
          status: 'ended',
          endedAt: serverTimestamp()
        }).catch(() => {});
      }

      // The VACT SDK requires cancel() if giving up before the call connects, and end() otherwise.
      if (activeCall.state === 'ringing' || activeCall.state === 'connecting') {
        if (typeof activeCall.cancel === 'function') {
          activeCall.cancel();
        } else if (typeof activeCall.end === 'function') {
          activeCall.end();
        }
      } else {
        if (typeof activeCall.end === 'function') {
          activeCall.end();
        }
      }
          setActiveCall(null);
          setCallState('idle');
          localStorage.removeItem('meetora:call-busy');
          setUserCallStatus('available');
    }
  };

  // Live listener to auto-stop ringtone if caller cancels/ends call in Firestore
  useEffect(() => {
    if (incomingCalls.length === 0) return;
    const currentCall = incomingCalls[0];
    const unsubscribe = onSnapshot(doc(db, 'calls', currentCall.id), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.status === 'ended' || data.status === 'cancelled' || data.status === 'declined') {
          console.log(`Caller marked call as ${data.status} in Firestore. Stopping ringtone.`);
          addHandledCallId(currentCall.id);
          if (typeof currentCall.decline === 'function') {
            currentCall.decline().catch(() => {});
          }
          setIncomingCallsWithRef([]);
          stopRingtone();
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [incomingCalls]);

  // Keep the caller in sync when the callee declines or disconnects before
  // WebRTC reaches connected. This covers delayed/missed VACT end events.
  useEffect(() => {
    if (!activeCall?.isCaller || !activeCall.id) return undefined;

    const unsubscribe = onSnapshot(doc(db, 'calls', activeCall.id), (snap) => {
      if (!snap.exists()) return;
      const status = snap.data().status;
      if (status !== 'declined' && status !== 'cancelled' && status !== 'ended') return;

      console.log(`Remote ended call ${activeCall.id} with status ${status}`);
      if (typeof activeCall.shutdown === 'function') activeCall.shutdown();
      stopRingtone();
      setActiveCall(null);
      setCallState('idle');
      localStorage.removeItem('meetora:call-busy');
      setUserCallStatus('available');
    });

    return unsubscribe;
  }, [activeCall]);

  // Handle network disconnects
  useEffect(() => {
    let disconnectTimer = null;
    let offlineSince = null;

    const handleOffline = () => {
      offlineSince = Date.now();
      disconnectTimer = setTimeout(() => {
        if (!navigator.onLine) {
          console.warn('Network offline for 5s. Auto-disconnecting call.');
          if (activeCallRef.current) {
            if (typeof activeCallRef.current.end === 'function') {
              activeCallRef.current.end();
            }
            setActiveCall(null);
            setCallState('idle');
            stopRingtone();
          }
          // Also clear any ringing incoming calls
          setIncomingCallsWithRef([]);
          stopRingtone();
        }
      }, 5000);
    };

    const handleOnline = () => {
      if (disconnectTimer) clearTimeout(disconnectTimer);
      
      // If the network was offline for more than 10 seconds, force a full page reload
      // to ensure all Firebase connections, WebSockets, and VACT states are completely fresh!
      if (offlineSince && (Date.now() - offlineSince > 10000)) {
        console.warn('Network was offline for >10s. Reloading page to reset state...');
        // Small delay to ensure network is actually stable before reloading
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
      offlineSince = null;
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
      if (disconnectTimer) clearTimeout(disconnectTimer);
    };
  }, []);

  // Warn user on reload if active call, and forcefully end it if they proceed
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (activeCallRef.current || isTransitioningRef.current) {
        e.preventDefault();
        e.returnValue = ''; // Shows the browser's "Leave site?" warning
      }
    };

    const handleUnload = () => {
      if (activeCallRef.current) {
        if (typeof activeCallRef.current.end === 'function') {
          // Fire-and-forget: try to tell VACT backend we are hanging up
          activeCallRef.current.end();
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('unload', handleUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('unload', handleUnload);
    };
  }, []);

  const value = {
    vact,
    isVactConnected,
    activeCall,
    callState,
    setActiveCall,
    incomingCalls,
    placeCall,
    acceptCall,
    declineCall,
    endCall
  };

  return (
    <CallContext.Provider value={value}>
      {children}
    </CallContext.Provider>
  );
};
