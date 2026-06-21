import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase/firebase';
import { doc, getDoc, runTransaction, collection, increment, serverTimestamp, query, where, getDocs, setDoc, updateDoc } from 'firebase/firestore';

function Quiz() {
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [selectedAnswers, setSelectedAnswers] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [points, setPoints] = useState(0);
  const [updateMessage, setUpdateMessage] = useState('');
  const [currentQuizVersion, setCurrentQuizVersion] = useState(0);
  const [quizAttemptId, setQuizAttemptId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [quizLoading, setQuizLoading] = useState(true);
  const [hasAttempted, setHasAttempted] = useState(false);
  const navigate = useNavigate();
  const user = auth.currentUser;

  useEffect(() => {
    const setupQuiz = async () => {
      if (!user) {
        navigate('/');
        return;
      }
      setLoading(true);

      const quizSettingsRef = doc(db, 'quizSettings', 'current');
      const quizSettingsSnap = await getDoc(quizSettingsRef);
      const version = quizSettingsSnap.exists() ? quizSettingsSnap.data().currentVersion : 1;
      setCurrentQuizVersion(version);

      const attemptId = `${user.uid}_v${version}`;
      setQuizAttemptId(attemptId);
      const quizAttemptRef = doc(db, 'quizAttempts', attemptId);

      try {
        const docSnap = await getDoc(quizAttemptRef);
        if (docSnap.exists()) {
          const attemptData = docSnap.data();
          if (attemptData.status === 'COMPLETED' || attemptData.status === 'IN_PROGRESS') {
            setHasAttempted(true);
          }
        } else {
          // Create a new attempt record
          await setDoc(quizAttemptRef, {
            userId: user.uid,
            quizVersion: version,
            startedAt: serverTimestamp(),
            status: 'IN_PROGRESS'
          });
        }
      } catch (error) {
        console.error("Error setting up quiz attempt:", error);
        setUpdateMessage("Could not initialize your quiz. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    setupQuiz();
  }, [user, navigate]);

  useEffect(() => {
    const fetchQuestions = async () => {
      if (!user || hasAttempted || loading || !currentQuizVersion) {
          setQuizLoading(false);
          return;
      }

      try {
        const q = query(
          collection(db, "quizQuestions"), 
          where("active", "==", true),
          where("quizVersion", "==", currentQuizVersion)
        );
        const querySnapshot = await getDocs(q);
        let activeQuestions = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // The problem description implies we should show all available questions for the version
        // not just a random subset of 5.
        // if (activeQuestions.length > 5) {
        //   activeQuestions.sort(() => 0.5 - Math.random());
        //   activeQuestions = activeQuestions.slice(0, 5);
        // }

        setQuizQuestions(activeQuestions);
        setSelectedAnswers(Array(activeQuestions.length).fill(null));
      } catch (err) {
        console.error("Error fetching quiz questions:", err);
        setUpdateMessage("Failed to load the quiz. Please try again later.");
      } finally {
        setQuizLoading(false);
      }
    };

    fetchQuestions();
  }, [user, hasAttempted, loading, currentQuizVersion]);

  const handleOptionChange = (questionIndex, option) => {
    if (submitted) return;
    const newSelectedAnswers = [...selectedAnswers];
    newSelectedAnswers[questionIndex] = option;
    setSelectedAnswers(newSelectedAnswers);
  };

  const calculatePoints = (correctAnswers) => {
      switch (correctAnswers) {
          case 5: return 10;
          case 4: return 8;
          case 3: return 5;
          case 2: return 2;
          default: return 0;
      }
  };

  const handleSubmit = async () => {
    if (submitted || !quizAttemptId) return;
    setSubmitted(true);

    let correctAnswers = 0;
    quizQuestions.forEach((question, index) => {
      const correctAnswerText = question.options[question.correctAnswer];
      if (selectedAnswers[index] === correctAnswerText) {
        correctAnswers++;
      }
    });

    const calculatedPoints = calculatePoints(correctAnswers);
    setScore(correctAnswers);
    setPoints(calculatedPoints);

    if (!user) {
      setUpdateMessage("You must be logged in to submit.");
      setSubmitted(false); 
      return;
    }

    const userDocRef = doc(db, 'users', user.uid);
    const quizAttemptRef = doc(db, 'quizAttempts', quizAttemptId);
    const transactionRecordRef = doc(collection(db, 'transactions'));

    try {
      await runTransaction(db, async (transaction) => {
        const quizAttemptDoc = await transaction.get(quizAttemptRef);
        if (!quizAttemptDoc.exists() || quizAttemptDoc.data().status === 'COMPLETED') {
          throw new Error("This quiz has already been completed.");
        }

        transaction.update(quizAttemptRef, {
          score: correctAnswers,
          pointsAwarded: calculatedPoints,
          completedAt: serverTimestamp(),
          status: 'COMPLETED'
        });

        if (calculatedPoints > 0) {
          transaction.update(userDocRef, {
            pointsEarned: increment(calculatedPoints)
          });
        }
        
        transaction.set(transactionRecordRef, {
            userId: user.uid,
            username: user.displayName || 'Anonymous',
            type: "Daily Quiz",
            points: calculatedPoints,
            timestamp: serverTimestamp()
        });
      });

      setUpdateMessage(`You earned ${calculatedPoints} points!`);

    } catch (error) {
      console.error("Error processing quiz results: ", error);
      setUpdateMessage(error.message || "Could not record your quiz attempt. Please try again.");
      setHasAttempted(true); // Block re-attempt on error
    }
  };

  const pageStyle = {
    fontFamily: `'Segoe UI', Tahoma, Geneva, Verdana, sans-serif`,
    backgroundColor: '#f4f7f6',
    color: '#333',
    minHeight: '100vh',
    padding: '2rem',
  };

  const quizContainerStyle = {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '2rem',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
  };

  const backButtonStyle = {
    position: 'absolute',
    top: '20px',
    left: '20px',
    padding: '0.5rem 1rem',
    borderRadius: '8px',
    border: '1px solid #ccc',
    background: 'white',
    cursor: 'pointer',
    fontSize: '0.9rem'
  };

  if (loading || quizLoading) {
    return <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh'}}>Loading Quiz...</div>;
  }

  if (hasAttempted) {
      return (
        <div style={pageStyle}>
          <button style={backButtonStyle} onClick={() => navigate('/dashboard')}>&larr; Back to Dashboard</button>
            <div style={quizContainerStyle}>
                <h2 style={{textAlign: 'center', color: '#4a00e0'}}>Quiz In Progress or Completed</h2>
                <p style={{textAlign: 'center', fontSize: '1.2rem', marginTop: '1rem'}}>You have already started or completed this quiz.</p>
            </div>
        </div>
      );
  }
  
  if (quizQuestions.length === 0 && !quizLoading) {
      return (
        <div style={pageStyle}>
          <button style={backButtonStyle} onClick={() => navigate('/dashboard')}>&larr; Back to Dashboard</button>
          <div style={quizContainerStyle}>
            <h1 style={{ textAlign: 'center', color: '#4a00e0', marginBottom: '2rem' }}>Daily Quiz</h1>
            <p style={{ textAlign: 'center', fontSize: '1.2rem' }}>No quiz questions are available for the current version.</p>
          </div>
        </div>
      );
  }

  return (
    <div style={pageStyle}>
       <button style={backButtonStyle} onClick={() => navigate('/dashboard')}>&larr; Back to Dashboard</button>
      <div style={quizContainerStyle}>
        <h1 style={{textAlign: 'center', color: '#4a00e0', marginBottom: '2rem'}}>Daily Quiz</h1>
        {submitted ? (
          <div>
            <h2 style={{textAlign: 'center'}}>Quiz Results</h2>
            <p style={{textAlign: 'center', fontSize: '1.2rem'}}>You scored {score} out of {quizQuestions.length}.</p>
            <p style={{textAlign: 'center', fontSize: '1.1rem', color: 'green'}}>{updateMessage}</p>
          </div>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
            {quizQuestions.map((item, index) => (
              <div key={item.id} style={{marginBottom: '1.5rem'}}>
                <p style={{fontWeight: 'bold'}}>{index + 1}. {item.question}</p>
                <div>
                  {Object.values(item.options).map((option, optionIndex) => (
                    <div key={optionIndex} style={{margin: '0.5rem 0'}}>
                      <label style={{display: 'block', padding: '0.5rem', borderRadius: '8px', border: '1px solid #ccc', cursor: 'pointer'}}>
                        <input
                          type="radio"
                          name={`question-${index}`}
                          value={option}
                          checked={selectedAnswers[index] === option}
                          onChange={() => handleOptionChange(index, option)}
                          style={{marginRight: '10px'}}
                        />
                        {option}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <button type="submit" style={{display: 'block', width: '100%', padding: '1rem', borderRadius: '8px', border: 'none', background: 'linear-gradient(to right, #4a00e0, #8e2de2)', color: 'white', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer'}}>Submit</button>
          </form>
        )}
      </div>
    </div>
  );
}

export default Quiz;
