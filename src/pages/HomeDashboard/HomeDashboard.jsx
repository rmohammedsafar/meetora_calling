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
  const [notifPermission, setNotifPermission] = useState(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'granted'
  );

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      alert('This browser does not support desktop notifications.');
      return;
    }
    const perm = await Notification.requestPermission();
    setNotifPermission(perm);
    if (perm === 'granted') {
      new Notification('Meetora Notifications Enabled!', {
        body: 'Desktop notifications are now active on your laptop.',
        icon: '/favicon.ico'
      });
    } else {
      alert('Notifications are blocked in your browser settings. Please click the padlock or tune icon in your browser URL bar to allow notifications for this site.');
    }
  };

  const handleTestNotification = () => {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      new Notification('Meetora Test Notification', {
        body: 'Notifications are working properly on your desktop!',
        icon: '/favicon.ico'
      });
    } else {
      requestNotificationPermission();
    }
  };

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
        usersList.sort((a, b) => {
          if (a.status === 'online' && b.status !== 'online') return -1;
          if (a.status !== 'online' && b.status === 'online') return 1;
          if (a.status === 'away' && b.status === 'offline') return -1;
          if (a.status === 'offline' && b.status === 'away') return 1;

          const getTime = (timestamp) => {
            if (!timestamp) return 0;
            if (timestamp.seconds) return timestamp.seconds;
            if (timestamp.toDate) return timestamp.toDate().getTime();
            return new Date(timestamp).getTime();
          };
          
          const timeA = getTime(a.lastSeen);
          const timeB = getTime(b.lastSeen);
          
          if (timeA !== timeB) {
            return timeB - timeA;
          }

          const nameA = a.displayName || a.email || '';
          const nameB = b.displayName || b.email || '';
          return nameA.localeCompare(nameB);
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
          <button 
            className="icon-button" 
            title={notifPermission === 'granted' ? "Click to test desktop notification" : "Click to enable notifications"}
            onClick={handleTestNotification}
          >
            <Bell size={20} />
            {notifPermission !== 'granted' && <span className="badge" style={{ background: '#ef4444' }}></span>}
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

      {notifPermission !== 'granted' && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.12)',
          border: '1px solid rgba(239, 68, 68, 0.35)',
          color: '#f87171',
          padding: '12px 20px',
          borderRadius: '10px',
          margin: '16px 24px 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          fontSize: '14px'
        }}>
          <span>🔔 <strong>Desktop notifications are not enabled.</strong> Enable them to get alerts for incoming calls and messages when Meetora is in the background.</span>
          <button 
            onClick={requestNotificationPermission}
            style={{
              background: '#ef4444',
              color: '#fff',
              border: 'none',
              padding: '6px 14px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600',
              whiteSpace: 'nowrap'
            }}
          >
            Enable Notifications
          </button>
        </div>
      )}

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


      {/* Dashboard Grid Content */}
      <div className="dashboard-grid">
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
                    <span className={`status ${contact.status === 'online' ? 'status-online' : (contact.status === 'away' ? 'status-away' : 'status-offline')}`}>
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
