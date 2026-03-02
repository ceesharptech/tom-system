import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ProtectedRoute from './components/ProtectedRoute';
import './index.css';

function RootRedirect() {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return null;
  return <Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<Login />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/officer/*"
        element={
          <ProtectedRoute requiredRole="officer">
            <div className="min-h-screen bg-toms-bg font-sans p-6">
              <div className="bg-white rounded-2xl shadow border border-toms-gray-border p-6">
                <h2 className="text-lg font-semibold text-gray-900">Officer area</h2>
                <p className="text-toms-gray-muted mt-1">Placeholder</p>
              </div>
            </div>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/admin/*"
        element={
          <ProtectedRoute requiredRole="admin">
            <div className="min-h-screen bg-toms-bg font-sans p-6">
              <div className="bg-white rounded-2xl shadow border border-toms-gray-border p-6">
                <h2 className="text-lg font-semibold text-gray-900">Admin area</h2>
                <p className="text-toms-gray-muted mt-1">Placeholder</p>
              </div>
            </div>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
