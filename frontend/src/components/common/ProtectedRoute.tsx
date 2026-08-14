import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'owner' | 'farmer' | 'stakeholder';
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      console.log('ProtectedRoute: Not authenticated, redirecting to role-selection');
      navigate('/role-selection');
      return;
    }

    if (requiredRole && user) {
      const userRole = user.role;
      if (!userRole) {
        console.log('ProtectedRoute: User role not yet loaded, waiting...');
        return;
      }
      
      if (userRole !== requiredRole) {
        console.log(`ProtectedRoute: User role ${userRole} cannot access ${requiredRole} route`);
        if (userRole === 'owner') navigate('/owner/dashboard');
        else if (userRole === 'farmer') navigate('/farmer/dashboard');
        else if (userRole === 'stakeholder') navigate('/stakeholder/dashboard');
        else navigate('/role-selection');
      }
    }
  }, [isAuthenticated, user, requiredRole, navigate]);

  if (!isAuthenticated) return null;
  if (requiredRole && user?.role !== requiredRole) return null;

  return <>{children}</>;
};

export default ProtectedRoute;
