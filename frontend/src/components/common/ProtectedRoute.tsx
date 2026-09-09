import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';
import { useAuthLoading } from '../../providers/AuthProvider';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'owner' | 'farmer' | 'stakeholder';
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();
  // Wait for AuthProvider to finish its async session check AND role resolution
  const authLoadingState = useAuthLoading();

  useEffect(() => {
    const { loading: authLoading, isLoadingRole } = authLoadingState;

    // Don't act while the session or role is still being resolved
    if (authLoading || isLoadingRole) return;

    if (!isAuthenticated) {
      console.log('ProtectedRoute: Not authenticated, redirecting to role-selection');
      navigate('/role-selection');
      return;
    }

    if (requiredRole && user) {
      const userRole = user.role;
      if (!userRole) {
        // Profile/role not yet loaded — wait for the next render
        console.log('ProtectedRoute: User role not yet loaded, waiting...');
        return;
      }

      if (userRole !== requiredRole) {
        console.log(`ProtectedRoute: User role ${userRole} cannot access ${requiredRole} route`);
        if (userRole === 'owner') navigate('/owner/dashboard');
        else if (userRole === 'farmer') navigate('/farmer/dashboard');
        else if (userRole === 'stakeholder') navigate('/stakeholder/map');
        else navigate('/role-selection');
      }
    }
  }, [authLoadingState, isAuthenticated, user, requiredRole, navigate]);

  // Show spinner while auth is resolving
  if (authLoadingState.loading || authLoadingState.isLoadingRole) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (!isAuthenticated) return null;
  if (requiredRole && user?.role !== requiredRole) return null;

  return <>{children}</>;
};

export default ProtectedRoute;
