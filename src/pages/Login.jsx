import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

function Login() {
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleAuthAction = async () => {
    setLoading(true);
    setError(null);
    try {
      if (isCreatingAccount) {
        if (!username) {
            setError("Please enter a username.");
            setLoading(false);
            return;
        }
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        await updateProfile(user, { displayName: username });

        const userDocRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(userDocRef);

        if (!docSnap.exists()) {
            await setDoc(userDocRef, {
                username: username,
                email: user.email,
                pointsEarned: 0,
                redeemedPoints: 0,
                processingPoints: 0,
                role: "user",
                createdAt: serverTimestamp()
            });
        }

      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        if (user.email.toLowerCase() === 'ravindrak12212@gmail.com') {
            navigate('/admin');
            return; 
        }
      }
      navigate('/dashboard');
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const containerStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    background: 'linear-gradient(to right, #4a00e0, #8e2de2)',
    fontFamily: 'sans-serif'
  };

  const formContainerStyle = {
    background: 'rgba(255, 255, 255, 0.1)',
    padding: '40px',
    borderRadius: '10px',
    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.1)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.18)',
    textAlign: 'center',
    color: 'white',
    width: '350px'
  };

  const titleStyle = {
    fontSize: '2.5rem',
    marginBottom: '10px'
  };

  const subtitleStyle = {
    fontSize: '1rem',
    marginBottom: '30px'
  };

  const inputStyle = {
    width: '100%',
    padding: '12px',
    marginBottom: '20px',
    borderRadius: '5px',
    border: '1px solid #ddd',
    background: 'rgba(255, 255, 255, 0.9)',
    boxSizing: 'border-box',
    color: '#333'
  };

  const buttonStyle = {
    width: '100%',
    padding: '12px',
    borderRadius: '5px',
    border: 'none',
    background: '#ff6b6b',
    color: 'white',
    fontSize: '1rem',
    cursor: 'pointer',
    transition: 'background 0.3s'
  };

  const toggleTextStyle = {
    marginTop: '20px',
    cursor: 'pointer'
  };

  const errorStyle = {
      color: '#ff6b6b',
      marginTop: '10px'
  }

  return (
    <div style={containerStyle}>
      <div style={formContainerStyle}>
        <h1 style={titleStyle}>GrowthQuest</h1>
        <p style={subtitleStyle}>
          {isCreatingAccount ? 'Join the quest for growth' : 'Welcome back, adventurer'}
        </p>
        {isCreatingAccount && (
            <input
                style={inputStyle}
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
            />
        )}
        <input
          style={inputStyle}
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          style={inputStyle}
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button style={buttonStyle} onClick={handleAuthAction} disabled={loading}>
          {loading ? 'Processing...' : (isCreatingAccount ? 'Create Account' : 'Continue')}
        </button>
        {error && <p style={errorStyle}>{error}</p>}
        <p style={toggleTextStyle} onClick={() => { setIsCreatingAccount(!isCreatingAccount); setError(null); }}>
          {isCreatingAccount ? 'Already have an account? Login' : "Don't have an account? Create one"}
        </p>
      </div>
    </div>
  );
}

export default Login;
