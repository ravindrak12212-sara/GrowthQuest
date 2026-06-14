import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase/firebase';
import { doc, onSnapshot, updateDoc, runTransaction, serverTimestamp, collection, query, where, addDoc, getDocs } from 'firebase/firestore';
import { signOut, sendPasswordResetEmail } from 'firebase/auth';
import ActivePolls from '../components/user/ActivePolls';
import ActiveWritingChallenges from '../components/user/ActiveWritingChallenges';

function Dashboard() {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [logoutError, setLogoutError] = useState('');
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const [isAboutModalOpen, setAboutModalOpen] = useState(false);
  const [isTermsModalOpen, setTermsModalOpen] = useState(false);
  const [isChangePasswordModalOpen, setChangePasswordModalOpen] = useState(false);
  const [isBonusModalOpen, setBonusModalOpen] = useState(false);
  const [streakBonusInfo, setStreakBonusInfo] = useState(null);
  const [changePasswordSuccess, setChangePasswordSuccess] = useState('');
  const [changePasswordError, setChangePasswordError] = useState('');
  const [isProcessingPasswordChange, setIsProcessingPasswordChange] = useState(false);
  const [isUpiModalOpen, setUpiModalOpen] = useState(false);
  const [upiId, setUpiId] = useState('');
  const [upiModalMessage, setUpiModalMessage] = useState('');
  const [isSavingUpi, setIsSavingUpi] = useState(false);

  const navigate = useNavigate();
  const user = auth.currentUser;
  const [announcement, setAnnouncement] = useState(null);
  
  const [writingTasks, setWritingTasks] = useState([]);
  const [userWritingResponses, setUserWritingResponses] = useState([]);
  const [writingLoading, setWritingLoading] = useState(false);
  const [writingError, setWritingError] = useState('');
  const [submittingTaskId, setSubmittingTaskId] = useState(null);
  
  const MILESTONES = { 5: 50, 10: 100, 15: 150, 20: 200, 25: 250, 30: 300 };

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
            setUpiId(data.upiId || '');
        } else {
            setError("Could not find user data.");
        }
        setLoading(false);
    }, (err) => {
        console.error("Error fetching user data:", err);
        setError("Failed to fetch user data.");
        setLoading(false);
    });

    const announcementRef = doc(db, 'announcements', 'current');
    const unsubscribeAnnouncements = onSnapshot(announcementRef, (doc) => {
      if (doc.exists() && doc.data().active) {
        setAnnouncement(doc.data());
      } else {
        setAnnouncement(null);
      }
    });

    const writingTasksQuery = query(
        collection(db, 'writingTasks'),
        where('active', '==', true),
        where('archived', '==', false)
      );
      
      const unsubscribeWritingTasks = onSnapshot(writingTasksQuery, (snapshot) => {
        setWritingTasks(
          snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          }))
        );
      });
      
      const writingResponsesQuery = query(
        collection(db, 'writingResponses'),
        where('userId', '==', user.uid)
      );
      
      const unsubscribeWritingResponses = onSnapshot(writingResponsesQuery, (snapshot) => {
        setUserWritingResponses(
          snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          }))
        );
      });


        return () => {
            unsubscribe();
            unsubscribeAnnouncements();
            unsubscribeWritingTasks();
            unsubscribeWritingResponses();
          }

  }, [user, navigate]);

  useEffect(() => {
    if (user && userData && !userData.isAdmin) {
        const grantDailyBonus = async () => {
            const userDocRef = doc(db, 'users', user.uid);
            try {
                let dailyBonusAwarded = false;

                const streakReward = await runTransaction(db, async (transaction) => {
                    const userDoc = await transaction.get(userDocRef);
                    if (!userDoc.exists()) {
                        throw "Document does not exist!";
                    }

                    const data = userDoc.data();
                    const today = new Date();
                    const lastBonusDate = data.lastLoginBonusDate?.toDate();

                    if (lastBonusDate && lastBonusDate.toLocaleDateString() === today.toLocaleDateString()) {
                        return null; // Exit if bonus is already claimed
                    }

                    dailyBonusAwarded = true;
                    let updates = {};
                    let awardedStreakBonus = null;

                    // 1. Grant Daily Login Bonus
                    updates.pointsEarned = (data.pointsEarned || 0) + 25;
                    updates.lastLoginBonusDate = serverTimestamp();

                    // 2. Calculate Login Streak
                    const yesterday = new Date();
                    yesterday.setDate(today.getDate() - 1);
                    
                    let currentStreak = data.currentStreak || 0;
                    let lastStreakRewardMilestone = data.lastStreakRewardMilestone || 0;

                    const isStreakContinuing = lastBonusDate && lastBonusDate.toLocaleDateString() === yesterday.toLocaleDateString();

                    if (isStreakContinuing) {
                        if (currentStreak === 30) {
                            currentStreak = 1;
                            lastStreakRewardMilestone = 0;
                        } else {
                            currentStreak++;
                        }
                    } else {
                        currentStreak = 1;
                        lastStreakRewardMilestone = 0;
                    }
                    
                    updates.currentStreak = currentStreak;

                    // 3. Update Longest Streak
                    updates.longestStreak = Math.max(data.longestStreak || 0, currentStreak);

                    // 4. Check for Milestone Bonuses
                    const bonusForCurrentStreak = MILESTONES[currentStreak];
                    if (bonusForCurrentStreak && currentStreak > lastStreakRewardMilestone) {
                        updates.pointsEarned += bonusForCurrentStreak;
                        lastStreakRewardMilestone = currentStreak;
                        awardedStreakBonus = { milestone: currentStreak, bonus: bonusForCurrentStreak };
                    }
                    updates.lastStreakRewardMilestone = lastStreakRewardMilestone;

                    transaction.update(userDocRef, updates);
                    return awardedStreakBonus;
                });

                if (dailyBonusAwarded) {
                    setBonusModalOpen(true);
                }

                if (streakReward) {
                    setStreakBonusInfo(streakReward);
                }

            } catch (error) {
                console.error("Daily bonus/streak transaction failed: ", error);
            }
        };

        grantDailyBonus();
    }
  }, [user, userData, navigate]);

  const handleLogout = async () => {
    setLogoutError('');
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error("Error signing out: ", error);
      setLogoutError("Failed to log out. Please try again.");
    }
  };
  
  const handleWritingSubmission = async (task, response) => {
    setSubmittingTaskId(task.id);
    setWritingError('');
  
    try {
      const responsesQuery = query(
        collection(db, 'writingResponses'),
        where('taskId', '==', task.id),
        where('userId', '==', user.uid)
      );
  
      const querySnapshot = await getDocs(responsesQuery);
  
      if (!querySnapshot.empty) {
        setWritingError('You have already submitted a response for this challenge.');
        return;
      }
  
      await addDoc(collection(db, 'writingResponses'), {
        taskId: task.id,
        taskTitle: task.title,
        userId: user.uid,
        userEmail: user.email,
        response,
        status: 'pending',
        submittedAt: serverTimestamp(),
      });
  
    } catch (err) {
      console.error('Error submitting writing response:', err);
      setWritingError(`Failed to submit: ${err.message}`);
    } finally {
      setSubmittingTaskId(null);
    }
  };
  
  const handleRedeemNavigation = () => {
    navigate('/redeem');
  }
  
  const handleQuizNavigation = () => {
      navigate('/quiz');
  }

  const calculateTotalMoney = (data) => {
    if (!data) return '0.00';
    const money = ((data.redeemedPoints || 0) / 100) * 10;
    return money.toFixed(2);
  };

    const getNextRewardInfo = () => {
        if (!userData) return null;

        const currentStreak = userData.currentStreak || 0;
        const lastMilestone = userData.lastStreakRewardMilestone || 0;

        if (lastMilestone === 30) {
            return { isCycleComplete: true };
        }

        const nextTarget = Object.keys(MILESTONES).map(Number).find(m => m > lastMilestone);

        if (nextTarget) {
            const bonus = MILESTONES[nextTarget];
            const previousMilestone = lastMilestone;
            const progress = Math.min(100, ((currentStreak - previousMilestone) / (nextTarget - previousMilestone)) * 100);

            return {
                bonus,
                target: nextTarget,
                current: currentStreak,
                progress: progress > 0 ? progress : 0,
                isCycleComplete: false
            };
        }

        return { isAllDone: true };
    };

  const handleChangePassword = async () => {
    setChangePasswordSuccess('');
    setChangePasswordError('');
    setIsProcessingPasswordChange(true);

    if (!user) {
      setChangePasswordError("No user is currently signed in.");
      setIsProcessingPasswordChange(false);
      return;
    }

    try {
      await sendPasswordResetEmail(auth, user.email);
      setChangePasswordSuccess("A password reset link has been sent to your registered email address. Please check your inbox and spam folder.");
    } catch (error) {
      console.error("Error sending password reset email:", error);
      setChangePasswordError("Failed to send reset link. Please try again later.");
    } finally {
      setIsProcessingPasswordChange(false);
    }
  };

  const handleSaveUpi = async () => {
    if (!upiId) {
      setUpiModalMessage("Please enter a UPI ID.");
      return;
    }
    setIsSavingUpi(true);
    setUpiModalMessage('');
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        redeemMethod: "UPI",
        upiId: upiId,
      });
      setUpiModalMessage("UPI ID saved successfully!");
    } catch (err) {
      console.error("Error saving UPI ID:", err);
      setUpiModalMessage("Failed to save UPI ID. Please try again.");
    } finally {
      setIsSavingUpi(false);
    }
  };

  const openUpiModal = () => {
    setUpiModalMessage('');
    setUpiModalOpen(true);
  };

  const closeChangePasswordModal = () => {
    setChangePasswordModalOpen(false);
    setChangePasswordSuccess('');
    setChangePasswordError('');
  };

  const pageStyle = {
    fontFamily: `'Segoe UI', Tahoma, Geneva, Verdana, sans-serif`,
    backgroundColor: '#f4f7f6',
    color: '#333',
    minHeight: '100vh',
  };

  const headerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 2rem',
    backgroundColor: 'white',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  };
  
  const hamburgerStyle = {
      fontSize: '1.5rem',
      cursor: 'pointer',
  };

  const headerTitleStyle = {
      margin: 0,
      fontSize: '1.5rem',
      fontWeight: 'bold',
      color: '#4a00e0',
      position: 'absolute',
      left: '50%',
      transform: 'translateX(-50%)'
  };
  
  const drawerStyle = {
      position: 'fixed',
      top: 0,
      left: isDrawerOpen ? 0 : '-300px',
      width: '280px',
      height: '100%',
      backgroundColor: 'white',
      boxShadow: '2px 0 5px rgba(0,0,0,0.1)',
      transition: 'left 0.3s ease-in-out',
      zIndex: 1001,
      padding: '2rem 1.5rem',
      display: 'flex',
      flexDirection: 'column'
  };
  
  const backdropStyle = {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0,0,0,0.4)',
      zIndex: 1000,
      display: isDrawerOpen ? 'block' : 'none',
  };
  
  const drawerHeader = {
      fontSize: '1.5rem',
      fontWeight: 'bold',
      color: '#4a00e0',
      marginBottom: '2rem',
  };
  
  const menuItemsContainer = {
      flexGrow: 1,
  };

  const menuItemStyle = {
      padding: '1rem 0',
      fontSize: '1.1rem',
      cursor: 'pointer',
      borderBottom: '1px solid #f0f0f0',
      display: 'block',
      textAlign: 'left'
  };

  const mainContentStyle = {
    padding: '2rem',
    maxWidth: '1200px',
    margin: '0 auto'
  };

  const statsContainerStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '2rem',
    marginBottom: '2rem'
  };

  const statCardStyle = {
    padding: '2rem',
    borderRadius: '12px',
    color: 'white',
    position: 'relative',
    overflow: 'hidden',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
  };

  const cardValueStyle = { fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '0.5rem' };
  const cardTitleStyle = { fontSize: '1.1rem', opacity: 0.9 };
  
  const actionCardStyle = {
      padding: '2rem',
      borderRadius: '12px',
      backgroundColor: '#fff',
      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
      textAlign: 'center',
  }
  
  const actionTitleStyle = {
      fontSize: '1.5rem',
      fontWeight: '600',
      color: '#4a00e0',
      marginBottom: '1rem'
  }
  
  const actionButtonStyle = {
      padding: '0.8rem 1.5rem',
      borderRadius: '8px',
      border: 'none',
      color: '#fff',
      fontSize: '1rem',
      fontWeight: 'bold',
      cursor: 'pointer',
      transition: 'transform 0.2s',
      display: 'block',
      width: '100%'
  }

  const modalBackdropStyle = {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0,0,0,0.5)',
      zIndex: 2000,
      display: isAboutModalOpen || isTermsModalOpen || isChangePasswordModalOpen || isUpiModalOpen || isBonusModalOpen || streakBonusInfo ? 'flex' : 'none',
      justifyContent: 'center',
      alignItems: 'center',
  };

  const modalContentStyle = {
      backgroundColor: 'white',
      padding: '2rem',
      borderRadius: '12px',
      boxShadow: '0 5px 15px rgba(0,0,0,0.2)',
      width: '90%',
      maxWidth: '600px',
      maxHeight: '80vh',
      overflowY: 'auto',
      position: 'relative'
  };

  const modalTitleStyle = {
      fontSize: '1.8rem',
      fontWeight: 'bold',
      color: '#4a00e0',
      marginBottom: '1.5rem',
      textAlign: 'center'
  };
  
  const modalParagraphStyle = {
      fontSize: '1rem',
      lineHeight: '1.6',
      marginBottom: '1rem',
  };
  
  const modalCloseButtonStyle = {
      position: 'absolute',
      top: '1rem',
      right: '1rem',
      background: 'none',
      border: 'none',
      fontSize: '1.5rem',
      cursor: 'pointer',
      color: '#888'
  };

  const termsListStyle = {
    listStyleType: 'disc',
    paddingLeft: '20px',
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

  const welcomeCardStyle = {
    background: 'linear-gradient(135deg, #6d28d9, #2563eb)',
    color: 'white',
    borderRadius: '20px',
    padding: '30px',
    boxShadow: '0 10px 20px rgba(0,0,0,0.15)',
    marginBottom: '20px',
    textAlign: 'center'
  };

  const announcementCardStyle = {
    background: '#e0f2fe',
    borderRadius: '20px',
    padding: '20px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    marginBottom: '20px'
  };
  
  const nextRewardInfo = getNextRewardInfo();

  if (loading) {
    return <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh'}}>Loading...</div>;
  }

  if (error) {
    return <div style={{textAlign: 'center', marginTop: '50px'}}>{error}</div>;
  }

  const submittedTaskIds = userWritingResponses.map(
    response => response.taskId
  );

  return (
    <div style={pageStyle}>
        <div style={backdropStyle} onClick={() => setDrawerOpen(false)}></div>
        <div style={drawerStyle}>
            <div style={drawerHeader}>GrowthQuest</div>
            <div style={menuItemsContainer}>
                <a style={menuItemStyle} onClick={() => { setAboutModalOpen(true); setDrawerOpen(false); }}>About Our Admin</a>
                <a style={menuItemStyle} onClick={() => { setTermsModalOpen(true); setDrawerOpen(false); }}>Terms & Conditions</a>
                <a style={menuItemStyle} onClick={() => { setChangePasswordModalOpen(true); setDrawerOpen(false); }}>Change Password</a>
                <a style={menuItemStyle} onClick={() => { openUpiModal(); setDrawerOpen(false); }}>Redeem Method</a>
                 <a style={menuItemStyle} onClick={handleLogout}>Logout</a>
            </div>
        </div>

        {isAboutModalOpen && (
            <div style={modalBackdropStyle} onClick={() => setAboutModalOpen(false)}>
                <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
                    <button style={modalCloseButtonStyle} onClick={() => setAboutModalOpen(false)}>&times;</button>
                    <h2 style={modalTitleStyle}>About Our Admin</h2>
                    <p style={modalParagraphStyle}>Welcome to GrowthQuest! ❤️</p>
                    <p style={modalParagraphStyle}>GrowthQuest started with a simple idea — to create an opportunity where students and young learners can make meaningful use of their free time while earning a little pocket money through engaging activities like games and surveys. Bringing this platform to life required a great deal of hard work, patience, and dedication.</p>
                    <p style={modalParagraphStyle}>Many students constantly search for opportunities to support themselves financially while continuing their education. Not everyone has the means or the confidence to invest money to begin their journey. With that thought in mind, GrowthQuest was built so that users can participate, learn, and earn without investing even a single rupee.</p>
                    <p style={modalParagraphStyle}>From my side, I have one sincere request: please answer surveys fairly and honestly. The support we receive through these surveys helps us sustain the platform and continue rewarding our users. Your honesty and participation play an important role in helping GrowthQuest grow.</p>
                    <p style={modalParagraphStyle}>Thank you for being part of this journey. I genuinely hope this platform becomes useful to you, even if it is only for a little extra pocket money during your student life.</p>
                    <p style={modalParagraphStyle}>Happy Learning and Happy Earning! 🌟</p>
                    <hr style={{margin: '2rem 0'}} />
                    <p style={{...modalParagraphStyle, textAlign: 'center', fontWeight: 'bold'}}>Support Email:</p>
                    <p style={{...modalParagraphStyle, textAlign: 'center'}}><a href="mailto:growthquest.support@gmail.com" style={{color: '#4a00e0'}}>growthquest.support@gmail.com</a></p>
                </div>
            </div>
        )}

        {isTermsModalOpen && (
            <div style={modalBackdropStyle} onClick={() => setTermsModalOpen(false)}>
                <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
                    <button style={modalCloseButtonStyle} onClick={() => setTermsModalOpen(false)}>&times;</button>
                    <h2 style={modalTitleStyle}>Terms & Conditions</h2>
                    <ul style={termsListStyle}>
                        <li style={modalParagraphStyle}><b>Fair Play:</b> Users must participate honestly and avoid exploiting the platform.</li>
                        <li style={modalParagraphStyle}><b>Authentic Responses:</b> Surveys and quizzes should be answered genuinely.</li>
                        <li style={modalParagraphStyle}><b>Daily Streak Responsibility:</b> Consistent participation is required to maintain streaks.</li>
                        <li style={modalParagraphStyle}><b>Legitimate Usage:</b> Only one account per individual is allowed.</li>
                        <li style={modalParagraphStyle}><b>Reward Eligibility:</b> Rewards are subject to verification and may be withheld in cases of misuse.</li>
                        <li style={modalParagraphStyle}><b>Respectful Participation:</b> Users should maintain respectful conduct.</li>
                        <li style={modalParagraphStyle}><b>Platform Updates:</b> Rules and features may change over time.</li>
                        <li style={modalParagraphStyle}><b>Final Decision:</b> Administrative decisions regarding disputes and violations are final.</li>
                    </ul>
                </div>
            </div>
        )}
        
        {isChangePasswordModalOpen && (
            <div style={modalBackdropStyle} onClick={closeChangePasswordModal}>
                <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
                    <button style={modalCloseButtonStyle} onClick={closeChangePasswordModal}>&times;</button>
                    <h2 style={modalTitleStyle}>Change Password</h2>
                    
                    {changePasswordSuccess ? (
                        <p style={{color: 'green', textAlign: 'center'}}>{changePasswordSuccess}</p>
                    ) : changePasswordError ? (
                        <p style={{color: 'red', textAlign: 'center'}}>{changePasswordError}</p>
                    ) : (
                        <p style={modalParagraphStyle}>A password reset link will be sent to your registered email address. You can use it to create a new password.</p>
                    )}

                    {!changePasswordSuccess && (
                        <div style={{display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '2rem'}}>
                            <button 
                                style={{...actionButtonStyle, background: '#888', width: 'auto'}} 
                                onClick={closeChangePasswordModal}>
                                Cancel
                            </button>
                            <button 
                                style={{...actionButtonStyle, background: 'linear-gradient(to right, #4a00e0, #8e2de2)', width: 'auto'}} 
                                onClick={handleChangePassword}
                                disabled={isProcessingPasswordChange}>
                                {isProcessingPasswordChange ? 'Sending...' : 'Send Reset Link'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        )}

        {isUpiModalOpen && (
            <div style={modalBackdropStyle} onClick={() => setUpiModalOpen(false)}>
                <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
                    <button style={modalCloseButtonStyle} onClick={() => setUpiModalOpen(false)}>&times;</button>
                    <h2 style={modalTitleStyle}>Redeem Method</h2>
                    <input
                      style={inputStyle}
                      type="text"
                      placeholder="Enter your UPI ID"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                    />
                    {upiModalMessage && <p style={{color: isSavingUpi ? 'blue' : 'green', textAlign: 'center'}}>{upiModalMessage}</p>}
                    <div style={{display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '2rem'}}>
                        <button 
                            style={{...actionButtonStyle, background: '#888', width: 'auto'}} 
                            onClick={() => setUpiModalOpen(false)}>
                            Cancel
                        </button>
                        <button 
                            style={{...actionButtonStyle, background: 'linear-gradient(to right, #4a00e0, #8e2de2)', width: 'auto'}} 
                            onClick={handleSaveUpi}
                            disabled={isSavingUpi}>
                            {isSavingUpi ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </div>
            </div>
        )}

        {isBonusModalOpen && (
            <div style={modalBackdropStyle} onClick={() => setBonusModalOpen(false)}>
                <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
                    <button style={modalCloseButtonStyle} onClick={() => setBonusModalOpen(false)}>&times;</button>
                    <h2 style={modalTitleStyle}>Daily Login Reward</h2>
                     <p style={{...modalParagraphStyle, textAlign: 'center', fontSize: '1.2rem', color: '#333'}}>
                        You earned <span style={{fontWeight: 'bold', color: '#4a00e0'}}>25 points</span> for logging in today!
                    </p>
                    <p style={{...modalParagraphStyle, textAlign: 'center', opacity: 0.8, marginTop: '0.5rem'}}>
                        Come back tomorrow for another bonus.
                    </p>
                    <div style={{display: 'flex', justifyContent: 'center', marginTop: '2rem'}}>
                        <button 
                            style={{...actionButtonStyle, background: 'linear-gradient(to right, #4a00e0, #8e2de2)', width: 'auto', padding: '0.8rem 2.5rem'}} 
                            onClick={() => setBonusModalOpen(false)}>
                            Awesome!
                        </button>
                    </div>
                </div>
            </div>
        )}

        {streakBonusInfo && (
            <div style={modalBackdropStyle} onClick={() => setStreakBonusInfo(null)}>
                <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
                    <button style={modalCloseButtonStyle} onClick={() => setStreakBonusInfo(null)}>&times;</button>
                    <h2 style={modalTitleStyle}>🎉 Streak Bonus! 🎉</h2>
                    <p style={{...modalParagraphStyle, textAlign: 'center', fontSize: '1.4rem', color: '#333'}}>
                        You reached a <span style={{fontWeight: 'bold', color: '#4a00e0'}}>{streakBonusInfo.milestone}-Day Streak</span>!
                    </p>
                    <p style={{...modalParagraphStyle, textAlign: 'center', fontSize: '1.2rem', color: '#333'}}>
                        You've earned an extra <span style={{fontWeight: 'bold', color: '#ff7e5f'}}>{streakBonusInfo.bonus} points!</span>
                    </p>
                    <p style={{...modalParagraphStyle, textAlign: 'center', opacity: 0.8, marginTop: '0.5rem'}}>
                        Keep up the great work!
                    </p>
                    <div style={{display: 'flex', justifyContent: 'center', marginTop: '2rem'}}>
                        <button 
                            style={{...actionButtonStyle, background: 'linear-gradient(to right, #ff7e5f, #feb47b)', width: 'auto', padding: '0.8rem 2.5rem'}} 
                            onClick={() => setStreakBonusInfo(null)}>
                            Awesome!
                        </button>
                    </div>
                </div>
            </div>
        )}

      <header style={headerStyle}>
          <div style={hamburgerStyle} onClick={() => setDrawerOpen(true)}>&#9776;</div>
          <h2 style={headerTitleStyle}>Dashboard</h2>
          <div style={{width: '40px'}}></div> {/* This div is for spacing, to help center the title */}
      </header>

      <main style={mainContentStyle}>
        
        {logoutError && <p style={{color: 'red', textAlign: 'center'}}>{logoutError}</p>}

        <div style={welcomeCardStyle}>
            <h1 style={{fontSize: '2.5rem', fontWeight: 'bold', breakWord: 'break-word'}}>
                Welcome Back, {userData ? userData.username : 'User'}!
            </h1>
            <p style={{fontSize: '1.1rem', opacity: 0.9, marginTop: '0.5rem', maxWidth: '600px', margin: '0.5rem auto 0 auto'}}>
                Complete tasks, earn rewards, and grow with GrowthQuest.
            </p>
            <div style={{marginTop: '1.5rem'}}>
                <div style={{fontSize: '3rem', fontWeight: 'bold'}}>₹{calculateTotalMoney(userData)}</div>
                <div style={{fontSize: '1rem', opacity: 0.9}}>Total Money Earned</div>
            </div>
        </div>

        {announcement && (
            <div style={announcementCardStyle}>
                <h2 style={{fontSize: '1.5rem', fontWeight: '600', color: '#0c4a6e', marginBottom: '0.5rem'}}>{announcement.title}</h2>
                <p style={{color: '#1e293b', lineHeight: '1.6'}}>{announcement.message}</p>
                <p style={{fontSize: '0.8rem', color: '#64748b', textAlign: 'right', marginTop: '1rem'}}>
                    Posted on: {announcement.createdAt?.toDate().toLocaleDateString()}
                </p>
            </div>
        )}

        <section style={{ marginBottom: '2rem' }}>
          <ActivePolls />
        </section>

        <section style={{ marginBottom: '2rem' }}>
            <ActiveWritingChallenges
                tasks={writingTasks}
                submittedTaskIds={submittedTaskIds}
                loading={writingLoading}
                error={writingError}
                submittingTaskId={submittingTaskId}
                onSubmit={handleWritingSubmission}
            />
        </section>

        <section>
          <div style={statsContainerStyle}>
            <div style={{...statCardStyle, background: 'linear-gradient(to right, #4a00e0, #8e2de2)'}}>
              <div style={cardValueStyle}>
                {userData ? userData.pointsEarned : 0}
              </div>
              <div style={cardTitleStyle}>Points Earned</div>
            </div>
            <div style={{...statCardStyle, background: 'linear-gradient(to right, #ff7e5f, #feb47b)'}}>
              <div style={cardValueStyle}>
                {userData ? userData.redeemedPoints : 0}
              </div>
              <div style={cardTitleStyle}>Redeemed Points</div>
            </div>
             <div style={{...statCardStyle, background: 'linear-gradient(to right, #00c6ff, #0072ff)'}}>
              <div style={cardValueStyle}>
                {userData ? userData.processingPoints || 0 : 0}
              </div>
              <div style={cardTitleStyle}>Processing Points</div>
            </div>
          </div>
        </section>

        <section style={{marginTop: '3rem'}}>
            <h2 style={{ fontSize: '2rem', fontWeight: 'bold', textAlign: 'center', marginBottom: '2rem', color: '#4a00e0'}}>Your Streak</h2>
            <div style={statsContainerStyle}>
                <div style={{...statCardStyle, background: 'linear-gradient(to right, #4CAF50, #81C784)'}}>
                    <div style={cardValueStyle}>{userData ? userData.currentStreak || 0 : 0}</div>
                    <div style={cardTitleStyle}>Current Streak</div>
                </div>
                <div style={{...statCardStyle, background: 'linear-gradient(to right, #fbc531, #f9ca24)'}}>
                    <div style={cardValueStyle}>{userData ? userData.longestStreak || 0 : 0}</div>
                    <div style={cardTitleStyle}>Longest Streak</div>
                </div>
                <div style={{...statCardStyle, background: 'linear-gradient(to right, #e84393, #d63031)', display: 'flex', flexDirection: 'column', justifyContent: 'center'}}>
                    {nextRewardInfo ? (
                        nextRewardInfo.isCycleComplete ? (
                             <div style={{textAlign: 'center'}}>
                                <div style={{...cardValueStyle, fontSize: '2rem'}}>🎉</div>
                                <div style={cardTitleStyle}>Cycle Complete!</div>
                                <div style={{fontSize: '0.9rem', opacity: 0.8, marginTop: '1rem'}}>New rewards start on your next login.</div>
                            </div>
                        ) : nextRewardInfo.isAllDone ? (
                             <div style={{textAlign: 'center'}}>
                                <div style={{...cardValueStyle, fontSize: '2rem'}}>🏆</div>
                                <div style={cardTitleStyle}>All Done!</div>
                             </div>
                        ) : (
                            <>
                                <div>
                                    <div style={{fontSize: '2.5rem', fontWeight: 'bold'}}>+{nextRewardInfo.bonus} Points</div>
                                    <div style={{fontSize: '1.1rem', opacity: 0.9}}>for {nextRewardInfo.target} Day Streak</div>
                                </div>
                                <div style={{marginTop: '1.5rem'}}>
                                    <div style={{height: '10px', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '5px', overflow: 'hidden'}}>
                                        <div style={{width: `${nextRewardInfo.progress}%`, height: '100%', background: 'linear-gradient(to right, #fbc531, #f9ca24)', borderRadius: '5px', transition: 'width 0.5s ease-in-out'}}></div>
                                    </div>
                                    <div style={{fontSize: '0.9rem', opacity: 0.8, textAlign: 'right', marginTop: '0.5rem'}}>
                                        {nextRewardInfo.current} / {nextRewardInfo.target} Days
                                    </div>
                                </div>
                            </>
                        )
                    ) : (
                        <>
                            <div style={cardValueStyle}>...</div>
                            <div style={cardTitleStyle}>Next Reward</div>
                        </>
                    )}
                </div>
            </div>
        </section>
        
        <section style={{marginTop: '3rem'}}>
            <div style={statsContainerStyle}>
                <div style={actionCardStyle}>
                    <h2 style={actionTitleStyle}>Start a Quiz</h2>
                    <p style={{opacity: 0.8, fontSize: '1rem', margin: '1rem 0 1.5rem'}}>Test your knowledge and earn more points.</p>
                    <button style={{...actionButtonStyle, background: 'linear-gradient(to right, #00c6ff, #0072ff)'}} onClick={handleQuizNavigation}>
                        Take a Quiz
                    </button>
                </div>
                <div style={actionCardStyle}>
                    <h2 style={actionTitleStyle}>Redeem Rewards</h2>
                    <p style={{opacity: 0.8, fontSize: '1rem', margin: '1rem 0 1.5rem'}}>Request to redeem your earned points.</p>
                    <button style={{...actionButtonStyle, background: 'linear-gradient(to right, #4a00e0, #8e2de2)'}} onClick={handleRedeemNavigation}>
                        Redeem Points
                    </button>
                </div>
            </div>
        </section>

      </main>
    </div>
  );
}

export default Dashboard;
