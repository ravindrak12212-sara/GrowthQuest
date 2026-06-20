import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Quiz from './pages/Quiz';
import Redeem from './pages/Redeem';
import AdminDashboard from './pages/AdminDashboard';
import TreasureVault from './pages/TreasureVault';
import DeliveryProfile from './pages/DeliveryProfile';
import ProtectedRoute from './components/ProtectedRoute';
import AdminProtectedRoute from './components/AdminProtectedRoute';
import { auth, db } from './firebase/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import useHeartbeat from './hooks/useHeartbeat';

function App() {
    const [user, setUser] = useState(undefined);
    const navigate = useNavigate();
    useHeartbeat(user?.uid);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
        });
        return unsubscribe;
    }, []);

    const handleLogout = async () => {
        if (auth.currentUser) {
            try {
                const userDocRef = doc(db, 'users', auth.currentUser.uid);
                await updateDoc(userDocRef, {
                    lastSeen: serverTimestamp(),
                });
            } catch (error) {
                console.error("Error updating lastSeen on logout: ", error);
            }
            await auth.signOut();
            navigate('/');
        }
    };

    return (
        <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/dashboard" element={<ProtectedRoute user={user}><Dashboard handleLogout={handleLogout} /></ProtectedRoute>} />
            <Route path="/quiz" element={<ProtectedRoute user={user}><Quiz /></ProtectedRoute>} />
            <Route path="/redeem" element={<ProtectedRoute user={user}><Redeem /></ProtectedRoute>} />
            <Route path="/treasure-vault" element={<ProtectedRoute user={user}><TreasureVault /></ProtectedRoute>} />
            <Route path="/delivery-profile" element={<ProtectedRoute user={user}><DeliveryProfile /></ProtectedRoute>} />
            <Route path="/admin" element={<AdminProtectedRoute user={user}><AdminDashboard handleLogout={handleLogout} /></AdminProtectedRoute>} />
        </Routes>
    );
}

const AppWrapper = () => (
    <BrowserRouter>
        <App />
    </BrowserRouter>
);

export default AppWrapper;
