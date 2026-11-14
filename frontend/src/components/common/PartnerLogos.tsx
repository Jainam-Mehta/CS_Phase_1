import React from 'react';

interface PartnerLogosProps {
  className?: string;
  theme?: 'dark' | 'light' | 'adaptive';
  prominent?: boolean;
}

export const PartnerLogos: React.FC<PartnerLogosProps> = ({
  className = '',
  theme = 'light',
}) => {
  const isDark = theme === 'dark';
  const textColor = isDark ? 'text-white' : 'text-black dark:text-white';
  const dividerColor = isDark ? 'bg-slate-700' : 'bg-gray-200 dark:bg-slate-700';

  return (
    <div
      className={`inline-flex items-center gap-2 sm:gap-3.5 my-auto ${className}`}
      title="Strategic Technology Partners: CoolCrop & GIZ"
    >
      {/* 1. CoolCrop Logo */}
      <div className="flex items-center justify-center flex-shrink-0 group">
        <img
          src="/coolcrop-logo.png"
          alt="CoolCrop"
          className="h-6 sm:h-8 md:h-9 w-auto object-contain transition-transform duration-200 group-hover:scale-105"
        />
      </div>

      {/* Divider */}
      <span className={`h-5 sm:h-6 w-px ${dividerColor} select-none`} />

      {/* 2. GIZ Logo */}
      <div className="flex items-center justify-center flex-shrink-0 group">
        <img
          src="/giz-logo.png"
          alt="GIZ - Deutsche Gesellschaft für Internationale Zusammenarbeit"
          className="h-5 sm:h-7 md:h-7.5 w-auto object-contain transition-transform duration-200 group-hover:scale-105"
        />
      </div>

      {/* Divider */}
      <span className={`hidden sm:inline-block h-5 sm:h-6 w-px ${dividerColor} select-none`} />

      {/* 3. PARTNERS in Black Color */}
      <div className="hidden sm:flex items-center flex-shrink-0">
        <span className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider ${textColor} select-none`}>
          PARTNERS
        </span>
      </div>
    </div>
  );
};

export default PartnerLogos;
