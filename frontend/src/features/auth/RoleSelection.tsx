import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';
import { Card, CardContent } from '../../components/ui/Card';
import { supabase } from '../../lib/supabase';

const FarmerIllustration: React.FC = () => (
  <svg viewBox="0 0 200 200" className="w-full h-full">
    <defs>
      <linearGradient id="farmerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#22c55e" />
        <stop offset="100%" stopColor="#16a34a" />
      </linearGradient>
    </defs>
    {/* Background circle */}
    <circle cx="100" cy="100" r="95" fill="#f0fdf4" />
    
    {/* Sun */}
    <circle cx="160" cy="40" r="20" fill="#fbbf24" />
    <g stroke="#fbbf24" strokeWidth="2">
      <line x1="160" y1="10" x2="160" y2="0" />
      <line x1="160" y1="70" x2="160" y2="80" />
      <line x1="130" y1="40" x2="120" y2="40" />
      <line x1="190" y1="40" x2="200" y2="40" />
      <line x1="140" y1="20" x2="133" y2="13" />
      <line x1="180" y1="60" x2="187" y2="67" />
      <line x1="140" y1="60" x2="133" y2="67" />
      <line x1="180" y1="20" x2="187" y2="13" />
    </g>
    
    {/* Ground */}
    <ellipse cx="100" cy="160" rx="80" ry="20" fill="#86efac" />
    
    {/* Plants */}
    <g fill="url(#farmerGradient)">
      <path d="M50 160 Q50 120 60 100 Q70 120 70 160 Z" />
      <path d="M60 160 Q60 110 75 90 Q90 110 90 160 Z" />
      <path d="M80 160 Q80 115 95 95 Q110 115 110 160 Z" />
      <path d="M100 160 Q100 120 115 100 Q130 120 130 160 Z" />
      <path d="M120 160 Q120 125 135 105 Q150 125 150 160 Z" />
    </g>
    
    {/* Farmer figure */}
    <g fill="#16a34a">
      <ellipse cx="100" cy="130" rx="15" ry="18" />
      <rect x="85" y="145" width="30" height="25" rx="5" />
    </g>
    <g fill="#dcfce7">
      <path d="M85 145 Q100 140 115 145 L115 155 Q100 150 85 155 Z" />
    </g>
    
    {/* Wheat/crops */}
    <g fill="#fbbf24">
      <ellipse cx="45" cy="85" rx="8" ry="4" />
      <ellipse cx="45" cy="95" rx="8" ry="4" />
      <ellipse cx="45" cy="105" rx="8" ry="4" />
      <line x1="45" y1="80" x2="45" y2="160" stroke="#16a34a" strokeWidth="2" />
    </g>
  </svg>
);

const OwnerIllustration: React.FC = () => (
  <svg viewBox="0 0 200 200" className="w-full h-full">
    <defs>
      <linearGradient id="ownerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#a855f7" />
        <stop offset="100%" stopColor="#ec4899" />
      </linearGradient>
    </defs>
    {/* Background circle */}
    <circle cx="100" cy="100" r="95" fill="#faf5ff" />
    
    {/* Warehouse building */}
    <rect x="40" y="80" width="120" height="80" fill="url(#ownerGradient)" rx="5" />
    <rect x="45" y="85" width="110" height="70" fill="#faf5ff" rx="3" />
    
    {/* Doors */}
    <rect x="60" y="110" width="30" height="40" fill="#a855f7" rx="2" />
    <rect x="110" y="110" width="30" height="40" fill="#a855f7" rx="2" />
    
    {/* Door handles */}
    <circle cx="85" cy="130" r="3" fill="#faf5ff" />
    <circle cx="115" cy="130" r="3" fill="#faf5ff" />
    
    {/* Roof */}
    <path d="M30 80 L100 40 L170 80 Z" fill="#a855f7" />
    
    {/* Snowflakes (cold indication) */}
    <g fill="#a855f7" opacity="0.6">
      <circle cx="50" cy="60" r="3" />
      <circle cx="150" cy="60" r="3" />
      <circle cx="100" cy="50" r="3" />
      <circle cx="70" cy="55" r="2" />
      <circle cx="130" cy="55" r="2" />
    </g>
    
    {/* Temperature gauge */}
    <circle cx="160" cy="150" r="20" fill="#faf5ff" stroke="#a855f7" strokeWidth="2" />
    <path d="M160 135 L160 145" stroke="#a855f7" strokeWidth="2" />
    <path d="M160 155 L160 165" stroke="#a855f7" strokeWidth="2" />
    <path d="M150 150 L160 150" stroke="#a855f7" strokeWidth="2" />
    <circle cx="160" cy="150" r="5" fill="#a855f7" />
    
    {/* Gear icon */}
    <g fill="none" stroke="#a855f7" strokeWidth="2">
      <circle cx="40" cy="150" r="12" />
      <circle cx="40" cy="150" r="5" />
      <line x1="40" y1="135" x2="40" y2="138" />
      <line x1="40" y1="162" x2="40" y2="165" />
      <line x1="25" y1="150" x2="28" y2="150" />
      <line x1="52" y1="150" x2="55" y2="150" />
    </g>
  </svg>
);

const StakeholderIllustration: React.FC = () => (
  <svg viewBox="0 0 200 200" className="w-full h-full">
    <defs>
      <linearGradient id="stakeholderGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#3b82f6" />
        <stop offset="100%" stopColor="#6366f1" />
      </linearGradient>
    </defs>
    {/* Background circle */}
    <circle cx="100" cy="100" r="95" fill="#eff6ff" />
    
    {/* Chart/graph */}
    <rect x="30" y="60" width="140" height="90" fill="#eff6ff" stroke="#3b82f6" strokeWidth="2" rx="5" />
    
    {/* Bar chart */}
    <rect x="45" y="100" width="20" height="40" fill="#3b82f6" rx="2" />
    <rect x="75" y="80" width="20" height="60" fill="#6366f1" rx="2" />
    <rect x="105" y="90" width="20" height="50" fill="#3b82f6" rx="2" />
    <rect x="135" y="70" width="20" height="70" fill="#6366f1" rx="2" />
    
    {/* Rupee symbol */}
    <circle cx="100" cy="35" r="18" fill="url(#stakeholderGradient)" />
    <text x="100" y="42" textAnchor="middle" fill="white" fontSize="20" fontWeight="bold">₹</text>
    
    {/* Trend line */}
    <polyline points="45,120 75,90 105,100 135,65" fill="none" stroke="#22c55e" strokeWidth="3" />
    <circle cx="135" cy="65" r="4" fill="#22c55e" />
    
    {/* Investment bag */}
    <g fill="url(#stakeholderGradient)">
      <path d="M150 140 Q150 120 160 115 Q170 120 170 140 L170 160 L150 160 Z" />
      <rect x="145" y="115" width="30" height="8" rx="2" />
    </g>
    
    {/* Dollar/coins */}
    <circle cx="30" cy="160" r="12" fill="#fbbf24" />
    <text x="30" y="165" textAnchor="middle" fill="#92400e" fontSize="12" fontWeight="bold">$</text>
  </svg>
);

const RoleSelection: React.FC = () => {
  const navigate = useNavigate();
  const { setSelectedRole, setUser, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const roles = [
    {
      id: 'farmer',
      name: 'Farmer',
      description: 'Manage inventory, track produce, and monitor storage conditions',
      illustration: <FarmerIllustration />,
      color: 'from-green-500 to-emerald-600',
      accent: 'green',
    },
    {
      id: 'owner',
      name: 'Owner',
      description: 'Full system access, manage users, and configure settings',
      illustration: <OwnerIllustration />,
      color: 'from-purple-500 to-pink-600',
      accent: 'purple',
    },
    {
      id: 'stakeholder',
      name: 'Stakeholder',
      description: 'View reports, analytics, and business insights',
      illustration: <StakeholderIllustration />,
      color: 'from-blue-500 to-indigo-600',
      accent: 'blue',
    },
  ];

  const handleRoleSelect = (roleId: 'farmer' | 'owner' | 'stakeholder') => {
    setSelectedRole(roleId);
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-400 via-blue-400 to-purple-400 p-4">
      <div className="w-full max-w-5xl">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
            <span className="text-4xl font-bold bg-gradient-to-r from-green-500 to-blue-500 bg-clip-text text-transparent">C</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-3">Select Your Role</h1>
          <p className="text-white/90 text-lg">Choose your role to customize your experience</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {roles.map((role) => (
            <Card
              key={role.id}
              variant="default"
              className="cursor-pointer hover:shadow-2xl transition-all duration-300 hover:scale-105 border-2 border-transparent hover:border-white/30"
              onClick={() => handleRoleSelect(role.id as any)}
            >
              <CardContent className="p-8">
                <div className="w-32 h-32 mx-auto mb-6">
                  {role.illustration}
                </div>
                <h3 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 text-center mb-3">
                  {role.name}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 text-center leading-relaxed">
                  {role.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RoleSelection;
