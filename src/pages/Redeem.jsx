import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase/firebase';
import { doc, getDoc, collection, serverTimestamp, runTransaction, increment } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

function Redeem() {
  const navigate = useNavigate();
  const user = auth.currentUser;
  const [userData, setUserData] = useState(null);
  const [availablePoints, setAvailablePoints] = useState(0);
  const [requestedPoints, setRequestedPoints] = useState('');
  const [inrValue, setInrValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const MINIMUM_TO_REDEEM = 1000;

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      const userDocRef = doc(db, 'users', user.uid);
      try {
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setUserData(data);
          const available = (data.pointsEarned || 0) - (data.processingPoints || 0);
          setAvailablePoints(available);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        setMessage({ type: 'error', text: 'Could not fetch your points balance.' });
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [user]);

  useEffect(() => {
    const points = parseInt(requestedPoints, 10);
    if (!isNaN(points) && points > 0) {
      setInrValue((points / 100) * 10);
    } else {
      setInrValue(0);
    }
  }, [requestedPoints]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    
    if (availablePoints < MINIMUM_TO_REDEEM) {
      setMessage({ type: 'error', text: `Minimum ${MINIMUM_TO_REDEEM} points are required to submit a redeem request.` });
      return;
    }

    const pointsToRedeem = parseInt(requestedPoints, 10);

    if (isNaN(pointsToRedeem) || pointsToRedeem <= 0) {
      setMessage({ type: 'error', text: 'Please enter a valid number of points greater than 0.' });
      return;
    }

    if (pointsToRedeem > availablePoints) {
      setMessage({ type: 'error', text: 'You do not have enough available points to make this redemption.' });
      return;
    }

    setIsSubmitting(true);

    try {
      await runTransaction(db, async (transaction) => {
        const userDocRef = doc(db, 'users', user.uid);
        const redemptionRequestRef = doc(collection(db, "redemptionRequests"));

        const userDoc = await transaction.get(userDocRef);
        if (!userDoc.exists()) {
          throw new Error("User data not found. Please try again.");
        }
        
        const data = userDoc.data();
        const serverAvailablePoints = (data.pointsEarned || 0) - (data.processingPoints || 0);
        
        if (serverAvailablePoints < MINIMUM_TO_REDEEM) {
          throw new Error(`A minimum of ${MINIMUM_TO_REDEEM} available points is required.`);
        }

        if (pointsToRedeem > serverAvailablePoints) {
          throw new Error("You do not have enough available points. Your balance might have changed.");
        }
        
        transaction.update(userDocRef, {
          pointsEarned: increment(-pointsToRedeem),
          processingPoints: increment(pointsToRedeem)
        });
        
        transaction.set(redemptionRequestRef, {
          userId: user.uid,
          username: user.displayName || 'Anonymous',
          requestedPoints: pointsToRedeem,
          status: 'pending',
          timestamp: serverTimestamp(),
        });
      });

      setMessage({ type: 'success', text: 'Your redemption request is now being processed.' });
      setAvailablePoints(prevBalance => prevBalance - pointsToRedeem);
      setRequestedPoints('');
      setInrValue(0);

    } catch (error) {
      console.error("Error submitting redemption request:", error);
      setMessage({ type: 'error', text: error.message || 'There was an error submitting your request. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const canRedeem = availablePoints >= MINIMUM_TO_REDEEM;
  const pointsNeeded = MINIMUM_TO_REDEEM - availablePoints;
  
  // Styles
  const pageStyle = {
    fontFamily: `'Segoe UI', Tahoma, Geneva, Verdana, sans-serif`,
    backgroundColor: '#f4f7f6',
    color: '#333',
    minHeight: '100vh',
    padding: '2rem',
  };

  const headerStyle = {
    textAlign: 'center',
    marginBottom: '2rem',
  };

  const titleStyle = {
    fontSize: '2.5rem',
    fontWeight: 'bold',
    color: '#4a00e0',
  };

  const balanceStyle = {
    fontSize: '1.2rem',
    color: '#555',
  };

  const formContainerStyle = {
    maxWidth: '500px',
    margin: '0 auto',
    padding: '2rem',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
  };

  const formGroupStyle = {
    marginBottom: '1.5rem',
  };

  const labelStyle = {
    display: 'block',
    marginBottom: '0.5rem',
    fontWeight: '600',
  };

  const inputStyle = {
    width: '100%',
    padding: '0.8rem',
    borderRadius: '8px',
    border: '1px solid #ccc',
    fontSize: '1rem',
  };

  const inrValueStyle = {
    marginTop: '0.5rem',
    fontSize: '1rem',
    color: '#0072ff',
    fontWeight: 'bold',
  };

  const buttonStyle = {
    width: '100%',
    padding: '1rem',
    borderRadius: '8px',
    border: 'none',
    background: 'linear-gradient(to right, #4a00e0, #8e2de2)',
    color: 'white',
    fontSize: '1.1rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'opacity 0.3s',
  };
  
  const messageStyle = (type) => ({
      padding: '1rem',
      borderRadius: '8px',
      marginTop: '1.5rem',
      textAlign: 'center',
      backgroundColor: type === 'success' ? '#d4edda' : '#f8d7da',
      color: type === 'success' ? '#155724' : '#721c24',
  });

  const backButtonStyle = {
    position: 'absolute',
    top: '20px',
    left: '20px',
    padding: '0.5rem 1rem',
    borderRadius: '8px',
    border: '1px solid #ccc',
    background: 'white',
    cursor: 'pointer',
    fontSize: '0.9rem'
  };

  const lockedMessageStyle = {
    padding: '1rem',
    borderRadius: '8px',
    marginTop: '1.5rem',
    textAlign: 'center',
    backgroundColor: '#fff4e6',
    color: '#663c00',
    border: '1px solid #ffeeba',
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div style={pageStyle}>
        <button style={backButtonStyle} onClick={() => navigate('/dashboard')}>
            &larr; Back to Dashboard
        </button>
      <div style={headerStyle}>
        <h1 style={titleStyle}>Redeem Points</h1>
        <p style={balanceStyle}>Your available balance: <strong>{availablePoints} points</strong></p>
      </div>

      <div style={formContainerStyle}>
        <form onSubmit={handleSubmit}>
          <div style={formGroupStyle}>
            <label style={labelStyle} htmlFor="points">Points to Redeem</label>
            <input
              style={inputStyle}
              type="number"
              id="points"
              value={requestedPoints}
              onChange={(e) => setRequestedPoints(e.target.value)}
              placeholder="e.g., 1000"
              required
              disabled={!canRedeem}
            />
          </div>
          <div style={inrValueStyle}>
            Equivalent to: ₹{inrValue.toFixed(2)}
          </div>
          
          <div style={formGroupStyle}>
              <p style={{fontSize: '0.9rem', color: '#888'}}>Note: 100 Points = ₹10</p>
          </div>

          <button 
            type="submit" 
            style={{...buttonStyle, opacity: isSubmitting || !canRedeem ? 0.7 : 1}}
            disabled={isSubmitting || !canRedeem}
          >
            {isSubmitting ? 'Processing...' : 'Request Redemption'}
          </button>
        </form>
        
        {!canRedeem && !loading && (
          <div style={lockedMessageStyle}>
              <span style={{fontSize: '1.2rem', verticalAlign: 'middle'}}>🔒</span> Redeem unlocks at <strong>{MINIMUM_TO_REDEEM} points</strong>.
              <br />
              <span style={{marginTop: '0.5rem', display: 'block'}}>You need <strong>{pointsNeeded} more points</strong> to redeem.</span>
          </div>
        )}

        {message.text && (
            <div style={messageStyle(message.type)}>{message.text}</div>
        )}
      </div>
    </div>
  );
}

export default Redeem;
