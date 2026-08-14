import React from 'react';
import { cn } from '../../lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'bg-gray-100 dark:bg-slate-800 text-gray-900 dark:text-gray-100',
        primary: 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300',
        success: 'bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-300',
        warning: 'bg-warning-100 dark:bg-warning-900/30 text-warning-700 dark:text-warning-300',
        error: 'bg-error-100 dark:bg-error-900/30 text-error-700 dark:text-error-300',
        info: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
        outline: 'border-2 border-gray-300 dark:border-slate-700 text-gray-700 dark:text-gray-300',
      },
      size: {
        sm: 'px-2 py-0.5 text-[10px]',
        md: 'px-2.5 py-0.5 text-xs',
        lg: 'px-3 py-1 text-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(badgeVariants({ variant, size, className }))}
        {...props}
      />
    );
  }
);

Badge.displayName = 'Badge';

export { Badge, badgeVariants };
