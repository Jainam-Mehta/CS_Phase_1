import React from 'react';
import { cn } from '../../lib/utils';

export interface LoadingSkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  count?: number;
}

const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  className,
  variant = 'rectangular',
  width,
  height,
  count = 1,
}) => {
  const baseClasses = 'shimmer rounded-md';

  const variantClasses = {
    text: 'h-4 w-full',
    circular: 'rounded-full',
    rectangular: 'rounded-md',
  };

  const renderPlaceholder = () => (
    <div
      className={cn(baseClasses, variantClasses[variant], className)}
      style={{ width, height }}
    />
  );

  if (count > 1) {
    return (
      <div className="space-y-2">
        {Array.from({ length: count }).map((_, index) => (
          <div key={index} style={{ width: index === count - 1 ? '60%' : '100%' }}>
            {renderPlaceholder()}
          </div>
        ))}
      </div>
    );
  }

  return renderPlaceholder();
};

export const CardSkeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('space-y-4 p-6', className)}>
    <LoadingSkeleton variant="rectangular" height={40} width="60%" />
    <LoadingSkeleton variant="rectangular" height={100} />
    <div className="flex gap-2">
      <LoadingSkeleton variant="rectangular" height={32} width={80} />
      <LoadingSkeleton variant="rectangular" height={32} width={80} />
    </div>
  </div>
);

export const TableSkeleton: React.FC<{ rows?: number; columns?: number }> = ({
  rows = 5,
  columns = 4,
}) => (
  <div className="space-y-3">
    <div className="flex gap-4 p-4">
      {Array.from({ length: columns }).map((_, index) => (
        <LoadingSkeleton key={index} variant="text" width="20%" />
      ))}
    </div>
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div key={rowIndex} className="flex gap-4 p-4 border-b border-gray-200 dark:border-slate-800">
        {Array.from({ length: columns }).map((_, colIndex) => (
          <LoadingSkeleton key={colIndex} variant="text" width="20%" />
        ))}
      </div>
    ))}
  </div>
);

export { LoadingSkeleton };
