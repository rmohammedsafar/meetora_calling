import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { VactClient } from '@firstlogicmetalab/client';
import { useAuth } from './AuthContext';
import { playIncomingRingtone, playOutgoingRingtone, stopRingtone } from '../utils/ringtone';
import { doc, setDoc, serverTimestamp, addDoc, collection, onSnapshot, getDoc } from 'firebase/firestore';
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
  const recentDropRef = useRef(null);
  const [pendingReconnect, setPendingReconnect] = useState(null);
  const [pendingAutoAccept, setPendingAutoAccept] = useState(null);

  // Keep ref in sync with state for use inside closures
  useEffect(() => {
    activeCallRef.current = activeCall;
  }, [activeCall]);
  const [incomingCalls, setIncomingCalls] = useState([]);
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

  useEffect(() => {
    let isCancelled = false;
    let client = null;

    // Only connect if we have a logged-in user
    if (!currentUser) {
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
        let isVactReady = false;
        let initialIncomingCalls = [];

        // Track ringing calls globally
        client.onIncomingCalls((calls) => {
          // The SDK can replay calls that were already ringing before this
          // tab connected. Hold the initial feed until connect settles so
          // those calls never reach the incoming-call UI.
          if (!isVactReady) {
            initialIncomingCalls = calls;
            return;
          }

          // Filter out calls we've already handled (accepted/declined) in this or previous sessions
          let newCalls = calls.filter(c => !hasHandledCall(c.id));
          
          // Auto-Accept logic for reconnection
          const now = Date.now();
          if (recentDropRef.current && (now - recentDropRef.current.timestamp) < 15000) {
            const reconnectCall = newCalls.find(c => c.fromUserId === recentDropRef.current.userId);
            if (reconnectCall) {
              console.log("Auto-accepting reconnecting call from", reconnectCall.fromUserId);
              recentDropRef.current = null; // consume it
              setPendingAutoAccept(reconnectCall);
              newCalls = newCalls.filter(c => c.id !== reconnectCall.id);
            }
          }

          // Deduplicate calls from the SAME user (take only the first one, auto-decline the rest)
          const seenUsers = new Set();
          const uniqueCalls = [];
          
          newCalls.forEach(incoming => {
            if (seenUsers.has(incoming.fromUserId)) {
              // This is a duplicate ghost call from the same person! Decline it instantly.
              incoming.decline().catch(console.error);
              addHandledCallId(incoming.id);
            } else {
              seenUsers.add(incoming.fromUserId);
              uniqueCalls.push(incoming);
            }
          });

          let callsToRing = [];
          let callsToDeclineBusy = [];

          if (activeCallRef.current || isTransitioningRef.current) {
            // User is on an active connected call OR currently placing a call, auto-decline ALL new incoming calls
            callsToDeclineBusy = uniqueCalls;
          } else if (uniqueCalls.length > 0) {
            // User is NOT on a connected call, but multiple people might be calling simultaneously.
            // Allow only the FIRST one to ring, instantly decline the rest as busy.
            callsToRing = [uniqueCalls[0]];
            callsToDeclineBusy = uniqueCalls.slice(1);
          }

          if (callsToDeclineBusy.length > 0) {
            callsToDeclineBusy.forEach(incoming => {
              incoming.decline().catch(console.error);
              addHandledCallId(incoming.id);

              // 1. Tell the caller we are busy
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

              addDoc(collection(db, 'messages'), {
                threadId,
                participants: [currentUser.uid, incoming.fromUserId],
                type: 'call_log',
                status: 'busy',
                callType: type,
                durationSeconds: 0,
                senderId: incoming.fromUserId,
                timestamp: serverTimestamp(),
              }).catch(console.error);

              // 2. Notify the receiver (current user) that they missed a call because they were busy
              if ('Notification' in window && Notification.permission === 'granted') {
                const notifyMissed = async () => {
                  let name = 'Someone';
                  try {
                    const snap = await getDoc(doc(db, 'users', incoming.fromUserId));
                    if (snap.exists()) name = snap.data().displayName || name;
                  } catch (e) {}

                  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                    navigator.serviceWorker.ready.then(reg => {
                      reg.showNotification(`Missed Call from ${name}`, {
                        body: `${name} tried to call you while you were busy.`,
                        icon: '/favicon.ico',
                        tag: 'missed-busy-' + incoming.fromUserId,
                        renotify: true
                      });
                    });
                  }
                };
                notifyMissed();
              }
            });
          }

          setIncomingCalls([...callsToRing]);
          if (callsToRing.length > 0) {
            playIncomingRingtone();
          } else {
            stopRingtone();
          }
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

        console.log("Attempting to connect to VACT with App ID:", appId, "and token:", accessToken);

        try {
          await client.connect(accessToken);
        } catch (connErr) {
          throw new Error('connect() failed! AppID: ' + appId + ' | Token: ' + accessToken + ' | Reason: ' + connErr.message);
        }

        // Give VACT's initial event feed time to arrive, then clear all calls
        // that existed before this page session and record them as missed.
        await new Promise(resolve => setTimeout(resolve, 5000));
        const staleIncomingCalls = initialIncomingCalls;
        isVactReady = true;
        initialIncomingCalls = [];
        staleIncomingCalls.forEach((incoming) => {
          addHandledCallId(incoming.id);
          const type = incoming.video ? 'video' : 'audio';
          const threadId = [currentUser.uid, incoming.fromUserId].sort().join('_');
          incoming.decline().catch(error => console.warn('Failed to clear stale call:', error));
          setDoc(doc(db, 'call_logs', incoming.id), {
            callerId: incoming.fromUserId,
            calleeId: currentUser.uid,
            status: 'missed',
            type,
            durationSeconds: 0,
            timestamp: serverTimestamp(),
          }, { merge: true }).catch(error => console.warn('Failed to record missed call:', error));
          addDoc(collection(db, 'messages'), {
            threadId,
            participants: [currentUser.uid, incoming.fromUserId],
            type: 'call_log',
            status: 'missed',
            callType: type,
            durationSeconds: 0,
            senderId: incoming.fromUserId,
            timestamp: serverTimestamp(),
          }).catch(error => console.warn('Failed to record missed message:', error));
        });
        setIncomingCalls([]);
        stopRingtone();

        if (!isCancelled) {
          setVact(client);
          setIsVactConnected(true);
          console.log('Successfully connected to VACT as', currentUser.uid);

          // Check for reconnect
          const reconnectPayload = sessionStorage.getItem('meetora:reconnect_call');
          if (reconnectPayload) {
            sessionStorage.removeItem('meetora:reconnect_call');
            try {
              const data = JSON.parse(reconnectPayload);
              if (Date.now() - data.timestamp < 15000) {
                console.log("Auto-redialing previously active call to", data.targetUserId);
                setPendingReconnect(data);
              }
            } catch(e) {}
          }
        } else {
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
        call.pc.addEventListener('connectionstatechange', () => {
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
          callStartTimes.current[call.id] = Date.now();
        }
        
        if (state === 'ended' || state === 'failed') {
          if (unsubscribeBusyListener) {
            unsubscribeBusyListener();
            unsubscribeBusyListener = null;
          }
          stopRingtone();
          
          recentDropRef.current = {
            userId: call.otherUserId,
            timestamp: Date.now()
          };
          
          let status = wasBusy ? 'busy' : 'missed';
          let duration = 0;
          
          if (callStartTimes.current[call.id]) {
            status = 'completed';
            duration = Math.floor((Date.now() - callStartTimes.current[call.id]) / 1000);
            delete callStartTimes.current[call.id];
          }
          
          // Write log for caller and callee
          writeCallLog(call, status, duration);

          setActiveCall(null);
          setCallState('idle');
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

    // Check if the user is online before placing a fresh call
    if (!options.isReconnect) {
      try {
        const userSnap = await getDoc(doc(db, 'users', targetUserId));
        if (userSnap.exists()) {
          const userData = userSnap.data();
          if (userData.status !== 'online') {
            alert('This user is currently offline.');
            return null;
          }
        }
      } catch (e) {
        console.warn('Failed to check user online status', e);
      }
    }

    // Auto-decline pending incoming calls if the user decides to place a new call instead of answering
    if (incomingCalls.length > 0) {
      incomingCalls.forEach(c => {
        c.decline().catch(console.error);
        addHandledCallId(c.id);
      });
      setIncomingCalls([]);
      stopRingtone();
    }

    isTransitioningRef.current = true;
    try {
      const call = await vact.call(targetUserId, options);
      playOutgoingRingtone();
      handleCallDisconnect(call);
      setActiveCall(call);
      return call;
    } catch (error) {
      console.error('Call failed:', error);
      throw error;
    } finally {
      isTransitioningRef.current = false;
    }
  };

  // Helper to accept a call
  const acceptCall = async (incomingCall) => {
    if (isTransitioningRef.current) return;
    isTransitioningRef.current = true;
    stopRingtone();
    try {
      const call = await incomingCall.accept({ video: incomingCall.video, audio: true });
      
      // Auto-decline any other ghost calls to prevent them popping up later
      incomingCalls.forEach(c => {
        if (c.id !== incomingCall.id) {
          c.decline().catch(e => console.warn('Ghost decline failed', e));
          addHandledCallId(c.id);
        }
      });
      addHandledCallId(incomingCall.id);

      handleCallDisconnect(call);
      setActiveCall(call);
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
    stopRingtone();
    try {
      await incomingCall.decline();
      
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
      addHandledCallId(incomingCall.id);
      
      setIncomingCalls(prev => prev.filter(c => c.id !== incomingCall.id));
    } catch (error) {
      console.error('Failed to decline call:', error);
    }
  };

  // Helper to end active call
  const endCall = () => {
    stopRingtone();
    if (activeCall) {
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
    }
  };

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
          setIncomingCalls([]);
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
        if (activeCallRef.current) {
          const hasLocalVideo = activeCallRef.current.localStream?.getVideoTracks().length > 0;
          const hasRemoteVideo = activeCallRef.current.remoteStream?.getVideoTracks().length > 0;
          sessionStorage.setItem('meetora:reconnect_call', JSON.stringify({
            targetUserId: activeCallRef.current.otherUserId,
            video: hasLocalVideo || hasRemoteVideo,
            timestamp: Date.now()
          }));
        }
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

  useEffect(() => {
    if (vact && isVactConnected && pendingReconnect && !activeCallRef.current && !isTransitioningRef.current) {
      const data = pendingReconnect;
      setPendingReconnect(null);
      placeCall(data.targetUserId, { video: data.video, isReconnect: true }).catch(console.error);
    }
  }, [vact, isVactConnected, pendingReconnect]);

  useEffect(() => {
    if (pendingAutoAccept && !activeCallRef.current && !isTransitioningRef.current) {
      const callToAccept = pendingAutoAccept;
      setPendingAutoAccept(null);
      acceptCall(callToAccept).catch(console.error);
    }
  }, [pendingAutoAccept]);

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
