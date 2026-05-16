import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { UserRole } from '../types';

export function ProtectedRoute({ children, roles }: { children: JSX.Element; roles?: UserRole[] }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-8 text-sm text-slate-600">Cargando...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={user.role === 'super_admin' ? '/admin' : '/dashboard'} replace />;
  return children;
}

