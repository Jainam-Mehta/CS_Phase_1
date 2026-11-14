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
      <svg
        viewBox="0 0 264 336"
        className="w-full h-full object-contain filter drop-shadow-[0_1px_1px_rgba(0,0,0,0.06)] text-[#2a170f] dark:text-white transition-transform duration-200 group-hover:scale-105"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="SystmII Logo"
      >
        {/* Top Hook */}
        <path d="M 72 0 L 264 0 L 210 72 L 88 72 L 80 80 L 80 220 L 72 228 L 0 156 L 0 72 Z" />
        
        {/* Center Capsule */}
        <rect x="104" y="96" width="56" height="144" rx="16" ry="16" />
        
        {/* Bottom Hook */}
        <path d="M 192 336 L 0 336 L 54 264 L 176 264 L 184 256 L 184 116 L 192 108 L 264 180 L 264 264 Z" />
      </svg>
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
      <div className={`flex items-center gap-2 sm:gap-3.5 my-auto ${className}`}>
        <SystmIcon size={iconSize ? Math.min(iconSize, 30) : 30} className="sm:hidden hover:scale-105 transition-transform duration-200" />
        <SystmIcon size={iconSize || 42} className="hidden sm:inline-flex hover:scale-105 transition-transform duration-200" />

        <div className="flex items-center gap-2 sm:gap-3">
          <span className="font-extrabold text-lg sm:text-[26px] tracking-tight text-gray-900 dark:text-white leading-none select-none">
            SystmII
          </span>

          {showCompanyLogo && (
            <span className="inline-flex items-center pl-2 sm:pl-3 border-l-2 border-gray-200 dark:border-slate-700">
              <img
                src="/company-logo.png"
                alt="1ACCORD"
                className="h-6 sm:h-9 w-auto object-contain"
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
