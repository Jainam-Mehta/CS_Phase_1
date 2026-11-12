import React from 'react';

interface PartnerLogosProps {
  className?: string;
  theme?: 'dark' | 'light' | 'adaptive';
  prominent?: boolean;
}

export const PartnerLogos: React.FC<PartnerLogosProps> = ({
  className = '',
  theme = 'adaptive',
  prominent = false,
}) => {
  if (prominent) {
    return (
      <div
        className={`inline-flex items-center gap-3 px-3.5 sm:px-4 py-1.5 rounded-xl border border-[#2E4154] bg-[#121E2C]/80 backdrop-blur-md shadow-md text-white ${className}`}
        title="Strategic Technology Partners: CoolCrop & GIZ"
      >
        {/* CoolCrop Slot */}
        <div className="flex items-center gap-1.5 group cursor-default">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/60 animate-pulse" />
          <span className="font-semibold text-xs sm:text-sm tracking-wide text-white drop-shadow">
            CoolCrop
          </span>
        </div>

        {/* Divider */}
        <span className="text-[#3E5266] font-light text-sm select-none">|</span>

        {/* GIZ Slot */}
        <div className="flex items-center gap-1.5 group cursor-default">
          <span className="flex h-2 w-2 rounded-full bg-sky-400 shadow-sm shadow-sky-400/60" />
          <span className="font-semibold text-xs sm:text-sm tracking-wide text-white drop-shadow">
            GIZ
          </span>
        </div>

        {/* Divider */}
        <span className="text-[#3E5266] font-light text-sm select-none">|</span>

        {/* Partners Badge */}
        <span className="text-[10px] uppercase tracking-wider font-bold text-sky-400 px-1.5 py-0.5 rounded bg-sky-500/10 border border-sky-400/30">
          PARTNERS
        </span>
      </div>
    );
  }

  const containerClasses =
    theme === 'dark'
      ? 'bg-slate-900/80 border-slate-700/80 text-slate-100'
      : theme === 'light'
      ? 'bg-white/80 border-gray-200 text-gray-700'
      : 'bg-white/70 dark:bg-slate-900/80 border-gray-200 dark:border-slate-800 text-gray-700 dark:text-slate-200';

  return (
    <div
      className={`inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl border backdrop-blur-md shadow-sm transition-all hover:border-sky-500/40 ${containerClasses} ${className}`}
      title="Strategic Technology Partners: CoolCrop & GIZ"
    >
      {/* CoolCrop Slot */}
      <div className="flex items-center gap-1.5 group">
        <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="font-semibold text-xs tracking-wide">CoolCrop</span>
      </div>

      {/* Divider */}
      <span className="text-gray-300 dark:text-slate-600 font-light text-sm select-none">|</span>

      {/* GIZ Slot */}
      <div className="flex items-center gap-1.5 group">
        <span className="flex h-2 w-2 rounded-full bg-sky-500" />
        <span className="font-semibold text-xs tracking-wide">GIZ</span>
      </div>

      {/* Divider */}
      <span className="text-gray-300 dark:text-slate-600 font-light text-sm select-none">|</span>

      {/* Indicator tag */}
      <span className="text-[10px] uppercase tracking-wider font-bold text-sky-500 dark:text-sky-400">
        PARTNERS
      </span>
    </div>
  );
};

export default PartnerLogos;
