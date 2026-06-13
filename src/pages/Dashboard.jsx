import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { signOut, sendPasswordResetEmail } from 'firebase/auth';

function Dashboard() {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [logoutError, setLogoutError] = useState('');
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const [isAboutModalOpen, setAboutModalOpen] = useState(false);
  const [isTermsModalOpen, setTermsModalOpen] = useState(false);
  const [isChangePasswordModalOpen, setChangePasswordModalOpen] = useState(false);
  const [changePasswordSuccess, setChangePasswordSuccess] = useState('');
  const [changePasswordError, setChangePasswordError] = useState('');
  const [isProcessingPasswordChange, setIsProcessingPasswordChange] = useState(false);
  const navigate = useNavigate();
  const user = auth.currentUser;
  const [announcement, setAnnouncement] = useState(null);

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }

    const userDocRef = doc(db, 'users', user.uid);

    const unsubscribe = onSnapshot(userDocRef, (doc) => {
        if (doc.exists()) {
            setUserData(doc.data());
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

    return () => {
      unsubscribe();
      unsubscribeAnnouncements();
    }

  }, [user, navigate]);

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

  const headerLogoutButtonStyle = {
    padding: '0.5rem 1rem',
    borderRadius: '8px',
    border: 'none',
    background: '#ff6b6b',
    color: 'white',
    fontSize: '0.9rem',
    cursor: 'pointer',
    transition: 'background 0.3s',
  };

  const logoutButtonStyle = {
    padding: '0.5rem 1rem',
    borderRadius: '8px',
    border: 'none',
    background: '#ff6b6b',
    color: 'white',
    fontSize: '0.9rem',
    cursor: 'pointer',
    transition: 'background 0.3s',
    width: '100%',
    textAlign: 'left'
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

  const heroSubtitle = {
    fontSize: '1.2rem',
    opacity: 0.9,
    marginTop: '0.5rem',
    maxWidth: '600px',
    margin: '0.5rem auto 0 auto',
  };

  const heroMoneyContainer = {
    marginTop: '2rem',
  };

  const heroMoneyValue = {
    fontSize: '3.5rem',
    fontWeight: 'bold',
  };
  
  const heroMoneyLabel = {
      fontSize: '1.1rem',
      opacity: 0.9,
      marginTop: '0.25rem'
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
      display: isAboutModalOpen || isTermsModalOpen || isChangePasswordModalOpen ? 'flex' : 'none',
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

  if (loading) {
    return <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh'}}>Loading...</div>;
  }

  if (error) {
    return <div style={{textAlign: 'center', marginTop: '50px'}}>{error}</div>;
  }

  return (
    <div style={pageStyle}>
        <div style={backdropStyle} onClick={() => setDrawerOpen(false)}></div>
        <div style={drawerStyle}>
            <div style={drawerHeader}>GrowthQuest</div>
            <div style={menuItemsContainer}>
                <a style={menuItemStyle} onClick={() => { setAboutModalOpen(true); setDrawerOpen(false); }}>About Our Admin</a>
                <a style={menuItemStyle} onClick={() => { setTermsModalOpen(true); setDrawerOpen(false); }}>Terms & Conditions</a>
                <a style={menuItemStyle} onClick={() => { setChangePasswordModalOpen(true); setDrawerOpen(false); }}>Change Password</a>
            </div>
            <button style={logoutButtonStyle} onClick={handleLogout}>Logout</button>
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

      <header style={headerStyle}>
          <div style={hamburgerStyle} onClick={() => setDrawerOpen(true)}>&#9776;</div>
          <h2 style={{margin: 0, fontSize: '1.5rem', fontWeight: 'bold', color: '#4a00e0'}}>Dashboard</h2>
          <button style={headerLogoutButtonStyle} onClick={handleLogout}>Logout</button>
      </header>

      <main style={mainContentStyle}>
        
        {logoutError && <p style={{color: 'red', textAlign: 'center'}}>{logoutError}</p>}

        <section className="p-8 md:py-12 md:px-8 rounded-2xl bg-gradient-to-r from-[#4a00e0] to-[#8e2de2] text-white text-center mb-12 shadow-lg">
            <h1 className="text-3xl md:text-5xl font-bold break-word">Welcome Back, {userData ? userData.username : 'User'}!</h1>
            <p style={heroSubtitle}>Complete tasks, earn rewards, and grow with GrowthQuest.</p>
            <div style={heroMoneyContainer}>
                <div style={heroMoneyValue}>₹{calculateTotalMoney(userData)}</div>
                <div style={heroMoneyLabel}>Total Money Earned</div>
            </div>
        </section>

        {announcement && (
            <section className="relative p-8 mb-12 bg-gradient-to-r from-indigo-100 via-purple-100 to-pink-100 border-l-8 border-purple-600 rounded-2xl shadow-lg">
                <div className="flex items-center">
                    <span className="text-3xl mr-4">📢</span>
                    <h2 className="text-lg font-semibold text-purple-700">Announcement</h2>
                </div>
                <h3 className="text-2xl font-bold text-purple-900 mt-4">
                    {announcement.title}
                </h3>
                <p className="mt-2 text-gray-800 leading-relaxed">
                    {announcement.message}
                </p>
                <p className="text-xs text-gray-600 mt-6 text-right">
                    Posted on: {announcement.createdAt?.toDate().toLocaleDateString()}
                </p>
            </section>
        )}

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
