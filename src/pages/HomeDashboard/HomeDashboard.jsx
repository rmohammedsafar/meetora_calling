import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, Video, Hash, Calendar as CalendarIcon, FileText } from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/Button/Button';
import Avatar from '../../components/Avatar/Avatar';
import { formatLastSeen } from '../../utils/timeUtils';
import './HomeDashboard.css';

const HomeDashboard = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [contacts, setContacts] = useState([]);

  useEffect(() => {
    const fetchContacts = async () => {
      try {
        const usersRef = collection(db, 'users');
        const querySnapshot = await getDocs(usersRef);
        const usersList = [];
        querySnapshot.forEach((doc) => {
          if (doc.id !== currentUser?.uid) {
            usersList.push({ id: doc.id, ...doc.data() });
          }
        });
        setContacts(usersList.slice(0, 5)); // Show up to 5 contacts
      } catch (error) {
        console.error("Error fetching contacts:", error);
      }
    };

    if (currentUser) {
      fetchContacts();
    }
  }, [currentUser]);
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
              <span className="user-name">{currentUser?.displayName || 'User'}</span>
              <span className="user-role">{currentUser?.email || 'Member'}</span>
            </div>
            <Avatar src={currentUser?.photoURL} name={currentUser?.displayName || 'User'} />
          </div>
        </div>
      </header>

      {/* Welcome Section */}
      <div className="welcome-section">
        <div className="welcome-text">
          <h1>Good morning, {currentUser?.displayName?.split(' ')[0] || 'there'}</h1>
          <p>Ready to make today productive?</p>
        </div>
        <div className="current-date">
          {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <Button variant="primary" size="large" className="action-btn" onClick={() => alert('Please select a contact from the Contacts tab to start a call.')}>
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
            <div className="empty-state" style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', backgroundColor: 'var(--bg-white)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              <p>No upcoming meetings</p>
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
            <div className="empty-state" style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <p>No recent conversations</p>
            </div>
          </div>
        </div>

        {/* Column 3: Contacts */}
        <div className="grid-column">
          <div className="section-header">
            <h2>Contacts</h2>
          </div>
          
          <div className="card-list list-no-gap">
            {contacts.length > 0 ? (
              contacts.map(contact => (
                <div key={contact.id} className="contact-item">
                  <Avatar src={contact.photoURL} name={contact.displayName} size="small" />
                  <div className="contact-details">
                    <h3>{contact.displayName}</h3>
                    <span className={`status ${contact.status === 'online' ? 'status-online' : 'status-offline'}`}>
                      {formatLastSeen(contact.status, contact.lastSeen)}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state" style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <p>No contacts found</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomeDashboard;
