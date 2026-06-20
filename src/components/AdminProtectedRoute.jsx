import React, { useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';

const ADMIN_EMAIL = 'ravindrak12212@gmail.com';

function AccessDeniedRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/dashboard', { replace: true });
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div style={{ textAlign: 'center', marginTop: '50px' }}>
      <h2>Access Denied</h2>
      <p>You do not have permission to view this page. Redirecting to your dashboard...</p>
    </div>
  );
}

function AdminProtectedRoute({ user, children }) {

  if (user === undefined) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (user.email !== ADMIN_EMAIL) {
    return <AccessDeniedRedirect />;
  }

  return React.cloneElement(children, { user });
}

export default AdminProtectedRoute;
