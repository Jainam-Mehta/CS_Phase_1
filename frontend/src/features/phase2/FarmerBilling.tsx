/**
 * Phase 2.4: Farmer Billing Component
 * Shows daily storage costs with cumulative pattern
 * Example: Day 1: ₹0, Day 2: ₹5.6, Day 3: ₹11.2
 */

import React, { useState, useEffect } from 'react';
import { AlertCircle, Loader, TrendingUp, IndianRupee } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface BillingRecord {
  date: string;
  daily_cost: number;
  cumulative_cost: number;
  daily_crate_count: number;
  payment_status: string;
}

interface FarmerBillingProps {
  farmerId: string;
}

const FarmerBilling: React.FC<FarmerBillingProps> = ({ farmerId }) => {
  const [billingHistory, setBillingHistory] = useState<BillingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentCumulative, setCurrentCumulative] = useState(0);

  useEffect(() => {
    fetchBillingData();
  }, [farmerId]);

  const fetchBillingData = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `http://localhost:8000/api/v2/farmer/billing/${farmerId}`
      );

      if (!response.ok) throw new Error('Failed to fetch billing data');

      const data = await response.json();
      setBillingHistory(data.billing_history || []);
      setCurrentCumulative(data.current_cumulative || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load billing data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => `₹${value.toFixed(2)}`;

  const chartData = billingHistory.map(record => ({
    date: new Date(record.date).toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric'
    }),
    'Daily Cost': parseFloat(record.daily_cost.toFixed(2)),
    'Cumulative Cost': parseFloat(record.cumulative_cost.toFixed(2))
  }));

  if (loading) {
    return (
      <div className="p-6 bg-white rounded-lg border border-gray-200 flex items-center justify-center h-96">
        <div className="text-center">
          <Loader className="mx-auto animate-spin text-blue-600 mb-2" size={32} />
          <p className="text-gray-600">Loading billing data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
        <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
        <div>
          <h3 className="font-semibold text-red-900">Error Loading Billing</h3>
          <p className="text-sm text-red-700 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h1 className="text-2xl font-bold text-gray-900">Storage Billing</h1>
        <p className="text-gray-600 mt-1">Daily and cumulative storage costs</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Owed */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600">Total Owed</span>
            <IndianRupee size={20} className="text-gray-400" />
          </div>
          <p className="text-3xl font-bold text-red-600">
            {formatCurrency(currentCumulative)}
          </p>
          <p className="text-xs text-gray-500">As of today</p>
        </div>

        {/* Average Daily Cost */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600">Average Daily</span>
            <TrendingUp size={20} className="text-gray-400" />
          </div>
          {billingHistory.length > 0 ? (
            <>
              <p className="text-3xl font-bold text-blue-600">
                {formatCurrency(
                  billingHistory.reduce((sum, r) => sum + r.daily_cost, 0) /
                    billingHistory.length
                )}
              </p>
              <p className="text-xs text-gray-500">
                Over {billingHistory.length} days
              </p>
            </>
          ) : (
            <p className="text-2xl font-bold text-gray-400">₹0.00</p>
          )}
        </div>

        {/* Records Count */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 space-y-2">
          <span className="text-sm font-medium text-gray-600">Billing Records</span>
          <p className="text-3xl font-bold text-green-600">{billingHistory.length}</p>
          <p className="text-xs text-gray-500">Days stored</p>
        </div>
      </div>

      {/* Chart */}
      {billingHistory.length > 0 && (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Cost Trend
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
                stroke="#6b7280"
                style={{ fontSize: '12px' }}
              />
              <YAxis
                stroke="#6b7280"
                style={{ fontSize: '12px' }}
                tickFormatter={(value) => `₹${value}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}
                formatter={(value: any) => formatCurrency(value as number)}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="Daily Cost"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="Cumulative Cost"
                stroke="#ef4444"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Billing History Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            Billing History
          </h2>
        </div>

        {billingHistory.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">No billing records yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Crates
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">
                    Daily Cost
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">
                    Cumulative
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {billingHistory.map((record, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {new Date(record.date).toLocaleDateString('en-IN', {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {record.daily_crate_count}
                    </td>
                    <td className="px-6 py-4 text-sm text-right font-medium text-blue-600">
                      {formatCurrency(record.daily_cost)}
                    </td>
                    <td className="px-6 py-4 text-sm text-right font-semibold text-red-600">
                      {formatCurrency(record.cumulative_cost)}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          record.payment_status === 'paid'
                            ? 'bg-green-100 text-green-800'
                            : record.payment_status === 'partial'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {record.payment_status.charAt(0).toUpperCase() +
                          record.payment_status.slice(1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Note */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-900">
          <span className="font-semibold">Note:</span> Billing is calculated daily based on the
          number of crates stored and the agreed rate per crate. The cumulative cost represents
          your total outstanding amount.
        </p>
      </div>
    </div>
  );
};

export default FarmerBilling;
