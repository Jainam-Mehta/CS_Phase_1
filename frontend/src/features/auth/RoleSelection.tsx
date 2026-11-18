import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';
import { SystmLogo, SystmIcon } from '../../components/common/SystmLogo';
import { PartnerLogos } from '../../components/common/PartnerLogos';
import { Sprout, Building2, TrendingUp } from 'lucide-react';

const RoleSelection: React.FC = () => {
  const navigate = useNavigate();
  const { setSelectedRole, isAuthenticated } = useAuthStore();
  const [activeRole, setActiveRole] = useState<'farmer' | 'owner' | 'stakeholder'>('owner');

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const roles = [
    {
      id: 'farmer' as const,
      name: 'Farmer',
      badge: 'Inventory & Batch Intake',
      description: 'Manage inventory, track fresh produce conditions, request room access, and monitor shelf-life optimization in real-time.',
      icon: Sprout,
      stripeColor: 'bg-[#15803d]',
      iconColor: 'text-[#15803d]',
      iconBg: 'bg-emerald-50',
      badgeColor: 'bg-[#ecfdf5] text-[#15803d] border-[#d1fae5]',
    },
    {
      id: 'owner' as const,
      name: 'Owner',
      badge: 'Facility Command & Control',
      description: 'Complete operational visibility over HVAC, multi-room sensors, capacity metrics, and approval queues.',
      icon: Building2,
      stripeColor: 'bg-[#0284c7]',
      iconColor: 'text-[#0284c7]',
      iconBg: 'bg-sky-50',
      badgeColor: 'bg-[#f0f9ff] text-[#0284c7] border-[#e0f2fe]',
    },
    {
      id: 'stakeholder' as const,
      name: 'Stakeholder',
      badge: 'Capital & ROI Analytics',
      description: 'Macro portfolio monitoring, facility utilization economics, and cold chain return-on-investment insights.',
      icon: TrendingUp,
      stripeColor: 'bg-[#4338ca]',
      iconColor: 'text-[#4338ca]',
      iconBg: 'bg-indigo-50',
      badgeColor: 'bg-[#eef2ff] text-[#4338ca] border-[#e0e7ff]',
    },
  ];

  const handleRoleClick = (roleId: 'farmer' | 'owner' | 'stakeholder') => {
    setActiveRole(roleId);
    setSelectedRole(roleId);
    navigate('/login');
  };

  return (
    <div className="relative min-h-screen md:h-screen md:overflow-hidden flex flex-col justify-between text-gray-900 selection:bg-blue-500 selection:text-white bg-[#f4f5f7]">
      {/* Background Subtle Gradient & Grid */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/70 via-[#f4f5f7] to-[#e9ecf0] pointer-events-none" />
      <div
        className="absolute inset-0 opacity-[0.3] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(#94a3b8 0.75px, transparent 0.75px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* Clean Header Bar */}
      <header className="relative w-full h-[64px] sm:h-[68px] md:h-[76px] px-3 sm:px-6 lg:px-12 flex items-center justify-between z-30 bg-white border-b border-gray-200/80 shadow-sm shrink-0">
        {/* Mobile View: Standard Compact Header */}
        <div className="flex md:hidden items-center justify-between w-full h-full">
          <SystmLogo variant="prominent-header" iconSize={38} showCompanyLogo={true} />
          <PartnerLogos theme="light" prominent={true} />
        </div>

        {/* Desktop View (Role Selection Only): Prominently Scaled Logos (+1.5cm) */}
        <div className="hidden md:flex items-center justify-between w-full h-full">
          {/* Left: Enlarged SystmII + 1ACCORD */}
          <div className="flex items-center gap-4 my-auto">
            <SystmIcon size={48} className="hover:scale-105 transition-transform duration-200" />
            <div className="flex items-center gap-3.5">
              <span className="font-extrabold text-[28px] tracking-tight text-gray-900 leading-none select-none">
                SystmII
              </span>
              <span className="inline-flex items-center pl-3.5 border-l-2 border-gray-200">
                <img
                  src="/company-logo.png"
                  alt="1ACCORD"
                  className="h-11 w-auto object-contain hover:scale-105 transition-transform duration-200"
                />
              </span>
            </div>
          </div>

          {/* Right: Enlarged CoolCrop + GIZ + PARTNERS */}
          <div className="inline-flex items-center gap-4 my-auto" title="Strategic Technology Partners: CoolCrop & GIZ">
            {/* CoolCrop Logo */}
            <div className="flex items-center justify-center flex-shrink-0 group">
              <img
                src="/coolcrop-logo.png"
                alt="CoolCrop"
                className="h-[48px] w-auto object-contain transition-transform duration-200 group-hover:scale-105"
              />
            </div>

            {/* Divider */}
            <span className="h-7 w-px bg-gray-200 select-none" />

            {/* GIZ Logo */}
            <div className="flex items-center justify-center flex-shrink-0 group">
              <img
                src="/giz-logo.png"
                alt="GIZ"
                className="h-[46px] w-auto object-contain transition-transform duration-200 group-hover:scale-105"
              />
            </div>

            {/* Divider */}
            <span className="h-7 w-px bg-gray-200 select-none" />

            {/* PARTNERS in Black */}
            <span className="text-xs font-extrabold uppercase tracking-widest text-black select-none">
              PARTNERS
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative flex-1 flex flex-col items-center justify-evenly px-4 sm:px-6 py-4 md:py-5 z-20 max-w-6xl mx-auto w-full">
        {/* Heading & Subtitle */}
        <div className="text-center mb-3.5 sm:mb-4 max-w-2xl">
          <h1 className="text-2xl sm:text-3xl md:text-[32px] font-extrabold tracking-tight text-gray-900 mb-1 leading-tight">
            Select Your Role
          </h1>
          <p className="text-gray-500 text-xs sm:text-sm font-normal">
            Choose your role to customize your <span className="font-semibold text-gray-800">SystmII</span> cold chain operations platform
          </p>
        </div>

        {/* Three Role Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 w-full max-w-5xl mb-3.5 sm:mb-4">
          {roles.map((role) => {
            const Icon = role.icon;

            return (
              <div
                key={role.id}
                onClick={() => handleRoleClick(role.id)}
                className="group relative rounded-2xl bg-white border border-gray-200/90 shadow-sm hover:shadow-xl hover:-translate-y-1.5 hover:border-gray-300 transition-all duration-200 cursor-pointer overflow-hidden flex flex-col justify-between active:scale-[0.99]"
              >
                {/* Top Role Stripe */}
                <div className={`h-2.5 w-full ${role.stripeColor}`} />

                {/* Card Body */}
                <div className="p-5 sm:p-6 md:p-5 flex flex-col items-center text-center flex-1">
                  {/* Icon */}
                  <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl ${role.iconBg} flex items-center justify-center mb-3 sm:mb-3.5 transition-transform duration-200 group-hover:scale-105`}>
                    <Icon className={`w-8 h-8 ${role.iconColor}`} />
                  </div>

                  {/* Role Title */}
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">
                    {role.name}
                  </h3>

                  {/* Pill Badge */}
                  <span className={`inline-block text-[11px] font-semibold tracking-wide uppercase px-3 py-1 rounded-full border mb-2.5 ${role.badgeColor}`}>
                    {role.badge}
                  </span>

                  {/* Description */}
                  <p className="text-xs sm:text-sm text-gray-500 leading-relaxed font-normal">
                    {role.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Support Link */}
        <div className="flex flex-col items-center">
          <p className="text-xs text-gray-500">
            Need help? Contact support:{' '}
            <a
              href="mailto:contact@1accord.in"
              className="font-semibold text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 underline transition-colors"
            >
              contact@1accord.in
            </a>
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-slate-800 py-2.5 sm:py-3 px-6 text-center text-xs text-gray-500 dark:text-gray-400 mt-auto bg-white dark:bg-slate-900 shrink-0 z-30">
        &copy; 2026 Systm II | Powered by 1Accord Technologies | v1.0
      </footer>
    </div>
  );
};

export default RoleSelection;
