/**
 * DoorStatusCard Component
 * Compact door status card for dashboard KPI row
 */

import { Card, CardHeader, CardTitle, CardContent } from './Card';
import { LoadingSkeleton } from './LoadingSkeleton';
import { DoorOpen } from 'lucide-react';

interface DoorStatusCardProps {
  doorNumber: 1 | 2;
  status: 'Open' | 'Closed';
  opensToday: number;
  durationToday: number;
  loading?: boolean;
}

export default function DoorStatusCard({
  doorNumber,
  status,
  opensToday,
  durationToday,
  loading = false,
}: DoorStatusCardProps) {
  const isOpen = status === 'Open';
  
  return (
    <Card variant="default">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-medium text-gray-500 dark:text-gray-400">
            Door {doorNumber}
          </CardTitle>
          <div className={`h-5 w-5 rounded-lg ${isOpen ? 'bg-red-100 dark:bg-red-900/30' : 'bg-green-100 dark:bg-green-900/30'} flex items-center justify-center`}>
            <DoorOpen className={`h-3 w-3 ${isOpen ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`} />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <LoadingSkeleton className="h-6 w-16 mb-1" />
        ) : (
          <div className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">
            {status}
          </div>
        )}
        <div className="space-y-1">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            <span className="text-gray-600 dark:text-gray-400">Opens: {opensToday}</span>
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            <span className="text-gray-600 dark:text-gray-400">Duration: {durationToday.toFixed(1)} min</span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}