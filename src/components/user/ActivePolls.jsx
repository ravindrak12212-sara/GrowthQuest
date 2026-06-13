import React, { useState, useEffect } from 'react';
import { db, auth } from '../../firebase/firebase';
import { collection, query, where, getDocs, doc, writeBatch, serverTimestamp, runTransaction } from 'firebase/firestore';

function ActivePolls() {
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedOptions, setSelectedOptions] = useState({});
  const [submitting, setSubmitting] = useState(null);

  useEffect(() => {
    fetchActivePolls();
  }, []);

  const fetchActivePolls = async () => {
    setLoading(true);
    const user = auth.currentUser;
    if (!user) {
        setError("You must be logged in to see polls.");
        setLoading(false);
        return;
    }

    try {
      const pollsQuery = query(collection(db, 'polls'), where('active', '==', true), where('archived', '==', false));
      const pollsSnapshot = await getDocs(pollsQuery);
      const activePolls = pollsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const responsesQuery = query(collection(db, 'pollResponses'), where('userId', '==', user.uid));
      const responsesSnapshot = await getDocs(responsesQuery);
      const respondedPollIds = new Set(responsesSnapshot.docs.map(doc => doc.data().pollId));

      const filteredPolls = activePolls.filter(poll => !respondedPollIds.has(poll.id));

      setPolls(filteredPolls.sort((a, b) => b.createdAt.toDate() - a.createdAt.toDate()));
    } catch (err) {
      setError('Failed to fetch polls.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOptionSelect = (pollId, option) => {
    setSelectedOptions(prev => ({ ...prev, [pollId]: option }));
  };

  const handleSubmitPoll = async (poll) => {
    const user = auth.currentUser;
    const selectedOption = selectedOptions[poll.id];

    if (!selectedOption) {
      alert('Please select an option to submit.');
      return;
    }

    setSubmitting(poll.id);
    setError('');

    try {
        await runTransaction(db, async (transaction) => {
            const userRef = doc(db, "users", user.uid);
            const responseQuery = query(
                collection(db, "pollResponses"),
                where("pollId", "==", poll.id),
                where("userId", "==", user.uid)
            );
            
            // 1. Verify user hasn't already responded
            const existingResponses = await getDocs(responseQuery);
            if (!existingResponses.empty) {
                throw new Error("Duplicate submission detected.");
            }
            
            // 2. Get current user data
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists()) {
                throw new Error("User document not found.");
            }
            const newPoints = (userDoc.data().pointsEarned || 0) + poll.rewardPoints;

            // 3. Create new response document
            const responseRef = doc(collection(db, "pollResponses"));
            transaction.set(responseRef, {
                pollId: poll.id,
                userId: user.uid,
                userEmail: user.email,
                selectedOption: selectedOption,
                submittedAt: serverTimestamp(),
            });

            // 4. Create new transaction document
            const transactionRef = doc(collection(db, "userTransactions"));
            transaction.set(transactionRef, {
                userId: user.uid,
                type: "poll",
                sourceId: poll.id,
                points: poll.rewardPoints,
                description: `Reward for completing poll: "${poll.title}"`,
                createdAt: serverTimestamp(),
            });

            // 5. Update user's points
            transaction.update(userRef, { pointsEarned: newPoints });
        });

      // On success, refetch polls to remove the completed one from the UI
      fetchActivePolls();

    } catch (err) {
        setError(`Failed to submit poll: ${err.message}`);
        console.error(err);
        // If a duplicate is detected server-side, refresh to correct the UI.
        if (err.message.includes("Duplicate")) {
            fetchActivePolls();
        }
    } finally {
        setSubmitting(null);
    }
  };

  if (loading) return <div>Loading polls...</div>;
  if (error) return <div style={{ color: 'red' }}>{error}</div>;
  if (polls.length === 0) return <p>No new polls available right now. Check back later!</p>;

  return (
    <div style={{ background: '#fff', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
      <h2 style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#4a00e0', marginBottom: '1.5rem' }}>Opinion Polls</h2>
      {polls.map(poll => (
        <div key={poll.id} style={{ border: '1px solid #eee', borderRadius: '8px', padding: '1.5rem', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>{poll.title}</h3>
          <p style={{ color: '#666', marginBottom: '1rem' }}>{poll.description}</p>
          <h4 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>{poll.question}</h4>
          <div>
            {poll.options.map(option => (
              <div key={option} style={{ marginBottom: '0.8rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name={poll.id}
                    value={option}
                    checked={selectedOptions[poll.id] === option}
                    onChange={() => handleOptionSelect(poll.id, option)}
                    style={{ marginRight: '0.8rem', transform: 'scale(1.2)' }}
                  />
                  {option}
                </label>
              </div>
            ))}
          </div>
           <p style={{ fontSize: '0.9rem', color: '#4CAF50', fontWeight: 'bold', margin: '1.5rem 0' }}>Reward: {poll.rewardPoints} Points</p>
          <button 
            onClick={() => handleSubmitPoll(poll)} 
            disabled={submitting === poll.id}
            style={{ padding: '0.8rem 1.5rem', background: 'linear-gradient(to right, #4a00e0, #8e2de2)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
          >
            {submitting === poll.id ? 'Submitting...' : 'Submit Answer'}
          </button>
        </div>
      ))}
    </div>
  );
}

export default ActivePolls;
