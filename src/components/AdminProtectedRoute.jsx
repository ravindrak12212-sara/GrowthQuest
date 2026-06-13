import React, { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { auth } from '../firebase/firebase';
import { onAuthStateChanged } from 'firebase/auth';

const ADMIN_EMAIL = 'ravindrak12212@gmail.com';

// Helper component for the "Access Denied" UI and delayed redirect
function AccessDeniedRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/dashboard', { replace: true });
    }, 3000); // 3-second delay before redirecting

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div style={{ textAlign: 'center', marginTop: '50px' }}>
      <h2>Access Denied</h2>
      <p>You do not have permission to view this page. Redirecting to your dashboard...</p>
    </div>
  );
}

function AdminProtectedRoute({ children }) {
  const [authState, setAuthState] = useState({
    loading: true,
    user: null,
    isAdmin: false,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        // Check if the user's email matches the admin email
        const isAdmin = currentUser.email === ADMIN_EMAIL;
        setAuthState({ loading: false, user: currentUser, isAdmin });
      } else {
        // State: Not authenticated
        setAuthState({ loading: false, user: null, isAdmin: false });
      }
    });

    return () => unsubscribe();
  }, []); // Effect runs once on mount

  // 1. While checking authentication, show a loading indicator
  if (authState.loading) {
    return <div>Loading...</div>;
  }

  // 2. If the user is not logged in, redirect to the login page.
  if (!authState.user) {
    return <Navigate to="/" replace />;
  }

  // 3. If the user is logged in but is NOT an admin, show "Access Denied"
  if (authState.user && !authState.isAdmin) {
    return <AccessDeniedRedirect />;
  }

  // 4. If the user is authenticated and is an admin, grant access
  return children;
}

export default AdminProtectedRoute;
