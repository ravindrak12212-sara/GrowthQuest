import React from 'react';

function PollManagement({
  polls,
  loading,
  error,
  newPoll,
  handleCreatePoll,
  togglePollStatus,
  deletePoll,
  handleOptionChange,
  addOption,
  removeOption,
  setNewPoll,
  // New props for viewing responses
  selectedPoll,
  setSelectedPoll,
  pollResponses,
  responsesLoading,
  // Inherited styles
  sectionTitleStyle,
  announcementFormStyle,
  inputStyle,
  buttonStyle,
  tableStyle,
  thStyle,
  tdStyle
}) {

  return (
    <>
      <section>
        <h2 style={sectionTitleStyle}>Create New Poll</h2>
        <div style={announcementFormStyle}>
          {error && <p style={{ color: 'red', marginBottom: '1rem' }}>{error}</p>}
          <input
            type="text"
            placeholder="Poll Question"
            style={inputStyle}
            value={newPoll.question}
            onChange={(e) => setNewPoll({ ...newPoll, question: e.target.value })}
          />
          {newPoll.options.map((option, index) => (
            <div key={index} style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
              <input
                type="text"
                placeholder={`Option ${index + 1}`}
                style={{ ...inputStyle, marginBottom: '0' }}
                value={option}
                onChange={(e) => handleOptionChange(index, e.target.value)}
              />
              <button
                style={{ ...buttonStyle, background: '#dc3545', marginLeft: '10px', padding: '0.4rem 0.8rem' }}
                onClick={() => removeOption(index)}
              >
                X
              </button>
            </div>
          ))}
          <button
            style={{ ...buttonStyle, background: '#6c757d', marginTop: '0.5rem', marginRight: '0.5rem' }}
            onClick={addOption}
          >
            Add Option
          </button>
          <button
            style={{ ...buttonStyle, background: '#4a00e0', marginTop: '0.5rem' }}
            onClick={handleCreatePoll}
          >
            Create Poll
          </button>
        </div>
      </section>

      <section>
        <h2 style={sectionTitleStyle}>Existing Polls</h2>
        <div style={announcementFormStyle}>
          {loading ? <p>Loading polls...</p> : (
            <div style={{ overflowX: 'auto' }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Question</th>
                    <th style={thStyle}>Status</th>
                    <th style={thStyle}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {polls.map(poll => (
                    <React.Fragment key={poll.id}>
                      <tr>
                        <td style={tdStyle}>{poll.question}</td>
                        <td style={tdStyle}>
                          <span style={{
                            padding: '0.3rem 0.6rem',
                            borderRadius: '12px',
                            color: 'white',
                            backgroundColor: poll.active ? '#28a745' : '#6c757d'
                          }}>
                            {poll.active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td style={tdStyle}>
                          <button
                            style={{ ...buttonStyle, background: poll.active ? '#ffc107' : '#28a745', marginRight: '5px' }}
                            onClick={() => togglePollStatus(poll.id, poll.active)}
                          >
                            {poll.active ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            style={{ ...buttonStyle, background: '#dc3545', marginRight: '5px' }}
                            onClick={() => deletePoll(poll.id)}
                          >
                            Delete
                          </button>
                           <button
                              style={{ ...buttonStyle, background: '#17a2b8' }}
                              onClick={() => setSelectedPoll(selectedPoll && selectedPoll.id === poll.id ? null : poll)}
                            >
                              {selectedPoll && selectedPoll.id === poll.id ? 'Hide' : 'View'} Responses
                          </button>
                        </td>
                      </tr>
                      {selectedPoll && selectedPoll.id === poll.id && (
                        <tr>
                          <td colSpan="3" style={{ padding: '0', backgroundColor: '#fafafa' }}>
                            <div style={{ margin: '1rem', padding: '1rem', borderRadius: '8px', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.06)' }}>
                              <h4 style={{ ...sectionTitleStyle, fontSize: '1.2rem', marginTop: 0, border: 'none', marginBottom: '1rem' }}>
                                Responses for: "{poll.question}"
                              </h4>
                              {responsesLoading ? (
                                <p>Loading responses...</p>
                              ) : pollResponses.length > 0 ? (
                                <table style={{ ...tableStyle, marginTop: '0' }}>
                                  <thead>
                                    <tr>
                                      <th style={thStyle}>User Email</th>
                                      <th style={thStyle}>Selected Option</th>
                                      <th style={thStyle}>Submitted At</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {pollResponses.map(response => (
                                      <tr key={response.id}>
                                        <td style={tdStyle}>{response.userEmail}</td>
                                        <td style={tdStyle}>{response.selectedOption}</td>
                                        <td style={tdStyle}>{response.submittedAt?.toDate().toLocaleString()}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              ) : (
                                <p>No responses yet for this poll.</p>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

export default PollManagement;
