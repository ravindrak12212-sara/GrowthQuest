import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import GQBuddyChat from './GQBuddyChat';

const GQBuddyButton = ({ user }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!user) return;
    const convRef = doc(db, 'gqBuddyConversations', user.uid);
    const unsubscribe = onSnapshot(convRef, (docSnap) => {
      if (docSnap.exists()) {
        setUnreadCount(docSnap.data().unreadForUser || 0);
      } else {
        setUnreadCount(0);
      }
    }, (err) => {
      console.error("Error listening to gqBuddyConversations:", err);
    });
    return () => unsubscribe();
  }, [user]);

  if (!user) return null;

  return (
    <div id="gq-buddy-container" style={{ position: 'fixed', bottom: isMobile ? '1rem' : '2rem', right: isMobile ? '1rem' : '2rem', zIndex: 10000, fontFamily: 'sans-serif' }}>
      {isOpen && (
        <GQBuddyChat user={user} onClose={() => setIsOpen(false)} />
      )}
      <button
        id="gq-buddy-toggle-btn"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          backgroundColor: '#4a00e0',
          color: 'white',
          border: 'none',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          cursor: 'pointer',
          position: 'relative',
          transition: 'all 0.3s ease',
        }}
        onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
        onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
      >
        <span style={{ fontSize: '28px', lineHeight: '1' }}>🤖</span>
        {unreadCount > 0 && (
          <span
            id="gq-buddy-unread-badge"
            style={{
              position: 'absolute',
              top: '-5px',
              right: '-5px',
              backgroundColor: '#ff3b30',
              color: 'white',
              borderRadius: '50%',
              padding: '0.2rem 0.6rem',
              fontSize: '0.8rem',
              fontWeight: 'bold',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            }}
          >
            {unreadCount}
          </span>
        )}
      </button>
    </div>
  );
};

export default GQBuddyButton;
