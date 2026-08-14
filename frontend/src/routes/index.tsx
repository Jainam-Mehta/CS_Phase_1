import React, { useState, useEffect } from 'react';
import { createBrowserRouter, useNavigate } from 'react-router-dom';
import { MainLayout } from '../layouts/MainLayout';
import OwnerLayout from '../layouts/OwnerLayout';
import FarmerLayout from '../layouts/FarmerLayout';
import StakeholderLayout from '../layouts/StakeholderLayout';
import NotFound from '../components/common/NotFound';
import ProtectedRoute from '../components/common/ProtectedRoute';
import OnboardingRoute from '../components/common/OnboardingRoute';
import { AuthProvider } from '../providers/AuthProvider';
import { useAuthStore } from '../stores/useAuthStore';

// Role redirect component
const RoleRedirect: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [hasRedirected, setHasRedirected] = useState(false);

  useEffect(() => {
    if (user && !hasRedirected) {
      console.log('=== ROLE REDIRECT ===');
      console.log('User Role:', user.role);
      console.log('Redirecting to:', user.role === 'owner' ? '/owner/dashboard' : user.role === 'farmer' ? '/farmer/dashboard' : user.role === 'stakeholder' ? '/stakeholder/dashboard' : '/role-selection');
      
      if (user.role === 'owner') {
        navigate('/owner/dashboard');
      } else if (user.role === 'farmer') {
        navigate('/farmer/dashboard');
      } else if (user.role === 'stakeholder') {
        navigate('/stakeholder/map');
      } else {
        navigate('/role-selection');
      }
      
      setHasRedirected(true);
    }
  }, [user, navigate, hasRedirected]);

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
    </div>
  );
};

// Layout that wraps routes with AuthProvider
const AuthLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AuthProvider>
    {children}
  </AuthProvider>
);

// Lazy load page components for better performance
const Splash = React.lazy(() => import('../features/auth/Splash'));
const Login = React.lazy(() => import('../features/auth/Login'));
const RoleSelection = React.lazy(() => import('../features/auth/RoleSelection'));
const Signup = React.lazy(() => import('../features/auth/Signup'));
const FarmerProfileSetup = React.lazy(() => import('../features/auth/FarmerProfileSetup'));
const OwnerProfileSetup = React.lazy(() => import('../features/auth/OwnerProfileSetup'));
const StakeholderProfileSetup = React.lazy(() => import('../features/auth/StakeholderProfileSetup'));
const StakeholderInvestmentPreferences = React.lazy(() => import('../features/auth/StakeholderInvestmentPreferences'));
const OwnerSetup = React.lazy(() => import('../features/auth/OwnerSetup'));
const ProductSelection = React.lazy(() => import('../features/auth/ProductSelection'));
const RoomSelection = React.lazy(() => import('../features/auth/RoomSelection'));
const StorageSelection = React.lazy(() => import('../features/auth/StorageSelection'));
const AuthCallback = React.lazy(() => import('../features/auth/AuthCallback'));

// Owner pages
const OwnerDashboard = React.lazy(() => import('../features/dashboard/OwnerDashboard'));
const OwnerMonitoring = React.lazy(() => import('../features/monitoring/OwnerMonitoring'));
const OwnerInventory = React.lazy(() => import('../features/inventory/OwnerInventory'));
const OwnerEnergy = React.lazy(() => import('../features/energy/OwnerEnergy'));
const OwnerCarbonCredits = React.lazy(() => import('../features/carbon-credits/OwnerCarbonCredits'));
const OwnerAlerts = React.lazy(() => import('../features/alerts/OwnerAlerts'));
const OwnerBatchTraceability = React.lazy(() => import('../features/batch-traceability/OwnerBatchTraceability'));
const OwnerMaintenance = React.lazy(() => import('../features/maintenance/OwnerMaintenance'));
const OwnerApprovals = React.lazy(() => import('../features/approvals/OwnerApprovals'));

// Farmer pages
const FarmerDashboard = React.lazy(() => import('../features/dashboard/FarmerDashboard'));
const FarmerInventory = React.lazy(() => import('../features/inventory/FarmerInventory'));
const FarmerPriceCalculator = React.lazy(() => import('../features/price-calculator/FarmerPriceCalculator'));
const FarmerMarketIntelligence = React.lazy(() => import('../features/market-intelligence/FarmerMarketIntelligence'));
const FarmerAlerts = React.lazy(() => import('../features/alerts/FarmerAlerts'));
const FarmerOrders = React.lazy(() => import('../features/orders/FarmerOrders'));
const FarmerFinance = React.lazy(() => import('../features/finance/FarmerFinance'));

// Stakeholder pages
const StakeholderMap = React.lazy(() => import('../features/stakeholder/StakeholderMap'));
const StakeholderState = React.lazy(() => import('../features/stakeholder/StakeholderState'));
const StakeholderDistrict = React.lazy(() => import('../features/stakeholder/StakeholderDistrict'));

// Shared pages
const Notifications = React.lazy(() => import('../features/notifications/Notifications'));
const Settings = React.lazy(() => import('../features/settings/Settings'));
const Profile = React.lazy(() => import('../features/settings/Profile'));
const OwnerProfile = React.lazy(() => import('../features/settings/OwnerProfile'));
const FarmerProfile = React.lazy(() => import('../features/profile/FarmerProfile'));
const StakeholderProfile = React.lazy(() => import('../features/settings/StakeholderProfile'));
const Preferences = React.lazy(() => import('../features/settings/Preferences'));

// Loading component for lazy loading
const LoadingFallback = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
  </div>
);

export const router = createBrowserRouter([
  {
    path: '/splash',
    element: (
      <AuthLayout>
        <React.Suspense fallback={<LoadingFallback />}>
          <Splash />
        </React.Suspense>
      </AuthLayout>
    ),
  },
  {
    path: '/role-selection',
    element: (
      <AuthLayout>
        <React.Suspense fallback={<LoadingFallback />}>
          <RoleSelection />
        </React.Suspense>
      </AuthLayout>
    ),
  },
  {
    path: '/login',
    element: (
      <AuthLayout>
        <React.Suspense fallback={<LoadingFallback />}>
          <Login />
        </React.Suspense>
      </AuthLayout>
    ),
  },
  {
    path: '/signup',
    element: (
      <AuthLayout>
        <React.Suspense fallback={<LoadingFallback />}>
          <Signup />
        </React.Suspense>
      </AuthLayout>
    ),
  },
  {
    path: '/auth/callback',
    element: (
      <AuthLayout>
        <React.Suspense fallback={<LoadingFallback />}>
          <AuthCallback />
        </React.Suspense>
      </AuthLayout>
    ),
  },
  {
    path: '/farmer-profile-setup',
    element: (
      <AuthLayout>
        <React.Suspense fallback={<LoadingFallback />}>
          <FarmerProfileSetup />
        </React.Suspense>
      </AuthLayout>
    ),
  },
  {
    path: '/owner-profile-setup',
    element: (
      <AuthLayout>
        <React.Suspense fallback={<LoadingFallback />}>
          <OwnerProfileSetup />
        </React.Suspense>
      </AuthLayout>
    ),
  },
  {
    path: '/stakeholder-profile-setup',
    element: (
      <AuthLayout>
        <React.Suspense fallback={<LoadingFallback />}>
          <StakeholderProfileSetup />
        </React.Suspense>
      </AuthLayout>
    ),
  },
  {
    path: '/stakeholder-investment-preferences',
    element: (
      <AuthLayout>
        <React.Suspense fallback={<LoadingFallback />}>
          <StakeholderInvestmentPreferences />
        </React.Suspense>
      </AuthLayout>
    ),
  },
  {
    path: '/owner-setup',
    element: (
      <AuthLayout>
        <React.Suspense fallback={<LoadingFallback />}>
          <OwnerSetup />
        </React.Suspense>
      </AuthLayout>
    ),
  },
  {
    path: '/product-selection',
    element: (
      <AuthLayout>
        <React.Suspense fallback={<LoadingFallback />}>
          <ProductSelection />
        </React.Suspense>
      </AuthLayout>
    ),
  },
  {
    path: '/room-selection',
    element: (
      <AuthLayout>
        <React.Suspense fallback={<LoadingFallback />}>
          <RoomSelection />
        </React.Suspense>
      </AuthLayout>
    ),
  },
  {
    path: '/storage-selection',
    element: (
      <AuthLayout>
        <React.Suspense fallback={<LoadingFallback />}>
          <StorageSelection />
        </React.Suspense>
      </AuthLayout>
    ),
  },

  // OWNER ROUTES - /owner/*
  {
    path: '/owner',
    element: (
      <AuthLayout>
        <ProtectedRoute requiredRole="owner">
          <OnboardingRoute>
            <OwnerLayout />
          </OnboardingRoute>
        </ProtectedRoute>
      </AuthLayout>
    ),
    children: [
      {
        index: true,
        element: (
          <React.Suspense fallback={<LoadingFallback />}>
            <OwnerDashboard />
          </React.Suspense>
        ),
      },
      {
        path: 'dashboard',
        element: (
          <React.Suspense fallback={<LoadingFallback />}>
            <OwnerDashboard />
          </React.Suspense>
        ),
      },
      {
        path: 'monitoring',
        element: (
          <React.Suspense fallback={<LoadingFallback />}>
            <OwnerMonitoring />
          </React.Suspense>
        ),
      },
      {
        path: 'inventory',
        element: (
          <React.Suspense fallback={<LoadingFallback />}>
            <OwnerInventory />
          </React.Suspense>
        ),
      },
      {
        path: 'energy',
        element: (
          <React.Suspense fallback={<LoadingFallback />}>
            <OwnerEnergy />
          </React.Suspense>
        ),
      },
      {
        path: 'carbon-credits',
        element: (
          <React.Suspense fallback={<LoadingFallback />}>
            <OwnerCarbonCredits />
          </React.Suspense>
        ),
      },
      {
        path: 'alerts',
        element: (
          <React.Suspense fallback={<LoadingFallback />}>
            <OwnerAlerts />
          </React.Suspense>
        ),
      },
      {
        path: 'batch-traceability',
        element: (
          <React.Suspense fallback={<LoadingFallback />}>
            <OwnerBatchTraceability />
          </React.Suspense>
        ),
      },
      {
        path: 'maintenance',
        element: (
          <React.Suspense fallback={<LoadingFallback />}>
            <OwnerMaintenance />
          </React.Suspense>
        ),
      },
      {
        path: 'approvals',
        element: (
          <React.Suspense fallback={<LoadingFallback />}>
            <OwnerApprovals />
          </React.Suspense>
        ),
      },
      {
        path: 'settings',
        element: (
          <React.Suspense fallback={<LoadingFallback />}>
            <Settings />
          </React.Suspense>
        ),
      },
      {
        path: 'profile',
        element: (
          <React.Suspense fallback={<LoadingFallback />}>
            <OwnerProfile />
          </React.Suspense>
        ),
      },
      {
        path: 'preferences',
        element: (
          <React.Suspense fallback={<LoadingFallback />}>
            <Preferences />
          </React.Suspense>
        ),
      },
    ],
  },

  // FARMER ROUTES - /farmer/*
  {
    path: '/farmer',
    element: (
      <AuthLayout>
        <ProtectedRoute requiredRole="farmer">
          <OnboardingRoute>
            <FarmerLayout />
          </OnboardingRoute>
        </ProtectedRoute>
      </AuthLayout>
    ),
    children: [
      {
        index: true,
        element: (
          <React.Suspense fallback={<LoadingFallback />}>
            <FarmerDashboard />
          </React.Suspense>
        ),
      },
      {
        path: 'dashboard',
        element: (
          <React.Suspense fallback={<LoadingFallback />}>
            <FarmerDashboard />
          </React.Suspense>
        ),
      },
      {
        path: 'inventory',
        element: (
          <React.Suspense fallback={<LoadingFallback />}>
            <FarmerInventory />
          </React.Suspense>
        ),
      },
      {
        path: 'price-calculator',
        element: (
          <React.Suspense fallback={<LoadingFallback />}>
            <FarmerPriceCalculator />
          </React.Suspense>
        ),
      },
      {
        path: 'market-intelligence',
        element: (
          <React.Suspense fallback={<LoadingFallback />}>
            <FarmerMarketIntelligence />
          </React.Suspense>
        ),
      },
      {
        path: 'alerts',
        element: (
          <React.Suspense fallback={<LoadingFallback />}>
            <FarmerAlerts />
          </React.Suspense>
        ),
      },
      {
        path: 'orders',
        element: (
          <React.Suspense fallback={<LoadingFallback />}>
            <FarmerOrders />
          </React.Suspense>
        ),
      },
      {
        path: 'finance',
        element: (
          <React.Suspense fallback={<LoadingFallback />}>
            <FarmerFinance />
          </React.Suspense>
        ),
      },
      {
        path: 'settings',
        element: (
          <React.Suspense fallback={<LoadingFallback />}>
            <Settings />
          </React.Suspense>
        ),
      },
      {
        path: 'profile',
        element: (
          <React.Suspense fallback={<LoadingFallback />}>
            <FarmerProfile />
          </React.Suspense>
        ),
      },
      {
        path: 'preferences',
        element: (
          <React.Suspense fallback={<LoadingFallback />}>
            <Preferences />
          </React.Suspense>
        ),
      },
    ],
  },

  // STAKEHOLDER ROUTES - /stakeholder/*
  {
    path: '/stakeholder',
    element: (
      <AuthLayout>
        <ProtectedRoute requiredRole="stakeholder">
          <OnboardingRoute>
            <StakeholderLayout />
          </OnboardingRoute>
        </ProtectedRoute>
      </AuthLayout>
    ),
    children: [
      {
        index: true,
        element: (
          <React.Suspense fallback={<LoadingFallback />}>
            <StakeholderMap />
          </React.Suspense>
        ),
      },
      {
        path: 'map',
        element: (
          <React.Suspense fallback={<LoadingFallback />}>
            <StakeholderMap />
          </React.Suspense>
        ),
      },
      {
        path: 'state/:stateName',
        element: (
          <React.Suspense fallback={<LoadingFallback />}>
            <StakeholderState />
          </React.Suspense>
        ),
      },
      {
        path: 'district/:districtName',
        element: (
          <React.Suspense fallback={<LoadingFallback />}>
            <StakeholderDistrict />
          </React.Suspense>
        ),
      },
      {
        path: 'dashboard/:facilityId',
        element: (
          <React.Suspense fallback={<LoadingFallback />}>
            <StakeholderMap />
          </React.Suspense>
        ),
      },
      {
        path: 'dashboard',
        element: (
          <React.Suspense fallback={<LoadingFallback />}>
            <StakeholderMap />
          </React.Suspense>
        ),
      },
      {
        path: 'settings',
        element: (
          <React.Suspense fallback={<LoadingFallback />}>
            <Settings />
          </React.Suspense>
        ),
      },
      {
        path: 'profile',
        element: (
          <React.Suspense fallback={<LoadingFallback />}>
            <StakeholderProfile />
          </React.Suspense>
        ),
      },
      {
        path: 'preferences',
        element: (
          <React.Suspense fallback={<LoadingFallback />}>
            <Preferences />
          </React.Suspense>
        ),
      },
    ],
  },

  // Root redirect based on role
  {
    path: '/',
    element: (
      <AuthLayout>
        <ProtectedRoute>
          <RoleRedirect />
        </ProtectedRoute>
      </AuthLayout>
    ),
  },

  {
    path: '*',
    element: (
      <AuthLayout>
        <React.Suspense fallback={<LoadingFallback />}>
          <NotFound />
        </React.Suspense>
      </AuthLayout>
    ),
  },
]);
