import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase/firebase';
import { doc, onSnapshot, runTransaction, collection, serverTimestamp } from 'firebase/firestore';

const GIFT_COLLECTION = [
    { category: '📱 Electronics', items: ['Bluetooth Speakers', 'Earbuds', 'Smart Watches', 'Power Banks', 'Mobile Accessories', 'USB Hubs', 'Ring Lights', 'Mini Projectors', 'Wireless Chargers', 'Webcams'] },
    { category: '💻 Computer Accessories', items: ['SSD', 'Pendrive', 'Laptop Stand', 'Cooling Pad', 'Gaming Mouse', 'Mechanical Keyboard', 'Mouse Pad', 'HDMI Cable', 'USB Cable', 'Card Reader'] },
    { category: '🎮 Gaming', items: ['Gaming Controller', 'Gaming Headset', 'RGB Keyboard', 'Gaming Mouse', 'Gaming Mouse Pad', 'Console Accessories'] },
    { category: '🧸 Toys', items: ['Teddy Bear', 'RC Car', 'Building Blocks', 'Barbie Doll', 'Puzzle Set', 'Soft Toys', 'Hot Wheels', 'Toy Drone', 'Cricket Set', 'Football'] },
    { category: '👶 Baby Products', items: ['Baby Blanket', 'Baby Pillow', 'Baby Dress', 'Baby Toy Set', 'Feeding Bottle', 'Baby Care Kit'] },
    { category: '👕 Fashion', items: ['T-Shirts', 'Shirts', 'Hoodies', 'Jackets', 'Jeans', 'Shoes', 'Sandals', 'Caps', 'Belts', 'Wallets'] },
    { category: '👜 Bags & Travel', items: ['Backpack', 'Laptop Bag', 'Travel Bag', 'Sling Bag', 'Duffel Bag', 'Passport Holder', 'Luggage Tags'] },
    { category: '⌚ Accessories', items: ['Watches', 'Sunglasses', 'Bracelets', 'Chains', 'Rings', 'Earrings'] },
    { category: '💄 Beauty', items: ['Makeup Kit', 'Perfume', 'Lipstick', 'Hair Dryer', 'Face Wash', 'Skin Care Kit'] },
    { category: '🧴 Personal Care', items: ['Trimmer', 'Grooming Kit', 'Electric Toothbrush', 'Shampoo Kit', 'Body Care Kit'] },
    { category: '🏋️ Fitness', items: ['Dumbbells', 'Yoga Mat', 'Resistance Bands', 'Gym Bottle', 'Fitness Tracker', 'Skipping Rope'] },
    { category: '⚽ Sports', items: ['Cricket Bat', 'Football', 'Volleyball', 'Badminton Kit', 'Table Tennis Set'] },
    { category: '🏠 Home Essentials', items: ['Coffee Mug', 'Water Bottle', 'Lunch Box', 'Wall Clock', 'Bedsheet', 'Storage Box', 'Pillow'] },
    { category: '🛋️ Home Decor', items: ['LED Lights', 'Table Lamp', 'Photo Frames', 'Artificial Plants', 'Aroma Diffuser'] },
    { category: '🍳 Kitchen', items: ['Dinner Set', 'Knife Set', 'Storage Containers', 'Air Fryer', 'Mixer Bottle'] },
    { category: '🍫 Chocolates', items: ['Ferrero Rocher', 'Cadbury Celebration', 'KitKat', 'Lindt', 'Premium Chocolate Box'] },
    { category: '🍿 Snacks', items: ['Dry Fruits', 'Cookies', 'Premium Tea', 'Coffee Hamper', 'Healthy Snack Box'] },
    { category: '📚 Books', items: ['Atomic Habits', 'Rich Dad Poor Dad', 'Ikigai', 'Deep Work', 'The Psychology of Money', 'The Alchemist'] },
    { category: '🎁 Gift Cards', items: ['Amazon', 'Flipkart', 'Myntra', 'Swiggy', 'Zomato', 'BookMyShow', 'Google Play'] },
    { category: '🐶 Pet Care', items: ['Dog Toys', 'Cat Toys', 'Pet Bed', 'Pet Bowl', 'Grooming Kit'] },
    { category: '🚗 Automobile', items: ['Car Vacuum', 'Car Charger', 'Mobile Holder', 'Seat Cushion', 'Car Perfume'] },
    { category: '🌱 Gardening', items: ['Plant Pots', 'Seeds', 'Watering Can', 'Gardening Tools'] },
    { category: '🎉 Festival Specials', items: ['Diwali Hampers', 'Christmas Gifts', 'Ugadi Hampers', 'Sankranti Specials', 'Rakhi Gifts'] },
    { category: '⭐ Premium Rewards', items: ['Smartphones', 'Tablets', 'Laptops', 'Smart TVs', 'Premium Headphones', 'Bicycles'] },
];

function TreasureVault({ user }) {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hovered, setHovered] = useState(null);
  const [isConfirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [isSuccessDialogOpen, setSuccessDialogOpen] = useState(false);
  const [isGiftCollectionModalOpen, setGiftCollectionModalOpen] = useState(false);
  const [unlockedTreasureId, setUnlockedTreasureId] = useState(null);
  const [selectedVault, setSelectedVault] = useState(null);
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
    if (!user || !selectedVault) {
      setError("An error occurred. Please try again.");
      return;
    }

    const vault = VAULTS[selectedVault];
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

        const currentKeys = userDoc.data().treasureKeys?.[selectedVault] || 0;
        if (currentKeys < vault.target) {
            throw `Not enough ${vault.name} Keys.`;
        }

        transaction.update(userDocRef, { 
            [`treasureKeys.${selectedVault}`]: currentKeys - vault.target 
        });

        transaction.set(newUnlockRef, {
            userId: user.uid,
            vaultType: selectedVault,
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
      setError(typeof err === 'string' ? err : "Unlock Failed. Please try again later.");
      console.error("Transaction failed: ", err);
    }
  };

  const openConfirmationDialog = (vaultType) => {
    setSelectedVault(vaultType);
    setConfirmDialogOpen(true);
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

  const giftModalContentStyle = {
      ...modalContentStyle,
      maxWidth: '600px',
      textAlign: 'left',
      maxHeight: '80vh',
      display: 'flex',
      flexDirection: 'column'
  };

  const giftModalBodyStyle = {
      flexGrow: 1,
      overflowY: 'auto',
      paddingRight: '1rem', 
  };

  const giftCategoryGridStyle = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1.5rem'
  }

  const giftCategoryStyle = {
      fontSize: '1.2rem',
      fontWeight: '600',
      color: '#4a00e0',
      marginTop: '1rem',
      marginBottom: '0.8rem',
  };

  const giftListStyle = {
      listStyle: 'none',
      padding: 0,
      margin: 0,
  };

  const giftItemStyle = {
      fontSize: '0.95rem',
      padding: '0.3rem 0',
      color: '#555'
  };

  const exploreButtonStyle = {
    display: 'block',
    margin: '3rem auto 0 auto',
    padding: '1rem 2.5rem',
    fontSize: '1.2rem',
    fontWeight: '600',
    color: 'white',
    background: 'linear-gradient(to right, #4a00e0, #8e2de2)',
    border: 'none',
    borderRadius: '50px',
    cursor: 'pointer',
    boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
    transition: 'transform 0.2s, box-shadow 0.2s'
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
        {isConfirmDialogOpen && selectedVault && (
            <div style={modalBackdropStyle} onClick={() => setConfirmDialogOpen(false)}>
                <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
                    <h2 style={modalTitleStyle}>Unlock {VAULTS[selectedVault].name} Treasure Vault?</h2>
                    <p style={modalParagraphStyle}>This will consume {VAULTS[selectedVault].target} {VAULTS[selectedVault].name} Keys.</p>
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

        {isSuccessDialogOpen && selectedVault && (
            <div style={modalBackdropStyle} onClick={handleSuccessDialogClose}>
                <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
                    <h2 style={modalTitleStyle}>🎉 Congratulations!</h2>
                    <p style={modalParagraphStyle}>Your {VAULTS[selectedVault].name} Treasure Vault has been unlocked successfully.</p>
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
                    <h2 style={errorModalTitleStyle}>Unlock Failed</h2>
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

        {isGiftCollectionModalOpen && (
             <div style={modalBackdropStyle} onClick={() => setGiftCollectionModalOpen(false)}>
                <div style={giftModalContentStyle} onClick={(e) => e.stopPropagation()}>
                    <h2 style={{...modalTitleStyle, textAlign: 'center', flexShrink: 0}}>🎁 Mystery Gift Collection</h2>
                    <div style={giftModalBodyStyle}>
                        <div style={giftCategoryGridStyle}>
                            {GIFT_COLLECTION.map(category => (
                                <div key={category.category}>
                                    <h3 style={giftCategoryStyle}>{category.category}</h3>
                                    <ul style={giftListStyle}>
                                        {category.items.map(item => (
                                            <li key={item} style={giftItemStyle}>• {item}</li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div style={{flexShrink: 0}}>
                        <div style={{textAlign: 'center', marginTop: '1.5rem', fontSize: '1rem', fontWeight: '600', color: '#555'}}>
                            <p style={{margin: '0.4rem'}}>✨ 400+ Mystery Gifts Available</p>
                            <p style={{margin: '0.4rem'}}>🏷️ 20+ Gift Categories</p>
                            <p style={{margin: '0.4rem'}}>🎁 New Gifts Added Regularly</p>
                        </div>
                         <p style={{textAlign: 'center', fontSize: '0.8rem', color: '#888', marginTop: '1rem'}}>
                            ⭐ The final gift is selected and assigned by the GrowthQuest Admin after successful verification.
                        </p>
                        <div style={{display: 'flex', justifyContent: 'center', marginTop: '2rem'}}>
                            <button 
                                style={{...modalButtonStyle, background: '#eee', color: '#333'}} 
                                onClick={() => setGiftCollectionModalOpen(false)}>
                                Close
                            </button>
                        </div>
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
                            onClick={() => openConfirmationDialog(keyType)}
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
            </div>
          );
        })}
      </div>
      <button style={exploreButtonStyle} onClick={() => setGiftCollectionModalOpen(true)}>
          🎁 Explore Mystery Gift Collection
      </button>
    </div>
  );
}

export default TreasureVault;
