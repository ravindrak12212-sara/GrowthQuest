import React, { useState, useEffect, useRef } from 'react';

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

    const prevSubmittedTaskIdsRef = useRef([]);
    useEffect(() => {
        const prevIds = prevSubmittedTaskIdsRef.current;
        const currentIds = submittedTaskIds || [];

        // Find the ID of the task that was just submitted
        const newlySubmittedId = currentIds.find(id => !prevIds.includes(id));

        if (newlySubmittedId) {
            // Clear the local response for the successfully submitted task
            setResponses(prev => ({
                ...prev,
                [newlySubmittedId]: ''
            }));
            // Also clear the word count for that task
            setWordCounts(prev => ({
                ...prev,
                [newlySubmittedId]: 0
            }));
        }

        // Update the ref to the current IDs for the next render
        prevSubmittedTaskIdsRef.current = currentIds;
    }, [submittedTaskIds]); // This effect runs only when submittedTaskIds changes


    // Inline Styles
    const cardStyle = {
        background: '#fff',
        borderRadius: '20px',
        overflow: 'hidden',
        marginBottom: '30px',
        boxShadow: '0 8px 25px rgba(0,0,0,0.08)',
    };

    const headerStyle = {
        background: 'linear-gradient(135deg, #6c5ce7, #0984e3)',
        padding: '25px',
        textAlign: 'center',
        color: '#fff',
    };

    const contentStyle = {
        padding: '25px',
    };

    const titleStyle = {
        fontSize: '1.75rem',
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: '10px',
        paddingBottom: '10px',
        textAlign: 'center',
    };

    const questionStyle = {
        fontSize: '1.1rem',
        marginTop: '10px',
        color: 'rgba(255,255,255,0.9)',
        fontWeight: '400',
        lineHeight: '1.6',
    };

    const detailStyle = {
        fontSize: '0.95rem',
        color: '#666',
        marginBottom: '20px',
        display: 'flex',
        justifyContent: 'center',
        gap: '20px',
        flexWrap: 'wrap',
    };

    const textareaStyle = {
        width: '100%',
        minHeight: '150px',
        padding: '15px',
        borderRadius: '10px',
        border: '1px solid #ddd',
        background: '#f8f9fa',
        color: '#333',
        fontSize: '1rem',
        marginBottom: '10px',
        boxSizing: 'border-box',
    };

    const buttonStyle = {
        background: 'linear-gradient(45deg, #6c5ce7, #0984e3)',
        color: 'white',
        padding: '12px 25px',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontWeight: 'bold',
        fontSize: '1rem',
        boxShadow: '0 4px 15px rgba(108, 92, 231, 0.3)',
        transition: 'all 0.3s ease',
        display: 'block',
        marginLeft: 'auto',
        marginRight: 'auto',
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
        textAlign: 'center',
    };

    const wordCountStyle = {
        color: '#777',
        fontSize: '0.9rem',
        textAlign: 'right',
        marginBottom: '15px',
    };

    const loadingStyle = {
        textAlign: 'center',
        padding: '50px',
        fontSize: '1.2rem',
        color: '#555',
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
                const isSubmitted = (submittedTaskIds || []).includes(task.id);
                const wordCount = wordCounts[task.id] || 0;
                const isSubmitting = submittingTaskId === task.id;
                const isSubmitDisabled =
                    isSubmitted ||
                    isSubmitting ||
                    wordCount < task.minimumWords;

                return (
                    <div key={task.id} style={cardStyle}>
                        <div style={headerStyle}>
                            <h3 style={titleStyle}>{task.title}</h3>
                            <p style={questionStyle}>
                                "{task.question}"
                            </p>
                        </div>
                        <div style={contentStyle}>
                            <div style={detailStyle}>
                                <span>
                                    <strong>Reward:</strong> {task.rewardPoints} points
                                </span>
                                <span>
                                    <strong>Minimum:</strong> {task.minimumWords} words
                                </span>
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
                    </div>
                );
            })}
             {error && <p style={{ color: '#ff4757', marginTop: '15px', textAlign: 'center', fontSize: '1.1rem' }}>Error: {error}</p>}
        </div>
    );
}

export default ActiveWritingChallenges;
