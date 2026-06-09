import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';

interface RequireRoleProps {
  roles: string[];
}

export function RequireRole({ roles }: RequireRoleProps) {
  const { isAuthenticated, isLoading, roles: userRoles } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const hasRole = roles.some((r) => userRoles.includes(r));

  if (!hasRole) {
    return <Navigate to="/403" replace />;
  }

  return <Outlet />;
}
