import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, getDoc, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useCall } from '../../contexts/CallContext';
import Avatar from '../../components/Avatar/Avatar';
import { Phone, Video, PhoneMissed, PhoneIncoming, PhoneOutgoing, Clock } from 'lucide-react';
import './RecentCallsPage.css';

const formatDuration = (seconds) => {
  if (!seconds) return '0s';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
};

const formatTime = (timestamp) => {
  if (!timestamp) return '';
  const date = timestamp.toDate();
  const today = new Date();
  const isToday = date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
  
  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (isToday) return `Today, ${timeStr}`;
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.getDate() === yesterday.getDate() && date.getMonth() === yesterday.getMonth() && date.getFullYear() === yesterday.getFullYear();
  if (isYesterday) return `Yesterday, ${timeStr}`;

  return `${date.toLocaleDateString()} ${timeStr}`;
};

const RecentCallsPage = () => {
  const { currentUser } = useAuth();
  const { placeCall, callState } = useCall();
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [usersCache, setUsersCache] = useState({});

  useEffect(() => {
    const fetchCalls = async () => {
      if (!currentUser) return;
      try {
        const callsRef = collection(db, 'call_logs');
        
        // Fetch where user is caller
        const qCaller = query(callsRef, where('callerId', '==', currentUser.uid));
        const snapCaller = await getDocs(qCaller);
        
        // Fetch where user is callee
        const qCallee = query(callsRef, where('calleeId', '==', currentUser.uid));
        const snapCallee = await getDocs(qCallee);

        let allCalls = [];
        snapCaller.forEach(d => allCalls.push({ id: d.id, ...d.data() }));
        snapCallee.forEach(d => allCalls.push({ id: d.id, ...d.data() }));

        // Deduplicate just in case
        const uniqueCalls = Array.from(new Map(allCalls.map(c => [c.id, c])).values());
        
        // Sort by timestamp descending
        uniqueCalls.sort((a, b) => {
          const tA = a.timestamp?.toMillis() || 0;
          const tB = b.timestamp?.toMillis() || 0;
          return tB - tA;
        });

        // Resolve user profiles
        const cache = { ...usersCache };
        for (const call of uniqueCalls) {
          const otherId = call.callerId === currentUser.uid ? call.calleeId : call.callerId;
          if (!cache[otherId]) {
            const userSnap = await getDoc(doc(db, 'users', otherId));
            if (userSnap.exists()) {
              cache[otherId] = userSnap.data();
            } else {
              cache[otherId] = { displayName: 'Unknown User' };
            }
          }
        }
        
        setUsersCache(cache);
        setCalls(uniqueCalls);
      } catch (error) {
        console.error("Failed to fetch calls:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCalls();
  }, [currentUser]);

  const handleCallback = async (callLog) => {
    if (callState !== 'idle') return;
    const targetId = callLog.callerId === currentUser.uid ? callLog.calleeId : callLog.callerId;
    try {
      await placeCall(targetId, { video: callLog.type === 'video' });
    } catch (e) {
      alert("Failed to call: " + e.message);
    }
  };

  return (
    <div className="recent-calls-page">
      <div className="calls-header">
        <h1>Recent Calls</h1>
        <p>Your call history</p>
      </div>

      <div className="calls-list">
        {loading ? (
          <div className="loading-state">Loading history...</div>
        ) : calls.length > 0 ? (
          calls.map(call => {
            const isOutgoing = call.callerId === currentUser.uid;
            const otherUser = usersCache[isOutgoing ? call.calleeId : call.callerId] || {};
            const isMissed = !isOutgoing && (call.status === 'missed' || call.status === 'declined');
            
            let statusIcon;
            if (isMissed) {
              statusIcon = <PhoneMissed size={20} />;
            } else if (isOutgoing) {
              statusIcon = <PhoneOutgoing size={20} />;
            } else {
              statusIcon = <PhoneIncoming size={20} />;
            }

            return (
              <div key={call.id} className="call-log-card">
                <div className="call-info-left">
                  <div className={`call-icon-wrapper ${isMissed ? 'missed' : call.status === 'completed' ? 'completed' : 'declined'}`}>
                    {statusIcon}
                  </div>
                  <Avatar name={otherUser.displayName} src={otherUser.photoURL} size="medium" />
                  <div className="call-details">
                    <h3 style={{ color: isMissed ? '#ef4444' : undefined }}>
                      {otherUser.displayName || 'Unknown'}
                    </h3>
                    <div className="call-meta">
                      <span>
                        {call.type === 'video' ? <Video size={14} /> : <Phone size={14} />}
                        {call.type === 'video' ? 'Video' : 'Voice'}
                      </span>
                      <span>•</span>
                      <span style={{ textTransform: 'capitalize' }}>{call.status}</span>
                    </div>
                  </div>
                </div>

                <div className="call-time-right">
                  <span className="call-date">{formatTime(call.timestamp)}</span>
                  {call.status === 'completed' && (
                    <span className="call-duration">
                      <Clock size={12} style={{ marginRight: '4px', display: 'inline-block', verticalAlign: 'middle' }}/>
                      {formatDuration(call.durationSeconds)}
                    </span>
                  )}
                  <button 
                    className="call-back-btn"
                    onClick={() => handleCallback(call)}
                    title={`Call back with ${call.type}`}
                    disabled={callState !== 'idle'}
                  >
                    {call.type === 'video' ? <Video size={20} /> : <Phone size={20} />}
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="empty-state">
            <p>No recent calls found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecentCallsPage;
