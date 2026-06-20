import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase/firebase';
import { doc, onSnapshot, runTransaction, collection, serverTimestamp } from 'firebase/firestore';

function TreasureVault({ user }) {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hovered, setHovered] = useState(null);
  const [isConfirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [isSuccessDialogOpen, setSuccessDialogOpen] = useState(false);
  const [unlockedTreasureId, setUnlockedTreasureId] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

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

  const handleUnlock = async () => {
    setConfirmDialogOpen(false);
    if (!user) {
      setError("You must be logged in to perform this action.");
      return;
    }

    const userDocRef = doc(db, 'users', user.uid);
    const unlocksCollectionRef = collection(db, 'treasureUnlocks');
    const newUnlockRef = doc(unlocksCollectionRef);
    const newUnlockId = newUnlockRef.id;

    try {
      await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userDocRef);
        if (!userDoc.exists()) {
          throw "User document does not exist!";
        }

        const currentKeys = userDoc.data().treasureKeys?.bronze || 0;
        if (currentKeys < 5) {
            throw "Not enough Bronze Keys.";
        }

        // Deduct keys
        transaction.update(userDocRef, { 
            'treasureKeys.bronze': currentKeys - 5 
        });

        // Create unlock record
        transaction.set(newUnlockRef, {
            userId: user.uid,
            vaultType: "bronze",
            status: "RESERVED",
            giftAssigned: false,
            deliveryDetailsSubmitted: false,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
      });

      setUnlockedTreasureId(newUnlockId);
      setSuccessDialogOpen(true);

    } catch (err) {
      if (err === "Not enough Bronze Keys.") {
          setError("You don't have enough Bronze Keys to unlock this vault.");
      } else {
          console.error("Transaction failed: ", err);
          setError("Unlock Failed. Please try again later.");
      }
    }
  };

  const handleSuccessDialogClose = () => {
    setSuccessDialogOpen(false);
    if (unlockedTreasureId) {
        navigate(`/delivery-profile?unlockId=${unlockedTreasureId}`);
    }
  };

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
      background: 'rgba(255, 255, 255, 0.3)',
      color: 'white',
      fontSize: '1.2rem',
      fontWeight: 'bold',
      cursor: 'pointer',
      transition: 'background 0.3s ease'
  };

  const disabledUnlockButtonStyle = {
    ...unlockButtonStyle,
    background: 'rgba(255, 255, 255, 0.1)',
    cursor: 'not-allowed',
  }

  const modalBackdropStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.6)',
    zIndex: 2000,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  };

  const modalContentStyle = {
      backgroundColor: 'white',
      padding: '2rem',
      borderRadius: '12px',
      boxShadow: '0 5px 15px rgba(0,0,0,0.2)',
      width: '90%',
      maxWidth: '450px',
      textAlign: 'center',
  };

  const modalTitleStyle = {
      fontSize: '1.8rem',
      fontWeight: 'bold',
      color: '#4a00e0',
      marginBottom: '1rem',
  };

  const errorModalTitleStyle = {
    ...modalTitleStyle,
    color: '#c0392b'
  }
  
  const modalParagraphStyle = {
      fontSize: '1rem',
      lineHeight: '1.6',
      marginBottom: '0.5rem',
  };
  
  const modalButtonStyle = {
      padding: '0.8rem 1.5rem',
      borderRadius: '8px',
      border: 'none',
      fontSize: '1rem',
      fontWeight: 'bold',
      cursor: 'pointer',
      transition: 'transform 0.2s',
      minWidth: '100px'
  }

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
        {isConfirmDialogOpen && (
            <div style={modalBackdropStyle} onClick={() => setConfirmDialogOpen(false)}>
                <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
                    <h2 style={modalTitleStyle}>Unlock Bronze Treasure Vault?</h2>
                    <p style={modalParagraphStyle}>This will consume 5 Bronze Keys.</p>
                    <p style={{...modalParagraphStyle, fontWeight: 'bold', color: '#c0392b'}}>This action cannot be undone.</p>
                    
                    <div style={{display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '2rem'}}>
                        <button 
                            style={{...modalButtonStyle, background: '#eee', color: '#333'}} 
                            onClick={() => setConfirmDialogOpen(false)}>
                            Cancel
                        </button>
                        <button 
                            style={{...modalButtonStyle, background: 'linear-gradient(to right, #4a00e0, #8e2de2)', color: 'white'}}
                            onClick={handleUnlock}>
                            Unlock
                        </button>
                    </div>
                </div>
            </div>
        )}

        {isSuccessDialogOpen && (
            <div style={modalBackdropStyle} onClick={handleSuccessDialogClose}>
                <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
                    <h2 style={modalTitleStyle}>🎉 Congratulations!</h2>
                    <p style={modalParagraphStyle}>Your Bronze Treasure Vault has been unlocked successfully.</p>
                    <p style={modalParagraphStyle}>Your Mystery Gift has been reserved.</p>
                    <p style={{...modalParagraphStyle, color: '#555'}}>Click below to enter your delivery details.</p>
                    
                    <div style={{display: 'flex', justifyContent: 'center', marginTop: '2rem'}}>
                        <button 
                            style={{...modalButtonStyle, background: 'linear-gradient(to right, #4a00e0, #8e2de2)', color: 'white'}}
                            onClick={handleSuccessDialogClose}>
                            Enter Delivery Details
                        </button>
                    </div>
                </div>
            </div>
        )}

        {error && (
            <div style={modalBackdropStyle} onClick={() => setError('')}>
                <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
                    <h2 style={errorModalTitleStyle}>{error === "You don't have enough Bronze Keys to unlock this vault." ? 'Not Enough Keys' : 'Unlock Failed'}</h2>
                    <p style={modalParagraphStyle}>{error}</p>
                    <div style={{display: 'flex', justifyContent: 'center', marginTop: '2rem'}}>
                        <button 
                            style={{...modalButtonStyle, background: '#eee', color: '#333'}} 
                            onClick={() => setError('')}>
                            OK
                        </button>
                    </div>
                </div>
            </div>
        )}

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
                            <button 
                                style={unlockButtonStyle}
                                onClick={() => setConfirmDialogOpen(true)}
                            >
                                Unlock Treasure Vault
                            </button>
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
                            <p style={simpleStatusTextStyle(true)}>🟢 Ready to Unlock</p>
                            <button style={disabledUnlockButtonStyle} disabled>Unlock Coming Soon</button>
                        </>
                    ) : (
                       <div style={statusTextStyle(false)}>
                            <span>🔒 Locked</span>
                            <span style={lockedSubtextStyle}>Collect {keysNeeded} more {vault.name} Keys</span>
                        </div>
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
