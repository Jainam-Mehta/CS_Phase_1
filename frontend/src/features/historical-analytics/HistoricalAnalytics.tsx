import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { TrendingUp, TrendingDown, Activity, Calendar } from 'lucide-react';

const HistoricalAnalytics: React.FC = () => {
  const analytics = [
    { metric: 'Temperature Stability', current: 94.5, previous: 91.2, change: 3.3, trend: 'up', unit: '%' },
    { metric: 'Energy Efficiency', current: 89.8, previous: 87.5, change: 2.3, trend: 'up', unit: '%' },
    { metric: 'Inventory Turnover', current: 4.2, previous: 3.8, change: 0.4, trend: 'up', unit: 'x' },
    { metric: 'Alert Response Time', current: 12.5, previous: 15.2, change: -2.7, trend: 'down', unit: 'min' },
    { metric: 'Capacity Utilization', current: 82.3, previous: 78.9, change: 3.4, trend: 'up', unit: '%' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Historical Analytics
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Analyze historical data and trends
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card variant="default">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Data Points</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">12.5K</p>
              </div>
              <Activity className="h-8 w-8 text-primary-500" />
            </div>
          </CardContent>
        </Card>
        <Card variant="default">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Time Range</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">6 months</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card variant="default">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Improvements</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">8</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card variant="default">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Declines</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">2</p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Table */}
      <Card variant="default">
        <CardHeader>
          <CardTitle>Key Performance Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-slate-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Metric</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Current</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Previous</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Change</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Trend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                {analytics.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-slate-800/50">
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100">{item.metric}</td>
                    <td className="px-6 py-4 text-gray-900 dark:text-gray-100">{item.current} {item.unit}</td>
                    <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{item.previous} {item.unit}</td>
                    <td className={`px-6 py-4 font-medium ${item.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {item.change >= 0 ? '+' : ''}{item.change} {item.unit}
                    </td>
                    <td className="px-6 py-4">
                      {item.trend === 'up' ? (
                        <span className="flex items-center gap-1 text-green-600">
                          <TrendingUp className="h-4 w-4" /> Improving
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-red-600">
                          <TrendingDown className="h-4 w-4" /> Declining
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default HistoricalAnalytics;
