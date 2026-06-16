import React from 'react';

function WritingManagement({
  tasks,
  loading,
  newTask,
  setNewTask,
  handleCreateTask,
  toggleTaskStatus,
  deleteTask,
  sectionTitleStyle,
  announcementFormStyle,
  inputStyle,
  textareaStyle,
  buttonStyle,
  tableStyle,
  thStyle,
  tdStyle,
  writingResponses,
  handleRejectWritingSubmission,
}) {
  return (
    <section>
      <h2 style={sectionTitleStyle}>Writing Challenge Management</h2>

      {/* Create New Challenge Form */}
      <div style={announcementFormStyle}>
        <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>Create New Writing Challenge</h3>
        <input
          type="text"
          style={inputStyle}
          placeholder="Challenge Title"
          value={newTask.title}
          onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
        />
        <textarea
          style={textareaStyle}
          placeholder="Challenge Question/Prompt"
          value={newTask.question}
          onChange={(e) => setNewTask({ ...newTask, question: e.target.value })}
        />
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
          <input
            type="number"
            style={inputStyle}
            placeholder="Reward Points (e.g., 50)"
            value={newTask.rewardPoints}
            onChange={(e) => setNewTask({ ...newTask, rewardPoints: Number(e.target.value) })}
          />
          <input
            type="number"
            style={inputStyle}
            placeholder="Minimum Words (e.g., 100)"
            value={newTask.minimumWords}
            onChange={(e) => setNewTask({ ...newTask, minimumWords: Number(e.target.value) })}
          />
        </div>
        <button
          style={{ ...buttonStyle, background: '#4a00e0', width: '100%' }}
          onClick={handleCreateTask}
        >
          Create Challenge
        </button>
      </div>

      {/* Existing Challenges Table */}
      <div style={{ ...announcementFormStyle, marginTop: '2rem' }}>
        <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>Existing Challenges</h3>
        {loading ? (
          <p>Loading writing challenges...</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Title</th>
                  <th style={thStyle}>Question</th>
                  <th style={thStyle}>Points</th>
                  <th style={thStyle}>Min Words</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tasks.length > 0 ? (
                  tasks.map((task) => (
                    <tr key={task.id}>
                      <td style={tdStyle}>{task.title}</td>
                      <td style={tdStyle}>{task.question}</td>
                      <td style={tdStyle}>{task.rewardPoints}</td>
                      <td style={tdStyle}>{task.minimumWords}</td>
                      <td style={tdStyle}>{task.active ? 'Active' : 'Inactive'}</td>
                      <td style={tdStyle}>
                        <button style={{ ...buttonStyle, background: task.active ? '#ffc107' : '#28a745' }} onClick={() => toggleTaskStatus(task.id, task.active)}>{task.active ? 'Deactivate' : 'Activate'}</button>
                        <button style={{ ...buttonStyle, background: '#dc3545' }} onClick={() => deleteTask(task.id)}>Delete</button>
                      </td>
                    </tr>
                  ))
                ) : ( <tr><td colSpan="6" style={{ ...tdStyle, textAlign: 'center' }}>No writing challenges found.</td></tr> )}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div style={{ ...announcementFormStyle, marginTop: '2rem' }}>
        <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>
          Easy Writing Submissions
        </h3>

        {writingResponses.length === 0 ? (
          <p>No writing submissions found.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>User</th>
                  <th style={thStyle}>Challenge</th>
                  <th style={thStyle}>Response</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>

              <tbody>
                {writingResponses.map((submission) => (
                  <tr key={submission.id}>
                    <td style={tdStyle}>
                      {submission.userEmail || 'N/A'}
                    </td>

                    <td style={tdStyle}>
                      {submission.taskTitle || 'N/A'}
                    </td>

                    <td
                      style={{
                        ...tdStyle,
                        maxWidth: '400px',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word'
                      }}
                    >
                      {submission.response}
                    </td>

                    <td style={tdStyle}>
                      {submission.status || 'pending'}
                    </td>
                    <td style={tdStyle}>
                      {(submission.status || 'pending') === 'pending' ? (
                        <button
                          style={{ ...buttonStyle, background: '#dc3545' }}
                          onClick={() => handleRejectWritingSubmission(submission)}
                        >
                          Reject
                        </button>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

export default WritingManagement;
