import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Quiz from './pages/Quiz';
import Redeem from './pages/Redeem';
import AdminDashboard from './pages/AdminDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import AdminProtectedRoute from './components/AdminProtectedRoute';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/quiz" element={<ProtectedRoute><Quiz /></ProtectedRoute>} />
        <Route path="/redeem" element={<ProtectedRoute><Redeem /></ProtectedRoute>} />
        <Route path="/admin" element={
          <AdminProtectedRoute>
            <AdminDashboard />
          </AdminProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
