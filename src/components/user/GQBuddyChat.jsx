import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../firebase/firebase';
import { collection, doc, query, orderBy, onSnapshot, addDoc, updateDoc, serverTimestamp, setDoc, increment, getDoc } from 'firebase/firestore';

const GQBuddyChat = ({ user, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
  const [convStatus, setConvStatus] = useState('system');

  const quickActions = [
    { id: 'connect', label: '📞 Connect with Admin' },
    { id: 'rewards', label: '🎁 Rewards & Redeem Help' },
    { id: 'issue', label: '🐞 Report an Issue' },
    { id: 'help', label: '❓ General Help' },
    { id: 'faqs', label: '📚 FAQs' }
  ];

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Listen to the conversation document to check status
  useEffect(() => {
    if (!user) return;
    const convRef = doc(db, 'gqBuddyConversations', user.uid);
    const unsubscribe = onSnapshot(convRef, (snapshot) => {
      if (snapshot.exists()) {
        setConvStatus(snapshot.data().status || 'system');
      } else {
        setConvStatus('system');
      }
    });
    return () => unsubscribe();
  }, [user]);

  // Automatically initialize welcome message for brand new users
  useEffect(() => {
    if (!user) return;
    const checkAndCreateWelcome = async () => {
      try {
        const convRef = doc(db, 'gqBuddyConversations', user.uid);
        const convSnap = await getDoc(convRef);
        if (!convSnap.exists()) {
          // Initialize conversation document with status 'system'
          await setDoc(convRef, {
            userId: user.uid,
            status: 'system',
            lastMessage: '👋 Welcome to Growth Quest Support. How may I assist you today?',
            lastMessageAt: serverTimestamp(),
            unreadForAdmin: 0,
            unreadForUser: 0,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });

          // Add the first automated system welcome message
          const msgRef = collection(db, 'gqBuddyConversations', user.uid, 'messages');
          await addDoc(msgRef, {
            senderId: 'system',
            senderType: 'system',
            message: "👋 Welcome to Growth Quest Support.\n\nHow may I assist you today?\n\nPlease choose an option below.",
            timestamp: serverTimestamp(),
          });
        }
      } catch (err) {
        console.error("Error setting up welcome message:", err);
      }
    };
    checkAndCreateWelcome();
  }, [user]);

  // Mark conversations as read for user
  useEffect(() => {
    if (!user) return;
    const markAsRead = async () => {
      try {
        const convRef = doc(db, 'gqBuddyConversations', user.uid);
        await updateDoc(convRef, { unreadForUser: 0 });
      } catch (err) {
        // Conversation doc might not exist yet, ignore
      }
    };
    markAsRead();
  }, [user, messages]);

  // Listen to messages
  useEffect(() => {
    if (!user) return;
    const msgsRef = collection(db, 'gqBuddyConversations', user.uid, 'messages');
    const q = query(msgsRef, orderBy('timestamp', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
      console.error("Error listening to messages:", err);
    });
    return () => unsubscribe();
  }, [user]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleQuickAction = async (actionId, label) => {
    try {
      const convRef = doc(db, 'gqBuddyConversations', user.uid);
      const msgRef = collection(db, 'gqBuddyConversations', user.uid, 'messages');

      // 1. Add user click selection to chat
      await addDoc(msgRef, {
        senderId: user.uid,
        senderType: 'user',
        message: label,
        timestamp: serverTimestamp(),
      });

      // 2. Prepare system reply
      let systemReply = '';
      let isEscalating = false;

      switch (actionId) {
        case 'connect':
          systemReply = "✅ Your request has been forwarded to the Growth Quest Admin team.\n\nPlease describe your question or issue in detail.";
          isEscalating = true;
          break;
        case 'rewards':
          systemReply = "🎁 Rewards can be redeemed from the Redeem section.\n\nIf you need further help, select Connect with Admin.";
          break;
        case 'issue':
          systemReply = "🐞 Please describe the issue you are facing.\n\nInclude screenshots or detailed steps if possible.";
          break;
        case 'help':
          systemReply = "❓ Please tell us how we can help.\n\nA team member will respond if additional assistance is required.";
          break;
        case 'faqs':
          systemReply = "📚 Frequently Asked Questions\n\n• 100 Points = ₹10\n• Rewards can be redeemed from Redeem section\n• Quiz rewards are credited automatically\n• Poll rewards are credited after successful submission\n\nNeed further assistance?\n\n📞 Connect with Admin";
          break;
        default:
          break;
      }

      // 3. Add system message
      await addDoc(msgRef, {
        senderId: 'system',
        senderType: 'system',
        message: systemReply,
        timestamp: serverTimestamp(),
      });

      // 4. Update parent conversation status
      const convSnap = await getDoc(convRef);
      const convData = {
        userId: user.uid,
        status: isEscalating ? 'active' : 'system',
        lastMessage: isEscalating ? "📞 Connect with Admin request" : systemReply.split('\n')[0],
        lastMessageAt: serverTimestamp(),
        unreadForAdmin: isEscalating ? increment(1) : 0,
        unreadForUser: 0,
        updatedAt: serverTimestamp(),
      };

      if (!convSnap.exists()) {
        convData.createdAt = serverTimestamp();
      }

      await setDoc(convRef, convData, { merge: true });

    } catch (err) {
      console.error("Error performing quick action:", err);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const messageText = newMessage.trim();
    setNewMessage('');

    try {
      const convRef = doc(db, 'gqBuddyConversations', user.uid);
      const msgRef = collection(db, 'gqBuddyConversations', user.uid, 'messages');

      // 1. Add user message
      await addDoc(msgRef, {
        senderId: user.uid,
        senderType: 'user',
        message: messageText,
        timestamp: serverTimestamp(),
      });

      // 2. If already active with admin, do not intercept with automated system helper
      if (convStatus === 'active') {
        const convSnap = await getDoc(convRef);
        const convData = {
          userId: user.uid,
          status: 'active',
          lastMessage: messageText,
          lastMessageAt: serverTimestamp(),
          unreadForAdmin: increment(1),
          unreadForUser: 0,
          updatedAt: serverTimestamp(),
        };

        if (!convSnap.exists()) {
          convData.createdAt = serverTimestamp();
        }

        await setDoc(convRef, convData, { merge: true });
        return;
      }

      // 3. Otherwise we are in 'system' status. Handle automated greeting detection
      const lowerMsg = messageText.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "").trim();
      const greetings = ['hi', 'hello', 'hey', 'hii', 'good morning', 'good afternoon', 'good evening'];
      const isGreeting = greetings.includes(lowerMsg);

      let systemReply = '';
      if (isGreeting) {
        systemReply = "👋 Hello!\n\nHow may I assist you today?\n\nChoose one of the available options below.";
      } else {
        systemReply = "🤖 I am the Growth Quest automated assistant.\n\nTo speak directly with our team, please click **📞 Connect with Admin** below, or type your query.";
      }

      // Add automated system response
      await addDoc(msgRef, {
        senderId: 'system',
        senderType: 'system',
        message: systemReply,
        timestamp: serverTimestamp(),
      });

      // Update conversation (keep as system)
      const convSnap = await getDoc(convRef);
      const convData = {
        userId: user.uid,
        status: 'system',
        lastMessage: messageText,
        lastMessageAt: serverTimestamp(),
        unreadForAdmin: 0,
        unreadForUser: 0,
        updatedAt: serverTimestamp(),
      };

      if (!convSnap.exists()) {
        convData.createdAt = serverTimestamp();
      }

      await setDoc(convRef, convData, { merge: true });

    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  return (
    <div
      id="gq-buddy-chat-window"
      style={{
        position: 'fixed',
        bottom: isMobile ? '0' : '100px',
        right: isMobile ? '0' : '2rem',
        top: isMobile ? '0' : 'auto',
        left: isMobile ? '0' : 'auto',
        width: isMobile ? '100vw' : '350px',
        height: isMobile ? '100vh' : '450px',
        backgroundColor: 'white',
        borderRadius: isMobile ? '0' : '12px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        border: '1px solid #eee',
        zIndex: 10001,
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
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '20px', lineHeight: '1' }}>🤖</span>
          <span style={{ fontWeight: 'bold' }}>GQ Buddy</span>
        </div>
        <button
          id="gq-buddy-close-btn"
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            fontSize: '20px',
            lineHeight: '1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          ✕
        </button>
      </div>

      {/* Messages */}
      <div
        id="gq-buddy-messages-container"
        style={{
          flex: 1,
          padding: '1rem',
          overflowY: 'auto',
          backgroundColor: '#f9f9f9',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.8rem',
        }}
      >
        {messages.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#888', marginTop: '2rem', padding: '0 1rem' }}>
            <style>{`
              @keyframes gq-buddy-spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
            <div style={{
              width: '24px',
              height: '24px',
              border: '3px solid #e9ecef',
              borderTop: '3px solid #4a00e0',
              borderRadius: '50%',
              margin: '0 auto',
              animation: 'gq-buddy-spin 1s linear infinite'
            }} />
            <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>Loading Support Chat...</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.senderType === 'user';
            return (
              <div
                key={msg.id}
                style={{
                  alignSelf: isUser ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <div
                  style={{
                    padding: '0.6rem 0.9rem',
                    borderRadius: '12px',
                    backgroundColor: isUser ? '#4a00e0' : '#e9ecef',
                    color: isUser ? 'white' : '#333',
                    fontSize: '0.9rem',
                    lineHeight: '1.4',
                    wordBreak: 'break-word',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {msg.message}
                </div>
                <span
                  style={{
                    fontSize: '0.7rem',
                    color: '#999',
                    marginTop: '0.2rem',
                    alignSelf: isUser ? 'flex-end' : 'flex-start',
                  }}
                >
                  {msg.timestamp?.toDate ? msg.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                </span>
              </div>
            );
          })
        )}

        {/* Quick Actions buttons for System Assistant Mode */}
        {convStatus === 'system' && (
          <div
            id="gq-buddy-quick-actions"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              marginTop: '1rem',
              padding: '0.6rem',
              backgroundColor: '#f0f3ff',
              borderRadius: '10px',
              border: '1px solid #dbe2ff',
            }}
          >
            <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#4a00e0', marginBottom: '0.2rem' }}>💡 Quick Support Options:</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {quickActions.map((action) => (
                <button
                  key={action.id}
                  id={`gq-buddy-action-${action.id}`}
                  onClick={() => handleQuickAction(action.id, action.label)}
                  style={{
                    backgroundColor: 'white',
                    border: '1px solid #4a00e0',
                    color: '#4a00e0',
                    borderRadius: '8px',
                    padding: '0.5rem 0.8rem',
                    fontSize: '0.85rem',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontWeight: '500',
                    transition: 'all 0.2s',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = '#4a00e0';
                    e.currentTarget.style.color = 'white';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = 'white';
                    e.currentTarget.style.color = '#4a00e0';
                  }}
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        id="gq-buddy-input-form"
        onSubmit={handleSendMessage}
        style={{
          padding: '0.8rem',
          borderTop: '1px solid #eee',
          display: 'flex',
          gap: '0.5rem',
          backgroundColor: 'white',
        }}
      >
        <input
          id="gq-buddy-text-input"
          type="text"
          placeholder="Type a message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          style={{
            flex: 1,
            padding: '0.6rem',
            borderRadius: '8px',
            border: '1px solid #ccc',
            fontSize: '0.9rem',
            outline: 'none',
          }}
        />
        <button
          id="gq-buddy-send-btn"
          type="submit"
          style={{
            backgroundColor: '#4a00e0',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <span style={{ fontSize: '16px', lineHeight: '1' }}>➡️</span>
        </button>
      </form>
    </div>
  );
};

export default GQBuddyChat;
