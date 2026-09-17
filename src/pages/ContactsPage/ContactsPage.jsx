import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useCall } from '../../contexts/CallContext';
import { Search, Phone, Video } from 'lucide-react';
import Avatar from '../../components/Avatar/Avatar';
import './ContactsPage.css';

const ContactsPage = () => {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();
  const { placeCall } = useCall();

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

    const fetchUsers = async () => {
      try {
        const usersRef = collection(db, 'users');
        const querySnapshot = await getDocs(usersRef);

        const usersList = [];
        querySnapshot.forEach((doc) => {
          // Don't include the current user in their own contacts list
          if (doc.id !== currentUser.uid) {
            usersList.push({ id: doc.id, ...doc.data() });
          }
        });

        setUsers(usersList);
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [currentUser]);

  const handleCall = async (uid) => {
    try {
      await placeCall(uid, { video: true });
    } catch (e) {
      console.error("Failed to place call:", e);
      alert("Failed to call: " + e.message);
    }
  };

  const filteredUsers = users.filter(user => {
    const searchLower = searchTerm.toLowerCase();
    const nameMatch = user.displayName?.toLowerCase().includes(searchLower);
    const emailMatch = user.email?.toLowerCase().includes(searchLower);
    return nameMatch || emailMatch;
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
                </div>
              </div>
              <div className="contact-actions">
                <button
                  className="action-btn call-btn"
                  onClick={() => handleCall(user.uid)}
                  title="Video Call"
                >
                  <Video size={18} />
                  <span>Call</span>
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
