import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase/firebase';
import { doc, getDoc, runTransaction, collection, increment, serverTimestamp, query, where, getDocs, setDoc } from 'firebase/firestore';

function Quiz() {
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [selectedAnswers, setSelectedAnswers] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [updateMessage, setUpdateMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [quizLoading, setQuizLoading] = useState(true);
  const [hasCompleted, setHasCompleted] = useState(false);
  const navigate = useNavigate();
  const user = auth.currentUser;

  useEffect(() => {
    const setupQuiz = async () => {
      if (!user) {
        navigate('/');
        return;
      }
      setLoading(true);

      const today = new Date().toISOString().slice(0, 10);
      const attemptId = `${user.uid}_${today}`;
      const quizAttemptRef = doc(db, 'quizAttempts', attemptId);

      try {
        const docSnap = await getDoc(quizAttemptRef);
        if (docSnap.exists()) {
          if (docSnap.data().status === 'COMPLETED') {
            setHasCompleted(true);
          } 
        } else {
          await setDoc(quizAttemptRef, {
            userId: user.uid,
            date: today,
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
      if (!user || hasCompleted || loading) {
          setQuizLoading(false);
          return;
      }

      try {
        const q = query(
          collection(db, "quizQuestions"), 
          where("active", "==", true)
        );
        const querySnapshot = await getDocs(q);
        const allQuestions = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const easyQuestions = allQuestions.filter(q => (q.difficulty || "").trim().toLowerCase() === 'easy');
        const mediumQuestions = allQuestions.filter(q => (q.difficulty || "").trim().toLowerCase() === 'medium');
        const hardQuestions = allQuestions.filter(q => (q.difficulty || "").trim().toLowerCase() === 'hard');

        const shuffle = (arr) => arr.sort(() => 0.5 - Math.random());

        const selectedEasy = shuffle(easyQuestions).slice(0, Math.min(5, easyQuestions.length));
        const selectedMedium = shuffle(mediumQuestions).slice(0, Math.min(5, mediumQuestions.length));
        const selectedHard = shuffle(hardQuestions).slice(0, Math.min(5, hardQuestions.length));

        const finalQuestions = [...selectedEasy, ...selectedMedium, ...selectedHard];

        setQuizQuestions(finalQuestions);
        setSelectedAnswers(Array(finalQuestions.length).fill(null));
      } catch (err) {
        console.error("Error fetching quiz questions:", err);
        setUpdateMessage("Failed to load the quiz. Please try again later.");
      } finally {
        setQuizLoading(false);
      }
    };

    if (!loading) {
        fetchQuestions();
    }
  }, [user, hasCompleted, loading]);

  const handleOptionChange = (questionIndex, option) => {
    if (submitted) return;
    const newSelectedAnswers = [...selectedAnswers];
    newSelectedAnswers[questionIndex] = option;
    setSelectedAnswers(newSelectedAnswers);
  };

  const calculatePoints = (correctAnswers) => {
      return correctAnswers * 2;
  };

  const handleSubmit = async () => {
    if (submitted) return;
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

    if (!user) {
      setUpdateMessage("You must be logged in to submit.");
      setSubmitted(false); 
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    const attemptId = `${user.uid}_${today}`;
    const quizAttemptRef = doc(db, 'quizAttempts', attemptId);
    const transactionRecordRef = doc(collection(db, 'transactions'));

    try {
      await runTransaction(db, async (transaction) => {
        // DEBUG: Find user by email instead of UID
        console.log("auth.currentUser.uid:", user.uid);
        console.log("auth.currentUser.email:", user.email);

        const userQuery = query(collection(db, "users"), where("email", "==", user.email));
        const querySnapshot = await getDocs(userQuery);

        console.log("querySnapshot.size:", querySnapshot.size);

        if (querySnapshot.empty) {
          console.log("No document found for email. Existing user documents:");
          const allUsersSnapshot = await getDocs(collection(db, "users"));
          allUsersSnapshot.forEach(doc => {
              console.log("Document ID:", doc.id);
          });
          throw new Error("Critical error: Could not find user profile via email to update points.");
        }

        const userDoc = querySnapshot.docs[0];
        console.log("matched document ID:", userDoc.id);
        const userDocRef = userDoc.ref;

        const quizAttemptDoc = await transaction.get(quizAttemptRef);
        if (quizAttemptDoc.exists() && quizAttemptDoc.data().status === 'COMPLETED') {
          throw new Error("This quiz has already been completed.");
        }

        transaction.set(
          quizAttemptRef,
          {
            score: correctAnswers,
            pointsAwarded: calculatedPoints,
            completedAt: serverTimestamp(),
            status: 'COMPLETED'
          },
          { merge: true }
        );

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
      console.error("Quiz handleSubmit Error:", error);
      setUpdateMessage(error.message);
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

  if (hasCompleted) {
      return (
        <div style={pageStyle}>
          <button style={backButtonStyle} onClick={() => navigate('/dashboard')}>&larr; Back to Dashboard</button>
            <div style={quizContainerStyle}>
                <h2 style={{textAlign: 'center', color: '#4a00e0'}}>Quiz Already Completed</h2>
                <p style={{textAlign: 'center', fontSize: '1.2rem', marginTop: '1rem'}}>You have already completed the quiz for today. Please come back tomorrow for a new set of questions.</p>
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
            <p style={{ textAlign: 'center', fontSize: '1.2rem' }}>No quiz questions are available at the moment. Please check back later.</p>
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
