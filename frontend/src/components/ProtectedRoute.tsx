import type { ReactElement } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../App';

interface ProtectedRouteProps {
  children: ReactElement;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();

  if (loading) {
    return null; // App.tsx already handles the main loading state
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
