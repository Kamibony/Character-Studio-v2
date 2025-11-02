
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../App';

interface ProtectedRouteProps {
  children: React.ReactElement;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return null; // Or a loader, but App.tsx already handles the main loading state
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
