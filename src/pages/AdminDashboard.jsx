import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase/firebase';
import { signOut } from 'firebase/auth';
import { collection, query, where, getDocs, doc, runTransaction, increment, getCountFromServer } from 'firebase/firestore';

function AdminDashboard() {
  const [requests, setRequests] = useState([]);
  const [transactionCount, setTransactionCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processingId, setProcessingId] = useState(null);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const fetchDashboardData = async () => {
    try {
      setError(null);
      setLoading(true);

      // Fetch pending redemption requests
      const q = query(collection(db, "redemptionRequests"), where("status", "==", "pending"));
      const querySnapshot = await getDocs(q);
      const requestsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRequests(requestsData);

      // Fetch total transaction count
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
              <div style={cardValueStyle}>0</div>
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
