import React, { useState, useEffect } from 'react';
import { 
  Search, Edit, Phone, Video, MoreVertical, 
  Smile, Paperclip, Send, FileText, MessageSquare
} from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import Avatar from '../../components/Avatar/Avatar';
import './MessagesPage.css';

const MessagesPage = () => {
  const { currentUser } = useAuth();
  const [contacts, setContacts] = useState([]);
  const [activeContact, setActiveContact] = useState(null);

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
        setContacts(usersList);
      } catch (error) {
        console.error("Error fetching contacts:", error);
      }
    };

    if (currentUser) {
      fetchContacts();
    }
  }, [currentUser]);

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
          {contacts.length > 0 ? (
            contacts.map(contact => (
              <div 
                key={contact.id} 
                className={`thread-item ${activeContact?.id === contact.id ? 'active' : ''}`}
                onClick={() => setActiveContact(contact)}
              >
                <Avatar src={contact.photoURL} name={contact.displayName} />
                <div className="thread-info">
                  <div className="thread-top">
                    <span className="thread-name">{contact.displayName}</span>
                  </div>
                  <p className="thread-preview" style={{ color: 'var(--text-muted)' }}>Start a conversation</p>
                </div>
              </div>
            ))
          ) : (
            <div className="empty-state" style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <p>No contacts found</p>
            </div>
          )}
        </div>
      </aside>

      {/* Active Chat Area */}
      <main className="chat-area">
        {activeContact ? (
          <>
            {/* Chat Header */}
            <header className="chat-header">
              <div className="chat-target-info">
                <Avatar src={activeContact.photoURL} name={activeContact.displayName} />
                <div>
                  <h2>{activeContact.displayName}</h2>
                  <span className="chat-target-status" style={{ color: '#10b981', fontSize: '12px' }}>Online</span>
                </div>
              </div>
              <div className="chat-header-actions">
                <button className="icon-btn"><Phone size={20} /></button>
                <button className="icon-btn"><Video size={20} /></button>
                <button className="icon-btn"><MoreVertical size={20} /></button>
              </div>
            </header>

            {/* Chat Messages */}
            <div className="chat-messages-container" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: 'var(--text-muted)' }}>
              <MessageSquare size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
              <h3>No messages yet</h3>
              <p>Send a message to start the conversation with {activeContact.displayName.split(' ')[0]}</p>
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
          </>
        ) : (
          <div className="empty-chat-state" style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            <MessageSquare size={64} style={{ marginBottom: '24px', opacity: 0.2 }} />
            <h2 style={{ fontSize: '24px', fontWeight: '600', color: 'var(--text-dark)', marginBottom: '8px' }}>Your Messages</h2>
            <p>Select a contact from the sidebar to start chatting</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default MessagesPage;
