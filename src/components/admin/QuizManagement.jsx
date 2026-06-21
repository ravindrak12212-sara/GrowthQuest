import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '../../firebase/firebase';
import { collection, doc, getDocs, writeBatch, query, where, serverTimestamp, onSnapshot, updateDoc, deleteDoc } from 'firebase/firestore';
import * as XLSX from 'xlsx';

const QuizManagement = () => {
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalStep, setModalStep] = useState(1); // 1: Upload, 2: Preview, 3: Importing, 4: Summary
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewData, setPreviewData] = useState([]);
    const [importError, setImportError] = useState('');
    const [questionCounts, setQuestionCounts] = useState({ total: 0, easy: 0, medium: 0, hard: 0 });
    const [importSummary, setImportSummary] = useState({ imported: 0, skipped: 0, failed: 0 });

    const fetchQuestions = useCallback(() => {
        setLoading(true);
        const q = query(collection(db, "quizQuestions"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedQuestions = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setQuestions(fetchedQuestions);
            setLoading(false);
        }, (err) => {
            console.error("Error fetching quiz questions: ", err);
            setError("Failed to fetch quiz questions.");
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    useEffect(() => {
        const unsubscribe = fetchQuestions();
        return () => unsubscribe();
    }, [fetchQuestions]);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file && file.name.endsWith('.xlsx')) {
            setSelectedFile(file);
            setImportError('');
        } else {
            setSelectedFile(null);
            setImportError('Please select a valid .xlsx file.');
        }
    };

    const handlePreview = () => {
        if (!selectedFile) {
            setImportError('Please select a file first.');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json(worksheet);

                if (json.length === 0) {
                    setImportError('The file is empty or in an incorrect format.');
                    return;
                }

                const requiredColumns = ['Question', 'Option 1', 'Option 2', 'Option 3', 'Option 4', 'Correct Answer (1-4)', 'Difficulty'];
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
            const existingQuestionsQuery = query(collection(db, "quizQuestions"));
            const snapshot = await getDocs(existingQuestionsQuery);
            const existingQuestionTexts = new Set(snapshot.docs.map(doc => doc.data().question?.trim().toLowerCase()));
            
            const batch = writeBatch(db);

            previewData.forEach(row => {
                const {
                    Question,
                    'Option 1': option1,
                    'Option 2': option2,
                    'Option 3': option3,
                    'Option 4': option4,
                    'Correct Answer (1-4)': correctAnswerIndex,
                    Difficulty,
                } = row;

                const questionText = Question?.trim();
                if (!questionText) {
                    skipped++;
                    return;
                }

                const options = [option1, option2, option3, option4].map(o => o?.trim()).filter(o => o);
                const correctAnswer = parseInt(correctAnswerIndex, 10) - 1;
                const difficulty = Difficulty || 'medium'; // FIX: Use the 'Difficulty' value from the Excel sheet. Default to 'medium' if blank.

                if (
                    options.length !== 4 ||
                    isNaN(correctAnswer) ||
                    correctAnswer < 0 ||
                    correctAnswer > 3 ||
                    !options[correctAnswer] ||
                    existingQuestionTexts.has(questionText.toLowerCase())
                ) {
                    if (existingQuestionTexts.has(questionText.toLowerCase())) {
                        skipped++;
                    } else {
                        failed++;
                    }
                    return;
                }

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
                existingQuestionTexts.add(questionText.toLowerCase());
            });

            await batch.commit();
            setImportSummary({ imported, skipped, failed });

        } catch (err) {
            console.error("Error importing questions: ", err);
            setImportError("An error occurred during the import process.");
            setImportSummary({ imported: 0, skipped: 0, failed: previewData.length });
        } finally {
            setModalStep(4);
        }
    };
    
    const resetModal = () => {
        setIsModalOpen(false);
        setTimeout(() => {
            setModalStep(1);
            setSelectedFile(null);
            setPreviewData([]);
            setImportError('');
            setQuestionCounts({ total: 0, easy: 0, medium: 0, hard: 0 });
            setImportSummary({ imported: 0, skipped: 0, failed: 0 });
        }, 300);
    };

    const handleToggleActive = async (id, currentStatus) => {
        try {
            const questionRef = doc(db, 'quizQuestions', id);
            await updateDoc(questionRef, { active: !currentStatus });
            setMessage(`Question ${!currentStatus ? 'activated' : 'deactivated'}.`);
        } catch (err) {
            setError('Failed to update question status.');
        }
    };

    const handleDeleteQuestion = async (id) => {
        if (window.confirm('Are you sure you want to delete this question?')) {
            try {
                await deleteDoc(doc(db, 'quizQuestions', id));
                setMessage('Question deleted successfully.');
            } catch (err) {
                setError('Failed to delete question.');
            }
        }
    };
    
    const filteredQuestions = useMemo(() => {
        // A placeholder for future search/filter functionality
        return questions;
    }, [questions]);

    const containerStyle = { background: 'white', padding: '2rem', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' };
    const tableStyle = { width: '100%', borderCollapse: 'collapse', marginTop: '1.5rem' };
    const thStyle = { border: '1px solid #ddd', padding: '12px', textAlign: 'left', backgroundColor: '#f2f2f2' };
    const tdStyle = { border: '1px solid #ddd', padding: '12px', verticalAlign: 'top' };
    const buttonStyle = { padding: '0.5rem 1rem', borderRadius: '5px', border: 'none', cursor: 'pointer', marginRight: '0.5rem' };

    return (
        <div style={containerStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ margin: 0 }}>Quiz Question Management</h2>
                <button onClick={() => setIsModalOpen(true)} style={{...buttonStyle, background: '#007bff', color: 'white'}}>Import from Excel</button>
            </div>

            {error && <p style={{ color: 'red' }}>{error}</p>}
            {message && <p style={{ color: 'green' }}>{message}</p>}

            {loading ? <p>Loading questions...</p> : (
                <div style={{overflowX: 'auto'}}>
                    <table style={tableStyle}>
                        <thead>
                            <tr>
                                <th style={thStyle}>Question</th>
                                <th style={{...thStyle, width: '100px'}}>Difficulty</th>
                                <th style={{...thStyle, width: '100px'}}>Status</th>
                                <th style={{...thStyle, width: '200px'}}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredQuestions.map(q => (
                                <tr key={q.id}>
                                    <td style={tdStyle}>{q.question}</td>
                                    <td style={tdStyle}>{q.difficulty}</td>
                                    <td style={tdStyle}>{q.active ? 'Active' : 'Inactive'}</td>
                                    <td style={tdStyle}>
                                        <button onClick={() => handleToggleActive(q.id, q.active)} style={{...buttonStyle, background: q.active ? '#ffc107' : '#28a745', color: 'white'}}>
                                            {q.active ? 'Deactivate' : 'Activate'}
                                        </button>
                                        <button onClick={() => handleDeleteQuestion(q.id)} style={{...buttonStyle, background: '#dc3545', color: 'white'}}>Delete</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {isModalOpen && (
                <div style={{position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000}}>
                    <div style={{background: 'white', padding: '2rem', borderRadius: '8px', width: '90%', maxWidth: '600px'}}>
                        <h3 style={{marginTop: 0, marginBottom: '2rem'}}>Import Quiz Questions</h3>
                        
                        {modalStep === 1 && (
                            <div>
                                <p>Select an .xlsx file to import. Ensure it follows the required template format.</p>
                                <a href="/quiz_questions_template.xlsx" download>Download Template</a>
                                <input type="file" onChange={handleFileChange} accept=".xlsx" style={{display: 'block', margin: '1rem 0'}}/>
                                {importError && <p style={{color: 'red'}}>{importError}</p>}
                                <div style={{marginTop: '2rem'}}>
                                    <button onClick={resetModal} style={{...buttonStyle, background: '#6c757d', color: 'white'}}>Cancel</button>
                                    <button onClick={handlePreview} disabled={!selectedFile} style={{...buttonStyle, background: '#007bff', color: 'white'}}>Preview Import</button>
                                </div>
                            </div>
                        )}

                        {modalStep === 2 && (
                            <div>
                               <h4>Preview</h4>
                                <p>Your file contains {questionCounts.total} questions.</p>
                                <ul>
                                    <li>Easy: {questionCounts.easy}</li>
                                    <li>Medium: {questionCounts.medium}</li>
                                    <li>Hard: {questionCounts.hard}</li>
                                </ul>
                                <p>Questions that already exist in the database will be skipped.</p>
                                {importError && <p style={{color: 'red'}}>{importError}</p>}
                                <div style={{marginTop: '2rem'}}>
                                    <button onClick={() => setModalStep(1)} style={{...buttonStyle, background: '#6c757d', color: 'white'}}>Back</button>
                                    <button onClick={handleImport} style={{...buttonStyle, background: '#28a745', color: 'white'}}>Confirm and Import</button>
                                </div>
                            </div>
                        )}

                        {(modalStep === 3) && <p>Importing... Please wait.</p>}

                        {modalStep === 4 && (
                            <div>
                                <h4>Import Complete</h4>
                                <p>Summary:</p>
                                <ul>
                                    <li style={{color: 'green'}}>Successfully Imported: {importSummary.imported}</li>
                                    <li style={{color: 'orange'}}>Skipped (Duplicates): {importSummary.skipped}</li>
                                    <li style={{color: 'red'}}>Failed (Invalid Data): {importSummary.failed}</li>
                                </ul>
                                {importError && <p style={{color: 'red'}}>{importError}</p>}
                                <div style={{marginTop: '2rem'}}>
                                    <button onClick={resetModal} style={{...buttonStyle, background: '#007bff', color: 'white'}}>Close</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default QuizManagement;
