import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * @param {{ children: React.ReactNode, requiredRole?: 'admin' | 'officer' }} props
 */
export default function ProtectedRoute({ children, requiredRole }) {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-toms-bg font-sans flex items-center justify-center">
        <p className="text-toms-gray-muted">Loading…</p>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    return (
      <div className="min-h-screen bg-toms-bg font-sans flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow border border-toms-gray-border p-8 max-w-md text-center">
          <h2 className="text-xl font-semibold text-gray-900">Access denied</h2>
          <p className="text-toms-gray-muted mt-2">
            This page requires <strong>{requiredRole}</strong> role. Your role is{' '}
            <strong>{user.role}</strong>.
          </p>
        </div>
      </div>
    );
  }

  return children;
}
