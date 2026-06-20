import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

function TreasureVault() {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hovered, setHovered] = useState(null);
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
        setUserData(doc.data());
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, navigate]);

  const pageStyle = {
    fontFamily: `'Segoe UI', Tahoma, Geneva, Verdana, sans-serif`,
    backgroundColor: '#f4f7f6',
    color: '#333',
    minHeight: '100vh',
    padding: '2rem',
  };

  const backButtonStyle = {
      position: 'absolute',
      top: '2rem',
      left: '2rem',
      background: 'none',
      border: 'none',
      fontSize: '1rem',
      fontWeight: '600',
      color: '#555',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
  };

  const headerStyle = {
    textAlign: 'center',
    marginBottom: '3rem',
    position: 'relative',
  };

  const headerTitleStyle = {
    fontSize: '3rem',
    fontWeight: 'bold',
    color: '#4a00e0',
  };

  const subtitleStyle = {
    fontSize: '1.2rem',
    color: '#666',
    marginTop: '0.5rem',
  };
    
  const journeyContainerStyle = {
      marginTop: '2rem',
      padding: '1.5rem',
      borderRadius: '12px',
      background: 'white',
      boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
      maxWidth: '600px',
      margin: '2rem auto 0 auto',
  };

  const journeyTitleStyle = {
      fontSize: '1.3rem',
      fontWeight: '600',
      color: '#4a00e0',
      margin: 0,
  };

  const journeyPathStyle = {
      fontSize: '1.1rem',
      color: '#555',
      margin: '0.5rem 0 0 0',
  };

  const vaultsContainerStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '2rem',
    maxWidth: '1200px',
    margin: '0 auto',
  };

  const vaultCardStyle = (gradient, isHovered) => ({
    background: gradient,
    color: 'white',
    borderRadius: '20px',
    padding: '2rem',
    boxShadow: isHovered ? '0 20px 40px rgba(0,0,0,0.25)' : '0 10px 20px rgba(0,0,0,0.15)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
    transform: isHovered ? 'scale(1.03)' : 'scale(1)',
  });

  const vaultHeaderStyle = {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '1rem',
  };

  const vaultIconStyle = {
    fontSize: '3rem',
    marginRight: '1.5rem',
  };

  const vaultTitleStyle = {
    fontSize: '2rem',
    fontWeight: 'bold',
  };
  
  const vaultDescriptionStyle = {
      fontSize: '1rem',
      opacity: 0.9,
      lineHeight: 1.5,
      marginBottom: '1.5rem',
  };

  const progressContainerStyle = {
    marginBottom: '1.5rem',
  };

  const progressTitleStyle = {
      fontWeight: 600,
      opacity: 0.9,
      marginBottom: '0.5rem',
  };

  const progressBarStyle = {
    height: '12px',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: '6px',
    overflow: 'hidden',
  };

  const progressBarFillStyle = (progress) => ({
    width: `${progress}%`,
    height: '100%',
    background: 'white',
    borderRadius: '6px',
    transition: 'width 0.5s ease-in-out',
  });
  
  const progressTextStyle = {
      textAlign: 'right',
      marginTop: '0.5rem',
      fontSize: '1rem',
      fontWeight: 'bold',
  };

  const statusContainerStyle = {
    textAlign: 'center',
    marginTop: 'auto',
  };

  const statusTextStyle = (ready) => ({
    fontSize: '1.2rem',
    fontWeight: 'bold',
    color: ready ? '#a7f3d0' : 'white',
    marginBottom: '1rem',
    minHeight: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column'
  });

  const simpleStatusTextStyle = (ready) => ({
    fontSize: '1.2rem',
    fontWeight: 'bold',
    color: ready ? '#a7f3d0' : '#fecaca',
    marginBottom: '1rem',
  });

  const lockedSubtextStyle = {
      fontSize: '0.9rem',
      fontWeight: 'normal',
      opacity: 0.8,
      marginTop: '0.25rem',
  };

  const unlockButtonStyle = {
      width: '100%',
      padding: '1rem',
      borderRadius: '12px',
      border: 'none',
      background: 'rgba(255, 255, 255, 0.2)',
      color: 'white',
      fontSize: '1.2rem',
      fontWeight: 'bold',
      cursor: 'not-allowed',
  };

  const VAULTS = {
    bronze: { name: 'Bronze', icon: '🥉', target: 5, gradient: 'linear-gradient(135deg, #cd7f32, #a05a2c)', description: 'Unlock exciting mystery gifts perfect for your first adventure.' },
    silver: { name: 'Silver', icon: '🥈', target: 15, gradient: 'linear-gradient(135deg, #c0c0c0, #a9a9a9)', description: 'Bigger surprises await dedicated explorers.' },
    gold: { name: 'Gold', icon: '🥇', target: 30, gradient: 'linear-gradient(135deg, #ffd700, #daa520)', description: 'Premium mystery gifts reserved for top achievers.' },
    diamond: { name: 'Diamond', icon: '💎', target: 50, gradient: 'linear-gradient(135deg, #b9f2ff, #8ec5fc)', description: 'The ultimate Treasure Vault with legendary mystery rewards.' },
  };

  const treasureKeys = userData?.treasureKeys || { bronze: 0, silver: 0, gold: 0, diamond: 0 };

  if (loading) {
    return <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh'}}>Loading...</div>;
  }

  return (
    <div style={pageStyle}>
        <button style={backButtonStyle} onClick={() => navigate('/dashboard')}>
            <span style={{marginRight: '0.5rem'}}>←</span> Back to Dashboard
        </button>
        <header style={headerStyle}>
            <h1 style={headerTitleStyle}>🏰 Treasure Vault</h1>
            <p style={subtitleStyle}>Collect Treasure Keys to unlock exclusive Mystery Gifts.</p>
            <div style={journeyContainerStyle}>
                <h3 style={journeyTitleStyle}>Your Treasure Journey</h3>
                <p style={journeyPathStyle}>Bronze → Silver → Gold → Diamond</p>
            </div>
        </header>

      <div style={vaultsContainerStyle}>
        {Object.keys(VAULTS).map(keyType => {
          const vault = VAULTS[keyType];
          const currentKeys = treasureKeys[keyType] || 0;
          const progress = Math.min(100, (currentKeys / vault.target) * 100);
          const isReady = currentKeys >= vault.target;
          const keysNeeded = vault.target - currentKeys;

          return (
            <div 
                key={keyType}
                style={vaultCardStyle(vault.gradient, hovered === keyType)}
                onMouseEnter={() => setHovered(keyType)}
                onMouseLeave={() => setHovered(null)}
            >
              {keyType === 'bronze' ? (
                // --- IMPROVED BRONZE CARD ---
                <>
                  <div>
                    <div style={vaultHeaderStyle}>
                        <span style={vaultIconStyle}>{vault.icon}</span>
                        <h2 style={vaultTitleStyle}>{vault.name} Vault</h2>
                    </div>
                    <p style={vaultDescriptionStyle}>{vault.description}</p>
                    <div style={progressContainerStyle}>
                        <div style={progressTitleStyle}>Progress</div>
                        <div style={progressBarStyle}>
                            <div style={progressBarFillStyle(progress)}></div>
                        </div>
                        <div style={progressTextStyle}>{currentKeys} / {vault.target} {vault.name} Keys</div>
                    </div>
                  </div>

                  <div style={statusContainerStyle}>
                    {isReady ? (
                        <>
                            <div style={statusTextStyle(true)}>🟢 Ready to Unlock</div>
                            <button style={unlockButtonStyle} disabled>Unlock Coming Soon</button>
                        </>                    
                    ) : (
                        <div style={statusTextStyle(false)}>
                            <span>🔒 Locked</span>
                            <span style={lockedSubtextStyle}>Collect {keysNeeded} more {vault.name} Keys</span>
                        </div>
                    )}
                  </div>
                </>
              ) : (
                // --- ORIGINAL CARDS ---
                <>
                  <div>
                    <div style={vaultHeaderStyle}>
                        <span style={vaultIconStyle}>{vault.icon}</span>
                        <h2 style={vaultTitleStyle}>{vault.name} Treasure Vault</h2>
                    </div>
                    {/* No Description */}
                    <div style={progressContainerStyle}>
                      {/* No Progress Title */}
                      <div style={progressBarStyle}>
                          <div style={progressBarFillStyle(progress)}></div>
                      </div>
                      <div style={progressTextStyle}>{currentKeys} / {vault.target} Keys</div>
                    </div>
                  </div>

                  <div style={statusContainerStyle}>
                    {isReady ? (
                        <>
                            <p style={simpleStatusTextStyle(true)}>🟢 Ready to Unlock</p>
                            <button style={unlockButtonStyle} disabled>Unlock Coming Soon</button>
                        </>
                    ) : (
                        <p style={simpleStatusTextStyle(false)}>🔒 Locked</p>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default TreasureVault;
