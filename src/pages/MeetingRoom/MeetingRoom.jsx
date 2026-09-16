import React, { useState, useEffect, useRef } from 'react';
import { 
  Video, Mic, MicOff, MonitorUp, Circle, MoreHorizontal, 
  PhoneOff, LayoutGrid, Send, Paperclip, Smile
} from 'lucide-react';
import Avatar from '../../components/Avatar/Avatar';
import Logo from '../../components/Logo/Logo';
import './MeetingRoom.css';
import { Link, useParams } from 'react-router-dom';
import { useCall } from '../../contexts/CallContext';

const MeetingRoom = () => {
  const { id: roomId } = useParams();
  const { isVactConnected, activeCall, placeCall, endCall, incomingCalls, acceptCall } = useCall();
  const [activeTab, setActiveTab] = useState('chat');
  
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

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

  const handleStartCall = async () => {
    try {
      await placeCall(roomId, { video: true });
    } catch (e) {
      console.error('Failed to start call', e);
    }
  };

  const handleAcceptCall = async (incoming) => {
    try {
      await acceptCall(incoming);
    } catch (e) {
      console.error('Failed to accept', e);
    }
  };

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

  const handleScreenShare = async () => {
    if (activeCall) {
      try {
        await activeCall.startScreenShare();
      } catch (e) {
        console.error('Failed to share screen', e);
      }
    }
  };

  return (
    <div className="meeting-room">
      {/* Top Header */}
      <header className="room-header">
        <Link to="/app" className="room-logo-link">
          <Logo size="small" className="logo-white-mode" />
        </Link>
        <div className="room-info">
          <h2>Product team sync</h2>
          <span className="room-timer">00:24:19</span>
        </div>
        <button className="view-toggle">
          <LayoutGrid size={16} /> View
        </button>
      </header>

      {/* Main Content Area */}
      <main className="room-main">
        {/* Video Grid */}
        <div className="video-area">
          <div className="video-grid">
            {/* If there's an active call, show the remote and local streams */}
            {activeCall ? (
              <>
                <div className="video-participant main-speaker">
                  <video 
                    ref={remoteVideoRef} 
                    autoPlay 
                    playsInline 
                    className="vact-video"
                  />
                  <div className="participant-info">
                    <span className="participant-name">Remote User</span>
                  </div>
                </div>
                <div className="video-participant local-participant">
                  <video 
                    ref={localVideoRef} 
                    autoPlay 
                    playsInline 
                    muted 
                    className="vact-video"
                  />
                  <div className="participant-info">
                    <span className="participant-name">You</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="waiting-room">
                {incomingCalls.length > 0 ? (
                  <div className="incoming-calls">
                    <h3>Incoming Calls</h3>
                    {incomingCalls.map((c, i) => (
                      <div key={i} className="incoming-card">
                        <p>{c.callerName || 'Someone'} is calling...</p>
                        <button onClick={() => handleAcceptCall(c)} className="btn-accept">Accept</button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="start-call-prompt">
                    <h3>Ready to join?</h3>
                    <button 
                      className="btn-start-call" 
                      onClick={handleStartCall}
                      disabled={!isVactConnected}
                    >
                      {isVactConnected ? 'Start Call' : 'Connecting to VACT...'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Call Controls Bar */}
          <div className="call-controls">
            <div className="controls-left">
              <button className="control-btn" title="Layout">
                <LayoutGrid size={20} />
              </button>
            </div>
            
            <div className="controls-center">
              <button className={`control-btn ${isMuted ? 'active-mute' : ''}`} onClick={toggleMute} title="Toggle Audio">
                {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
              </button>
              <button className={`control-btn ${isVideoOff ? 'active-mute' : ''}`} onClick={toggleVideo} title="Toggle Video">
                <Video size={20} />
              </button>
              <button className="control-btn" onClick={handleScreenShare} title="Share Screen">
                <MonitorUp size={20} />
              </button>
              <button className="control-btn" title="More options">
                <MoreHorizontal size={20} />
              </button>
              <button className="control-btn btn-danger" onClick={endCall} title="Leave Call">
                <PhoneOff size={20} color="white" />
              </button>
            </div>
            <div className="controls-right">
              <Link to="/app" className="leave-button">
                Leave
              </Link>
            </div>
          </div>
        </div>

        {/* Side Panel (Chat / Participants) */}
        <aside className="room-panel">
          <div className="panel-tabs">
            <button 
              className={`panel-tab ${activeTab === 'chat' ? 'active' : ''}`}
              onClick={() => setActiveTab('chat')}
            >
              Chat
            </button>
            <button 
              className={`panel-tab ${activeTab === 'participants' ? 'active' : ''}`}
              onClick={() => setActiveTab('participants')}
            >
              Participants (4)
            </button>
          </div>

          <div className="panel-content">
            <div className="chat-messages">
              <div className="message-item">
                <Avatar src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=100" size="small" />
                <div className="message-body">
                  <div className="message-header">
                    <span className="msg-author">Emma Wilson</span>
                    <span className="msg-time">10:14 AM</span>
                  </div>
                  <div className="message-text">Great discussion today!</div>
                </div>
              </div>
              
              <div className="message-item">
                <Avatar src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=100" size="small" />
                <div className="message-body">
                  <div className="message-header">
                    <span className="msg-author">Daniel Kim</span>
                    <span className="msg-time">10:16 AM</span>
                  </div>
                  <div className="message-text">Here's the design we talked about:</div>
                  <div className="attachment">
                    <div className="attachment-icon">PDF</div>
                    <div className="attachment-info">
                      <span className="attachment-name">product-design.pdf</span>
                      <span className="attachment-size">2.4 MB</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="message-item">
                <Avatar src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=100" size="small" />
                <div className="message-body">
                  <div className="message-header">
                    <span className="msg-author">Marcus Lee</span>
                    <span className="msg-time">10:17 AM</span>
                  </div>
                  <div className="message-text">This looks awesome!</div>
                </div>
              </div>
              
              <div className="message-item">
                <Avatar src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=100" size="small" />
                <div className="message-body">
                  <div className="message-header">
                    <span className="msg-author">Sarah Chen</span>
                    <span className="msg-time">10:20 AM</span>
                  </div>
                  <div className="message-text">Let's move forward with this.</div>
                </div>
              </div>
            </div>
            
            <div className="chat-input-area">
              <div className="chat-input-wrapper">
                <input type="text" placeholder="Type a message..." className="chat-input" />
                <div className="chat-input-actions">
                  <button className="chat-action-btn"><Smile size={16} /></button>
                  <button className="chat-action-btn"><Paperclip size={16} /></button>
                  <button className="chat-action-btn send-btn"><Send size={16} /></button>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
};

export default MeetingRoom;
