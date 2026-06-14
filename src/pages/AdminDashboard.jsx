import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase/firebase';
import { signOut } from 'firebase/auth';
import { collection, query, where, onSnapshot, doc, runTransaction, increment, serverTimestamp, setDoc, deleteDoc, orderBy, limit, addDoc, updateDoc } from 'firebase/firestore';
import PollManagement from '../components/admin/PollManagement';
import WritingManagement from '../components/admin/WritingManagement';

function AdminDashboard() {
  // --- STATE MANAGEMENT ---
  const navigate = useNavigate();

  // GENERIC STATE
  const [users, setUsers] = useState([]);
  const [polls, setPolls] = useState([]);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');
  
  // LOADING STATE
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(true);
  const [pollsLoading, setPollsLoading] = useState(true);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [writingTasksLoading, setWritingTasksLoading] = useState(true);
  const [announcementLoading, setAnnouncementLoading] = useState(true);

  // TABS
  const [activeTab, setActiveTab] = useState('announcements');

  // ANNOUNCEMENTS
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementMessage, setAnnouncementMessage] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [currentAnnouncement, setCurrentAnnouncement] = useState(null);

  // REDEEM WORKFLOW
  const [redemptionRequests, setRedemptionRequests] = useState([]);
  const [approvedRequests, setApprovedRequests] = useState([]);
  const [rejectedRequests, setRejectedRequests] = useState([]);
  const [showApproved, setShowApproved] = useState(false);
  const [showRejected, setShowRejected] = useState(false);
  
  // POLL MANAGEMENT STATE
  const [newPoll, setNewPoll] = useState({ question: '', options: ['', ''] });
  const [selectedPoll, setSelectedPoll] = useState(null);
  const [pollResponses, setPollResponses] = useState([]);
  const [responsesLoading, setResponsesLoading] = useState(false);

  // WRITING MANAGEMENT STATE
  const [writingTasks, setWritingTasks] = useState([]);
  const [newWritingTask, setNewWritingTask] = useState({ title: '', question: '', rewardPoints: 50, minimumWords: 100 });


  // --- FIRESTORE LISTENERS ---
  useEffect(() => {
    const unsubscribes = [];
    // Master Listeners
    const usersQuery = query(collection(db, "users"));
    unsubscribes.push(onSnapshot(usersQuery, (snapshot) => { setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))); setUsersLoading(false); }, (err) => { console.error("User listener error:", err); setError("Failed to fetch user data."); setUsersLoading(false); }));
    const pollsQuery = query(collection(db, "polls"));
    unsubscribes.push(onSnapshot(pollsQuery, (snapshot) => { setPolls(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))); setPollsLoading(false); }, (err) => { console.error("Poll listener error:", err); setError("Failed to fetch poll data."); setPollsLoading(false); }));
    const announcementRef = doc(db, 'announcements', 'current');
    unsubscribes.push(onSnapshot(announcementRef, (docSnap) => { setCurrentAnnouncement(docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null); setAnnouncementLoading(false); }, (err) => { console.error("Announcement listener error:", err); setAnnouncementLoading(false); }));
    const pendingQuery = query(collection(db, "redemptionRequests"), where("status", "==", "pending"));
    unsubscribes.push(onSnapshot(pendingQuery, (snapshot) => { setRedemptionRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))); setRequestsLoading(false); }, (err) => { console.error("Requests listener error:", err); setRequestsLoading(false); }));
    const approvedQuery = query(collection(db, "redemptionRequests"), where("status", "==", "approved"), orderBy("approvedAt", "desc"), limit(20));
    unsubscribes.push(onSnapshot(approvedQuery, (snapshot) => { setApprovedRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))); }));
    const rejectedQuery = query(collection(db, "redemptionRequests"), where("status", "==", "rejected"), orderBy("rejectedAt", "desc"), limit(20));
    unsubscribes.push(onSnapshot(rejectedQuery, (snapshot) => { setRejectedRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))); }));
    const writingTasksQuery = query(collection(db, "writingTasks"), orderBy("createdAt", "desc"));
    unsubscribes.push(onSnapshot(writingTasksQuery, (snapshot) => { setWritingTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))); setWritingTasksLoading(false); }, (err) => { console.error("Writing tasks listener error:", err); setWritingTasksLoading(false); }));

    return () => unsubscribes.forEach(unsub => unsub());
  }, []);

  // Effect for fetching poll responses when a poll is selected
  useEffect(() => {
    if (selectedPoll) {
      setResponsesLoading(true);
      const responsesQuery = query(collection(db, "pollResponses"), where("pollId", "==", selectedPoll.id));
      const unsubscribe = onSnapshot(responsesQuery, (snapshot) => {
        setPollResponses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setResponsesLoading(false);
      }, (err) => {
        console.error("Error fetching poll responses:", err);
        setError("Failed to fetch poll responses.");
        setResponsesLoading(false);
      });

      // Cleanup listener when component unmounts or selectedPoll changes
      return () => unsubscribe();
    } else {
      setPollResponses([]); // Clear responses when no poll is selected
    }
  }, [selectedPoll]);

  useEffect(() => {
    if (!usersLoading && !pollsLoading && !requestsLoading && !announcementLoading) {
      setLoading(false);
    }
  }, [usersLoading, pollsLoading, requestsLoading, announcementLoading]);

  // --- POLL MANAGEMENT LOGIC ---
  const handleOptionChange = (index, value) => {
    const updatedOptions = [...newPoll.options];
    updatedOptions[index] = value;
    setNewPoll({ ...newPoll, options: updatedOptions });
  };

  const addOption = () => { setNewPoll({ ...newPoll, options: [...newPoll.options, ''] }); };
  const removeOption = (index) => { const updatedOptions = newPoll.options.filter((_, i) => i !== index); setNewPoll({ ...newPoll, options: updatedOptions }); };

  const handleCreatePoll = async () => {
    if (!newPoll.question || newPoll.options.some(opt => !opt)) { setError("Please fill in the poll question and all options."); return; }
    setError(null); setMessage('');
    try {
        await addDoc(collection(db, 'polls'), { ...newPoll, active: true, archived: false, rewardPoints: 10, createdAt: serverTimestamp(), votes: {} });
        setNewPoll({ question: '', options: ['', ''] });
        setMessage('Poll created successfully!');
    } catch (err) { console.error("Error creating poll:", err); setError("Failed to create poll."); }
  };

  const togglePollStatus = async (pollId, currentStatus) => {
      setError(null); setMessage('');
      try {
          await updateDoc(doc(db, 'polls', pollId), { active: !currentStatus });
          setMessage(`Poll status updated successfully!`);
      } catch (err) { console.error("Error updating poll status:", err); setError("Failed to update poll status."); }
  };

  const deletePoll = async (pollId) => {
      if (selectedPoll && selectedPoll.id === pollId) {
        setSelectedPoll(null);
      }
      setError(null); setMessage('');
      try {
          await deleteDoc(doc(db, 'polls', pollId));
          setMessage('Poll deleted successfully!');
      } catch (err) { console.error("Error deleting poll:", err); setError("Failed to delete poll."); }
  };

  // --- REDEEM APPROVAL WORKFLOW ---
  const handleApprove = async (request) => {
    const { id: requestId, userId, requestedPoints } = request;
    setMessage(''); setError(null);
    try {
      await runTransaction(db, async (transaction) => {
        const requestRef = doc(db, "redemptionRequests", requestId);
        const userRef = doc(db, "users", userId);
        const requestDoc = await transaction.get(requestRef);
        if (!requestDoc.exists() || requestDoc.data().status !== 'pending') { throw new Error("Request is not pending or has already been processed."); }
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) { throw new Error("User associated with the request was not found."); }
        transaction.update(requestRef, { status: "approved", approvedAt: serverTimestamp(), approvedBy: auth.currentUser.email });
        transaction.update(userRef, { processingPoints: increment(-requestedPoints), redeemedPoints: increment(requestedPoints) });
      });
      setMessage(`Request for ${requestedPoints} points approved.`);
    } catch (err) { console.error("Error approving request:", err); setError(`Failed to approve request: ${err.message}`); }
  };

  const handleReject = async (request) => {
    const { id: requestId, userId, requestedPoints } = request;
    setMessage(''); setError(null);
    try {
      await runTransaction(db, async (transaction) => {
        const requestRef = doc(db, "redemptionRequests", requestId);
        const userRef = doc(db, "users", userId);
        const requestDoc = await transaction.get(requestRef);
        if (!requestDoc.exists() || requestDoc.data().status !== 'pending') { throw new Error("Request is not pending or has already been processed."); }
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) { throw new Error(`User ${userId} not found. Cannot process rejection.`); }
        transaction.update(requestRef, { status: "rejected", rejectedAt: serverTimestamp(), rejectedBy: auth.currentUser.email });
        transaction.update(userRef, { processingPoints: increment(-requestedPoints), pointsEarned: increment(requestedPoints) });
      });
       setMessage(`Request for ${requestedPoints} points rejected.`);
    } catch (err) { console.error("Error rejecting request:", err); setError(`Failed to reject request: ${err.message}`); }
  };

  // --- WRITING CHALLENGE LOGIC ---
  const handleCreateWritingTask = async () => {
    if (!newWritingTask.title || !newWritingTask.question) {
      setError("Challenge title and question are required.");
      return;
    }
    if (newWritingTask.rewardPoints <= 0) {
      setError("Reward points must be greater than zero.");
      return;
    }
    if (newWritingTask.minimumWords < 50) {
      setError("Minimum words must be at least 50.");
      return;
    }
    setError(null); setMessage('');
    try {
      await addDoc(collection(db, 'writingTasks'), {
        ...newWritingTask,
        active: false, // Default to inactive
        archived: false,
        createdAt: serverTimestamp(),
      });
      setNewWritingTask({ title: '', question: '', rewardPoints: 50, minimumWords: 100 });
      setMessage('Writing challenge created successfully!');
    } catch (err) { console.error("Error creating writing task:", err); setError("Failed to create writing challenge."); }
  };

  const toggleWritingTaskStatus = async (taskId, currentStatus) => {
    try { await updateDoc(doc(db, 'writingTasks', taskId), { active: !currentStatus }); setMessage('Challenge status updated successfully!'); } catch (err) { console.error("Error updating task status:", err); setError("Failed to update challenge status."); }
  };

  const deleteWritingTask = async (taskId) => {
    try { await deleteDoc(doc(db, 'writingTasks', taskId)); setMessage('Challenge deleted successfully!'); } catch (err) { console.error("Error deleting task:", err); setError("Failed to delete challenge."); }
  };

  // --- OTHER HANDLERS ---
  const handleLogout = async () => { try { await signOut(auth); navigate('/'); } catch (error) { console.error("Error signing out: ", error); } };
  const handlePublishAnnouncement = async () => {
    if (!announcementTitle || !announcementMessage) { setError("Please fill in both the title and message for the announcement."); return; }
    setError(null); setMessage('');
    try {
      await setDoc(doc(db, 'announcements', 'current'), { title: announcementTitle, message: announcementMessage, active: true, createdAt: serverTimestamp() });
      setMessage("Announcement published successfully!"); setAnnouncementTitle(''); setAnnouncementMessage('');
    } catch (err) { console.error("Error publishing announcement:", err); setError("Failed to publish announcement."); }
  };

  const handleDeleteAnnouncement = async () => {
    setError(null); setMessage('');
    try { await deleteDoc(doc(db, 'announcements', 'current')); setMessage("Current announcement has been deleted successfully!"); } 
    catch (err) { console.error("Error deleting announcement:", err); setError("Failed to delete announcement."); } 
    finally { setShowDeleteModal(false); }
  };

  // --- STYLES (UNCHANGED) ---
  const pageStyle = { fontFamily: `'Segoe UI', Tahoma, Geneva, Verdana, sans-serif`, backgroundColor: '#f4f7f6', color: '#333', minHeight: '100vh' };
  const navStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 2rem', backgroundColor: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', position: 'sticky', top: 0, zIndex: 1000 };
  const navTitleStyle = { fontSize: '1.5rem', fontWeight: 'bold', color: '#4a00e0' };
  const logoutButtonStyle = { padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', background: '#ff6b6b', color: 'white', fontSize: '0.9rem', cursor: 'pointer', transition: 'background 0.3s' };
  const mainContentStyle = { padding: '2rem', maxWidth: '1400px', margin: '0 auto' };
  const headerStyle = { fontSize: '2.5rem', fontWeight: 'bold', color: '#4a00e0', marginBottom: '2rem' };
  const statsContainerStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem', marginBottom: '3rem' };
  const statCardStyle = { padding: '2rem', borderRadius: '12px', color: 'white', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', background: 'linear-gradient(to right, #4a00e0, #8e2de2)' };
  const cardValueStyle = { fontSize: '3rem', fontWeight: 'bold', marginBottom: '0.5rem' };
  const cardTitleStyle = { fontSize: '1.2rem', opacity: 0.9 };
  const sectionTitleStyle = { fontSize: '2rem', fontWeight: '600', marginTop: '3rem', marginBottom: '1.5rem', borderBottom: '2px solid #e0e0e0', paddingBottom: '0.5rem' };
  const requestsContainerStyle = { backgroundColor: 'white', borderRadius: '12px', padding: '2rem', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' };
  const buttonStyle = { padding: '0.6rem 1.2rem', borderRadius: '8px', border: 'none', color: 'white', fontSize: '0.9rem', cursor: 'pointer', transition: 'opacity 0.3s', margin: '0 5px' };
  const announcementFormStyle = { backgroundColor: 'white', borderRadius: '12px', padding: '2rem', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' };
  const inputStyle = { width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ccc', marginBottom: '1rem', fontSize: '1rem' };
  const textareaStyle = { width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ccc', marginBottom: '1rem', fontSize: '1rem', minHeight: '100px' };
  const tableStyle = { width: '100%', borderCollapse: 'collapse', marginTop: '1.5rem' };
  const thStyle = { border: '1px solid #ddd', padding: '12px', textAlign: 'left', backgroundColor: '#f2f2f2' };
  const tdStyle = { border: '1px solid #ddd', padding: '12px' };
  const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 };
  const modalContentStyle = { background: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 5px 15px rgba(0,0,0,0.3)', maxWidth: '500px', width: '90%', textAlign: 'center' };
  const tabContainerStyle = { borderBottom: '2px solid #ccc', marginBottom: '2rem' };
  const tabButtonStyle = { padding: '1rem 1.5rem', cursor: 'pointer', border: 'none', background: 'none', fontSize: '1.1rem', color: '#666', borderBottom: '3px solid transparent' };
  const tabButtonActiveStyle = { ...tabButtonStyle, fontWeight: 'bold', color: '#4a00e0', borderBottom: '3px solid #4a00e0' };
  
  return (
    <div style={pageStyle}>
      <nav style={navStyle}><div style={navTitleStyle}>GrowthQuest Admin</div><button style={logoutButtonStyle} onClick={handleLogout}>Logout</button></nav>
      <main style={mainContentStyle}>
        <header style={headerStyle}>Admin Dashboard</header>
        {message && <p style={{color: 'green', textAlign: 'center', marginBottom: '1rem'}}>{message}</p>}
        {error && <p style={{color: 'red', textAlign: 'center', marginBottom: '1rem'}}>{error}</p>}
        {loading ? <p style={{textAlign: 'center'}}>Loading Dashboard Data...</p> : (
        <>
          <section>
            <div style={statsContainerStyle}>
              <div style={statCardStyle}><div style={cardValueStyle}>{users.length}</div><div style={cardTitleStyle}>Total Users</div></div>
              <div style={{...statCardStyle, background: 'linear-gradient(to right, #ff7e5f, #feb47b)'}}><div style={cardValueStyle}>{redemptionRequests.length}</div><div style={cardTitleStyle}>Pending Redeem Requests</div></div>
              <div style={{...statCardStyle, background: 'linear-gradient(to right, #2193b0, #6dd5ed)'}}><div style={cardValueStyle}>{polls.filter(p => p.active).length}</div><div style={cardTitleStyle}>Active Polls</div></div>
            </div>
          </section>
          <div style={tabContainerStyle}>
              <button style={activeTab === 'announcements' ? tabButtonActiveStyle : tabButtonStyle} onClick={() => setActiveTab('announcements')}>Announcement Management</button>
              <button style={activeTab === 'polls' ? tabButtonActiveStyle : tabButtonStyle} onClick={() => setActiveTab('polls')}>Poll Management</button>
              <button style={activeTab === 'writing' ? tabButtonActiveStyle : tabButtonStyle} onClick={() => setActiveTab('writing')}>Writing Management</button>
          </div>
          {activeTab === 'announcements' && (
              <>
                  <section><h2 style={sectionTitleStyle}>Publish Announcement</h2><div style={announcementFormStyle}><input type="text" style={inputStyle} placeholder="Announcement Title" value={announcementTitle} onChange={(e) => setAnnouncementTitle(e.target.value)} /><textarea style={textareaStyle} placeholder="Announcement Message" value={announcementMessage} onChange={(e) => setAnnouncementMessage(e.target.value)} /><button style={{...buttonStyle, background: '#4a00e0', width: '100%'}} onClick={handlePublishAnnouncement}>Publish Announcement</button></div></section>
                  <section><h2 style={sectionTitleStyle}>Current Announcement</h2><div style={announcementFormStyle}>{announcementLoading ? (<p>Loading announcement...</p>) : currentAnnouncement ? (<div><h3 style={{fontSize: '1.2rem', fontWeight: 'bold'}}>{currentAnnouncement.title}</h3><p style={{margin: '1rem 0'}}>{currentAnnouncement.message}</p><p style={{fontSize: '0.8rem', color: '#666'}}>Published on: {currentAnnouncement.createdAt?.toDate().toLocaleString()}</p><button style={{...buttonStyle, background: '#dc3545', width: '100%', marginTop: '1rem'}} onClick={() => setShowDeleteModal(true)}>Delete Announcement</button></div>) : (<p>No active announcement.</p>)}</div></section>
              </>
          )}
          {activeTab === 'polls' && (
            <PollManagement
              polls={polls}
              loading={pollsLoading}
              error={error}
              newPoll={newPoll}
              setNewPoll={setNewPoll}
              handleCreatePoll={handleCreatePoll}
              togglePollStatus={togglePollStatus}
              deletePoll={deletePoll}
              handleOptionChange={handleOptionChange}
              addOption={addOption}
              removeOption={removeOption}
              selectedPoll={selectedPoll}
              setSelectedPoll={setSelectedPoll}
              pollResponses={pollResponses}
              responsesLoading={responsesLoading}
              sectionTitleStyle={sectionTitleStyle}
              announcementFormStyle={announcementFormStyle}
              inputStyle={inputStyle}
              buttonStyle={buttonStyle}
              tableStyle={tableStyle}
              thStyle={thStyle}
              tdStyle={tdStyle}
            />
          )}
          {activeTab === 'writing' && (
            <WritingManagement
              tasks={writingTasks}
              loading={writingTasksLoading}
              error={error}
              newTask={newWritingTask}
              setNewTask={setNewWritingTask}
              handleCreateTask={handleCreateWritingTask}
              toggleTaskStatus={toggleWritingTaskStatus}
              deleteTask={deleteWritingTask}
              sectionTitleStyle={sectionTitleStyle}
              announcementFormStyle={announcementFormStyle}
              inputStyle={inputStyle}
              textareaStyle={textareaStyle}
              buttonStyle={buttonStyle}
              tableStyle={tableStyle}
              thStyle={thStyle}
              tdStyle={tdStyle}
            />
          )}
          <section>
            <h2 style={sectionTitleStyle}>Redeem Requests</h2>
            <div style={requestsContainerStyle}>
                <h3 style={{fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem'}}>Pending Requests</h3>
                <div style={{overflowX: 'auto'}}><table style={tableStyle}><thead><tr><th style={thStyle}>Username</th><th style={thStyle}>User ID</th><th style={thStyle}>UPI ID</th><th style={thStyle}>Points</th><th style={thStyle}>Requested At</th><th style={thStyle}>Status</th><th style={thStyle}>Actions</th></tr></thead><tbody>{redemptionRequests.length > 0 ? redemptionRequests.map(req => (<tr key={req.id}><td style={tdStyle}>{req.username}</td><td style={tdStyle}>{req.userId}</td><td style={tdStyle}>{users.find(user => user.id === req.userId)?.upiId || 'N/A'}</td><td style={tdStyle}>{req.requestedPoints}</td><td style={tdStyle}>{req.timestamp?.toDate().toLocaleString()}</td><td style={tdStyle}>{req.status}</td><td style={tdStyle}><button style={{...buttonStyle, background: '#28a745'}} onClick={() => handleApprove(req)}>Approve</button><button style={{...buttonStyle, background: '#dc3545'}} onClick={() => handleReject(req)}>Reject</button></td></tr>)) : (<tr><td colSpan="7" style={{...tdStyle, textAlign: 'center'}}>No pending requests.</td></tr>)}</tbody></table></div>
                <div style={{marginTop: '2rem', borderTop: '1px solid #eee', paddingTop: '2rem'}}>
                    <h3 style={{fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem'}}>History</h3>
                    <div><button style={{...buttonStyle, background: showApproved ? '#4a00e0' : '#6c757d'}} onClick={() => {setShowApproved(true); setShowRejected(false);}}>Approved</button><button style={{...buttonStyle, background: showRejected ? '#4a00e0' : '#6c757d'}} onClick={() => {setShowRejected(true); setShowApproved(false);}}>Rejected</button></div>
                    {showApproved && (<div style={{marginTop: '1rem'}}><h4 style={{fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '1rem'}}>Recently Approved</h4><div style={{overflowX: 'auto'}}><table style={tableStyle}><thead><tr><th style={thStyle}>Username</th><th style={thStyle}>Points</th><th style={thStyle}>Requested At</th><th style={thStyle}>Approved By</th></tr></thead><tbody>{approvedRequests.length > 0 ? approvedRequests.map(req => (<tr key={req.id}><td style={tdStyle}>{req.username}</td><td style={tdStyle}>{req.requestedPoints}</td><td style={tdStyle}>{req.timestamp?.toDate().toLocaleString()}</td><td style={tdStyle}>{req.approvedBy}</td></tr>)) : (<tr><td colSpan="4" style={{...tdStyle, textAlign: 'center'}}>No approved requests in history.</td></tr>)}</tbody></table></div></div>)}
                    {showRejected && (<div style={{marginTop: '1rem'}}><h4 style={{fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '1rem'}}>Recently Rejected</h4><div style={{overflowX: 'auto'}}><table style={tableStyle}><thead><tr><th style={thStyle}>Username</th><th style={thStyle}>Points</th><th style={thStyle}>Requested At</th><th style={thStyle}>Rejected By</th></tr></thead><tbody>{rejectedRequests.length > 0 ? rejectedRequests.map(req => (<tr key={req.id}><td style={tdStyle}>{req.username}</td><td style={tdStyle}>{req.requestedPoints}</td><td style={tdStyle}>{req.timestamp?.toDate().toLocaleString()}</td><td style={tdStyle}>{req.rejectedBy}</td></tr>)) : (<tr><td colSpan="4" style={{...tdStyle, textAlign: 'center'}}>No rejected requests in history.</td></tr>)}</tbody></table></div></div>)}
                </div>
            </div>
          </section>
          <section>
            <h2 style={sectionTitleStyle}>User Management</h2>
            <div style={requestsContainerStyle}><div style={{overflowX: 'auto'}}><table style={tableStyle}><thead><tr><th style={thStyle}>Username</th><th style={thStyle}>Email</th><th style={thStyle}>UPI ID</th><th style={thStyle}>Points Earned</th><th style={thStyle}>Points Processing</th><th style={thStyle}>Points Redeemed</th></tr></thead><tbody>{users.map(user => (<tr key={user.id}><td style={tdStyle}>{user.username}</td><td style={tdStyle}>{user.email}</td><td style={tdStyle}>{user.upiId || 'N/A'}</td><td style={tdStyle}>{user.pointsEarned || 0}</td><td style={tdStyle}>{user.processingPoints || 0}</td><td style={tdStyle}>{user.redeemedPoints || 0}</td></tr>))}</tbody></table></div></div>
          </section>
        </>)}
      </main>
      {showDeleteModal && (<div style={modalOverlayStyle}><div style={modalContentStyle}><h3 style={{fontSize: '1.5rem', marginBottom: '1rem'}}>Confirm Deletion</h3><p>Are you sure you want to delete the current announcement? This action cannot be undone.</p><div style={{marginTop: '2rem'}}><button style={{...buttonStyle, background: '#dc3545', marginRight: '1rem'}} onClick={handleDeleteAnnouncement}>Confirm Delete</button><button style={{...buttonStyle, background: '#6c757d'}} onClick={() => setShowDeleteModal(false)}>Cancel</button></div></div></div>)}
    </div>
  );
}

export default AdminDashboard;
