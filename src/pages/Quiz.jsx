import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase/firebase';
import { doc, getDoc, runTransaction, collection, increment, serverTimestamp } from 'firebase/firestore';

const quizData = [
    { question: "What is 2 + 2?", options: ["3", "4", "5"], correctAnswer: "4" },
    { question: "What is the capital of France?", options: ["London", "Paris", "Berlin"], correctAnswer: "Paris" },
    { question: "What is the largest planet in our solar system?", options: ["Earth", "Jupiter", "Mars"], correctAnswer: "Jupiter" },
    { question: "Who wrote 'Hamlet'?", options: ["Charles Dickens", "William Shakespeare", "Leo Tolstoy"], correctAnswer: "William Shakespeare" },
    { question: "What is the chemical symbol for water?", options: ["H2O", "O2", "CO2"], correctAnswer: "H2O" },
];

function Quiz() {
  const [selectedAnswers, setSelectedAnswers] = useState(Array(quizData.length).fill(null));
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [points, setPoints] = useState(0);
  const [updateMessage, setUpdateMessage] = useState('');

  const [loading, setLoading] = useState(true);
  const [hasAttempted, setHasAttempted] = useState(false);
  const navigate = useNavigate();
  const user = auth.currentUser;

  useEffect(() => {
    const checkQuizAttempt = async () => {
      if (!user) {
        navigate('/');
        return;
      }
      setLoading(true);
      const quizAttemptId = `${user.uid}_dailyQuiz1`;
      const quizAttemptRef = doc(db, 'quizAttempts', quizAttemptId);

      try {
        const docSnap = await getDoc(quizAttemptRef);
        if (docSnap.exists()) {
          setHasAttempted(true);
        }
      } catch (error) {
        console.error("Error checking quiz attempt:", error);
        setUpdateMessage("Could not verify your quiz status. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    checkQuizAttempt();
  }, [user, navigate]);

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
    if (submitted) return;
    setSubmitted(true); // Prevent UI double-clicks

    let correctAnswers = 0;
    quizData.forEach((question, index) => {
      if (selectedAnswers[index] === question.correctAnswer) {
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

    const quizAttemptId = `${user.uid}_dailyQuiz1`;
    const userDocRef = doc(db, 'users', user.uid);
    const quizAttemptRef = doc(db, 'quizAttempts', quizAttemptId);
    const transactionRecordRef = doc(collection(db, 'transactions'));

    try {
      await runTransaction(db, async (transaction) => {
        const quizAttemptDoc = await transaction.get(quizAttemptRef);
        if (quizAttemptDoc.exists()) {
          throw new Error("You have already completed today's quiz.");
        }

        transaction.set(quizAttemptRef, {
          userId: user.uid,
          quizId: "dailyQuiz1",
          score: correctAnswers,
          pointsAwarded: calculatedPoints,
          attemptedAt: serverTimestamp()
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
      if (error.message === "You have already completed today's quiz.") {
          setHasAttempted(true); 
          setUpdateMessage("You have already completed today's quiz.");
      } else {
          setUpdateMessage(error.message || "Could not record your quiz attempt. Please try again.");
          setSubmitted(false); 
      }
    }
  };

  // Styles
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

  if (loading) {
    return <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh'}}>Checking your quiz status...</div>;
  }

  if (hasAttempted) {
      return (
        <div style={pageStyle}>
          <button style={backButtonStyle} onClick={() => navigate('/dashboard')}>&larr; Back to Dashboard</button>
            <div style={quizContainerStyle}>
                <h2 style={{textAlign: 'center', color: '#4a00e0'}}>Quiz Complete</h2>
                <p style={{textAlign: 'center', fontSize: '1.2rem', marginTop: '1rem'}}>You have already completed today's quiz.</p>
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
            <p style={{textAlign: 'center', fontSize: '1.2rem'}}>You scored {score} out of {quizData.length}.</p>
            <p style={{textAlign: 'center', fontSize: '1.1rem', color: 'green'}}>{updateMessage}</p>
          </div>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
            {quizData.map((item, index) => (
              <div key={index} style={{marginBottom: '1.5rem'}}>
                <p style={{fontWeight: 'bold'}}>{index + 1}. {item.question}</p>
                <div>
                  {item.options.map((option, optionIndex) => (
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
