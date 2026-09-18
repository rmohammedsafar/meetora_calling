import React, { useState, useEffect, useRef } from 'react';
import { Video, Mic, MicOff, PhoneOff, Phone, Volume2, VolumeX } from 'lucide-react';
import { useCall } from '../../contexts/CallContext';
import Avatar from '../Avatar/Avatar';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import './CallWidget.css';

const CallWidget = () => {
  const { activeCall, callState, incomingCalls, acceptCall, declineCall, endCall } = useCall();
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const [callerName, setCallerName] = useState('Someone');
  
  const hasLocalVideo = activeCall?.localStream?.getVideoTracks().length > 0;
  const hasRemoteVideo = activeCall?.remoteStream?.getVideoTracks().length > 0;
  const isAudioOnly = activeCall && !hasLocalVideo && !hasRemoteVideo;

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  // Attach video streams when the call is active
  useEffect(() => {
    if (!activeCall) return;

    // Constantly check for the stream to ensure it attaches when the camera is ready
    const interval = setInterval(() => {
      if (localVideoRef.current && activeCall.localStream && localVideoRef.current.srcObject !== activeCall.localStream) {
        localVideoRef.current.srcObject = activeCall.localStream;
        localVideoRef.current.play().catch(e => console.warn('Local play prevented:', e));
      }
      if (remoteVideoRef.current && activeCall.remoteStream) {
        if (remoteVideoRef.current.srcObject !== activeCall.remoteStream) {
          remoteVideoRef.current.srcObject = activeCall.remoteStream;
        }
        remoteVideoRef.current.muted = isSpeakerMuted;
        remoteVideoRef.current.play().catch(e => console.warn('Remote play prevented:', e));
      }
    }, 500);

    return () => clearInterval(interval);
  }, [activeCall, isSpeakerMuted]);

  useEffect(() => {
    if (incomingCalls.length > 0) {
      const incoming = incomingCalls[0];
      const uid = incoming.fromUserId;
      let name = 'Someone';
      
      if (uid) {
        getDoc(doc(db, 'users', uid)).then(docSnap => {
          if (docSnap.exists()) {
            name = docSnap.data().displayName || uid;
            setCallerName(name);
          } else {
            name = incoming.callerName || uid;
            setCallerName(name);
          }
        }).catch(() => {
          name = incoming.callerName || uid;
          setCallerName(name);
        });
      } else {
        name = incoming.callerName || 'Someone';
        setCallerName(name);
      }
    }
  }, [incomingCalls]);

  // Request Notification Permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
  }, []);

  // Reference to hold active notification tag to close it manually if needed
  const activeNotificationTag = useRef(null);

  // Trigger Browser Notification if tab is hidden
  useEffect(() => {
    if (incomingCalls.length > 0 && 'Notification' in window && Notification.permission === 'granted') {
      if (document.visibilityState !== 'visible') {
        const incomingCall = incomingCalls[0];
        const isVideo = incomingCall.video;
        // Use the call ID as the tag so the browser updates the existing notification 
        // instead of creating new ones if callerName changes or if multiple tabs are open.
        const tag = 'incoming-call-' + incomingCall.id;
        activeNotificationTag.current = tag;

        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.ready.then(registration => {
            registration.showNotification(`Incoming ${isVideo ? 'Video' : 'Voice'} Call`, {
              body: `${callerName} is calling you on Meetora`,
              icon: '/favicon.ico',
              tag: tag,
              requireInteraction: true,
              actions: [
                { action: 'answer', title: 'Answer' },
                { action: 'decline', title: 'Decline' }
              ]
            });
          });
        }
      }
    } else {
      // Close notification if call ends or is answered
      if (activeNotificationTag.current && 'serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(registration => {
          registration.getNotifications({ tag: activeNotificationTag.current }).then(notifications => {
            notifications.forEach(notification => notification.close());
          });
        });
        activeNotificationTag.current = null;
      }
    }
  }, [incomingCalls, callerName]);

  // Listen for Service Worker messages
  useEffect(() => {
    const handleSWMessage = (event) => {
      if (event.data && event.data.type === 'CALL_ACTION') {
        if (incomingCalls.length > 0) {
          const call = incomingCalls[0];
          if (event.data.action === 'answer') {
            acceptCall(call);
          } else if (event.data.action === 'decline') {
            declineCall(call);
          }
        }
      }
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleSWMessage);
    }

    return () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleSWMessage);
      }
    };
  }, [incomingCalls, acceptCall, declineCall]);

  const toggleMute = () => {
    if (activeCall) {
      activeCall.setMicrophoneEnabled(isMuted);
    }
    setIsMuted(!isMuted);
  };

  const toggleVideo = () => {
    if (activeCall) {
      activeCall.setCameraEnabled(isVideoOff);
    }
    setIsVideoOff(!isVideoOff);
  };

  const toggleSpeaker = () => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.muted = !isSpeakerMuted;
    }
    setIsSpeakerMuted(!isSpeakerMuted);
  };

  // Do not render anything if there are no calls
  if (!activeCall && incomingCalls.length === 0) {
    return null;
  }

  return (
    <div className="call-widget-overlay">
      <div className="call-widget-container">
        {/* Incoming Call View */}
        {!activeCall && incomingCalls.length > 0 && (
          <div className="incoming-call-view">
            <div className="incoming-header">
              <Avatar name={callerName} size="large" />
              <h3>Incoming {incomingCalls[0].video ? 'Video' : 'Voice'} Call</h3>
              <p>{callerName}</p>
            </div>
            <div className="incoming-actions">
              <button 
                className="btn-call-action btn-decline" 
                onClick={() => declineCall(incomingCalls[0])}
              >
                <PhoneOff size={24} color="white" />
              </button>
              <button 
                className="btn-call-action btn-accept" 
                onClick={() => acceptCall(incomingCalls[0])}
              >
                <Phone size={24} color="white" />
              </button>
            </div>
          </div>
        )}

        {/* Active Call View */}
        {activeCall && (
          <div className="active-call-view">
            <div className="video-container">
              {/* Always mount remote video to ensure audio plays! */}
              <video 
                ref={remoteVideoRef} 
                autoPlay 
                playsInline 
                className="remote-video"
                style={{ display: isAudioOnly ? 'none' : 'block' }}
              />

              {/* Remote Video or Audio Avatar */}
              {isAudioOnly ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'white', position: 'absolute', inset: 0 }}>
                  <Avatar name={callerName} size="large" />
                  <h3 style={{ marginTop: '16px' }}>Voice Call</h3>
                  <p>{callState}</p>
                </div>
              ) : (
                <>
                  {callState !== 'connected' && (
                    <div className="video-placeholder">State: {callState}...</div>
                  )}
                  
                  {/* Local Video (Picture-in-Picture) */}
                  {hasLocalVideo && (
                    <div className="local-video-container">
                      <video 
                        ref={localVideoRef} 
                        autoPlay 
                        playsInline 
                        muted 
                        className="local-video"
                      />
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Call Controls */}
            <div className="call-controls-bar">
              <button 
                className={`control-btn ${isSpeakerMuted ? 'active-mute' : ''}`} 
                onClick={toggleSpeaker}
                title="Toggle Speaker"
              >
                {isSpeakerMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>

              <button 
                className={`control-btn ${isMuted ? 'active-mute' : ''}`} 
                onClick={toggleMute}
                title="Toggle Audio"
              >
                {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
              </button>
              
              {!isAudioOnly && (
                <button 
                  className={`control-btn ${isVideoOff ? 'active-mute' : ''}`} 
                  onClick={toggleVideo}
                  title="Toggle Video"
                >
                  <Video size={20} />
                </button>
              )}
              
              <button 
                className="control-btn btn-danger" 
                onClick={endCall}
                title="End Call"
              >
                <PhoneOff size={20} color="white" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CallWidget;
