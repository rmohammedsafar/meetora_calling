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

          if (activeCallRef.current && uniqueCalls.length > 0) {
            // User is on another call; auto-decline new incoming calls
            uniqueCalls.forEach(incoming => {
              incoming.decline().catch(console.error);
              addHandledCallId(incoming.id);

              // Tell the caller we are busy
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
            });
          } else {
            setIncomingCalls([...uniqueCalls]);
            if (uniqueCalls.length > 0) {
              playIncomingRingtone();
            } else {
              stopRingtone();
            }
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
  const placeCall = async (targetUserId, options = { video: true }) => {
    if (!vact) throw new Error('VACT client not initialized');
    if (activeCallRef.current || isTransitioningRef.current) {
      throw new Error('Already on a call or transitioning');
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
