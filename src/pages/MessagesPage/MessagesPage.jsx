import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Edit, Phone, Video, MoreVertical, 
  Smile, Paperclip, Send, FileText, MessageSquare, PhoneMissed, PhoneOutgoing, PhoneIncoming, ArrowLeft
} from 'lucide-react';
import { collection, getDocs, query, where, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import Avatar from '../../components/Avatar/Avatar';
import { formatLastSeen } from '../../utils/timeUtils';
import './MessagesPage.css';

const MessagesPage = () => {
  const { currentUser } = useAuth();
  const [contacts, setContacts] = useState([]);
  const [activeContact, setActiveContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    return timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  useEffect(() => {
    if (!currentUser) return;

    const usersRef = collection(db, 'users');
    const unsubscribe = onSnapshot(usersRef, (querySnapshot) => {
      const usersList = [];
      querySnapshot.forEach((doc) => {
        if (doc.id !== currentUser.uid) {
          usersList.push({ id: doc.id, ...doc.data() });
        }
      });
      setContacts(usersList);
    }, (error) => {
      console.error("Error fetching contacts:", error);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Derived state to keep active contact up to date with latest presence data
  const currentActiveContact = contacts.find(c => c.id === activeContact?.id) || activeContact;

  useEffect(() => {
    if (!currentUser || !activeContact) return;
    
    const threadId = [currentUser.uid, activeContact.id].sort().join('_');
    const q = query(
      collection(db, 'messages'),
      where('threadId', '==', threadId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = [];
      snapshot.forEach(doc => msgs.push({ id: doc.id, ...doc.data() }));
      
      // Sort locally to avoid Firestore composite index requirement
      msgs.sort((a, b) => {
        const tA = a.timestamp?.toMillis() || 0;
        const tB = b.timestamp?.toMillis() || 0;
        return tA - tB;
      });
      
      setMessages(msgs);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });

    return () => unsubscribe();
  }, [currentUser, activeContact]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser || !activeContact) return;
    
    const text = newMessage;
    setNewMessage('');
    
    const threadId = [currentUser.uid, activeContact.id].sort().join('_');
    try {
      await addDoc(collection(db, 'messages'), {
        threadId,
        participants: [currentUser.uid, activeContact.id],
        text,
        senderId: currentUser.uid,
        timestamp: serverTimestamp(),
        type: 'text'
      });
    } catch (error) {
      console.error("Failed to send message", error);
    }
  };

  return (
    <div className={`messages-page ${activeContact ? 'mobile-chat-active' : ''}`}>
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
        {currentActiveContact ? (
          <>
            {/* Chat Header */}
            <header className="chat-header">
              <div className="chat-target-info">
                <button className="mobile-back-btn" onClick={() => setActiveContact(null)}>
                  <ArrowLeft size={20} />
                </button>
                <Avatar src={currentActiveContact.photoURL} name={currentActiveContact.displayName} />
                <div>
                  <h2>{currentActiveContact.displayName}</h2>
                  <span className="chat-target-status" style={{ color: currentActiveContact.status === 'online' ? '#10b981' : 'var(--text-muted)', fontSize: '12px' }}>
                    {formatLastSeen(currentActiveContact.status, currentActiveContact.lastSeen)}
                  </span>
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
              {messages.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: 'var(--text-muted)', height: '100%' }}>
                  <MessageSquare size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
                  <h3>No messages yet</h3>
                  <p>Send a message to start the conversation with {currentActiveContact.displayName.split(' ')[0]}</p>
                </div>
              ) : (
                messages.map(msg => {
                  if (msg.type === 'call_log') {
                    const isCaller = msg.senderId === currentUser.uid;
                    const isMissed = !isCaller && (msg.status === 'missed' || msg.status === 'declined');
                    return (
                      <div key={msg.id} className="chat-call-log-wrapper">
                        <div className="chat-call-log">
                          {isMissed ? <PhoneMissed size={16} color="#ef4444" /> : isCaller ? <PhoneOutgoing size={16} /> : <PhoneIncoming size={16} />}
                          <div className="call-log-content">
                            <strong>{isMissed ? 'Missed Call' : msg.status === 'completed' ? 'Call Ended' : 'Cancelled Call'}</strong>
                            <span>{msg.durationSeconds ? `${Math.floor(msg.durationSeconds / 60)}m ${msg.durationSeconds % 60}s` : formatTime(msg.timestamp)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  const isOwn = msg.senderId === currentUser.uid;
                  return (
                    <div key={msg.id} className={`chat-bubble-wrapper ${isOwn ? 'own' : ''}`}>
                      <div className="chat-bubble">
                        <p>{msg.text}</p>
                        <span className="msg-time">{formatTime(msg.timestamp)}</span>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input */}
            <div className="chat-input-container">
              <form className="chat-input-box" onSubmit={handleSendMessage}>
                <button type="button" className="input-action-btn"><Paperclip size={20} /></button>
                <input 
                  type="text" 
                  placeholder="Type a message..." 
                  className="main-chat-input" 
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                />
                <button type="button" className="input-action-btn"><Smile size={20} /></button>
                <button type="submit" className="input-send-btn" disabled={!newMessage.trim()}><Send size={18} /></button>
              </form>
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
