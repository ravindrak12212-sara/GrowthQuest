import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../firebase/firebase';
import { collection, doc, query, orderBy, onSnapshot, addDoc, updateDoc, serverTimestamp, increment } from 'firebase/firestore';

const GQBuddyAdminChat = ({ userId, userDetails, onBack }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);

  // Reset unread count for admin when opening the chat
  useEffect(() => {
    if (!userId) return;
    const markAsReadByAdmin = async () => {
      try {
        const convRef = doc(db, 'gqBuddyConversations', userId);
        await updateDoc(convRef, { unreadForAdmin: 0 });
      } catch (err) {
        console.error("Error marking as read by admin:", err);
      }
    };
    markAsReadByAdmin();
  }, [userId, messages]);

  // Listen to messages
  useEffect(() => {
    if (!userId) return;
    const msgsRef = collection(db, 'gqBuddyConversations', userId, 'messages');
    const q = query(msgsRef, orderBy('timestamp', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
      console.error("Error listening to admin messages:", err);
    });
    return () => unsubscribe();
  }, [userId]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const messageText = newMessage.trim();
    setNewMessage('');

    try {
      const convRef = doc(db, 'gqBuddyConversations', userId);
      const msgRef = collection(db, 'gqBuddyConversations', userId, 'messages');

      // Add to messages subcollection
      await addDoc(msgRef, {
        senderId: 'admin',
        senderType: 'admin',
        message: messageText,
        timestamp: serverTimestamp(),
      });

      // Update main conversation
      await updateDoc(convRef, {
        lastMessage: messageText,
        lastMessageAt: serverTimestamp(),
        unreadForUser: increment(1),
        unreadForAdmin: 0,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("Error sending admin message:", err);
    }
  };

  return (
    <div
      id="gq-buddy-admin-chat-window"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        overflow: 'hidden',
        border: '1px solid #e0e0e0',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '1rem',
          backgroundColor: '#4a00e0',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
        }}
      >
        {onBack && (
          <button
            id="gq-buddy-admin-back-btn"
            onClick={onBack}
            style={{
              background: 'none',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span style={{ fontSize: '20px', lineHeight: '1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>⬅️</span>
          </button>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <span id="admin-chat-user-title" style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
            {userDetails?.username || 'User Chat'}
          </span>
          <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>
            {userDetails?.email || userId}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div
        id="admin-chat-messages-container"
        style={{
          flex: 1,
          padding: '1.5rem',
          overflowY: 'auto',
          backgroundColor: '#f8f9fa',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        {messages.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#888', marginTop: '4rem' }}>
            <p>No messages in this conversation yet.</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isAdmin = msg.senderType === 'admin';
            return (
              <div
                key={msg.id}
                style={{
                  alignSelf: isAdmin ? 'flex-end' : 'flex-start',
                  maxWidth: '70%',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <div
                  style={{
                    padding: '0.7rem 1rem',
                    borderRadius: '12px',
                    backgroundColor: isAdmin ? '#4a00e0' : '#e9ecef',
                    color: isAdmin ? 'white' : '#333',
                    fontSize: '0.95rem',
                    lineHeight: '1.4',
                    wordBreak: 'break-word',
                  }}
                >
                  {msg.message}
                </div>
                <span
                  style={{
                    fontSize: '0.75rem',
                    color: '#999',
                    marginTop: '0.3rem',
                    alignSelf: isAdmin ? 'flex-end' : 'flex-start',
                  }}
                >
                  {msg.timestamp?.toDate ? msg.timestamp.toDate().toLocaleString() : 'Just now'}
                </span>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form
        id="admin-chat-input-form"
        onSubmit={handleSendMessage}
        style={{
          padding: '1rem',
          borderTop: '1px solid #e0e0e0',
          display: 'flex',
          gap: '0.8rem',
          backgroundColor: 'white',
        }}
      >
        <input
          id="admin-chat-text-input"
          type="text"
          placeholder="Type your reply here..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          style={{
            flex: 1,
            padding: '0.8rem',
            borderRadius: '8px',
            border: '1px solid #ccc',
            fontSize: '1rem',
            outline: 'none',
          }}
        />
        <button
          id="admin-chat-send-btn"
          type="submit"
          style={{
            backgroundColor: '#4a00e0',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '0 1.5rem',
            fontSize: '1rem',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          Send <span style={{ fontSize: '16px', lineHeight: '1' }}>➡️</span>
        </button>
      </form>
    </div>
  );
};

export default GQBuddyAdminChat;
