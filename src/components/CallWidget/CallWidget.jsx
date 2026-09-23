import React, { useState, useEffect, useRef } from 'react';
import { Video, Mic, MicOff, PhoneOff, Phone, Volume2, VolumeX, PictureInPicture } from 'lucide-react';
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
  const [callDuration, setCallDuration] = useState(0);
  const callStartTimeRef = useRef(null);

  useEffect(() => {
    let interval;
    if (callState === 'connected') {
      if (!callStartTimeRef.current) {
        callStartTimeRef.current = Date.now();
      }
      // Instantly set the correct time before the first interval tick
      setCallDuration(Math.floor((Date.now() - callStartTimeRef.current) / 1000));
      
      interval = setInterval(() => {
        const currentDuration = Math.floor((Date.now() - callStartTimeRef.current) / 1000);
        if (currentDuration >= 3600) {
          endCall();
          alert('Maximum call duration of 60 minutes reached.');
        } else {
          setCallDuration(currentDuration);
        }
      }, 1000);
    } else {
      clearInterval(interval);
      if (callState === 'idle' || callState === 'ended' || callState === 'failed') {
        callStartTimeRef.current = null;
        setCallDuration(0);
      }
    }
    return () => clearInterval(interval);
  }, [callState, endCall]);

  const formatDuration = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const callDurationRef = useRef(0);
  const callerNameRef = useRef('Someone');
  useEffect(() => { callDurationRef.current = callDuration; }, [callDuration]);
  useEffect(() => { callerNameRef.current = callerName; }, [callerName]);

  const pipVideoRef = useRef(null);
  const pipCanvasRef = useRef(null);

  const togglePiP = async () => {
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture();
      return;
    }

    if (!pipCanvasRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 300;
      pipCanvasRef.current = canvas;
    }
    
    if (!pipVideoRef.current) {
      const video = document.createElement('video');
      video.muted = true;
      video.playsInline = true;
      pipVideoRef.current = video;
    }

    const canvas = pipCanvasRef.current;
    const ctx = canvas.getContext('2d');
    
    let animationId;
    const draw = () => {
      // Draw background
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw video frame if available
      if (!isAudioOnly && remoteVideoRef.current && remoteVideoRef.current.readyState >= 2) {
        // Calculate aspect ratio to fit video in canvas
        const vidW = remoteVideoRef.current.videoWidth;
        const vidH = remoteVideoRef.current.videoHeight;
        if (vidW && vidH) {
          const ratio = Math.min(canvas.width / vidW, canvas.height / vidH);
          const w = vidW * ratio;
          const h = vidH * ratio;
          const x = (canvas.width - w) / 2;
          const y = (canvas.height - h) / 2;
          ctx.drawImage(remoteVideoRef.current, x, y, w, h);
        }
      } else {
        // Draw Audio Avatar Placeholder
        ctx.fillStyle = '#3b82f6';
        ctx.beginPath();
        ctx.arc(canvas.width / 2, canvas.height / 2 - 20, 50, 0, 2 * Math.PI);
        ctx.fill();
        ctx.fillStyle = 'white';
        ctx.font = 'bold 40px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(callerNameRef.current.charAt(0).toUpperCase(), canvas.width / 2, canvas.height / 2 - 20);
      }
      
      // Draw Overlay Top Bar
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(0, 0, canvas.width, 40);
      
      // Draw Name
      ctx.fillStyle = 'white';
      ctx.font = '16px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(callerNameRef.current, 10, 20);
      
      // Draw Timer
      ctx.textAlign = 'right';
      ctx.fillText(formatDuration(callDurationRef.current), canvas.width - 10, 20);
      
      animationId = requestAnimationFrame(draw);
    };
    
    draw();
    
    try {
      const stream = canvas.captureStream(30);
      pipVideoRef.current.srcObject = stream;
      await pipVideoRef.current.play();
      await pipVideoRef.current.requestPictureInPicture();
    } catch (e) {
      console.error("PiP failed", e);
      alert("Picture-in-Picture is not supported by your browser.");
      cancelAnimationFrame(animationId);
    }
    
    pipVideoRef.current.addEventListener('leavepictureinpicture', () => {
      cancelAnimationFrame(animationId);
    }, { once: true });
  };

  
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
  // Reference to hold active notification tag to close it manually if needed
  const activeNotificationTag = useRef(null);
  const directNotificationRef = useRef(null);
  const pendingNotificationActionRef = useRef(null);

  // A service-worker click can open a new tab before React/VACT has published
  // the incoming call. Preserve the action in memory until that call appears.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const action = params.get('callAction');
    const callId = params.get('callId');
    if ((action === 'answer' || action === 'decline') && callId) {
      pendingNotificationActionRef.current = { type: 'CALL_ACTION', action, callId };
      window.history.replaceState({}, document.title, window.location.pathname + window.location.hash);
    }
  }, []);

  // Trigger Browser Notification for Incoming Calls
  useEffect(() => {
    let cancelled = false;
    let workerTimer;
    if (incomingCalls.length > 0 && 'Notification' in window && Notification.permission === 'granted') {
      const incomingCall = incomingCalls[0];
      const isVideo = incomingCall.video;
      // Use the call ID as the tag so the browser updates the existing notification 
      // instead of creating new ones if callerName changes or if multiple tabs are open.
      const tag = 'incoming-call-' + incomingCall.id;
      activeNotificationTag.current = tag;

      const title = `Incoming ${isVideo ? 'Video' : 'Voice'} Call`;
      const options = {
        body: `${callerName || 'Someone'} is calling you on Meetora`,
        icon: '/favicon.svg',
        badge: '/favicon.svg',
        tag: tag,
        requireInteraction: true,
        renotify: true,
        vibrate: [500, 250, 500, 250, 500],
        data: {
          type: 'incoming_call',
          callId: incomingCall.id,
          callerName: callerName || 'Someone'
        },
        actions: [
          { action: 'answer', title: 'Answer' },
          { action: 'decline', title: 'Decline' }
        ]
      };

      const showDirectNotification = () => {
        if (cancelled) return;
        try {
          // Action buttons are supported only by showNotification(), not
          // the desktop Notification constructor (which throws TypeError).
          const directOptions = { ...options };
          delete directOptions.actions;
          const notification = new Notification(title, directOptions);
          directNotificationRef.current?.close();
          directNotificationRef.current = notification;
          notification.onclick = () => {
            window.focus();
            notification.close();
          };
        } catch (error) {
          console.warn('Desktop notification could not be shown:', error);
        }
      };

      // Prefer persistent notifications on desktop and mobile so action
      // buttons work regardless of whether the tab is visible.
      if ('serviceWorker' in navigator) {
        const timeout = new Promise((_, reject) =>
          workerTimer = setTimeout(() => reject(new Error('Service worker notification timeout')), 2000)
        );
        Promise.race([navigator.serviceWorker.ready, timeout])
          .then(registration => {
            clearTimeout(workerTimer);
            if (!cancelled) return registration.showNotification(title, options);
          })
          .catch(showDirectNotification);
      } else {
        showDirectNotification();
      }
    } else {
      directNotificationRef.current?.close();
      directNotificationRef.current = null;
      // Close notification if call ends or is answered
      if (activeNotificationTag.current && 'serviceWorker' in navigator) {
        const endedTag = activeNotificationTag.current;
        navigator.serviceWorker.ready.then(registration => {
          registration.getNotifications({ tag: endedTag }).then(notifications => {
            notifications.forEach(notification => notification.close());
          });
        }).catch(() => {});
        activeNotificationTag.current = null;
      }
    }
    return () => {
      cancelled = true;
      clearTimeout(workerTimer);
    };
  }, [incomingCalls, callerName]);

  // Listen for Service Worker messages
  useEffect(() => {
    const handleSWMessage = (event) => {
      if (event.data && event.data.type === 'CALL_ACTION') {
        const call = incomingCalls.find(c => c.id === event.data.callId);
        if (call) {
          if (event.data.action === 'answer') {
            acceptCall(call);
          } else if (event.data.action === 'decline') {
            declineCall(call);
          }
        } else {
          pendingNotificationActionRef.current = event.data;
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

  // A notification action can arrive just before VACT publishes the call
  // object to React. Apply the queued action when that object becomes ready.
  useEffect(() => {
    const pending = pendingNotificationActionRef.current;
    if (!pending || incomingCalls.length === 0) return;

    const call = incomingCalls.find(c => c.id === pending.callId);
    if (!call) return;

    pendingNotificationActionRef.current = null;
    if (pending.action === 'answer') {
      acceptCall(call);
    } else if (pending.action === 'decline') {
      declineCall(call);
    }
  }, [incomingCalls, acceptCall, declineCall]);

  const toggleMute = () => {
    const nextMuted = !isMuted;
    if (activeCall) {
      if (typeof activeCall.setMicrophoneEnabled === 'function') {
        activeCall.setMicrophoneEnabled(!nextMuted);
      }
      if (activeCall.localStream) {
        activeCall.localStream.getAudioTracks().forEach(t => t.enabled = !nextMuted);
      }
    }
    setIsMuted(nextMuted);
  };

  const toggleVideo = () => {
    const nextVideoOff = !isVideoOff;
    if (activeCall) {
      if (typeof activeCall.setCameraEnabled === 'function') {
        activeCall.setCameraEnabled(!nextVideoOff);
      }
      if (activeCall.localStream) {
        activeCall.localStream.getVideoTracks().forEach(t => t.enabled = !nextVideoOff);
      }
    }
    setIsVideoOff(nextVideoOff);
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
                  <p>{callState === 'connected' ? formatDuration(callDuration) : callState}</p>
                </div>
              ) : (
                <>
                  {callState !== 'connected' ? (
                    <div className="video-placeholder">State: {callState}...</div>
                  ) : (
                    <div style={{ position: 'absolute', top: '16px', left: '16px', backgroundColor: 'rgba(0,0,0,0.5)', padding: '4px 12px', borderRadius: '16px', color: 'white', fontSize: '14px', zIndex: 10 }}>
                      {formatDuration(callDuration)}
                    </div>
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
              
              {callState === 'connected' && (
                <button 
                  className="control-btn" 
                  onClick={togglePiP}
                  title="Picture-in-Picture"
                >
                  <PictureInPicture size={20} />
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
