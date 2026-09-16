import React from 'react';
import { 
  Search, Edit, Phone, Video, MoreVertical, 
  Smile, Paperclip, Send, FileText 
} from 'lucide-react';
import Avatar from '../../components/Avatar/Avatar';
import './MessagesPage.css';

const MessagesPage = () => {
  return (
    <div className="messages-page">
      {/* Threads Sidebar */}
      <aside className="threads-sidebar">
        <div className="threads-header">
          <div>
            <h1>Messages</h1>
            <p className="threads-subtitle">Keep the conversation going.</p>
          </div>
          <button className="new-message-btn">
            <Edit size={18} />
          </button>
        </div>

        <div className="threads-search">
          <div className="search-bar-small">
            <Search size={16} className="search-icon" />
            <input type="text" placeholder="Search messages..." className="search-input" />
          </div>
        </div>

        <div className="threads-tabs">
          <button className="thread-tab active">All</button>
          <button className="thread-tab">Unread</button>
          <button className="thread-tab">Groups</button>
        </div>

        <div className="threads-list">
          <div className="thread-item active">
            <Avatar src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=100" name="Product Team" />
            <div className="thread-info">
              <div className="thread-top">
                <span className="thread-name">Product Team</span>
                <span className="thread-time">10:24 AM</span>
              </div>
              <p className="thread-preview"><strong>Emma:</strong> Great progress today!</p>
            </div>
            <div className="unread-dot"></div>
          </div>
          
          <div className="thread-item">
            <Avatar src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=100" name="Alex Rivera" />
            <div className="thread-info">
              <div className="thread-top">
                <span className="thread-name">Alex Rivera</span>
                <span className="thread-time">Yesterday</span>
              </div>
              <p className="thread-preview">Let's catch up this week.</p>
            </div>
          </div>

          <div className="thread-item">
            <Avatar src="https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&q=80&w=100" name="Design" />
            <div className="thread-info">
              <div className="thread-top">
                <span className="thread-name">Design</span>
                <span className="thread-time">9:30 AM</span>
              </div>
              <p className="thread-preview"><strong>You:</strong> Sharing the latest mockups.</p>
            </div>
          </div>

          <div className="thread-item">
            <Avatar src="https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&q=80&w=100" name="Marketing" />
            <div className="thread-info">
              <div className="thread-top">
                <span className="thread-name">Marketing</span>
                <span className="thread-time">Yesterday</span>
              </div>
              <p className="thread-preview"><strong>Sara:</strong> Here are the assets.</p>
            </div>
          </div>

          <div className="thread-item">
            <Avatar src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100" name="Priya Shah" />
            <div className="thread-info">
              <div className="thread-top">
                <span className="thread-name">Priya Shah</span>
                <span className="thread-time">Yesterday</span>
              </div>
              <p className="thread-preview">Sounds good!</p>
            </div>
          </div>

          <div className="thread-item">
            <Avatar src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=100" name="James Park" />
            <div className="thread-info">
              <div className="thread-top">
                <span className="thread-name">James Park</span>
                <span className="thread-time">Apr 14</span>
              </div>
              <p className="thread-preview">Thanks!</p>
            </div>
          </div>
          
          <div className="thread-item">
            <Avatar src="https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&q=80&w=100" name="General" />
            <div className="thread-info">
              <div className="thread-top">
                <span className="thread-name">General</span>
                <span className="thread-time">Apr 12</span>
              </div>
              <p className="thread-preview">You: Welcome to the team!</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Active Chat Area */}
      <main className="chat-area">
        {/* Chat Header */}
        <header className="chat-header">
          <div className="chat-target-info">
            <Avatar src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=100" name="Product Team" />
            <div>
              <h2>Product Team</h2>
              <span className="chat-target-status">4 members</span>
            </div>
          </div>
          <div className="chat-header-actions">
            <button className="icon-btn"><Phone size={20} /></button>
            <button className="icon-btn"><Video size={20} /></button>
            <button className="icon-btn"><MoreVertical size={20} /></button>
          </div>
        </header>

        {/* Chat Messages */}
        <div className="chat-messages-container">
          <div className="date-divider">
            <span>Today</span>
          </div>
          
          {/* Incoming Message */}
          <div className="message incoming">
            <Avatar src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=100" size="small" name="Emma Wilson" />
            <div className="message-content">
              <div className="message-meta">
                <span className="sender-name">Emma Wilson</span>
                <span className="message-time">10:14 AM</span>
              </div>
              <div className="bubble bubble-incoming">
                Great progress today!
              </div>
            </div>
          </div>

          {/* Outgoing Message */}
          <div className="message outgoing">
            <div className="message-content">
              <div className="bubble bubble-outgoing">
                Agreed! Here are the notes from the meeting.
              </div>
              <div className="message-meta justify-end">
                <span className="message-time">10:20 AM</span>
                <span className="message-status">✓✓</span>
              </div>
            </div>
          </div>

          {/* Outgoing Message with Attachment */}
          <div className="message outgoing">
            <div className="message-content">
              <div className="bubble bubble-outgoing bubble-attachment">
                <div className="file-attachment">
                  <div className="file-icon"><FileText size={24} color="white" /></div>
                  <div className="file-details">
                    <span className="file-name">meeting-notes.pdf</span>
                    <span className="file-size">1.1 MB</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Incoming Message */}
          <div className="message incoming">
            <Avatar src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=100" size="small" name="Daniel Kim" />
            <div className="message-content">
              <div className="message-meta">
                <span className="sender-name">Daniel Kim</span>
                <span className="message-time">10:24 AM</span>
              </div>
              <div className="bubble bubble-incoming">
                This looks great. Excited for what's next! 🎉
              </div>
            </div>
          </div>
        </div>

        {/* Chat Input */}
        <div className="chat-input-container">
          <div className="chat-input-box">
            <button className="input-action-btn"><Paperclip size={20} /></button>
            <input type="text" placeholder="Type a message..." className="main-chat-input" />
            <button className="input-action-btn"><Smile size={20} /></button>
            <button className="input-send-btn"><Send size={18} /></button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default MessagesPage;
