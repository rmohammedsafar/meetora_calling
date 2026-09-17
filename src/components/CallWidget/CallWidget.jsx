import React, { useState, useEffect, useRef } from 'react';
import { Video, Mic, MicOff, PhoneOff, Phone } from 'lucide-react';
import { useCall } from '../../contexts/CallContext';
import Avatar from '../Avatar/Avatar';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import './CallWidget.css';

const CallWidget = () => {
  const { activeCall, callState, incomingCalls, acceptCall, declineCall, endCall } = useCall();
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callerName, setCallerName] = useState('Someone');

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
      if (remoteVideoRef.current && activeCall.remoteStream && remoteVideoRef.current.srcObject !== activeCall.remoteStream) {
        remoteVideoRef.current.srcObject = activeCall.remoteStream;
        remoteVideoRef.current.play().catch(e => console.warn('Remote play prevented:', e));
      }
    }, 500);

    return () => clearInterval(interval);
  }, [activeCall]);

  useEffect(() => {
    if (incomingCalls.length > 0) {
      const incoming = incomingCalls[0];
      const uid = incoming.fromUserId;
      if (uid) {
        getDoc(doc(db, 'users', uid)).then(docSnap => {
          if (docSnap.exists()) {
            setCallerName(docSnap.data().displayName || uid);
          } else {
            setCallerName(incoming.callerName || uid);
          }
        }).catch(() => setCallerName(incoming.callerName || uid));
      } else {
        setCallerName(incoming.callerName || 'Someone');
      }
    }
  }, [incomingCalls]);

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
              <h3>{callerName}</h3>
              <p>Incoming video call...</p>
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
              {/* Remote Video (Large) */}
              <video 
                ref={remoteVideoRef} 
                autoPlay 
                playsInline 
                className="remote-video"
              />
              {callState !== 'connected' && (
                <div className="video-placeholder">State: {callState}...</div>
              )}
              
              {/* Local Video (Picture-in-Picture) */}
              <div className="local-video-container">
                <video 
                  ref={localVideoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  className="local-video"
                />
              </div>
            </div>

            {/* Call Controls */}
            <div className="call-controls-bar">
              <button 
                className={`control-btn ${isMuted ? 'active-mute' : ''}`} 
                onClick={toggleMute}
                title="Toggle Audio"
              >
                {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
              </button>
              
              <button 
                className={`control-btn ${isVideoOff ? 'active-mute' : ''}`} 
                onClick={toggleVideo}
                title="Toggle Video"
              >
                <Video size={20} />
              </button>
              
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
