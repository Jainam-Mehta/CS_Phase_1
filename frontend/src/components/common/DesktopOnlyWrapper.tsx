import React from 'react';
import { Monitor, Info } from 'lucide-react';

interface DesktopOnlyWrapperProps {
  title?: string;
  description?: string;
  fallbackSummary?: React.ReactNode;
  children: React.ReactNode;
  minBreakpoint?: 'md' | 'lg';
}

export const DesktopOnlyWrapper: React.FC<DesktopOnlyWrapperProps> = ({
  title = 'Complex Diagram',
  description = 'This detailed industrial schematic is optimized for larger desktop and tablet displays.',
  fallbackSummary,
  children,
  minBreakpoint = 'md',
}) => {
  const hiddenOnMobileClass = minBreakpoint === 'lg' ? 'hidden lg:block' : 'hidden md:block';
  const visibleOnMobileClass = minBreakpoint === 'lg' ? 'block lg:hidden' : 'block md:hidden';

  return (
    <>
      {/* ── MOBILE FALLBACK VIEW (< breakpoint) ── */}
      <div className={`${visibleOnMobileClass} space-y-4`}>
        {fallbackSummary}

        <div className="p-4 rounded-xl border border-sky-200 dark:border-sky-900/40 bg-sky-50/80 dark:bg-sky-950/20 text-sky-900 dark:text-sky-200 flex items-start gap-3 shadow-sm">
          <div className="p-2 rounded-lg bg-sky-100 dark:bg-sky-900/50 text-sky-600 dark:text-sky-300 shrink-0 mt-0.5">
            <Monitor className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-sky-950 dark:text-sky-100">{title}</h4>
            <p className="text-xs text-sky-700 dark:text-sky-300 mt-1 leading-relaxed">
              {description} Switch to a desktop view (768px+) for interactive sensor placement, valve animations, and detailed circuit tracing.
            </p>
          </div>
        </div>
      </div>

      {/* ── DESKTOP VIEW (>= breakpoint) ── */}
      <div className={hiddenOnMobileClass}>
        {children}
      </div>
    </>
  );
};

export default DesktopOnlyWrapper;
