import React, { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useCall } from '../../contexts/CallContext';
import { Search, Phone, Video } from 'lucide-react';
import Avatar from '../../components/Avatar/Avatar';
import { formatLastSeen } from '../../utils/timeUtils';
import './ContactsPage.css';

const ContactsPage = () => {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [callingId, setCallingId] = useState(null);
  const [callingType, setCallingType] = useState(null);
  const { currentUser } = useAuth();
  const { placeCall, callState } = useCall();

  useEffect(() => {
    // VACT docs: Request permissions BEFORE a call to prevent the popup from breaking WebRTC timing
    const requestPermissions = async () => {
      try {
        const probe = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        probe.getTracks().forEach((t) => t.stop());
      } catch (err) {
        console.warn('Camera permissions denied or ignored early probe', err);
      }
    };
    requestPermissions();

    const usersRef = collection(db, 'users');
    const unsubscribe = onSnapshot(usersRef, (querySnapshot) => {
      const usersList = [];
      querySnapshot.forEach((doc) => {
        // Don't include the current user in their own contacts list
        if (doc.id !== currentUser.uid) {
          usersList.push({ id: doc.id, ...doc.data() });
        }
      });
      setUsers(usersList);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching users:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const handleCall = async (uid, isVideo) => {
    if (callState !== 'idle') {
      console.warn('Cannot place call, another call is active or connecting');
      return;
    }
    setCallingId(uid);
    setCallingType(isVideo ? 'video' : 'audio');
    try {
      await placeCall(uid, { video: isVideo });
    } catch (e) {
      console.error("Failed to place call:", e);
      alert("Failed to call: " + e.message);
    } finally {
      setCallingId(null);
      setCallingType(null);
    }
  };

  const filteredUsers = users.filter(user => {
    const searchLower = searchTerm.toLowerCase();
    const nameMatch = user.displayName?.toLowerCase().includes(searchLower);
    const emailMatch = user.email?.toLowerCase().includes(searchLower);
    return nameMatch || emailMatch;
  }).sort((a, b) => {
    // Online users first, then away, then offline
    if (a.status === 'online' && b.status !== 'online') return -1;
    if (a.status !== 'online' && b.status === 'online') return 1;
    if (a.status === 'away' && b.status === 'offline') return -1;
    if (a.status === 'offline' && b.status === 'away') return 1;

    // Alphabetical fallback
    const nameA = a.displayName || a.email || '';
    const nameB = b.displayName || b.email || '';
    return nameA.localeCompare(nameB);
  });

  return (
    <div className="contacts-page">
      <div className="contacts-header">
        <h1>Contacts</h1>
        <p>Find and call anyone on Meetora</p>
      </div>

      <div className="contacts-search">
        <div className="search-bar-wrapper">
          <Search size={20} className="search-icon" />
          <input
            type="text"
            placeholder="Search by name or email (e.g., test@gmail.com)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      <div className="contacts-list">
        {loading ? (
          <div className="loading-state">Loading contacts...</div>
        ) : filteredUsers.length > 0 ? (
          filteredUsers.map(user => (
            <div key={user.id} className="contact-card">
              <div className="contact-info">
                <Avatar name={user.displayName} src={user.photoURL} size="medium" />
                <div className="contact-details">
                  <span className="contact-name">{user.displayName}</span>
                  <span className="contact-email">{user.email}</span>
                  <span style={{ fontSize: '12px', color: user.status === 'online' ? '#10b981' : user.status === 'away' ? '#f59e0b' : 'var(--text-muted)' }}>
                    {formatLastSeen(user.status, user.lastSeen)}
                  </span>
                </div>
              </div>
              <div className="contact-actions" style={{ display: 'flex', gap: '8px' }}>
                <button
                  className={`action-btn call-btn audio-btn ${callingId === user.id && callingType === 'audio' ? 'calling' : ''}`}
                  onClick={() => handleCall(user.id, false)}
                  title="Voice Call"
                  disabled={callingId !== null || callState !== 'idle'}
                  style={{ backgroundColor: '#3b82f6', padding: '10px', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                >
                  {callingId === user.id && callingType === 'audio' ? (
                    <span style={{fontSize: '12px', fontWeight: 'bold'}}>...</span>
                  ) : (
                    <Phone size={18} color="white" />
                  )}
                </button>
                <button
                  className={`action-btn call-btn video-btn ${callingId === user.id && callingType === 'video' ? 'calling' : ''}`}
                  onClick={() => handleCall(user.id, true)}
                  title="Video Call"
                  disabled={callingId !== null || callState !== 'idle'}
                  style={{ padding: '10px', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                >
                  {callingId === user.id && callingType === 'video' ? (
                    <span style={{fontSize: '12px', fontWeight: 'bold'}}>...</span>
                  ) : (
                    <Video size={18} color="white" />
                  )}
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state">
            <p>No contacts found matching "{searchTerm}"</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContactsPage;
