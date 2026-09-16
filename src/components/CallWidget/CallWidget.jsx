import React, { useState, useEffect, useRef } from 'react';
import { Video, Mic, MicOff, PhoneOff, Phone } from 'lucide-react';
import { useCall } from '../../contexts/CallContext';
import Avatar from '../Avatar/Avatar';
import './CallWidget.css';

const CallWidget = () => {
  const { activeCall, incomingCalls, acceptCall, declineCall, endCall } = useCall();
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  // Attach video streams when the call is active
  useEffect(() => {
    if (activeCall) {
      if (localVideoRef.current && activeCall.localStream) {
        localVideoRef.current.srcObject = activeCall.localStream;
      }
      if (remoteVideoRef.current && activeCall.remoteStream) {
        remoteVideoRef.current.srcObject = activeCall.remoteStream;
      }
    }
  }, [activeCall]);

  const toggleMute = () => {
    if (activeCall) {
      if (isMuted) activeCall.unmuteAudio();
      else activeCall.muteAudio();
    }
    setIsMuted(!isMuted);
  };

  const toggleVideo = () => {
    if (activeCall) {
      if (isVideoOff) activeCall.unmuteVideo();
      else activeCall.muteVideo();
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
              <Avatar name={incomingCalls[0].callerName || 'Someone'} size="large" />
              <h3>{incomingCalls[0].callerName || 'Someone'}</h3>
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
              {!activeCall.remoteStream && (
                <div className="video-placeholder">Connecting...</div>
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
