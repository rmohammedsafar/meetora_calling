import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where, getDocs, setDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useCall } from '../../contexts/CallContext';
import { Search, Phone, Video, UserPlus, RefreshCw, X } from 'lucide-react';
import Avatar from '../../components/Avatar/Avatar';
import { formatLastSeen } from '../../utils/timeUtils';
import './ContactsPage.css';

const ContactsPage = () => {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [callingId, setCallingId] = useState(null);
  const [callingType, setCallingType] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newContactEmail, setNewContactEmail] = useState('');
  const [newContactName, setNewContactName] = useState('');
  const [addError, setAddError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState('');

  const { currentUser } = useAuth();
  const { placeCall, callState } = useCall();
  const isCallInProgress = callingId !== null || callState !== 'idle';

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
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        // Hide self if UID matches or doc id matches
        if (docSnap.id !== currentUser?.uid && data.uid !== currentUser?.uid) {
          usersList.push({ id: docSnap.id, ...data });
        }
      });
      setUsers(usersList);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching users:", error);
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
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

  const handleAddContact = async (e) => {
    e.preventDefault();
    setAddError('');
    const email = newContactEmail.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      setAddError('Please enter a valid email address.');
      return;
    }

    if (email === currentUser?.email?.toLowerCase()) {
      setAddError('You cannot add your own email as a contact.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Check if user already exists by email
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', email));
      const querySnap = await getDocs(q);

      if (!querySnap.empty) {
        setAddError('This user is already in your contacts list!');
        setIsSubmitting(false);
        return;
      }

      // Create new contact record in Firestore
      const newDocRef = doc(usersRef);
      const fallbackName = email.split('@')[0];
      const displayName = newContactName.trim() || fallbackName;

      await setDoc(newDocRef, {
        uid: newDocRef.id,
        email: email,
        displayName: displayName,
        photoURL: null,
        status: 'offline',
        lastSeen: serverTimestamp(),
        createdAt: new Date().toISOString()
      });

      setNewContactEmail('');
      setNewContactName('');
      setIsAddModalOpen(false);
    } catch (err) {
      console.error('Error adding contact:', err);
      setAddError('Failed to add contact: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSyncUsers = async () => {
    setIsSyncing(true);
    setSyncStatus('Syncing users...');
    try {
      // Cloud Function sync endpoint
      const res = await fetch('https://us-central1-meetora-39ab0.cloudfunctions.net/syncUsers');
      if (res.ok) {
        const data = await res.json();
        setSyncStatus(`Synced ${data.count || 0} users!`);
      } else {
        setSyncStatus('Sync failed, using live Firestore data.');
      }
    } catch (err) {
      console.warn('Sync function request error:', err);
      setSyncStatus('Refreshed!');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncStatus(''), 4000);
    }
  };

  const filteredUsers = users.filter(user => {
    if (!searchTerm.trim()) return true;
    const searchLower = searchTerm.toLowerCase().trim();
    const displayName = (user.displayName || user.email || 'User').toLowerCase();
    const email = (user.email || '').toLowerCase();
    return displayName.includes(searchLower) || email.includes(searchLower);
  }).sort((a, b) => {
    // Online users first, then away, then offline
    if (a.status === 'online' && b.status !== 'online') return -1;
    if (a.status !== 'online' && b.status === 'online') return 1;
    if (a.status === 'away' && b.status === 'offline') return -1;
    if (a.status === 'offline' && b.status === 'away') return 1;

    // Sort by lastSeen (most recent first)
    const getTime = (timestamp) => {
      if (!timestamp) return 0;
      if (timestamp.seconds) return timestamp.seconds;
      if (timestamp.toDate) return timestamp.toDate().getTime();
      return new Date(timestamp).getTime();
    };
    
    const timeA = getTime(a.lastSeen);
    const timeB = getTime(b.lastSeen);
    
    if (timeA !== timeB) {
      return timeB - timeA; // Descending order
    }

    // Alphabetical fallback
    const nameA = a.displayName || a.email || '';
    const nameB = b.displayName || b.email || '';
    return nameA.localeCompare(nameB);
  });

  return (
    <div className="contacts-page">
      <div className="contacts-header-row">
        <div className="contacts-header">
          <h1>Contacts</h1>
          <p>Find and call anyone on Meetora</p>
        </div>
        <div className="contacts-header-actions">
          <button
            className="sync-btn"
            onClick={handleSyncUsers}
            disabled={isSyncing}
            title="Sync all users"
          >
            <RefreshCw size={16} className={isSyncing ? 'spinning' : ''} />
            <span className="sync-text">{isSyncing ? 'Syncing...' : 'Sync'}</span>
          </button>
          <button
            className="add-contact-btn"
            onClick={() => setIsAddModalOpen(true)}
            title="Add contact by email"
          >
            <UserPlus size={16} />
            <span>Add Contact</span>
          </button>
        </div>
      </div>

      {syncStatus && (
        <div className="sync-banner">
          {syncStatus}
        </div>
      )}

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
                <Avatar name={user.displayName || user.email || 'User'} src={user.photoURL} size="medium" />
                <div className="contact-details">
                  <span className="contact-name">{user.displayName || (user.email ? user.email.split('@')[0] : 'User')}</span>
                  <span className="contact-email">{user.email || 'No email'}</span>
                  <span style={{ fontSize: '12px', color: user.status === 'online' ? '#10b981' : user.status === 'away' ? '#f59e0b' : 'var(--text-muted)' }}>
                    {formatLastSeen(user.status, user.lastSeen)}
                  </span>
                </div>
              </div>
              {!isCallInProgress && <div className="contact-actions" style={{ display: 'flex', gap: '8px' }}>
                <button
                  className={`action-btn call-btn audio-btn ${callingId === user.id && callingType === 'audio' ? 'calling' : ''}`}
                  onClick={() => handleCall(user.id || user.uid, false)}
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
                  onClick={() => handleCall(user.id || user.uid, true)}
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
              </div>}
            </div>
          ))
        ) : (
          <div className="empty-state">
            <p>{searchTerm ? `No contacts found matching "${searchTerm}"` : 'No other contacts registered yet.'}</p>
            <button className="empty-add-btn" onClick={() => setIsAddModalOpen(true)}>
              <UserPlus size={16} /> Add a contact by email
            </button>
          </div>
        )}
      </div>

      {/* Add Contact Modal */}
      {isAddModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsAddModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add New Contact</h3>
              <button className="close-btn" onClick={() => setIsAddModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddContact} className="add-contact-form">
              <p className="modal-description">
                Enter the email address of the person you want to add or call on Meetora.
              </p>
              
              {addError && <div className="add-error-msg">{addError}</div>}

              <div className="form-group">
                <label>Email Address *</label>
                <input
                  type="email"
                  placeholder="user@example.com"
                  value={newContactEmail}
                  onChange={(e) => setNewContactEmail(e.target.value)}
                  required
                  autoFocus
                  className="modal-input"
                />
              </div>

              <div className="form-group">
                <label>Name (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={newContactName}
                  onChange={(e) => setNewContactName(e.target.value)}
                  className="modal-input"
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setIsAddModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Adding...' : 'Add Contact'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContactsPage;
