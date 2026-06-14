import React, { useState } from 'react';

function ActiveWritingChallenges({ tasks, submittedTaskIds, onSubmit, error, loading, submittingTaskId }) {
    const [responses, setResponses] = useState({});
    const [wordCounts, setWordCounts] = useState({});

    const handleResponseChange = (taskId, text) => {
        setResponses(prev => ({ ...prev, [taskId]: text }));
        const words = text.trim().split(/\s+/).filter(Boolean);
        setWordCounts(prev => ({ ...prev, [taskId]: words.length }));
    };

    const handleSubmit = (task) => {
        const response = responses[task.id]?.trim();
        if (!response) return;
        onSubmit(task, response);
    };

    // Inline Styles
    const cardStyle = {
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '15px',
        padding: '25px',
        marginBottom: '25px',
        boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.1)',
        backdropFilter: 'blur(10px)',
        color: '#fff',
    };

    const titleStyle = {
        fontSize: '1.75rem',
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: '10px',
        borderBottom: '2px solid rgba(108, 92, 231, 0.8)',
        paddingBottom: '10px',
    };

    const questionStyle = {
        fontSize: '1.1rem',
        color: '#eee',
        marginBottom: '15px',
        fontStyle: 'italic',
        lineHeight: '1.6',
    };

    const detailStyle = {
        fontSize: '0.9rem',
        color: '#ccc',
        marginBottom: '20px',
        display: 'flex',
        gap: '15px',
    };

    const textareaStyle = {
        width: '100%',
        minHeight: '150px',
        padding: '15px',
        borderRadius: '10px',
        border: '1px solid #6c5ce7',
        background: 'rgba(0,0,0,0.3)',
        color: '#fff',
        fontSize: '1rem',
        marginBottom: '10px',
        boxSizing: 'border-box',
    };

    const buttonStyle = {
        background: 'linear-gradient(45deg, #6c5ce7, #a29bfe)',
        color: 'white',
        padding: '12px 25px',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontWeight: 'bold',
        fontSize: '1rem',
        boxShadow: '0 4px 15px 0 rgba(108, 92, 231, 0.4)',
        transition: 'all 0.3s ease',
    };

     const disabledButtonStyle = {
        ...buttonStyle,
        background: 'linear-gradient(45deg, #5a5a5a, #888888)',
        cursor: 'not-allowed',
        boxShadow: 'none',
    };

    const submittedMessageStyle = {
        color: '#2ecc71',
        fontWeight: 'bold',
        fontSize: '1.1rem',
        padding: '20px 0',
    };

    const wordCountStyle = {
        color: '#ccc',
        fontSize: '0.9rem',
        textAlign: 'right',
        marginBottom: '15px',
    };

    const loadingStyle = {
        textAlign: 'center',
        padding: '50px',
        fontSize: '1.2rem',
        color: '#fff',
    };

    if (loading) {
        return <div style={loadingStyle}>Loading writing challenges...</div>;
    }

    if (!tasks || tasks.length === 0) {
        return <div style={loadingStyle}>No writing challenges available at the moment.</div>;
    }

    return (
        <div>
            {tasks.map((task) => {
                const isSubmitted = submittedTaskIds.includes(task.id);
                const wordCount = wordCounts[task.id] || 0;
                const isSubmitting = submittingTaskId === task.id;
                const isSubmitDisabled =
                    isSubmitted ||
                    isSubmitting ||
                    wordCount < task.minimumWords;

                return (
                    <div key={task.id} style={cardStyle}>
                        <h3 style={titleStyle}>{task.title}</h3>
                        <p style={questionStyle}>"{task.question}"</p>
                        <div style={detailStyle}>
                            <span><strong>Reward:</strong> {task.rewardPoints} points</span>
                            <span><strong>Minimum:</strong> {task.minimumWords} words</span>
                        </div>

                        {isSubmitted ? (
                            <p style={submittedMessageStyle}>✔️ You have already submitted this challenge.</p>
                        ) : (
                            <form onSubmit={(e) => { e.preventDefault(); handleSubmit(task); }}>
                                <textarea
                                    style={textareaStyle}
                                    placeholder="Unleash your creativity here..."
                                    value={responses[task.id] || ''}
                                    onChange={(e) => handleResponseChange(task.id, e.target.value)}
                                    disabled={isSubmitting}
                                />
                                <div style={wordCountStyle}>
                                    Word Count: {wordCount} / {task.minimumWords}
                                </div>
                                <button
                                    type="submit"
                                    style={isSubmitDisabled ? disabledButtonStyle : buttonStyle}
                                    disabled={isSubmitDisabled}
                                >
                                    {isSubmitting ? 'Submitting...' : 'Submit Response'}
                                </button>
                            </form>
                        )}
                    </div>
                );
            })}
             {error && <p style={{ color: '#ff4757', marginTop: '15px', textAlign: 'center', fontSize: '1.1rem' }}>Error: {error}</p>}
        </div>
    );
}

export default ActiveWritingChallenges;
