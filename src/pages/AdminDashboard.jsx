
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase/firebase';
import { signOut } from 'firebase/auth';
import { collection, query, where, getDocs, doc, runTransaction, increment, getCountFromServer, setDoc, serverTimestamp, deleteDoc, onSnapshot } from 'firebase/firestore';

function AdminDashboard() {
  const [requests, setRequests] = useState([]);
  const [users, setUsers] = useState([]);
  const [transactionCount, setTransactionCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processingId, setProcessingId] = useState(null);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementMessage, setAnnouncementMessage] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [currentAnnouncement, setCurrentAnnouncement] = useState(null);
  const [announcementLoading, setAnnouncementLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      setError(null);
      setLoading(true);

      const usersQuery = query(collection(db, "users"));
      const usersSnapshot = await getDocs(usersQuery);
      const usersData = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(usersData);

      const q = query(collection(db, "redemptionRequests"), where("status", "==", "pending"));
      const querySnapshot = await getDocs(q);
      const requestsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRequests(requestsData);

      const transactionsCollection = collection(db, 'transactions');
      const snapshot = await getCountFromServer(transactionsCollection);
      setTransactionCount(snapshot.data().count);

    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      setError("Failed to fetch dashboard data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    const announcementRef = doc(db, 'announcements', 'current');
    const unsubscribe = onSnapshot(announcementRef, (docSnap) => {
        if (docSnap.exists()) {
            setCurrentAnnouncement({ id: docSnap.id, ...docSnap.data() });
        } else {
            setCurrentAnnouncement(null);
        }
        setAnnouncementLoading(false);
    }, (error) => {
        console.error("Error fetching current announcement:", error);
        setError("Failed to fetch current announcement.");
        setAnnouncementLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleRequest = async (requestId, userId, requestedPoints, action) => {
    if (processingId) return;

    setProcessingId(requestId);
    setMessage('');
    setError(null);

    try {
      await runTransaction(db, async (transaction) => {
        const requestRef = doc(db, "redemptionRequests", requestId);
        const userRef = doc(db, "users", userId);

        const requestDoc = await transaction.get(requestRef);

        if (!requestDoc.exists() || requestDoc.data().status !== 'pending') {
          throw new Error("This request has already been processed.");
        }

        const newStatus = action === 'approve' ? 'approved' : 'rejected';

        transaction.update(requestRef, { status: newStatus });

        if (action === 'approve') {
          transaction.update(userRef, {
            processingPoints: increment(-requestedPoints),
            redeemedPoints: increment(requestedPoints)
          });
        } else { // reject
          transaction.update(userRef, {
            processingPoints: increment(-requestedPoints),
            pointsEarned: increment(requestedPoints)
          });
        }
      });

      setMessage(`Request has been ${action}d successfully.`);
      setRequests(prev => prev.filter(req => req.id !== requestId));

    } catch (err) {
      console.error(`Error ${action}ing request:`, err);
      if (err.message === "This request has already been processed.") {
          setError(err.message);
          setRequests(prev => prev.filter(req => req.id !== requestId));
      } else {
          setError(`Failed to ${action} request. Please try again.`);
      }
    } finally {
      setProcessingId(null);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error("Error signing out: ", error);
      setError("Failed to log out. Please try again.");
    }
  };

  const handlePublishAnnouncement = async () => {
    if (!announcementTitle || !announcementMessage) {
      setError("Please fill in both the title and message for the announcement.");
      return;
    }
    setError(null);
    setMessage('');
    try {
      const announcementRef = doc(db, 'announcements', 'current');
      await setDoc(announcementRef, {
        title: announcementTitle,
        message: announcementMessage,
        active: true,
        createdAt: serverTimestamp(),
      });
      setMessage("Announcement published successfully!");
      setAnnouncementTitle('');
      setAnnouncementMessage('');
    } catch (err) {
      console.error("Error publishing announcement:", err);
      setError("Failed to publish announcement. Please try again.");
    }
  };

  const handleDeleteAnnouncement = async () => {
    setError(null);
    setMessage('');
    try {
        const announcementRef = doc(db, 'announcements', 'current');
        await deleteDoc(announcementRef);
        setMessage("Current announcement has been deleted successfully!");
    } catch (err) {
        console.error("Error deleting announcement:", err);
        setError("Failed to delete announcement. Please try again.");
    } finally {
        setShowDeleteModal(false);
    }
  };

  const calculateInr = (points) => {
    return ((points / 100) * 10).toFixed(2);
  };

  // Styles
  const pageStyle = {
    fontFamily: `'Segoe UI', Tahoma, Geneva, Verdana, sans-serif`,
    backgroundColor: '#f4f7f6',
    color: '#333',
    minHeight: '100vh',
  };

  const navStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 2rem',
    backgroundColor: 'white',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    position: 'sticky',
    top: 0,
    zIndex: 1000,
  };

  const navTitleStyle = {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#4a00e0'
  };

  const logoutButtonStyle = {
    padding: '0.5rem 1rem',
    borderRadius: '8px',
    border: 'none',
    background: '#ff6b6b',
    color: 'white',
    fontSize: '0.9rem',
    cursor: 'pointer',
    transition: 'background 0.3s'
  };

  const mainContentStyle = {
    padding: '2rem',
    maxWidth: '1400px',
    margin: '0 auto'
  };

  const headerStyle = {
    fontSize: '2.5rem',
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#4a00e0',
    marginBottom: '2rem'
  };

  const statsContainerStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '2rem',
    marginBottom: '3rem'
  };

  const statCardStyle = {
    padding: '2rem',
    borderRadius: '12px',
    color: 'white',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    background: 'linear-gradient(to right, #4a00e0, #8e2de2)'
  };

  const cardValueStyle = { fontSize: '3rem', fontWeight: 'bold', marginBottom: '0.5rem' };
  const cardTitleStyle = { fontSize: '1.2rem', opacity: 0.9 };

  const sectionTitleStyle = {
    fontSize: '2rem',
    fontWeight: '600',
    marginTop: '3rem',
    marginBottom: '1.5rem',
    borderBottom: '2px solid #e0e0e0',
    paddingBottom: '0.5rem'
  };

  const requestsContainerStyle = {
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: '2rem',
      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
  };
  
  const requestCardStyle = {
      padding: '1.5rem',
      border: '1px solid #e0e0e0',
      borderRadius: '8px',
      marginBottom: '1rem',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: '1rem'
  };
  
  const buttonStyle = {
      padding: '0.6rem 1.2rem',
      borderRadius: '8px',
      border: 'none',
      color: 'white',
      fontSize: '0.9rem',
      cursor: 'pointer',
      transition: 'opacity 0.3s',
      margin: '0 5px'
  }

  const announcementFormStyle = {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '2rem',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
  };

  const inputStyle = {
    width: '100%',
    padding: '0.8rem',
    borderRadius: '8px',
    border: '1px solid #ccc',
    marginBottom: '1rem',
    fontSize: '1rem'
  };

  const textareaStyle = {
    width: '100%',
    padding: '0.8rem',
    borderRadius: '8px',
    border: '1px solid #ccc',
    marginBottom: '1rem',
    fontSize: '1rem',
    minHeight: '100px'
  };

  const tableStyle = {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '1.5rem',
  };

  const thStyle = {
    border: '1px solid #ddd',
    padding: '8px',
    textAlign: 'left',
    backgroundColor: '#f2f2f2',
  };

  const tdStyle = {
    border: '1px solid #ddd',
    padding: '8px',
  };
  
  const modalOverlayStyle = {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 2000,
  };

  const modalContentStyle = {
      background: 'white',
      padding: '2rem',
      borderRadius: '12px',
      boxShadow: '0 5px 15px rgba(0,0,0,0.3)',
      maxWidth: '500px',
      width: '90%',
      textAlign: 'center',
  };

  return (
    <div style={pageStyle}>
      <nav style={navStyle}>
        <div style={navTitleStyle}>GrowthQuest Admin</div>
        <button style={logoutButtonStyle} onClick={handleLogout}>Logout</button>
      </nav>

      <main style={mainContentStyle}>
        <header style={headerStyle}>GrowthQuest Admin Dashboard</header>
        
        {message && <p style={{color: 'green', textAlign: 'center'}}>{message}</p>}
        {error && <p style={{color: 'red', textAlign: 'center'}}>{error}</p>}

        <section>
          <div style={statsContainerStyle}>
            <div style={statCardStyle}>
              <div style={cardValueStyle}>{loading ? '...' : users.length}</div>
              <div style={cardTitleStyle}>Total Users</div>
            </div>
            <div style={{...statCardStyle, background: 'linear-gradient(to right, #ff7e5f, #feb47b)'}}>
              <div style={cardValueStyle}>{loading ? '...' : requests.length}</div>
              <div style={cardTitleStyle}>Pending Redemption Requests</div>
            </div>
            <div style={{...statCardStyle, background: 'linear-gradient(to right, #00c6ff, #0072ff)'}}>
              <div style={cardValueStyle}>{loading ? '...' : transactionCount}</div>
              <div style={cardTitleStyle}>Total Transactions</div>
            </div>
          </div>
        </section>

        <section>
          <h2 style={sectionTitleStyle}>Announcement Management</h2>
          <div style={announcementFormStyle}>
            <input
              type="text"
              style={inputStyle}
              placeholder="Announcement Title"
              value={announcementTitle}
              onChange={(e) => setAnnouncementTitle(e.target.value)}
            />
            <textarea
              style={textareaStyle}
              placeholder="Announcement Message"
              value={announcementMessage}
              onChange={(e) => setAnnouncementMessage(e.target.value)}
            />
            <button
              style={{...buttonStyle, background: '#4a00e0', width: '100%'}}
              onClick={handlePublishAnnouncement}
            >
              Publish Announcement
            </button>
          </div>
        </section>

        <section>
            <h2 style={sectionTitleStyle}>Current Announcement</h2>
            <div style={announcementFormStyle}>
                {announcementLoading ? (
                    <p>Loading announcement...</p>
                ) : currentAnnouncement ? (
                    <div>
                        <h3 style={{fontSize: '1.2rem', fontWeight: 'bold'}}>{currentAnnouncement.title}</h3>
                        <p style={{margin: '1rem 0'}}>{currentAnnouncement.message}</p>
                        <p style={{fontSize: '0.8rem', color: '#666'}}>
                            Published on: {currentAnnouncement.createdAt?.toDate().toLocaleString()}
                        </p>
                        <button
                            style={{...buttonStyle, background: '#dc3545', width: '100%', marginTop: '1rem'}}
                            onClick={() => setShowDeleteModal(true)}
                        >
                            Delete Announcement
                        </button>
                    </div>
                ) : (
                    <p>No active announcement.</p>
                )}
            </div>
        </section>

        {showDeleteModal && (
            <div style={modalOverlayStyle}>
                <div style={modalContentStyle}>
                    <h3 style={{fontSize: '1.5rem', marginBottom: '1rem'}}>Confirm Deletion</h3>
                    <p>Are you sure you want to delete the current announcement? This action cannot be undone.</p>
                    <div style={{marginTop: '2rem'}}>
                        <button style={{...buttonStyle, background: '#dc3545', marginRight: '1rem'}} onClick={handleDeleteAnnouncement}>Confirm Delete</button>
                        <button style={{...buttonStyle, background: '#6c757d'}} onClick={() => setShowDeleteModal(false)}>Cancel</button>
                    </div>
                </div>
            </div>
        )}

        <section>
          <h2 style={sectionTitleStyle}>User Information</h2>
          <div style={requestsContainerStyle}>
            {loading ? <p>Loading users...</p> : 
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Username</th>
                    <th style={thStyle}>Email</th>
                    <th style={thStyle}>Points Earned</th>
                    <th style={thStyle}>UPI ID</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id}>
                      <td style={tdStyle}>{user.username}</td>
                      <td style={tdStyle}>{user.email}</td>
                      <td style={tdStyle}>{user.pointsEarned}</td>
                      <td style={tdStyle}>{user.upiId || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            }
          </div>
        </section>

        <section>
          <h2 style={sectionTitleStyle}>Pending Redemption Requests</h2>
          <div style={requestsContainerStyle}>
             {loading && <p>Loading requests...</p>}
             {!loading && requests.length === 0 && (
                <p>No pending requests.</p>
             )}
             {!loading && requests.length > 0 && (
                <div>
                    {requests.map(req => (
                        <div key={req.id} style={requestCardStyle}>
                            <div>
                                <p style={{fontWeight: 'bold', fontSize: '1.1rem'}}>{req.username}</p>
                                <p style={{color: '#555'}}>{req.timestamp?.toDate().toLocaleDateString()}</p>
                            </div>
                            <div>
                                <p style={{fontWeight: '600'}}>{req.requestedPoints} Points</p>
                                <p style={{color: '#0072ff'}}>≈ ₹{calculateInr(req.requestedPoints)}</p>
                            </div>
                            <div>
                                <button 
                                  style={{...buttonStyle, background: '#28a745'}}
                                  onClick={() => handleRequest(req.id, req.userId, req.requestedPoints, 'approve')}
                                  disabled={processingId === req.id}
                                >
                                  {processingId === req.id ? 'Processing...' : 'Approve'}
                                </button>
                                <button 
                                  style={{...buttonStyle, background: '#dc3545'}}
                                  onClick={() => handleRequest(req.id, req.userId, req.requestedPoints, 'reject')}
                                  disabled={processingId === req.id}
                                >
                                  {processingId === req.id ? 'Processing...' : 'Reject'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
             )}
          </div>
        </section>

      </main>
    </div>
  );
}

export default AdminDashboard;
