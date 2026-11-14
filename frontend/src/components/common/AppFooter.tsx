import React from 'react';

export const AppFooter: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <footer className={`border-t border-gray-200 dark:border-slate-800 py-4 px-6 text-center text-xs text-gray-500 dark:text-gray-400 mt-12 ${className}`}>
      &copy; 2026 Systm II | Powered by 1Accord Technologies | v1.0
    </footer>
  );
};

export default AppFooter;
