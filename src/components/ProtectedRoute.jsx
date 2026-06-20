import React from 'react';
import { Navigate } from 'react-router-dom';

function ProtectedRoute({ user, children }) {
  if (user === undefined) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/" />;
  }

  return React.cloneElement(children, { user });
}

export default ProtectedRoute;
