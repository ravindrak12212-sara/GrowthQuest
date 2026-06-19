import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase/firebase';
import { doc, getDoc, collection, serverTimestamp, runTransaction, increment } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

const REWARD_CATEGORIES = [
    { id: 'amazon_pay', name: '🟨 Amazon Pay Gift Card' },
    { id: 'amazon_gift', name: '🎁 Amazon Gift Card' },
    { id: 'flipkart', name: '🛒 Flipkart Gift Card' },
    { id: 'ajio', name: '👕 AJIO Gift Card' },
    { id: 'mobile_recharge', name: '📱 Mobile Recharge' },
];

const REWARD_AMOUNTS = {
    amazon_pay: [25, 50, 100],
    amazon_gift: [100, 250, 500, 1000],
    flipkart: [100, 250, 500, 1000],
    ajio: [250, 500, 1000],
};

const SERVICE_PROVIDERS = ['Airtel', 'Jio', 'Vi', 'BSNL'];

function Redeem() {
    const navigate = useNavigate();
    const user = auth.currentUser;
    const [availablePoints, setAvailablePoints] = useState(0);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const [selectedCategory, setSelectedCategory] = useState(null);
    const [selectedAmount, setSelectedAmount] = useState(null);
    const [mobileDetails, setMobileDetails] = useState({ provider: '', number: '', amount: '', validity: '' });

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

    const inrToPoints = (inr) => inr * 10;
    const pointsToInr = (points) => (points / 100) * 10;

    const requiredPoints = selectedCategory === 'mobile_recharge'
        ? inrToPoints(Number(mobileDetails.amount) || 0)
        : inrToPoints(Number(selectedAmount) || 0);

    const remainingPoints = availablePoints - requiredPoints;

    const handleCategorySelect = (category) => {
        setSelectedCategory(category);
        setSelectedAmount(null);
        setMobileDetails({ provider: '', number: '', amount: '', validity: '' });
        setMessage({ type: '', text: '' });
    };
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage({ type: '', text: '' });

        const pointsToRedeem = requiredPoints;

        if (isNaN(pointsToRedeem) || pointsToRedeem <= 0) {
            setMessage({ type: 'error', text: 'Please select a valid reward or enter a recharge amount.' });
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

                if (pointsToRedeem > serverAvailablePoints) {
                    throw new Error("You do not have enough available points. Your balance might have changed.");
                }

                transaction.update(userDocRef, {
                    pointsEarned: increment(-pointsToRedeem),
                    processingPoints: increment(pointsToRedeem)
                });
                
                const redemptionData = {
                    userId: user.uid,
                    username: user.displayName || 'Anonymous',
                    pointsUsed: pointsToRedeem,
                    rewardType: selectedCategory,
                    rewardAmount: selectedCategory === 'mobile_recharge' ? Number(mobileDetails.amount) : selectedAmount,
                    status: 'pending',
                    requestedAt: serverTimestamp(),
                    serviceProvider: selectedCategory === 'mobile_recharge' ? mobileDetails.provider : '',
                    mobileNumber: selectedCategory === 'mobile_recharge' ? mobileDetails.number : '',
                    planValidity: selectedCategory === 'mobile_recharge' ? mobileDetails.validity : '',
                };

                transaction.set(redemptionRequestRef, redemptionData);
            });

            setMessage({ type: 'success', text: 'Your redemption request is now being processed.' });
            setAvailablePoints(prevBalance => prevBalance - pointsToRedeem);
            setSelectedCategory(null);
            setSelectedAmount(null);
            setMobileDetails({ provider: '', number: '', amount: '', validity: '' });

        } catch (error) {
            console.error("Error submitting redemption request:", error);
            setMessage({ type: 'error', text: error.message || 'There was an error submitting your request. Please try again.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Styles
    const pageStyle = { fontFamily: `'Segoe UI', sans-serif`, backgroundColor: '#f4f7f6', color: '#333', minHeight: '100vh', padding: '2rem' };
    const headerStyle = { textAlign: 'center', marginBottom: '2rem' };
    const titleStyle = { fontSize: '2.5rem', fontWeight: 'bold', color: '#4a00e0' };
    const balanceStyle = { fontSize: '1.2rem', color: '#555' };
    const containerStyle = { maxWidth: '800px', margin: '0 auto' };
    const backButtonStyle = { position: 'absolute', top: '20px', left: '20px', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid #ccc', background: 'white', cursor: 'pointer', fontSize: '0.9rem' };
    const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' };
    const cardStyle = (isSelected) => ({ padding: '1.5rem', borderRadius: '12px', border: `2px solid ${isSelected ? '#4a00e0' : '#ddd'}`, backgroundColor: isSelected ? '#f3e9ff' : 'white', cursor: 'pointer', textAlign: 'center', fontWeight: '600', transition: 'all 0.2s' });
    const amountCardStyle = (isSelected, isEnabled) => ({ ...cardStyle(isSelected), cursor: isEnabled ? 'pointer' : 'not-allowed', backgroundColor: isEnabled ? (isSelected ? '#f3e9ff' : 'white') : '#f8f9fa', color: isEnabled ? '#333' : '#aaa'});
    const formContainerStyle = { padding: '2rem', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' };
    const formGroupStyle = { marginBottom: '1.5rem' };
    const labelStyle = { display: 'block', marginBottom: '0.5rem', fontWeight: '600' };
    const inputStyle = { width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ccc', fontSize: '1rem' };
    const buttonStyle = { width: '100%', padding: '1rem', borderRadius: '8px', border: 'none', background: 'linear-gradient(to right, #4a00e0, #8e2de2)', color: 'white', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', transition: 'opacity 0.3s' };
    const messageStyle = (type) => ({ padding: '1rem', borderRadius: '8px', marginTop: '1.5rem', textAlign: 'center', backgroundColor: type === 'success' ? '#d4edda' : '#f8d7da', color: type === 'success' ? '#155724' : '#721c24' });

    if (loading) return <div>Loading...</div>;

    return (
        <div style={pageStyle}>
            <button style={backButtonStyle} onClick={() => navigate('/dashboard')}>&larr; Back to Dashboard</button>
            <div style={headerStyle}>
                <h1 style={titleStyle}>Redeem Points</h1>
                <p style={balanceStyle}>Available Balance: <strong>{availablePoints} points</strong> (₹{pointsToInr(availablePoints).toFixed(2)})</p>
            </div>

            <div style={containerStyle}>
                <form onSubmit={handleSubmit}>
                    <div style={formContainerStyle}>
                        <h2 style={{ ...titleStyle, fontSize: '1.5rem', marginBottom: '1.5rem', textAlign: 'left' }}>1. Select Reward Category</h2>
                        <div style={gridStyle}>
                            {REWARD_CATEGORIES.map(cat => (
                                <div key={cat.id} style={cardStyle(selectedCategory === cat.id)} onClick={() => handleCategorySelect(cat.id)}>
                                    {cat.name}
                                </div>
                            ))}
                        </div>

                        {selectedCategory && (
                            <div>
                                <h2 style={{ ...titleStyle, fontSize: '1.5rem', marginBottom: '1.5rem', textAlign: 'left' }}>2. Choose Amount</h2>
                                {REWARD_AMOUNTS[selectedCategory] ? (
                                    <div style={{ ...gridStyle, gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))' }}>
                                        {REWARD_AMOUNTS[selectedCategory].map(amount => {
                                            const required = inrToPoints(amount);
                                            const isEnabled = availablePoints >= required;
                                            return (
                                                <div key={amount} style={amountCardStyle(selectedAmount === amount, isEnabled)} onClick={() => isEnabled && setSelectedAmount(amount)}>
                                                    ₹{amount}
                                                    {!isEnabled && <div style={{fontSize: '0.8rem', color: '#aaa'}}>🔒 Requires {required} Points</div>}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : ( // Mobile Recharge
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div style={formGroupStyle}>
                                            <label style={labelStyle} htmlFor="provider">Service Provider</label>
                                            <select id="provider" style={inputStyle} value={mobileDetails.provider} onChange={e => setMobileDetails({...mobileDetails, provider: e.target.value})} required>
                                                <option value="">Select Provider</option>
                                                {SERVICE_PROVIDERS.map(p => <option key={p} value={p}>{p}</option>)}
                                            </select>
                                        </div>
                                        <div style={formGroupStyle}>
                                            <label style={labelStyle} htmlFor="mobileNumber">Mobile Number</label>
                                            <input id="mobileNumber" style={inputStyle} type="tel" value={mobileDetails.number} onChange={e => setMobileDetails({...mobileDetails, number: e.target.value})} required />
                                        </div>
                                        <div style={formGroupStyle}>
                                            <label style={labelStyle} htmlFor="rechargeAmount">Recharge Amount (₹)</label>
                                            <input id="rechargeAmount" style={inputStyle} type="number" value={mobileDetails.amount} onChange={e => setMobileDetails({...mobileDetails, amount: e.target.value})} required />
                                        </div>
                                        <div style={formGroupStyle}>
                                            <label style={labelStyle} htmlFor="planValidity">Plan Validity (optional)</label>
                                            <input id="planValidity" style={inputStyle} type="text" value={mobileDetails.validity} onChange={e => setMobileDetails({...mobileDetails, validity: e.target.value})} />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {requiredPoints > 0 && (
                            <div style={{ margin: '2rem 0', padding: '1.5rem', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                                <h3 style={{ ...titleStyle, fontSize: '1.3rem', marginBottom: '1rem' }}>Redemption Summary</h3>
                                <p><strong>Reward:</strong> {REWARD_CATEGORIES.find(c => c.id === selectedCategory)?.name}</p>
                                <p><strong>Reward Value:</strong> ₹{selectedCategory === 'mobile_recharge' ? mobileDetails.amount : selectedAmount}</p>
                                <p><strong>Required Points:</strong> <span style={{ color: '#e04a00', fontWeight: 'bold' }}>{requiredPoints}</span></p>
                                <hr style={{ margin: '1rem 0' }} />
                                <p><strong>Available Points:</strong> {availablePoints}</p>
                                <p><strong>Points Remaining After Redeem:</strong> <span style={{ color: remainingPoints < 0 ? 'red' : 'green', fontWeight: 'bold' }}>{remainingPoints}</span></p>
                            </div>
                        )}

                        <button
                            type="submit"
                            style={{ ...buttonStyle, opacity: isSubmitting || !selectedCategory || requiredPoints <= 0 || remainingPoints < 0 ? 0.7 : 1 }}
                            disabled={isSubmitting || !selectedCategory || requiredPoints <= 0 || remainingPoints < 0}
                        >
                            {isSubmitting ? 'Processing...' : 'Request Redemption'}
                        </button>
                    </div>
                </form>

                {message.text && (
                    <div style={messageStyle(message.type)}>{message.text}</div>
                )}
            </div>
        </div>
    );
}

export default Redeem;
