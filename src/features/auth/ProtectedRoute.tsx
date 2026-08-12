import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) return <div className="p-4 text-gray-500">加载中…</div>;
  if (!session) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
