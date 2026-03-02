import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="min-h-screen bg-toms-bg font-sans flex flex-col">
      <header className="bg-white border-b border-toms-gray-border px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500" aria-hidden />
          <h1 className="text-lg font-semibold text-gray-900">TOMS Dashboard</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-toms-gray-muted">
            {user?.full_name || user?.email} ({user?.role})
          </span>
          <button
            onClick={handleLogout}
            className="px-3 py-1.5 rounded-lg text-sm font-medium text-toms-gray-muted hover:text-toms-blue hover:bg-toms-blue-light border border-toms-gray-border transition-colors"
          >
            Logout
          </button>
        </div>
      </header>
      <main className="flex-1 p-6">
        <div className="bg-white rounded-2xl shadow border border-toms-gray-border p-6">
          <p className="text-toms-gray-muted">Dashboard placeholder. Officer and admin routes coming next.</p>
        </div>
      </main>
    </div>
  );
}
