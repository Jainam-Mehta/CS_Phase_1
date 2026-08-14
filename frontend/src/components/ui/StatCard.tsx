/**
 * StatCard Component
 * Reusable statistic card component for displaying key metrics
 */

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './Card';
import { LoadingSkeleton } from './LoadingSkeleton';
import { type LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  iconColor?: 'blue' | 'green' | 'yellow' | 'orange' | 'purple' | 'red' | 'cyan' | 'indigo' | 'rose' | 'amber';
  subtitle?: string;
  subtitleColor?: 'green' | 'orange' | 'red' | 'gray' | 'blue' | 'yellow';
  loading?: boolean;
  size?: 'small' | 'medium' | 'large';
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  iconColor = 'blue',
  subtitle,
  subtitleColor = 'gray',
  loading = false,
  size = 'medium',
}) => {
  const colorMap = {
    blue: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400' },
    green: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-600 dark:text-green-400' },
    yellow: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-600 dark:text-yellow-400' },
    orange: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-600 dark:text-orange-400' },
    purple: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400' },
    red: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-600 dark:text-red-400' },
    cyan: { bg: 'bg-cyan-100 dark:bg-cyan-900/30', text: 'text-cyan-600 dark:text-cyan-400' },
    indigo: { bg: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-indigo-600 dark:text-indigo-400' },
    rose: { bg: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-600 dark:text-rose-400' },
    amber: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400' },
  };

  const subtitleColorMap = {
    green: 'text-green-600 dark:text-green-400',
    orange: 'text-orange-600 dark:text-orange-400',
    red: 'text-red-600 dark:text-red-400',
    gray: 'text-gray-600 dark:text-gray-400',
    blue: 'text-blue-600 dark:text-blue-400',
    yellow: 'text-yellow-600 dark:text-yellow-400',
  };

  const sizeClasses = {
    small: {
      title: 'text-xs',
      value: 'text-xl',
      icon: 'h-6 w-6',
    },
    medium: {
      title: 'text-xs',
      value: 'text-2xl',
      icon: 'h-8 w-8',
    },
    large: {
      title: 'text-sm',
      value: 'text-3xl',
      icon: 'h-10 w-10',
    },
  };

  const colors = colorMap[iconColor];
  const sizeClass = sizeClasses[size];

  return (
    <Card variant="default">
      <CardHeader className="pb-2">
        <CardTitle className={`${sizeClass.title} font-medium text-gray-500 dark:text-gray-400`}>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <LoadingSkeleton className={`h-8 w-16 mb-2`} />
        ) : (
          <div className="flex items-center justify-between">
            <div className={`${sizeClass.value} font-bold text-gray-900 dark:text-gray-100`}>
              {typeof value === 'number' ? value.toFixed(1) : value}
            </div>
            <div className={`${sizeClass.icon} rounded-lg ${colors.bg} flex items-center justify-center flex-shrink-0`}>
              <Icon className={`h-4 w-4 ${colors.text}`} />
            </div>
          </div>
        )}
        {subtitle && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            <span className={subtitleColorMap[subtitleColor]}>{subtitle}</span>
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default StatCard;
