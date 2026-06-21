import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase/firebase';
import { collection, query, where, onSnapshot, doc, runTransaction, increment, serverTimestamp, setDoc, deleteDoc, orderBy, limit, addDoc, updateDoc, getDocs } from 'firebase/firestore';
import PollManagement from '../components/admin/PollManagement';
import WritingManagement from '../components/admin/WritingManagement';
import GiftManagement from '../components/admin/GiftManagement';
import FeatureAccessManagement from './FeatureAccessManagement'; // Import the new component

const REWARD_NAMES = {
    amazon_pay: '🟨 Amazon Pay Gift Card',
    amazon_gift: '🎁 Amazon Gift Card',
    flipkart: '🛒 Flipkart Gift Card',
    ajio: '👕 AJIO Gift Card',
    mobile_recharge: '📱 Mobile Recharge',
};

function AdminDashboard({ handleLogout }) {
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
  const [activeTab, setActiveTab] = useState('polls'); // Keep original default

  // ANNOUNCEMENTS
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementMessage, setAnnouncementMessage] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [currentAnnouncement, setCurrentAnnouncement] = useState(null);

  // REDEEM WORKFLOW
  const [redemptionRequests, setRedemptionRequests] = useState([]);
  const [historyRequests, setHistoryRequests] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  // POLL MANAGEMENT STATE
  const [newPoll, setNewPoll] = useState({ question: '', options: ['', ''], startTime: '', endTime: '' });
  const [editingPoll, setEditingPoll] = useState(null);
  const [selectedPoll, setSelectedPoll] = useState(null);
  const [pollResponses, setPollResponses] = useState([]);
  const [responsesLoading, setResponsesLoading] = useState(false);

  // WRITING MANAGEMENT STATE
  const [writingTasks, setWritingTasks] = useState([]);
  const [newWritingTask, setNewWritingTask] = useState({ title: '', question: '', rewardPoints: 50, minimumWords: 100 });
  const [writingResponses, setWritingResponses] = useState([]);
  
  const [treasureKeyUserEmail, setTreasureKeyUserEmail] = useState('');
  const [treasureKeyMessage, setTreasureKeyMessage] = useState('');

  const formatLastSeen = (timestamp) => {
    if (!timestamp || typeof timestamp.toDate !== 'function') return 'N/A';
    const lastSeenDate = timestamp.toDate();
    const now = new Date();

    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);

    const lastSeenDay = new Date(lastSeenDate.getFullYear(), lastSeenDate.getMonth(), lastSeenDate.getDate());

    const timeString = lastSeenDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true });

    if (lastSeenDay.getTime() === today.getTime()) {
        return `Today ${timeString}`;
    } else if (lastSeenDay.getTime() === yesterday.getTime()) {
        return `Yesterday ${timeString}`;
    } else {
        const dateString = lastSeenDate.toLocaleDateString('en-GB');
        return `${dateString} ${timeString}`;
    }
};


  // --- FIRESTORE LISTENERS ---
  useEffect(() => {
    const unsubscribes = [];
    // Master Listeners
    const usersQuery = query(collection(db, "users"));
    unsubscribes.push(onSnapshot(usersQuery, (snapshot) => { setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))); setUsersLoading(false); }, (err) => { console.error("User listener error:", err); setError("Failed to fetch user data."); setUsersLoading(false); }));
    const pollsQuery = query(collection(db, "polls"), orderBy("createdAt", "desc"));
    unsubscribes.push(onSnapshot(pollsQuery, (snapshot) => { setPolls(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))); setPollsLoading(false); }, (err) => { console.error("Poll listener error:", err); setError("Failed to fetch poll data."); setPollsLoading(false); }));
    const announcementRef = doc(db, 'announcements', 'current');
    unsubscribes.push(onSnapshot(announcementRef, (docSnap) => { setCurrentAnnouncement(docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null); setAnnouncementLoading(false); }, (err) => { console.error("Announcement listener error:", err); setAnnouncementLoading(false); }));
    const requestsQuery = query(collection(db, "redemptionRequests"), orderBy("requestedAt", "desc"));
    unsubscribes.push(onSnapshot(requestsQuery, (snapshot) => {
        const allRequests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setRedemptionRequests(allRequests.filter(r => r.status === 'pending' || r.status === 'processing'));
        setHistoryRequests(allRequests.filter(r => r.status === 'completed' || r.status === 'rejected'));
        setRequestsLoading(false);
    }, (err) => { console.error("Requests listener error:", err); setRequestsLoading(false); }));
    const writingTasksQuery = query(collection(db, "writingTasks"), orderBy("createdAt", "desc"));
    unsubscribes.push(onSnapshot(writingTasksQuery, (snapshot) => { setWritingTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))); setWritingTasksLoading(false); }, (err) => { console.error("Writing tasks listener error:", err); setWritingTasksLoading(false); }));

    const writingResponsesQuery = query(
        collection(db, "writingResponses"),
        orderBy("submittedAt", "desc")
    );

    unsubscribes.push(onSnapshot(
        writingResponsesQuery,
        (snapshot) => {
            setWritingResponses(
                snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }))
            );
        },
        (err) => {
            console.error("Writing responses listener error:", err);
        }
    ));

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
    const toDateTime = (dateTimeString) => {
        if (!dateTimeString) return null;
        const dt = new Date(dateTimeString);
        return isNaN(dt.getTime()) ? null : dt;
    };

    const validatePollData = (pollData) => {
        const { question, options, startTime, endTime } = pollData;

        if (!question.trim()) return "Poll question cannot be empty.";
        if (options.length < 2) return "Poll must have at least 2 options.";
        if (options.length > 6) return "Poll can have a maximum of 6 options.";
        if (options.some(opt => !opt.trim())) return "All poll options must be filled.";

        const uniqueOptions = new Set(options.map(opt => opt.trim().toLowerCase()));
        if (uniqueOptions.size !== options.length) return "Poll options must be unique.";

        const startDateTime = toDateTime(startTime);
        const endDateTime = toDateTime(endTime);

        if (endDateTime && !startDateTime) return "A start time must be set if an end time is specified.";
        if (startDateTime && endDateTime && startDateTime >= endDateTime) return "End time must be after the start time.";

        return null;
    };

  const handleOptionChange = (index, value) => {
    const updatedOptions = [...newPoll.options];
    updatedOptions[index] = value;
    setNewPoll({ ...newPoll, options: updatedOptions });
  };

  const addOption = () => { if (newPoll.options.length < 6) setNewPoll({ ...newPoll, options: [...newPoll.options, ''] }); };
  const removeOption = (index) => { if (newPoll.options.length > 2) { const updatedOptions = newPoll.options.filter((_, i) => i !== index); setNewPoll({ ...newPoll, options: updatedOptions }); }};

    const handleCreatePoll = async () => {
        setError(null);
        setMessage('');
        const validationError = validatePollData(newPoll);
        if (validationError) {
            setError(validationError);
            return;
        }
        try {
            await addDoc(collection(db, 'polls'), {
                question: newPoll.question,
                options: newPoll.options,
                startTime: toDateTime(newPoll.startTime),
                endTime: toDateTime(newPoll.endTime),
                active: true,
                archived: false,
                createdAt: serverTimestamp(),
            });
            setNewPoll({ question: '', options: ['', ''], startTime: '', endTime: '' });
            setMessage('Poll created successfully!');
        } catch (err) {
            console.error("Error creating poll:", err);
            setError("Failed to create poll.");
        }
    };

    const handleUpdatePoll = async () => {
        if (!editingPoll) return;
        setError(null);
        setMessage('');
        const validationError = validatePollData(editingPoll);
        if (validationError) {
            setError(validationError);
            return;
        }
        try {
            const pollRef = doc(db, 'polls', editingPoll.id);
            await updateDoc(pollRef, {
                question: editingPoll.question,
                options: editingPoll.options,
                startTime: toDateTime(editingPoll.startTime),
                endTime: toDateTime(editingPoll.endTime),
            });
            setEditingPoll(null);
            setMessage('Poll updated successfully!');
        } catch (err) {
            console.error("Error updating poll:", err);
            setError("Failed to update poll.");
        }
    };

    const handleCancelEdit = () => {
        setEditingPoll(null);
        setError(null);
        setMessage('');
    };

    const handleEditClick = (poll) => {
        const pollData = { ...poll };
        if (poll.startTime) {
            const startTimeAsDate = poll.startTime.toDate ? poll.startTime.toDate() : poll.startTime;
            pollData.startTime = new Date(startTimeAsDate.getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
        }
        if (poll.endTime) {
            const endTimeAsDate = poll.endTime.toDate ? poll.endTime.toDate() : poll.endTime;
            pollData.endTime = new Date(endTimeAsDate.getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
        }
        setEditingPoll(pollData);
    };

    const handleArchivePoll = async (pollId) => {
      setError(null); setMessage('');
      try {
          await updateDoc(doc(db, 'polls', pollId), {
              archived: true,
              archivedAt: serverTimestamp()
          });
          setMessage('Poll archived successfully!');
      } catch (err) {
          console.error("Error archiving poll:", err);
          setError("Failed to archive poll.");
      }
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
    const { id: requestId } = request;
    setMessage(''); setError(null);
    try {
      const requestRef = doc(db, "redemptionRequests", requestId);
      await updateDoc(requestRef, { 
        status: "processing", 
        approvedAt: serverTimestamp(), 
        approvedBy: auth.currentUser.email 
      });
      setMessage(`Request approved and is now being processed.`);
    } catch (err) { console.error("Error approving request:", err); setError(`Failed to approve request: ${err.message}`); }
  };

  const handleComplete = async (request) => {
    const { id: requestId, userId, pointsUsed } = request;
    setMessage(''); setError(null);
    try {
      await runTransaction(db, async (transaction) => {
        const requestRef = doc(db, "redemptionRequests", requestId);
        const userRef = doc(db, "users", userId);
        const requestDoc = await transaction.get(requestRef);
        if (!requestDoc.exists() || requestDoc.data().status !== 'processing') { throw new Error("Request is not in processing state."); }
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) { throw new Error("User associated with the request was not found."); }
        transaction.update(requestRef, { status: "completed", completedAt: serverTimestamp() });
        transaction.update(userRef, { processingPoints: increment(-pointsUsed), redeemedPoints: increment(pointsUsed) });
      });
      setMessage(`Request for ${pointsUsed} points marked as complete.`);
    } catch (err) { console.error("Error completing request:", err); setError(`Failed to complete request: ${err.message}`); }
  };

  const handleReject = async (request) => {
    const { id: requestId, userId, pointsUsed, status } = request;
    setMessage(''); setError(null);
    try {
      await runTransaction(db, async (transaction) => {
        const requestRef = doc(db, "redemptionRequests", requestId);
        const userRef = doc(db, "users", userId);
        const requestDoc = await transaction.get(requestRef);
        if (!requestDoc.exists() || (status !== 'pending' && status !== 'processing')) { throw new Error("Request cannot be rejected or has already been processed."); }
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) { throw new Error(`User ${userId} not found. Cannot process rejection.`); }
        transaction.update(requestRef, { status: "rejected", rejectedAt: serverTimestamp(), rejectedBy: auth.currentUser.email });
        // Return points to user
        if (status === 'pending') {
            transaction.update(userRef, { processingPoints: increment(-pointsUsed), pointsEarned: increment(pointsUsed) });
        } else { // It was in processing
            transaction.update(userRef, { processingPoints: increment(-pointsUsed), pointsEarned: increment(pointsUsed) });
        }
      });
       setMessage(`Request for ${pointsUsed} points rejected.`);
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

    const handleGrantKeys = async (keyType) => {
        if (!treasureKeyUserEmail) {
            setTreasureKeyMessage('Please enter a user email.');
            return;
        }
        setTreasureKeyMessage('Processing...');
        try {
            const usersQuery = query(collection(db, "users"), where("email", "==", treasureKeyUserEmail));
            const querySnapshot = await getDocs(usersQuery);
            if (querySnapshot.empty) {
                setTreasureKeyMessage('User not found.');
                return;
            }
            const userDoc = querySnapshot.docs[0];
            const userRef = doc(db, 'users', userDoc.id);
    
            await runTransaction(db, async (transaction) => {
                const userSnap = await transaction.get(userRef)
                if (!userSnap.exists()) {
                  throw "Document does not exist!";
                }
                const treasureKeys = userSnap.data().treasureKeys || { bronze: 0, silver: 0, gold: 0, diamond: 0 };
                treasureKeys[keyType] = (treasureKeys[keyType] || 0) + 1;
                transaction.update(userRef, {
                    treasureKeys: treasureKeys
                });
            });
    
            setTreasureKeyMessage(`+1 ${keyType} key granted to ${treasureKeyUserEmail}.`);
        } catch (error) {
            console.error("Error granting keys:", error);
            setTreasureKeyMessage('Error granting keys.');
        }
    };

    const handleResetKeys = async (keyType) => {
        if (!treasureKeyUserEmail) {
            setTreasureKeyMessage('Please enter a user email.');
            return;
        }
        setTreasureKeyMessage('Processing...');
        try {
            const usersQuery = query(collection(db, "users"), where("email", "==", treasureKeyUserEmail));
            const querySnapshot = await getDocs(usersQuery);
    
            if (querySnapshot.empty) {
                setTreasureKeyMessage('User not found.');
                return;
            }
    
            const userDoc = querySnapshot.docs[0];
            const userRef = doc(db, 'users', userDoc.id);
    
            await runTransaction(db, async (transaction) => {
                const userSnap = await transaction.get(userRef);
                if (!userSnap.exists()) {
                    throw "Document does not exist!";
                }
                const treasureKeys = userSnap.data().treasureKeys || { bronze: 0, silver: 0, gold: 0, diamond: 0 };
                treasureKeys[keyType] = 0;
                transaction.update(userRef, {
                    treasureKeys: treasureKeys
                });
            });
    
            setTreasureKeyMessage(`${keyType} keys reset for ${treasureKeyUserEmail}.`);
        } catch (error) {
            console.error("Error resetting keys:", error);
            setTreasureKeyMessage('Error resetting keys.');
        }
    };

  // --- OTHER HANDLERS ---
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

  const handleRejectWritingSubmission = async (submission) => {
    setMessage('');
    setError(null);

    try {
      await updateDoc(
        doc(db, "writingResponses", submission.id),
        {
          status: "rejected",
          reviewedAt: serverTimestamp(),
        }
      );

      setMessage("Submission rejected successfully.");
    } catch (err) {
      console.error("Error rejecting writing submission:", err);
      setError("Failed to reject submission.");
    }
  };

  const handleApproveWritingSubmission = async (submission) => {
    setMessage('');
    setError(null);

    try {
      await runTransaction(db, async (transaction) => {
        const submissionRef = doc(db, "writingResponses", submission.id);
        const submissionDoc = await transaction.get(submissionRef);

        if (!submissionDoc.exists() || submissionDoc.data().status !== 'pending') {
          throw new Error("Submission has already been processed or does not exist.");
        }

        transaction.update(submissionRef, {
          status: "approved",
          reviewedAt: serverTimestamp(),
        });

        const userRef = doc(db, "users", submission.userId);
        transaction.update(userRef, {
          pointsEarned: increment(submission.rewardPoints),
        });
      });
      setMessage("Submission approved successfully.");
    } catch (err) {
      console.error("Error approving writing submission:", err);
      setError(err.message || "Failed to approve submission.");
    }
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
  const statusBadgeStyle = (status) => {
    const baseStyle = { padding: '0.4rem 0.8rem', borderRadius: '12px', color: 'white', fontWeight: 'bold', fontSize: '0.8rem', display: 'inline-block' };
    switch (status) {
        case 'pending': return { ...baseStyle, backgroundColor: '#ffc107' }; // Yellow
        case 'processing': return { ...baseStyle, backgroundColor: '#17a2b8' }; // Blue
        case 'completed': return { ...baseStyle, backgroundColor: '#28a745' }; // Green
        case 'rejected': return { ...baseStyle, backgroundColor: '#dc3545' }; // Red
        default: return { ...baseStyle, backgroundColor: '#6c757d' }; // Grey
    }
  };

  const renderRedeemTable = (requests, title) => (
    <div style={{overflowX: 'auto'}}>
      <h3 style={{fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem'}}>{title}</h3>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>User</th>
            <th style={thStyle}>Reward</th>
            <th style={thStyle}>Reward Value</th>
            <th style={thStyle}>Points Used</th>
            <th style={thStyle}>Details</th>
            <th style={thStyle}>Status</th>
            <th style={thStyle}>Requested Date</th>
            <th style={thStyle}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {requests.length > 0 ? requests.map(req => (
            <tr key={req.id}>
              <td style={tdStyle}>{req.username}</td>
              <td style={tdStyle}>{REWARD_NAMES[req.rewardType] || req.rewardType}</td>
              <td style={tdStyle}>₹{req.rewardAmount}</td>
              <td style={tdStyle}>{req.pointsUsed}</td>
              <td style={tdStyle}>
                {req.rewardType === 'mobile_recharge' ? (
                    <>
                        <div><strong>Provider:</strong> {req.serviceProvider}</div>
                        <div><strong>Mobile:</strong> {req.mobileNumber}</div>
                        {req.planValidity && <div><strong>Validity:</strong> {req.planValidity}</div>}
                    </>
                ) : (
                    <span>*</span>
                )}
              </td>
              <td style={tdStyle}><span style={statusBadgeStyle(req.status)}>{req.status.charAt(0).toUpperCase() + req.status.slice(1)}</span></td>
              <td style={tdStyle}>{req.requestedAt?.toDate().toLocaleString()}</td>
              <td style={tdStyle}>
                {req.status === 'pending' && (
                    <>
                        <button style={{...buttonStyle, background: '#007bff'}} onClick={() => handleApprove(req)}>Approve</button>
                        <button style={{...buttonStyle, background: '#dc3545'}} onClick={() => handleReject(req)}>Reject</button>
                    </>
                )}
                {req.status === 'processing' && (
                    <button style={{...buttonStyle, background: '#28a745'}} onClick={() => handleComplete(req)}>Complete</button>
                )}
                {(req.status === 'completed' || req.status === 'rejected') && (
                    <span>-</span>
                )}
              </td>
            </tr>
          )) : (
            <tr><td colSpan="8" style={{...tdStyle, textAlign: 'center'}}>No requests found.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );

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
              <button style={activeTab === 'polls' ? tabButtonActiveStyle : tabButtonStyle} onClick={() => setActiveTab('polls')}>Poll Management</button>
              <button style={activeTab === 'writing' ? tabButtonActiveStyle : tabButtonStyle} onClick={() => setActiveTab('writing')}>Writing Management</button>
              <button style={activeTab === 'announcements' ? tabButtonActiveStyle : tabButtonStyle} onClick={() => setActiveTab('announcements')}>Announcement Management</button>
              <button style={activeTab === 'giftManagement' ? tabButtonActiveStyle : tabButtonStyle} onClick={() => setActiveTab('giftManagement')}>🎁 Gift Management</button>
              <button style={activeTab === 'featureAccess' ? tabButtonActiveStyle : tabButtonStyle} onClick={() => setActiveTab('featureAccess')}>⚙️ Feature Access</button>
          </div>
          {activeTab === 'featureAccess' && <FeatureAccessManagement />}
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
                editingPoll={editingPoll}
                setEditingPoll={setEditingPoll}
                handleCreatePoll={handleCreatePoll}
                handleUpdatePoll={handleUpdatePoll}
                handleCancelEdit={handleCancelEdit}
                handleEditClick={handleEditClick}
                togglePollStatus={togglePollStatus}
                handleArchivePoll={handleArchivePoll}
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
              writingResponses={writingResponses}
              handleRejectWritingSubmission={handleRejectWritingSubmission}
              handleApproveWritingSubmission={handleApproveWritingSubmission}
            />
          )}
          {activeTab === 'giftManagement' && <GiftManagement />}
          <section>
            <h2 style={sectionTitleStyle}>Redeem Requests</h2>
            <div style={requestsContainerStyle}>
                {renderRedeemTable(redemptionRequests, 'Active Requests')}
                <div style={{marginTop: '2rem', borderTop: '1px solid #eee', paddingTop: '1rem'}}>
                    <button style={{...buttonStyle, background: showHistory ? '#4a00e0' : '#6c757d'}} onClick={() => setShowHistory(!showHistory)}>
                        {showHistory ? 'Hide History' : 'Show History'}
                    </button>
                    {showHistory && renderRedeemTable(historyRequests, 'Request History')}
                </div>
            </div>
          </section>
          <section>
            <h2 style={sectionTitleStyle}>🗝️ Treasure Key Management</h2>
            <div style={announcementFormStyle}>
                <input type="email" style={inputStyle} placeholder="User Email" value={treasureKeyUserEmail} onChange={(e) => setTreasureKeyUserEmail(e.target.value)} />
                 {treasureKeyMessage && <p style={{ color: 'green', marginBottom: '1rem' }}>{treasureKeyMessage}</p>}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                    {[
                        'bronze', 'silver', 'gold', 'diamond'
                    ].map(keyType => (
                        <div key={keyType} style={{ border: '1px solid #ccc', borderRadius: '8px', padding: '1rem' }}>
                            <h3 style={{ textTransform: 'capitalize', marginBottom: '1rem' }}>{keyType} Keys</h3>
                            <div style={{ display: 'flex', gap: '0.5rem'}}>
                                <button style={{ ...buttonStyle, background: '#007bff', flexGrow: 1 }} onClick={() => handleGrantKeys(keyType)}>+1</button>
                                <button style={{ ...buttonStyle, background: '#dc3545', flexGrow: 1 }} onClick={() => handleResetKeys(keyType)}>Reset</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
          <section>
            <h2 style={sectionTitleStyle}>User Management</h2>
            <div style={requestsContainerStyle}><div style={{overflowX: 'auto'}}><table style={tableStyle}><thead><tr><th style={thStyle}>Username</th><th style={thStyle}>Email</th><th style={thStyle}>Status</th><th style={thStyle}>UPI ID</th><th style={thStyle}>Points Earned</th><th style={thStyle}>Points Processing</th><th style={thStyle}>Points Redeemed</th><th style={thStyle}>🥉</th><th style={thStyle}>🥈</th><th style={thStyle}>🥇</th><th style={thStyle}>💎</th></tr></thead><tbody>{users.map(user => {
                const isOnline = user.lastSeen && typeof user.lastSeen.toDate === 'function' && (Date.now() - user.lastSeen.toDate().getTime() < 60000);
                const treasureKeys = user.treasureKeys || { bronze: 0, silver: 0, gold: 0, diamond: 0 };
                return (
                    <tr key={user.id}>
                        <td style={tdStyle}>{user.username}</td>
                        <td style={tdStyle}>{user.email}</td>
                        <td style={tdStyle}>
                            {isOnline ? (
                                <span>🟢 Online</span>
                            ) : (
                                <div>
                                    <span>🔴 Offline</span>
                                    <div style={{fontSize: '0.8em', color: '#666'}}>Last seen: {formatLastSeen(user.lastSeen)}</div>
                                </div>
                            )}
                        </td>
                        <td style={tdStyle}>{user.upiId || 'N/A'}</td>
                        <td style={tdStyle}>{user.pointsEarned || 0}</td>
                        <td style={tdStyle}>{user.processingPoints || 0}</td>
                        <td style={tdStyle}>{user.redeemedPoints || 0}</td>
                         <td style={tdStyle}>{treasureKeys.bronze}</td>
                         <td style={tdStyle}>{treasureKeys.silver}</td>
                         <td style={tdStyle}>{treasureKeys.gold}</td>
                         <td style={tdStyle}>{treasureKeys.diamond}</td>
                    </tr>
                );
            })}</tbody></table></div></div>
          </section>
        </>)}
      </main>
      {showDeleteModal && (<div style={modalOverlayStyle}><div style={modalContentStyle}><h3 style={{fontSize: '1.5rem', marginBottom: '1rem'}}>Confirm Deletion</h3><p>Are you sure you want to delete the current announcement? This action cannot be undone.</p><div style={{marginTop: '2rem'}}><button style={{...buttonStyle, background: '#dc3545', marginRight: '1rem'}} onClick={handleDeleteAnnouncement}>Confirm Delete</button><button style={{...buttonStyle, background: '#6c757d'}} onClick={() => setShowDeleteModal(false)}>Cancel</button></div></div></div>)}
    </div>
  );
}

export default AdminDashboard;
