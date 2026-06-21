import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { db } from '../../firebase/firebase';
import { collection, writeBatch, doc, serverTimestamp, getDocs } from "firebase/firestore";

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
  tdStyle
}) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewData, setPreviewData] = useState([]);
  const [questionCounts, setQuestionCounts] = useState({ total: 0, easy: 0, medium: 0, hard: 0 });
  const [importError, setImportError] = useState('');
  const [modalStep, setModalStep] = useState(1);
  const [importSummary, setImportSummary] = useState({ imported: 0, skipped: 0, failed: 0 });

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
    setImportError('');
  };

  const handleNext = () => {
    if (!selectedFile) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet);

        if (json.length === 0) {
          setImportError('The selected file is empty or not in the correct format.');
          return;
        }

        const requiredColumns = ['Question', 'Option A', 'Option B', 'Option C', 'Option D', 'Correct Answer', 'Difficulty'];
        const firstRow = json[0];
        const hasAllColumns = requiredColumns.every(col => Object.keys(firstRow).includes(col));

        if (!hasAllColumns) {
          setImportError('The file is missing required columns. Please check the template.');
          return;
        }

        const counts = {
          total: json.length,
          easy: json.filter(q => q.Difficulty?.toLowerCase() === 'easy').length,
          medium: json.filter(q => q.Difficulty?.toLowerCase() === 'medium').length,
          hard: json.filter(q => q.Difficulty?.toLowerCase() === 'hard').length,
        };

        setPreviewData(json);
        setQuestionCounts(counts);
        setModalStep(2);

      } catch (err) {
        setImportError('An error occurred while reading the file. Please ensure it is a valid .xlsx file.');
        console.error(err);
      }
    };
    reader.readAsArrayBuffer(selectedFile);
  };

  const handleImport = async () => {
    if (previewData.length === 0) return;

    setModalStep(3);
    setImportError('');
    let imported = 0;
    let skipped = 0;
    let failed = 0;

    try {
        const questionsRef = collection(db, "quizQuestions");
        const existingQuestionsSnapshot = await getDocs(questionsRef);
        const existingQuestionTexts = new Set(existingQuestionsSnapshot.docs.map(d => d.data().question));

        const batch = writeBatch(db);

        previewData.forEach(q => {
            const questionText = q.Question;
            const options = {
                A: q["Option A"],
                B: q["Option B"],
                C: q["Option C"],
                D: q["Option D"],
            };
            const correctAnswer = q["Correct Answer"];
            const difficulty = q.Difficulty;

            if (!questionText || !options.A || !options.B || !options.C || !options.D || !correctAnswer || !difficulty) {
                failed++;
                return;
            }

            if (existingQuestionTexts.has(questionText)) {
                skipped++;
            } else {
                const newQuestionRef = doc(collection(db, "quizQuestions"));
                batch.set(newQuestionRef, {
                    question: questionText,
                    options,
                    correctAnswer,
                    difficulty: difficulty.trim().toLowerCase(),
                    active: true,
                    createdAt: serverTimestamp(),
                });
                imported++;
                existingQuestionTexts.add(questionText); // Avoid duplicates from the same file
            }
        });

        await batch.commit();
        setImportSummary({ imported, skipped, failed });

    } catch (err) {
        console.error("Error importing questions: ", err);
        setImportError("An error occurred during the import process.");
        setImportSummary({ imported: 0, skipped: 0, failed: previewData.length });
    }
  };

  const resetModal = () => {
    setIsModalOpen(false);
    setSelectedFile(null);
    setPreviewData([]);
    setQuestionCounts({ total: 0, easy: 0, medium: 0, hard: 0 });
    setImportError('');
    setModalStep(1);
  };
  
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

  const renderModalContent = () => {
    if (modalStep === 3) {
        return (
            <div style={{...announcementFormStyle, width: '500px', textAlign: 'center'}}>
                <h3 style={{ ...sectionTitleStyle, fontSize: '1.5rem', marginTop: 0 }}>Import Complete</h3>
                {importError ? (
                    <p style={{ color: 'red' }}>{importError}</p>
                ) : (
                <>
                    <p><strong>Imported:</strong> {importSummary.imported}</p>
                    <p><strong>Skipped (Duplicates):</strong> {importSummary.skipped}</p>
                    <p><strong>Failed:</strong> {importSummary.failed}</p>
                </>
                )}
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
                    <button style={{ ...buttonStyle, background: '#6c757d' }} onClick={resetModal}>Close</button>
                </div>
            </div>
        )
    }

    if (modalStep === 2) {
      return (
        <div style={{...announcementFormStyle, width: '800px'}}>
            <h3 style={{ ...sectionTitleStyle, fontSize: '1.5rem', marginTop: 0 }}>Preview Import</h3>
            {importError ? (
                <p style={{ color: 'red', textAlign: 'center' }}>{importError}</p>
            ) : (
            <>
                <div style={{ marginBottom: '1rem', textAlign: 'center' }}>
                    <p><strong>Total Questions Found:</strong> {questionCounts.total}</p>
                    <p>
                        <strong>Easy:</strong> {questionCounts.easy} | 
                        <strong>Medium:</strong> {questionCounts.medium} | 
                        <strong>Hard:</strong> {questionCounts.hard}
                    </p>
                </div>
                <div style={{ overflowX: 'auto', maxHeight: '300px' }}>
                    <table style={tableStyle}>
                        <thead>
                        <tr>
                            <th style={thStyle}>#</th>
                            <th style={thStyle}>Difficulty</th>
                            <th style={thStyle}>Question</th>
                            <th style={thStyle}>Correct Answer</th>
                        </tr>
                        </thead>
                        <tbody>
                        {previewData.slice(0, 20).map((q, index) => (
                            <tr key={index}>
                            <td style={tdStyle}>{index + 1}</td>
                            <td style={tdStyle}>{q.Difficulty}</td>
                            <td style={tdStyle}>{q.Question}</td>
                            <td style={tdStyle}>{q['Correct Answer']}</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                <button style={{ ...buttonStyle, background: '#6c757d' }} onClick={resetModal}>Cancel</button>
                <button style={{ ...buttonStyle, background: '#17a2b8' }} onClick={() => setModalStep(1)}>Back</button>
                <button style={{ ...buttonStyle, background: '#007bff' }} onClick={handleImport} >Import</button>
            </div>
        </div>
      )
    }

    return (
        <div style={{ ...announcementFormStyle, width: '500px' }}>
        <h3 style={{ ...sectionTitleStyle, fontSize: '1.5rem', marginTop: 0 }}>Import Quiz Questions</h3>
        {importError && <p style={{ color: 'red', textAlign: 'center' }}>{importError}</p>}
        <input
          type="file"
          accept=".xlsx"
          onChange={handleFileChange}
          style={{ ...inputStyle, display: 'block', width: '100%', marginBottom: '1rem' }}
        />
        <p style={{ marginBottom: '1rem' }}>
          Selected File: {selectedFile ? selectedFile.name : "No file selected"}
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
          <button
            style={{ ...buttonStyle, background: '#6c757d' }}
            onClick={resetModal}
          >
            Cancel
          </button>
          <button
            style={{ ...buttonStyle, background: '#007bff' }}
            onClick={handleNext}
            disabled={!selectedFile}
          >
            Next
          </button>
        </div>
      </div>
    )
  }

  return (
    <section>
      <h2 style={sectionTitleStyle}>Quiz Management</h2>

      {error && <p style={{ color: 'red', textAlign: 'center', marginBottom: '1rem' }}>{error}</p>}

      {!editingQuestion && (
        <div style={{ marginBottom: '2rem' }}>
          <button
            style={{ ...buttonStyle, background: '#28a745' }}
            onClick={() => setShowCreateForm(!showCreateForm)}
          >
            {showCreateForm ? 'Cancel' : '➕ Add Question'}
          </button>
          <button
            style={{ ...buttonStyle, background: '#17a2b8', marginLeft: '1rem' }}
            onClick={() => setIsModalOpen(true)}
          >
            📥 Import Questions
          </button>
          {showCreateForm && renderQuestionForm(newQuestion, handleCreateQuestion, () => setShowCreateForm(false))}
        </div>
      )}

      {isModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
            {renderModalContent()}
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
