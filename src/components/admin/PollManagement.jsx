import React from 'react';

function PollManagement({
  polls,
  loading,
  error,
  newPoll,
  editingPoll,
  setNewPoll,
  setEditingPoll,
  handleCreatePoll,
  handleUpdatePoll,
  handleCancelEdit,
  togglePollStatus,
  deletePoll,
  handleArchivePoll,
  handleEditClick,
  selectedPoll,
  setSelectedPoll,
  pollResponses,
  responsesLoading,
  sectionTitleStyle,
  announcementFormStyle,
  inputStyle,
  buttonStyle,
  tableStyle,
  thStyle,
  tdStyle
}) {

  const isEditing = !!editingPoll;
  const pollInEdit = isEditing ? editingPoll : newPoll;
  const setPollInEdit = isEditing ? setEditingPoll : setNewPoll;

  const getPollStatus = (poll) => {
    if (poll.archived) return { text: 'Archived', color: '#6c757d' };

    const now = new Date();
    const startTime = poll.startTime?.toDate();
    const endTime = poll.endTime?.toDate();

    if (poll.active) {
        if (startTime && now < startTime) return { text: 'Scheduled', color: '#17a2b8' };
        if (endTime && now > endTime) return { text: 'Ended', color: '#dc3545' };
        return { text: 'Live', color: '#28a745' };
    }

    return { text: 'Draft', color: '#ffc107', textColor: '#000' };
  };

  const activePolls = polls.filter(p => {
    const status = getPollStatus(p).text;
    return (status === 'Scheduled' || status === 'Live' || status === 'Draft');
  });

  const endedPolls = polls.filter(p => getPollStatus(p).text === 'Ended' && !p.archived);

  const archivedPolls = polls.filter(p => p.archived).sort((a, b) => (b.archivedAt?.toDate() || 0) - (a.archivedAt?.toDate() || 0));

  const PollsTable = ({ pollList, tableType }) => (
    <div style={{ overflowX: 'auto' }}>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Question</th>
            <th style={thStyle}>Status</th>
            {tableType !== 'archived' && <th style={thStyle}>Starts</th>}
            {tableType !== 'archived' && <th style={thStyle}>Ends</th>}
            {tableType === 'archived' && <th style={thStyle}>Archived Date</th>}
            <th style={thStyle}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {pollList.map(poll => {
            const status = getPollStatus(poll);
            const isLive = status.text === 'Live';

            return (
              <React.Fragment key={poll.id}>
                <tr>
                  <td style={tdStyle}>{poll.question}</td>
                  <td style={tdStyle}>
                    <span style={{
                      padding: '0.3rem 0.6rem',
                      borderRadius: '12px',
                      color: status.textColor || 'white',
                      backgroundColor: status.color,
                    }}>
                      {status.text}
                    </span>
                  </td>
                  {tableType !== 'archived' && <td style={tdStyle}>{poll.startTime ? poll.startTime.toDate().toLocaleString() : '-'}</td>}
                  {tableType !== 'archived' && <td style={tdStyle}>{poll.endTime ? poll.endTime.toDate().toLocaleString() : '-'}</td>}
                  {tableType === 'archived' && <td style={tdStyle}>{poll.archivedAt ? poll.archivedAt.toDate().toLocaleString() : 'N/A'}</td>}
                  <td style={tdStyle}>
                    {tableType === 'active' && (
                      <>
                        <button
                          style={{ ...buttonStyle, background: '#dc3545', marginRight: '5px' }}
                          onClick={() => deletePoll(poll.id)}
                          disabled={isLive}
                        >
                          🗑 Delete
                        </button>
                      </>
                    )}
                    {tableType === 'ended' && (
                       <button
                          style={{ ...buttonStyle, background: '#6c757d', marginRight: '5px' }}
                          onClick={() => handleArchivePoll(poll.id)}
                        >
                          📦 Archive
                        </button>
                    )}
                    {tableType === 'archived' && (
                       <button
                          style={{ ...buttonStyle, background: '#dc3545', marginRight: '5px' }}
                          onClick={() => deletePoll(poll.id)}
                        >
                          🗑 Delete Permanently
                        </button>
                    )}
                    <button
                      style={{ ...buttonStyle, background: '#17a2b8' }}
                      onClick={() => setSelectedPoll(selectedPoll && selectedPoll.id === poll.id ? null : poll)}
                    >
                      {selectedPoll && selectedPoll.id === poll.id ? 'Hide' : '👁 View'} Responses
                    </button>
                  </td>
                </tr>
                {selectedPoll && selectedPoll.id === poll.id && (
                  <tr>
                    <td colSpan={tableType === 'archived' ? 4 : 5} style={{ padding: '0', backgroundColor: '#fafafa' }}>
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
            );
          })}
        </tbody>
      </table>
    </div>
  );

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
            name="question"
          />
          {newPoll.options.map((option, index) => (
            <div key={index} style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
              <input
                type="text"
                placeholder={`Option ${index + 1}`}
                style={{ ...inputStyle, marginBottom: '0' }}
                value={option}
                onChange={(e) => {
                  const updatedOptions = [...newPoll.options];
                  updatedOptions[index] = e.target.value;
                  setNewPoll({ ...newPoll, options: updatedOptions });
                }}
              />
              <button
                style={{ ...buttonStyle, background: '#dc3545', marginLeft: '10px', padding: '0.4rem 0.8rem' }}
                onClick={() => {
                  if (newPoll.options.length > 2) {
                    const updatedOptions = newPoll.options.filter((_, i) => i !== index);
                    setNewPoll({ ...newPoll, options: updatedOptions });
                  }
                }}
              >
                X
              </button>
            </div>
          ))}
           <button
            style={{ ...buttonStyle, background: '#6c757d', marginTop: '0.5rem', marginRight: '0.5rem' }}
            onClick={() => {
              if (newPoll.options.length < 6) {
                 setNewPoll({ ...newPoll, options: [...newPoll.options, ''] })
              }
            }}
          >
            Add Option
          </button>

          <h4 style={{ ...sectionTitleStyle, fontSize: '1.2rem', marginTop: '1.5rem', border: 'none', marginBottom: '1rem' }}>
            Schedule (Optional)
          </h4>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ flex: 1 }}>
              <label>Start Time</label>
              <input
                type="datetime-local"
                name="startTime"
                style={inputStyle}
                value={newPoll.startTime || ''}
                onChange={(e) => setNewPoll({ ...newPoll, startTime: e.target.value })}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label>End Time</label>
              <input
                type="datetime-local"
                name="endTime"
                style={inputStyle}
                value={newPoll.endTime || ''}
                onChange={(e) => setNewPoll({ ...newPoll, endTime: e.target.value })}
              />
            </div>
          </div>

            <button
              style={{ ...buttonStyle, background: '#4a00e0', marginTop: '0.5rem' }}
              onClick={handleCreatePoll}
            >
              Create Poll
            </button>
        </div>
      </section>

      <section>
        <h2 style={sectionTitleStyle}>Active Polls</h2>
        <div style={announcementFormStyle}>
          {loading ? <p>Loading polls...</p> : <PollsTable pollList={activePolls} tableType="active" />}
        </div>
      </section>

       <section>
        <h2 style={sectionTitleStyle}>Ended Polls</h2>
        <div style={announcementFormStyle}>
          {loading ? <p>Loading polls...</p> : <PollsTable pollList={endedPolls} tableType="ended" />}
        </div>
      </section>

       <section>
        <h2 style={sectionTitleStyle}>Archived Polls</h2>
        <div style={announcementFormStyle}>
          {loading ? <p>Loading polls...</p> : <PollsTable pollList={archivedPolls} tableType="archived" />}
        </div>
      </section>
    </>
  );
}

export default PollManagement;
