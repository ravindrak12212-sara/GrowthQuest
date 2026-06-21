import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase/firebase';
import { doc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';

function UserProfile() {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [username, setUsername] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  const user = auth.currentUser;

  useEffect(() => {
    if (!user) {
        navigate('/');
        return;
    }

    const userDocRef = doc(db, 'users', user.uid);

    const unsubscribe = onSnapshot(userDocRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setUserData(data);
        setUsername(data.username || '');
      } else {
        setError("User data not found. Please log out and log back in.");
      }
      setLoading(false);
    }, (err) => {
      console.error("Error fetching user profile:", err);
      setError("Failed to fetch user data.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, navigate]);

  const handleUpdateUsername = async () => {
    if (!username.trim()) {
      setMessage("Username cannot be empty.");
      return;
    }

    const userDocRef = doc(db, 'users', user.uid);
    try {
      await updateDoc(userDocRef, {
        username: username,
        lastSeen: serverTimestamp(),
      });
      setMessage("Username updated successfully!");
      setIsEditing(false);
    } catch (err) {
        console.error("Error updating username:", err)
        setMessage("Failed to update username. Please try again.");
    }
  };

  const pageStyle = {
    fontFamily: `'Segoe UI', Tahoma, Geneva, Verdana, sans-serif`,
    backgroundColor: '#f4f7f6',
    color: '#333',
    minHeight: '100vh',
    padding: '2rem',
  };

  const profileContainerStyle = {
    maxWidth: '600px',
    margin: '0 auto',
    padding: '2rem',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
  };

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

  if (loading) return <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh'}}>Loading Profile...</div>;

  if (error) return (
    <div style={pageStyle}>
        <div style={profileContainerStyle}>
            <p style={{color: 'red', textAlign: 'center'}}>{error}</p>
        </div>
    </div>
  );

  return (
    <div style={pageStyle}>
        <button style={backButtonStyle} onClick={() => navigate('/dashboard')}>&larr; Back to Dashboard</button>
        <div style={profileContainerStyle}>
            <h2 style={{textAlign: 'center', color: '#4a00e0', marginBottom: '2rem'}}>User Profile</h2>
            {userData && (
                <div>
                    <div style={{marginBottom: '1.5rem'}}>
                        <p><strong>Email:</strong> {userData.email}</p>
                        <p><strong>Points Earned:</strong> {userData.pointsEarned}</p>
                        <p><strong>Points Redeemed:</strong> {userData.redeemedPoints}</p>
                         <p><strong>Processing Points:</strong> {userData.processingPoints || 0}</p>
                    </div>
                    
                    <div style={{marginBottom: '1rem'}}>
                        <strong>Username:</strong>
                        {isEditing ? (
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                style={{width: '100%', padding: '0.5rem', marginTop: '0.5rem'}}
                            />
                        ) : (
                            <span> {username}</span>
                        )}
                    </div>

                    {isEditing ? (
                        <div>
                            <button onClick={handleUpdateUsername} style={{padding: '0.75rem 1.5rem', background: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', marginRight: '1rem'}}>Save</button>
                            <button onClick={() => { setIsEditing(false); setMessage(''); }} style={{padding: '0.75rem 1.5rem', background: '#6c757d', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer'}}>Cancel</button>
                        </div>
                    ) : (
                        <button onClick={() => setIsEditing(true)} style={{padding: '0.75rem 1.5rem', background: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer'}}>Edit Username</button>
                    )}
                    {message && <p style={{marginTop: '1rem', color: isEditing ? 'blue' : 'green'}}>{message}</p>}
                </div>
            )}
        </div>
    </div>
  );
}

export default UserProfile;
