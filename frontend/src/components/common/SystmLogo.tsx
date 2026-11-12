import React from 'react';

interface SystmLogoProps {
  variant?: 'header' | 'prominent-header' | 'hero' | 'sidebar' | 'icon-only';
  collapsed?: boolean;
  className?: string;
  showCompanyLogo?: boolean;
  iconSize?: number;
}

export const SystmIcon: React.FC<{ size?: number; className?: string }> = ({ size = 36, className = '' }) => {
  return (
    <div
      style={{ width: size, height: size }}
      className={`relative inline-flex items-center justify-center flex-shrink-0 group ${className}`}
    >
      <img
        src="/systm-logo-mark.png"
        alt="SystmII Logo"
        className="w-full h-full object-contain filter drop-shadow-[0_1px_1px_rgba(0,0,0,0.06)] dark:brightness-200 dark:invert transition-transform duration-200 group-hover:scale-105"
      />
    </div>
  );
};

export const SystmLogo: React.FC<SystmLogoProps> = ({
  variant = 'header',
  collapsed = false,
  className = '',
  showCompanyLogo = true,
  iconSize,
}) => {
  if (variant === 'icon-only' || (variant === 'sidebar' && collapsed)) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <SystmIcon size={iconSize || 36} />
      </div>
    );
  }

  // PROMINENT HEADER variant: Perfectly aligned logo, title, and enlarged 1ACCORD partner mark
  if (variant === 'prominent-header') {
    return (
      <div className={`flex items-center gap-3.5 my-auto ${className}`}>
        <SystmIcon size={iconSize || 42} className="hover:scale-105 transition-transform duration-200" />

        <div className="flex items-center gap-3">
          <span className="font-extrabold text-2xl sm:text-[26px] tracking-tight text-gray-900 dark:text-white leading-none select-none">
            SystmII
          </span>

          {showCompanyLogo && (
            <span className="inline-flex items-center pl-3 border-l-2 border-gray-200 dark:border-slate-700">
              <img
                src="/company-logo.png"
                alt="1ACCORD"
                className="h-8 sm:h-9 w-auto object-contain"
              />
            </span>
          )}
        </div>
      </div>
    );
  }

  if (variant === 'hero') {
    return (
      <div className={`flex flex-col items-center text-center ${className}`}>
        <div className="relative mb-3">
          <SystmIcon size={iconSize || 76} className="relative shadow-sm" />
        </div>
        <div className="flex items-center justify-center gap-2">
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-gray-900 dark:text-white">
            SystmII
          </h1>
        </div>
        {showCompanyLogo && (
          <div className="mt-3.5 flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-white/90 dark:bg-[#1A2A3A]/90 backdrop-blur-md border border-gray-200 dark:border-slate-700 shadow-sm">
            <span className="text-xs font-medium text-gray-600 dark:text-slate-300">Powered by</span>
            <img
              src="/company-logo.png"
              alt="1ACCORD"
              className="h-6 w-auto object-contain"
            />
          </div>
        )}
      </div>
    );
  }

  // Standard Header / Topbar / Sidebar expanded
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <SystmIcon size={iconSize || 32} />
      <div className="flex items-center gap-2.5">
        <span className="font-extrabold text-xl tracking-tight text-gray-900 dark:text-white leading-none">
          SystmII
        </span>
        {showCompanyLogo && (
          <span className="inline-flex items-center pl-2.5 border-l border-gray-200 dark:border-slate-700">
            <img
              src="/company-logo.png"
              alt="1ACCORD"
              className="h-6 w-auto object-contain"
            />
          </span>
        )}
      </div>
    </div>
  );
};

export default SystmLogo;
