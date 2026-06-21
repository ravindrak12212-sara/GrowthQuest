import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase/firebase';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

function UserOnboarding() {
    const [username, setUsername] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const user = auth.currentUser;

    useEffect(() => {
        if (!user) {
            navigate('/'); // Should not happen if routed correctly
        }
    }, [user, navigate]);

    const handleOnboarding = async () => {
        if (!username.trim()) {
            setError("Please choose a username to continue.");
            return;
        }
        setLoading(true);

        const userDocRef = doc(db, 'users', user.uid);

        try {
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists()) {
                // This case is unlikely if onboarding is shown correctly,
                // but as a fallback, we can update the existing document.
                await updateDoc(userDocRef, {
                    username: username,
                    lastSeen: serverTimestamp()
                });
            } else {
                // Standard onboarding: create the new user document.
                await setDoc(userDocRef, {
                    uid: user.uid,
                    username: username,
                    email: user.email,
                    pointsEarned: 0,
                    redeemedPoints: 0,
                    processingPoints: 0,
                    role: "user",
                    createdAt: serverTimestamp(),
                    lastSeen: serverTimestamp()
                });
            }
            
            navigate('/dashboard');
        } catch (err) {
            console.error("Onboarding failed: ", err);
            setError("There was an error setting up your account. Please try again.");
            setLoading(false);
        }
    };

    const pageStyle = {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: '#f0f2f5'
    };

    const containerStyle = {
        padding: '2rem',
        background: 'white',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        width: '400px',
        textAlign: 'center'
    };

    return (
        <div style={pageStyle}>
            <div style={containerStyle}>
                <h2 style={{ marginBottom: '2rem', color: '#333' }}>Welcome!</h2>
                <p style={{ marginBottom: '1.5rem', color: '#555' }}>Let's set up your profile. Please choose a username.</p>
                
                {error && <p style={{ color: 'red', marginBottom: '1rem' }}>{error}</p>}
                
                <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Choose a Username"
                    style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', border: '1px solid #ccc', borderRadius: '4px' }}
                />
                
                <button onClick={handleOnboarding} disabled={loading} style={{ width: '100%', padding: '0.75rem', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '1rem' }}>
                    {loading ? 'Saving...' : 'Complete Profile'}
                </button>
            </div>
        </div>
    );
}

export default UserOnboarding;
