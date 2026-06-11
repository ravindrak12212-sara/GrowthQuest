import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase/firebase';
import { doc, getDoc, collection, serverTimestamp, runTransaction, increment } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

function Redeem() {
  const navigate = useNavigate();
  const user = auth.currentUser;
  const [pointsBalance, setPointsBalance] = useState(0);
  const [requestedPoints, setRequestedPoints] = useState('');
  const [inrValue, setInrValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    const fetchUserPoints = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      const userDocRef = doc(db, 'users', user.uid);
      try {
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
          setPointsBalance(docSnap.data().pointsEarned || 0);
        }
      } catch (error) {
        console.error("Error fetching user points:", error);
        setMessage({ type: 'error', text: 'Could not fetch your points balance.' });
      } finally {
        setLoading(false);
      }
    };

    fetchUserPoints();
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

    const pointsToRedeem = parseInt(requestedPoints, 10);

    if (isNaN(pointsToRedeem) || pointsToRedeem <= 0) {
      setMessage({ type: 'error', text: 'Please enter a valid number of points greater than 0.' });
      return;
    }

    if (pointsToRedeem > pointsBalance) {
      setMessage({ type: 'error', text: 'You do not have enough points to make this redemption.' });
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

        const currentPoints = userDoc.data().pointsEarned || 0;
        if (pointsToRedeem > currentPoints) {
          throw new Error("You do not have enough points to make this redemption.");
        }
        
        // Update user's points atomically
        transaction.update(userDocRef, {
          pointsEarned: increment(-pointsToRedeem),
          processingPoints: increment(pointsToRedeem)
        });
        
        // Create the redemption request document
        transaction.set(redemptionRequestRef, {
          userId: user.uid,
          username: user.displayName || 'Anonymous',
          requestedPoints: pointsToRedeem,
          status: 'pending',
          timestamp: serverTimestamp(),
        });
      });

      // If the transaction is successful:
      setMessage({ type: 'success', text: 'Your redemption request is now being processed.' });
      setPointsBalance(prevBalance => prevBalance - pointsToRedeem);
      setRequestedPoints('');
      setInrValue(0);

    } catch (error) {
      console.error("Error submitting redemption request:", error);
      setMessage({ type: 'error', text: error.message || 'There was an error submitting your request. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };
  
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
        <p style={balanceStyle}>Your current balance: <strong>{pointsBalance} points</strong></p>
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
              placeholder="e.g., 500"
              required
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
            style={{...buttonStyle, opacity: isSubmitting ? 0.7 : 1}}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Processing...' : 'Request Redemption'}
          </button>
        </form>
        {message.text && (
            <div style={messageStyle(message.type)}>{message.text}</div>
        )}
      </div>
    </div>
  );
}

export default Redeem;
