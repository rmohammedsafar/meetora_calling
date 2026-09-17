import React, { createContext, useContext, useState, useEffect } from 'react';
import { VactClient } from '@firstlogicmetalab/client';
import { useAuth } from './AuthContext';
import { playIncomingRingtone, playOutgoingRingtone, stopRingtone } from '../utils/ringtone';

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

        // Track ringing calls globally
        client.onIncomingCalls((calls) => {
          if (activeCallRef.current && calls.length > 0) {
            // User is on another call; auto-decline new incoming calls
            calls.forEach(incoming => {
              incoming.decline().catch(console.error);
            });
          } else {
            setIncomingCalls([...calls]);
            if (calls.length > 0) {
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

  const handleCallDisconnect = (call) => {
    if (call) {
      setCallState(call.state);
      call.onState = (state) => {
        setCallState(state);
        if (state === 'connected' || state === 'ended' || state === 'failed') {
          stopRingtone();
        }
        if (state === 'ended' || state === 'failed') {
          setActiveCall(null);
          setCallState('idle');
        }
      };
    }
  };

  // Helper to place a call
  const placeCall = async (targetUserId, options = { video: true }) => {
    if (!vact) throw new Error('VACT client not initialized');

    try {
      const call = await vact.call(targetUserId, options);
      playOutgoingRingtone();
      handleCallDisconnect(call);
      setActiveCall(call);
      return call;
    } catch (error) {
      console.error('Call failed:', error);
      throw error;
    }
  };

  // Helper to accept a call
  const acceptCall = async (incomingCall) => {
    stopRingtone();
    try {
      const call = await incomingCall.accept({ video: true, audio: true });
      handleCallDisconnect(call);
      setActiveCall(call);
      return call;
    } catch (error) {
      console.error('Failed to accept call:', error);
      throw error;
    }
  };

  // Helper to decline a call
  const declineCall = async (incomingCall) => {
    stopRingtone();
    try {
      await incomingCall.decline();
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
