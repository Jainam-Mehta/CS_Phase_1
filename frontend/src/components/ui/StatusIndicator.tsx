import React from 'react';
import { cn } from '../../lib/utils';

export interface StatusIndicatorProps {
  status: 'online' | 'offline' | 'warning' | 'error' | 'success';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  label?: string;
  className?: string;
}

const statusConfig = {
  online: {
    color: 'bg-success-500',
    label: 'Online',
  },
  offline: {
    color: 'bg-gray-400',
    label: 'Offline',
  },
  warning: {
    color: 'bg-warning-500',
    label: 'Warning',
  },
  error: {
    color: 'bg-error-500',
    label: 'Error',
  },
  success: {
    color: 'bg-success-500',
    label: 'Success',
  },
};

const sizeConfig = {
  sm: 'h-2 w-2',
  md: 'h-3 w-3',
  lg: 'h-4 w-4',
};

const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  size = 'md',
  showLabel = false,
  label,
  className,
}) => {
  const config = statusConfig[status];
  const sizeClass = sizeConfig[size];

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span className={cn('relative flex rounded-full', sizeClass)}>
        <span
          className={cn(
            'absolute inline-flex h-full w-full animate-ping rounded-full opacity-75',
            config.color
          )}
        />
        <span
          className={cn(
            'relative inline-flex rounded-full',
            sizeClass,
            config.color
          )}
        />
      </span>
      {showLabel && (
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label || config.label}
        </span>
      )}
    </div>
  );
};

export { StatusIndicator };
