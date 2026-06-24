import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/firebase';
import { collection, query, orderBy, limit, getDocs, startAfter, onSnapshot } from 'firebase/firestore';
import GQBuddyAdminChat from './GQBuddyAdminChat';

const GQBuddyAdmin = ({ users }) => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [lastVisible, setLastVisible] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [totalUnread, setTotalUnread] = useState(0);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const PAGE_SIZE = 10;

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Real-time listener for conversations to keep unread counts and lists synchronized
  useEffect(() => {
    const qAll = query(collection(db, 'gqBuddyConversations'), orderBy('lastMessageAt', 'desc'));
    const unsubscribe = onSnapshot(qAll, (snapshot) => {
      const allConvs = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(conv => conv.status !== 'system');
      
      // Calculate overall unread conversations count for Admin
      const unread = allConvs.reduce((sum, conv) => sum + (conv.unreadForAdmin || 0), 0);
      setTotalUnread(unread);

      // Handle pagination initial page using real-time sync
      const initialBatch = allConvs.slice(0, PAGE_SIZE);
      setConversations(initialBatch);
      setLastVisible(snapshot.docs[initialBatch.length - 1] || null);
      setHasMore(allConvs.length > initialBatch.length);
      setLoading(false);
    }, (err) => {
      console.error("Error loading conversations:", err);
      setError("Failed to load conversations.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLoadMore = async () => {
    if (!lastVisible || !hasMore) return;
    
    try {
      const qNext = query(
        collection(db, 'gqBuddyConversations'),
        orderBy('lastMessageAt', 'desc'),
        startAfter(lastVisible),
        limit(PAGE_SIZE)
      );
      
      const querySnapshot = await getDocs(qNext);
      const newConvs = querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(conv => conv.status !== 'system');
      
      if (newConvs.length > 0) {
        setConversations(prev => {
          const existingIds = new Set(prev.map(c => c.id));
          const filteredNew = newConvs.filter(c => !existingIds.has(c.id));
          return [...prev, ...filteredNew];
        });
        setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1]);
        setHasMore(querySnapshot.docs.length === PAGE_SIZE);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error("Error loading more conversations:", err);
    }
  };

  // Resolve user details using the shared users list
  const getUserDetails = (userId) => {
    return users?.find(u => u.id === userId) || null;
  };

  // Filter conversations based on search query matching resolved username or email
  const filteredConversations = conversations.filter(conv => {
    const user = getUserDetails(conv.userId);
    const username = user?.username?.toLowerCase() || '';
    const email = user?.email?.toLowerCase() || '';
    const search = searchQuery.toLowerCase();
    return username.includes(search) || email.includes(search);
  });

  const selectedUserDetails = getUserDetails(selectedUserId);

  return (
    <div 
      id="gq-buddy-admin-panel" 
      style={{ 
        display: 'flex', 
        flexDirection: isMobile ? 'column' : 'row',
        gap: isMobile ? '1rem' : '2rem', 
        height: isMobile ? 'calc(100vh - 180px)' : '650px', 
        minHeight: isMobile ? '450px' : '650px',
        fontFamily: 'sans-serif', 
        marginTop: '1rem' 
      }}
    >
      {/* Conversations Sidebar */}
      {(!isMobile || !selectedUserId) && (
        <div
          id="gq-buddy-admin-sidebar"
          style={{
            width: isMobile ? '100%' : '350px',
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            border: '1px solid #e0e0e0',
            flex: isMobile ? 1 : 'none',
          }}
        >
          {/* Search Input and status badge */}
          <div style={{ padding: '1rem', borderBottom: '1px solid #e0e0e0', backgroundColor: '#f8f9fa' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <span style={{ position: 'absolute', left: '10px', color: '#999', fontSize: '16px', display: 'flex', alignItems: 'center' }}>🔍</span>
              <input
                id="gq-buddy-admin-search"
                type="text"
                placeholder="Search user or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.6rem 0.6rem 2.2rem',
                  borderRadius: '8px',
                  border: '1px solid #ccc',
                  fontSize: '0.9rem',
                  outline: 'none',
                }}
              />
            </div>
            {totalUnread > 0 && (
              <div id="admin-unread-conversations-summary" style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#ff3b30', fontWeight: 'bold' }}>
                🔴 {totalUnread} unread conversations
              </div>
            )}
          </div>

          {/* Conversation List */}
          <div id="admin-conversations-list" style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', flexDirection: 'column', gap: '0.5rem' }}>
                <style>{`
                  @keyframes gq-admin-spin {
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
                  animation: 'gq-admin-spin 1s linear infinite'
                }} />
                <span style={{ fontSize: '0.9rem', color: '#666' }}>Loading conversations...</span>
              </div>
            ) : error ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#dc3545' }}>
                <span style={{ fontSize: '24px', display: 'block', margin: '0 auto 0.5rem', textAlign: 'center' }}>⚠️</span>
                <p>{error}</p>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>
                <p>No conversations found.</p>
              </div>
            ) : (
              <>
                {filteredConversations.map((conv) => {
                  const user = getUserDetails(conv.userId);
                  const isSelected = selectedUserId === conv.userId;
                  return (
                    <div
                      key={conv.id}
                      onClick={() => setSelectedUserId(conv.userId)}
                      style={{
                        padding: '1rem',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        backgroundColor: isSelected ? '#f0f3ff' : 'transparent',
                        borderLeft: conv.unreadForAdmin > 0 ? '4px solid #4a00e0' : '4px solid transparent',
                        transition: 'background-color 0.2s',
                        marginBottom: '0.4rem',
                        borderBottom: '1px solid #f0f0f0',
                      }}
                      onMouseOver={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = '#f8f9fa'; }}
                      onMouseOut={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                        <span style={{ fontWeight: conv.unreadForAdmin > 0 ? 'bold' : '500', color: '#333', fontSize: '0.95rem' }}>
                          {user?.username || 'Unknown User'}
                        </span>
                        {conv.unreadForAdmin > 0 && (
                          <span
                            style={{
                              backgroundColor: '#ff3b30',
                              color: 'white',
                              borderRadius: '50%',
                              padding: '0.1rem 0.4rem',
                              fontSize: '0.75rem',
                              fontWeight: 'bold',
                            }}
                          >
                            {conv.unreadForAdmin}
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          fontSize: '0.8rem',
                          color: conv.unreadForAdmin > 0 ? '#111' : '#666',
                          fontWeight: conv.unreadForAdmin > 0 ? '500' : 'normal',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {conv.lastMessage || 'No messages yet.'}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#999', marginTop: '0.4rem', textAlign: 'right' }}>
                        {conv.lastMessageAt?.toDate ? conv.lastMessageAt.toDate().toLocaleDateString() : ''}
                      </div>
                    </div>
                  );
                })}
                
                {hasMore && (
                  <button
                    id="gq-buddy-load-more-btn"
                    onClick={handleLoadMore}
                    style={{
                      width: '100%',
                      padding: '0.6rem',
                      backgroundColor: '#f1f1f1',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#4a00e0',
                      fontSize: '0.85rem',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      marginTop: '0.5rem',
                      transition: 'background-color 0.2s',
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#e5e5e5'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#f1f1f1'}
                  >
                    Load More Conversations
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Chat window viewport */}
      {(!isMobile || selectedUserId) && (
        <div style={{ flex: 1, height: '100%' }}>
          {selectedUserId ? (
            <GQBuddyAdminChat 
              userId={selectedUserId} 
              userDetails={selectedUserDetails} 
              onBack={isMobile ? () => setSelectedUserId(null) : null}
            />
          ) : (
            <div
              id="gq-buddy-admin-placeholder"
              style={{
                height: '100%',
                backgroundColor: 'white',
                borderRadius: '12px',
                border: '1px solid #e0e0e0',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                color: '#888',
                padding: '2rem',
              }}
            >
              <span style={{ fontSize: '48px', color: '#ccc', marginBottom: '1rem', display: 'block', textAlign: 'center' }}>🤖</span>
              <p style={{ fontSize: '1.1rem', fontWeight: 'bold', margin: '0 0 0.5rem' }}>GQ Buddy Admin Console</p>
              <p style={{ fontSize: '0.9rem' }}>Select a conversation from the left side to reply or chat.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GQBuddyAdmin;
