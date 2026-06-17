import React, { useState } from 'react';

function ActiveWritingChallenges({ tasks, submittedTaskIds, loading, error, submittingTaskId, onSubmit, userWritingResponses }) {
  const [expandedTaskId, setExpandedTaskId] = useState(null);
  const [submission, setSubmission] = useState('');
  const [localError, setLocalError] = useState('');
  const [wordCount, setWordCount] = useState(0);

  const handleToggle = (taskId) => {
    setExpandedTaskId(prevId => (prevId === taskId ? null : taskId));
    setSubmission('');
    setWordCount(0);
    setLocalError('');
  };

  const handleSubmissionChange = (text) => {
    setSubmission(text);
    const words = text.trim().split(/\s+/).filter(Boolean);
    setWordCount(words.length);
  };

  const handleSubmit = (task) => {
    if (wordCount < task.minimumWords) {
      setLocalError(`Your response must be at least ${task.minimumWords} words.`);
      return;
    }
    setSubmission('');
    setLocalError('');
    onSubmit(task, submission);
  };

  const renderSubmissionStatus = (task) => {
    const response = userWritingResponses.find(r => r.taskId === task.id);
    if (!response) {
      return (
        <div style={submittedContainerStyle}>
          <p style={submittedTextStyle}>✔ You have already submitted this challenge.</p>
        </div>
      );
    }

    let statusIcon, statusText, statusMessage, statusStyle;

    const baseStatusContainerStyle = {
      padding: '1.5rem',
      borderRadius: '12px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
      textAlign: 'center',
      border: '1px solid',
      marginTop: '1rem',
    };

    switch (response.status) {
      case 'approved':
        statusIcon = '🎉';
        statusText = 'Approved!';
        statusStyle = { ...baseStatusContainerStyle, backgroundColor: '#f0fff4', borderColor: '#c6f6d5' };
        if (response.rewardPoints && response.rewardPoints > 0) {
          statusMessage = `Congratulations! Your submission has been approved and ${response.rewardPoints} points have been credited to your wallet.`;
        } else {
          statusMessage = 'Congratulations! Your submission has been approved.';
        }
        break;
      case 'rejected':
        statusIcon = '🔴';
        statusText = 'Rejected';
        statusMessage = 'Unfortunately, your submission was not approved.';
        statusStyle = { ...baseStatusContainerStyle, backgroundColor: '#fff5f5', borderColor: '#fed7d7' };
        break;
      default: // 'pending'
        statusIcon = '🟡';
        statusText = 'Under Review';
        statusMessage = 'Your submission has been received and is waiting for admin review.';
        statusStyle = { ...baseStatusContainerStyle, backgroundColor: '#fffff0', borderColor: '#fefcbf' };
    }

    return (
      <div style={statusStyle}>
        <p style={{...statusTextStyle, fontWeight: 'bold'}}><span>{statusIcon}</span> {statusText}</p>
        <p style={statusMessageStyle}>{statusMessage}</p>
      </div>
    );
  };

  const isTaskExpanded = (taskId) => expandedTaskId === taskId;

  // --- STYLES ---

  const sectionStyle = {
    background: '#fff',
    borderRadius: '20px',
    padding: '2rem',
    boxShadow: '0 8px 30px rgba(0,0,0,0.07)',
  };

  const sectionTitleStyle = {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: '#4a00e0',
    marginBottom: '2rem',
    textAlign: 'center',
  };

  const taskItemStyle = {
    border: '1px solid #eee',
    borderRadius: '15px',
    marginBottom: '1.5rem',
    overflow: 'hidden',
    boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
  };

  const taskHeaderStyle = {
    padding: '1.5rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'pointer',
    background: '#f8f9fa',
  };

  const taskTitleStyle = {
    fontSize: '1.3rem',
    fontWeight: '600',
    color: '#333',
  };

  const rewardTagStyle = {
    background: 'linear-gradient(to right, #4a00e0, #8e2de2)',
    color: 'white',
    padding: '0.5rem 1rem',
    borderRadius: '20px',
    fontSize: '0.9rem',
    fontWeight: 'bold',
  };

  const taskContentStyle = {
    padding: '1.5rem',
    borderTop: '1px solid #eee',
  };

  const questionStyle = {
    fontSize: '1.1rem',
    fontStyle: 'italic',
    color: '#555',
    marginBottom: '1.5rem',
    lineHeight: '1.6',
  };

  const textareaStyle = {
    width: '100%',
    minHeight: '120px',
    padding: '1rem',
    borderRadius: '10px',
    border: '1px solid #ddd',
    fontSize: '1rem',
    marginBottom: '1rem',
    boxSizing: 'border-box',
  };

  const wordCountStyle = {
    fontSize: '0.9rem',
    color: '#777',
    textAlign: 'right',
    marginBottom: '1.5rem',
  };

  const submitButtonStyle = {
    padding: '0.8rem 1.5rem',
    borderRadius: '8px',
    border: 'none',
    color: '#fff',
    fontSize: '1rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    background: 'linear-gradient(to right, #00c6ff, #0072ff)',
  };

  const submittedContainerStyle = {
    padding: '1rem 0',
  };

  const submittedTextStyle = {
    color: '#28a745',
    fontWeight: 'bold',
    fontSize: '1.1rem',
  };

  const statusTextStyle = {
    fontSize: '1.4rem',
    margin: '0 0 10px 0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  };

  const statusMessageStyle = {
    margin: '0',
    color: '#555',
    fontSize: '1rem',
  };

  const taskListStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '2rem',
  };

  if (loading) return <p>Loading challenges...</p>;

  return (
    <div style={sectionStyle}>
      <h2 style={sectionTitleStyle}>Active Writing Challenges</h2>
      {error && <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>}
      
      <div>
        {tasks.map((task) => {
          const isSubmitted = submittedTaskIds.includes(task.id);
          const isExpanded = isTaskExpanded(task.id);

          return (
            <div key={task.id} style={taskItemStyle}>
              <div style={taskHeaderStyle} onClick={() => handleToggle(task.id)}>
                <span style={taskTitleStyle}>{task.title}</span>
                <span style={rewardTagStyle}>+{task.rewardPoints} Points</span>
              </div>
              
              {isExpanded && (
                <div style={taskContentStyle}>
                  <p style={questionStyle}>"{task.question}"</p>

                  {isSubmitted ? (
                    <div style={submittedContainerStyle}>
                      {renderSubmissionStatus(task)}
                    </div>
                  ) : (
                    <>
                      <textarea
                        style={textareaStyle}
                        placeholder="Type your response here..."
                        value={submission}
                        onChange={(e) => handleSubmissionChange(e.target.value)}
                        disabled={submittingTaskId === task.id}
                      />
                      <div style={wordCountStyle}>
                        {wordCount} / {task.minimumWords} words
                      </div>
                      {localError && <p style={{ color: 'red', fontSize: '0.9rem' }}>{localError}</p>}
                      <button
                        style={submitButtonStyle}
                        onClick={() => handleSubmit(task)}
                        disabled={submittingTaskId === task.id || wordCount < task.minimumWords}
                      >
                        {submittingTaskId === task.id ? 'Submitting...' : 'Submit'}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ActiveWritingChallenges;
