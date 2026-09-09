/**
 * OnboardingRoute Component
 *
 * Gates access to protected pages by checking onboarding completion.
 * If onboarding is not done, navigates the user to the correct next step.
 * Navigation here is intentional — RoleRedirect handles the initial
 * role-based redirect; OnboardingRoute handles the step-based redirect
 * that happens AFTER the role layout has mounted.
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOnboarding } from '../../hooks/useOnboarding';

interface OnboardingRouteProps {
  children: React.ReactNode;
}

const OnboardingRoute: React.FC<OnboardingRouteProps> = ({ children }) => {
  const navigate = useNavigate();
  const { step, loading, targetRoute } = useOnboarding();

  useEffect(() => {
    if (loading) return;

    // targetRoute is null when step === 'dashboard' (onboarding complete)
    // or when loading. Only navigate away if there's an actual step to go to.
    if (step !== 'dashboard' && targetRoute) {
      console.log('OnboardingRoute: onboarding incomplete, navigating to', targetRoute);
      navigate(targetRoute);
    }
  }, [loading, step, targetRoute, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  // Render children only when onboarding is fully complete
  if (step === 'dashboard') {
    return <>{children}</>;
  }

  // Navigation is in flight — render nothing to avoid a layout flash
  return null;
};

export default OnboardingRoute;
