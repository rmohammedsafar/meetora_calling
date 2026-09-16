import React, { useState } from 'react';
import { 
  Video, Mic, MicOff, MonitorUp, Circle, MoreHorizontal, 
  PhoneOff, LayoutGrid, Send, Paperclip, Smile
} from 'lucide-react';
import Avatar from '../../components/Avatar/Avatar';
import Logo from '../../components/Logo/Logo';
import './MeetingRoom.css';
import { Link } from 'react-router-dom';

const MeetingRoom = () => {
  const [activeTab, setActiveTab] = useState('chat');

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
            <div className="video-participant">
              <img src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=800" alt="Sarah Chen" />
              <div className="participant-label">
                Sarah Chen
                <div className="audio-indicator"><Mic size={12} /></div>
              </div>
            </div>
            
            <div className="video-participant">
              <img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=800" alt="Daniel Kim" />
              <div className="participant-label">
                Daniel Kim
                <div className="audio-indicator"><Mic size={12} /></div>
              </div>
            </div>
            
            <div className="video-participant">
              <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=800" alt="Marcus Lee" />
              <div className="participant-label">
                Marcus Lee
                <div className="audio-indicator muted"><MicOff size={12} /></div>
              </div>
            </div>
            
            <div className="video-participant">
              <img src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=800" alt="Emma Wilson" />
              <div className="participant-label">
                Emma Wilson
                <div className="audio-indicator"><Mic size={12} /></div>
              </div>
            </div>
          </div>

          {/* Call Controls Bar */}
          <div className="controls-bar">
            <div className="controls-center">
              <button className="control-button active">
                <Mic size={20} />
                <span>Mute</span>
              </button>
              <button className="control-button active">
                <Video size={20} />
                <span>Stop video</span>
              </button>
              <button className="control-button">
                <MonitorUp size={20} />
                <span>Share</span>
              </button>
              <button className="control-button">
                <Circle size={20} />
                <span>Record</span>
              </button>
              <button className="control-button">
                <MoreHorizontal size={20} />
                <span>More</span>
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
