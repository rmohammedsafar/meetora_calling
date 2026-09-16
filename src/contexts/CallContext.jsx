import React, { createContext, useContext, useState, useEffect } from 'react';
import { VactClient } from '@firstlogicmetalab/client';
import { useAuth } from './AuthContext';

const CallContext = createContext();

export const useCall = () => {
  return useContext(CallContext);
};

export const CallProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const [vact, setVact] = useState(null);
  const [activeCall, setActiveCall] = useState(null);
  const [incomingCalls, setIncomingCalls] = useState([]);
  const [isVactConnected, setIsVactConnected] = useState(false);

  useEffect(() => {
    // Only connect if we have a logged-in user
    if (!currentUser) {
      if (vact) {
        // Disconnect logic could go here if supported by SDK, or just nullify
        setIsVactConnected(false);
      }
      return;
    }

    const initVact = async () => {
      try {
        // App ID must be exposed to the frontend via VITE_
        const appId = import.meta.env.VITE_VACT_APP_ID;
        if (!appId) {
          console.warn('VITE_VACT_APP_ID is missing from .env');
          return;
        }

        const client = new VactClient(appId);

        // Track ringing calls globally
        client.onIncomingCalls((calls) => {
          setIncomingCalls([...calls]);
        });

        // Get an access token from our custom backend
        // In a real app, you would pass an auth token (like Firebase ID token) to secure this endpoint
        const response = await fetch('http://localhost:3001/api/vact-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId: currentUser.uid })
        });

        if (!response.ok) {
          throw new Error('Failed to fetch VACT access token');
        }

        const { accessToken } = await response.json();
        
        await client.connect(accessToken);
        
        setVact(client);
        setIsVactConnected(true);
        console.log('Successfully connected to VACT as', currentUser.uid);

      } catch (error) {
        console.error('Error connecting to VACT:', error);
      }
    };

    initVact();
  }, [currentUser]);

  // Helper to place a call
  const placeCall = async (targetUserId, options = { video: true }) => {
    if (!vact) throw new Error('VACT client not initialized');
    
    try {
      const call = await vact.call(targetUserId, options);
      setActiveCall(call);
      return call;
    } catch (error) {
      console.error('Call failed:', error);
      throw error;
    }
  };

  // Helper to accept a call
  const acceptCall = async (incomingCall) => {
    try {
      const call = await incomingCall.accept();
      setActiveCall(call);
      return call;
    } catch (error) {
      console.error('Failed to accept call:', error);
      throw error;
    }
  };

  // Helper to decline a call
  const declineCall = async (incomingCall) => {
    try {
      await incomingCall.decline();
    } catch (error) {
      console.error('Failed to decline call:', error);
    }
  };
  
  // Helper to end active call
  const endCall = () => {
    if (activeCall) {
      // If the SDK provides an end() method, use it:
      if (typeof activeCall.end === 'function') {
        activeCall.end();
      } else if (typeof activeCall.close === 'function') {
        activeCall.close();
      }
      setActiveCall(null);
    }
  };

  const value = {
    vact,
    isVactConnected,
    activeCall,
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
