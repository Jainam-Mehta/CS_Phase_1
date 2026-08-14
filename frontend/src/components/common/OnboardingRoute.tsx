/**
 * OnboardingRoute Component
 * CRITICAL FIX: This component should ONLY gate access, not navigate
 * Navigation is handled by RoleRedirect in routes
 * 
 * Wraps protected routes to ensure onboarding is complete before allowing access
 * Uses the useOnboarding hook to determine the correct routing
 */

import { useEffect } from 'react';
import { useOnboarding } from '../../hooks/useOnboarding';

interface OnboardingRouteProps {
  children: React.ReactNode;
}

const OnboardingRoute: React.FC<OnboardingRouteProps> = ({ children }) => {
  const { step, loading, navigateToCurrentStep } = useOnboarding();

  useEffect(() => {
    if (!loading) {
      // Only navigate to onboarding steps if not on dashboard
      // Do NOT navigate to dashboards - that's handled by RoleRedirect
      if (step !== 'dashboard') {
        navigateToCurrentStep();
      }
    }
  }, [loading, step, navigateToCurrentStep]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  // Only render children if onboarding is complete
  if (step === 'dashboard') {
    return <>{children}</>;
  }

  // Otherwise, don't render anything (the navigateToCurrentStep will handle redirection)
  return null;
};

export default OnboardingRoute;