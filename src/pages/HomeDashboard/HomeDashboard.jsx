import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, Video, Hash, Calendar as CalendarIcon, FileText } from 'lucide-react';
import Button from '../../components/Button/Button';
import Avatar from '../../components/Avatar/Avatar';
import './HomeDashboard.css';

const HomeDashboard = () => {
  const navigate = useNavigate();
  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="dashboard-header">
        <div className="search-bar">
          <Search size={18} className="search-icon" />
          <input type="text" placeholder="Search meetings, people, or messages..." className="search-input" />
        </div>
        
        <div className="header-actions">
          <button className="icon-button">
            <Bell size={20} />
            <span className="badge"></span>
          </button>
          
          <div className="user-profile">
            <div className="user-info">
              <span className="user-name">Sarah Chen</span>
              <span className="user-role">Product Team</span>
            </div>
            <Avatar src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=100" name="Sarah Chen" />
          </div>
        </div>
      </header>

      {/* Welcome Section */}
      <div className="welcome-section">
        <div className="welcome-text">
          <h1>Good morning, Sarah</h1>
          <p>Ready to make today productive?</p>
        </div>
        <div className="current-date">
          Tue, Apr 16, 2024
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <Button variant="primary" size="large" className="action-btn" onClick={() => navigate('/room/demo-123')}>
          <Video size={18} /> Start a meeting
        </Button>
        <Button variant="outline" size="large" className="action-btn action-btn-secondary">
          <Hash size={18} /> Join with code
        </Button>
      </div>

      {/* Dashboard Grid Content */}
      <div className="dashboard-grid">
        {/* Column 1: Meetings */}
        <div className="grid-column">
          <div className="section-header">
            <h2>Upcoming meetings</h2>
            <button className="view-all">View all</button>
          </div>
          
          <div className="card-list">
            <div className="meeting-card">
              <div className="meeting-time">
                <span className="time-primary">10:00 AM</span>
                <span className="time-secondary">30 min</span>
              </div>
              <div className="meeting-details">
                <h3>Product team sync</h3>
                <p>With 8 participants</p>
              </div>
            </div>
            
            <div className="meeting-card">
              <div className="meeting-time">
                <span className="time-primary">1:00 PM</span>
                <span className="time-secondary">1 hr</span>
              </div>
              <div className="meeting-details">
                <h3>Design review</h3>
                <p>Meeting room</p>
              </div>
            </div>
            
            <div className="meeting-card">
              <div className="meeting-time">
                <span className="time-primary">3:00 PM</span>
                <span className="time-secondary">45 min</span>
              </div>
              <div className="meeting-details">
                <h3>Customer interview</h3>
                <p>With Alex Rivera</p>
              </div>
            </div>
          </div>
          
          <Button variant="outline" className="w-full mt-4" style={{marginTop: '16px'}}>
            <CalendarIcon size={16} style={{marginRight: '8px'}} /> Schedule meeting
          </Button>
        </div>

        {/* Column 2: Recent Conversations */}
        <div className="grid-column">
          <div className="section-header">
            <h2>Recent conversations</h2>
            <button className="view-all">View all</button>
          </div>
          
          <div className="card-list list-no-gap">
            <div className="conversation-item">
              <Avatar src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=100" name="Product Team" />
              <div className="conv-details">
                <div className="conv-header">
                  <h3>Product Team</h3>
                  <span className="conv-time">10:14 AM</span>
                </div>
                <p><strong>Emma:</strong> Great progress today!</p>
              </div>
            </div>
            
            <div className="conversation-item">
              <Avatar src="https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&q=80&w=100" name="Design" />
              <div className="conv-details">
                <div className="conv-header">
                  <h3>Design</h3>
                  <span className="conv-time">Yesterday</span>
                </div>
                <p><strong>You:</strong> Sharing the latest mockups...</p>
              </div>
            </div>
            
            <div className="conversation-item">
              <Avatar src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=100" name="Alex Rivera" />
              <div className="conv-details">
                <div className="conv-header">
                  <h3>Alex Rivera</h3>
                  <span className="conv-time">Yesterday</span>
                </div>
                <p>Let's catch up this week.</p>
              </div>
            </div>
            
            <div className="conversation-item">
              <Avatar src="https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&q=80&w=100" name="Marketing" />
              <div className="conv-details">
                <div className="conv-header">
                  <h3>Marketing</h3>
                  <span className="conv-time">Yesterday</span>
                </div>
                <p><strong>Sara:</strong> Here are the assets.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Column 3: Contacts */}
        <div className="grid-column">
          <div className="section-header">
            <h2>Contacts</h2>
          </div>
          
          <div className="card-list list-no-gap">
            <div className="contact-item">
              <Avatar src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=100" name="Emma Wilson" size="small" />
              <div className="contact-details">
                <h3>Emma Wilson</h3>
                <span className="status status-online">Online</span>
              </div>
            </div>
            <div className="contact-item">
              <Avatar src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=100" name="James Park" size="small" />
              <div className="contact-details">
                <h3>James Park</h3>
                <span className="status status-meeting">In a meeting</span>
              </div>
            </div>
            <div className="contact-item">
              <Avatar src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100" name="Priya Shah" size="small" />
              <div className="contact-details">
                <h3>Priya Shah</h3>
                <span className="status status-offline">Offline</span>
              </div>
            </div>
            <div className="contact-item">
              <Avatar src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=100" name="Daniel Kim" size="small" />
              <div className="contact-details">
                <h3>Daniel Kim</h3>
                <span className="status status-online">Online</span>
              </div>
            </div>
            <div className="contact-item">
              <Avatar src="https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&q=80&w=100" name="Olivia Martin" size="small" />
              <div className="contact-details">
                <h3>Olivia Martin</h3>
                <span className="status status-online">Online</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomeDashboard;
