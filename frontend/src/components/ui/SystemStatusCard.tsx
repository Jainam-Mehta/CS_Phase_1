/**
 * SystemStatusCard Component
 * Displays system alerts and overall status
 */

import { Card, CardHeader, CardTitle, CardContent } from './Card';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

interface SystemStatusCardProps {
  alerts?: number;
  systemStatus?: 'operational' | 'warning' | 'critical';
}

export default function SystemStatusCard({
  alerts = 0,
  systemStatus = 'operational',
}: SystemStatusCardProps) {
  const statusConfig = {
    operational: {
      color: 'green',
      text: 'Normal',
      icon: CheckCircle2,
    },
    warning: {
      color: 'yellow',
      text: 'Warning',
      icon: AlertTriangle,
    },
    critical: {
      color: 'red',
      text: 'Critical',
      icon: AlertTriangle,
    },
  };

  const config = statusConfig[systemStatus];
  const StatusIcon = config.icon;

  return (
    <Card variant="default">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-medium text-gray-500 dark:text-gray-400">
            System Status
          </CardTitle>
          <div className={`h-8 w-8 rounded-lg bg-${config.color}-100 dark:bg-${config.color}-900/30 flex items-center justify-center flex-shrink-0`}>
            <StatusIcon className={`h-4 w-4 text-${config.color}-600 dark:text-${config.color}-400`} />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">
          {config.text}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          <span className="text-gray-600 dark:text-gray-400">
            {alerts} active {alerts === 1 ? 'alert' : 'alerts'}
          </span>
        </p>
      </CardContent>
    </Card>
  );
}