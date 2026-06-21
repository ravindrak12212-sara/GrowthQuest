import React, { useState } from 'react';

function QuizManagement({
  questions,
  loading,
  error,
  newQuestion,
  setNewQuestion,
  editingQuestion,
  setEditingQuestion,
  handleCreateQuestion,
  handleUpdateQuestion,
  handleCancelEdit,
  handleEditClick,
  toggleQuestionStatus,
  deleteQuestion,
  sectionTitleStyle,
  announcementFormStyle,
  inputStyle,
  buttonStyle,
  tableStyle,
  thStyle,
  tdStyle,
  quizVersion,
  handlePublishQuiz
}) {
  const [showCreateForm, setShowCreateForm] = useState(false);

  const renderQuestionRow = (question) => (
    <tr key={question.id}>
      <td style={tdStyle}>{question.question}</td>
      <td style={tdStyle}>{question.correctAnswer}</td>
      <td style={tdStyle}>
        <span style={{
          padding: '0.4rem 0.8rem',
          borderRadius: '12px',
          color: 'white',
          fontWeight: 'bold',
          fontSize: '0.8rem',
          backgroundColor: question.active ? '#28a745' : '#dc3545'
        }}>
          {question.active ? 'Active' : 'Inactive'}
        </span>
      </td>
      <td style={tdStyle}>
        <button style={{ ...buttonStyle, background: '#007bff' }} onClick={() => handleEditClick(question)}>Edit</button>
        <button style={{ ...buttonStyle, background: question.active ? '#ffc107' : '#28a745' }} onClick={() => toggleQuestionStatus(question.id, question.active)}>
          {question.active ? 'Deactivate' : 'Activate'}
        </button>
        <button style={{ ...buttonStyle, background: '#dc3545' }} onClick={() => deleteQuestion(question.id)}>Delete</button>
      </td>
    </tr>
  );

  const renderQuestionForm = (questionData, handleSubmit, handleCancel) => (
    <div style={announcementFormStyle}>
      <input
        type="text"
        style={inputStyle}
        placeholder="Question"
        value={questionData.question}
        onChange={(e) => setQuestionData({ ...questionData, question: e.target.value })}
      />
      <input
        type="text"
        style={inputStyle}
        placeholder="Option A"
        value={questionData.options.A}
        onChange={(e) => setQuestionData({ ...questionData, options: { ...questionData.options, A: e.target.value } })}
      />
      <input
        type="text"
        style={inputStyle}
        placeholder="Option B"
        value={questionData.options.B}
        onChange={(e) => setQuestionData({ ...questionData, options: { ...questionData.options, B: e.target.value } })}
      />
      <input
        type="text"
        style={inputStyle}
        placeholder="Option C"
        value={questionData.options.C}
        onChange={(e) => setQuestionData({ ...questionData, options: { ...questionData.options, C: e.target.value } })}
      />
      <input
        type="text"
        style={inputStyle}
        placeholder="Option D"
        value={questionData.options.D}
        onChange={(e) => setQuestionData({ ...questionData, options: { ...questionData.options, D: e.target.value } })}
      />
      <select
        style={inputStyle}
        value={questionData.correctAnswer}
        onChange={(e) => setQuestionData({ ...questionData, correctAnswer: e.target.value })}
      >
        <option value="">Select Correct Answer</option>
        <option value="A">Option A</option>
        <option value="B">Option B</option>
        <option value="C">Option C</option>
        <option value="D">Option D</option>
      </select>
      <div style={{ display: 'flex', gap: '1rem' }}>
        <button style={{ ...buttonStyle, background: '#4a00e0', width: '100%' }} onClick={handleSubmit}>
          {editingQuestion ? 'Update Question' : 'Create Question'}
        </button>
        <button style={{ ...buttonStyle, background: '#6c757d', width: '100%' }} onClick={handleCancel}>
          Cancel
        </button>
      </div>
    </div>
  );

  const setQuestionData = editingQuestion ? setEditingQuestion : setNewQuestion;

  return (
    <section>
      <h2 style={sectionTitleStyle}>Quiz Management</h2>

      <div style={{...announcementFormStyle, marginBottom: '2rem', textAlign: 'center'}}>
        <p style={{fontSize: '1.2rem', marginBottom: '1rem'}}>Current Quiz Version: <strong>{quizVersion}</strong></p>
        <button style={{...buttonStyle, background: '#4a00e0', fontSize: '1.1rem'}} onClick={handlePublishQuiz}>
        🚀 Publish Quiz
        </button>
      </div>

      {error && <p style={{ color: 'red', textAlign: 'center', marginBottom: '1rem' }}>{error}</p>}

      {!editingQuestion && (
        <div style={{ marginBottom: '2rem' }}>
          <button
            style={{ ...buttonStyle, background: '#28a745' }}
            onClick={() => setShowCreateForm(!showCreateForm)}
          >
            {showCreateForm ? 'Cancel' : '➕ Add Question'}
          </button>
          {showCreateForm && renderQuestionForm(newQuestion, handleCreateQuestion, () => setShowCreateForm(false))}
        </div>
      )}

      {editingQuestion && (
        <div>
          <h3 style={{ ...sectionTitleStyle, fontSize: '1.5rem' }}>✏️ Edit Question</h3>
          {renderQuestionForm(editingQuestion, handleUpdateQuestion, handleCancelEdit)}
        </div>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Question</th>
              <th style={thStyle}>Correct Answer</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="4" style={{ ...tdStyle, textAlign: 'center' }}>Loading questions...</td></tr>
            ) : questions.length > 0 ? (
              questions.map(renderQuestionRow)
            ) : (
              <tr><td colSpan="4" style={{ ...tdStyle, textAlign: 'center' }}>No questions found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default QuizManagement;
