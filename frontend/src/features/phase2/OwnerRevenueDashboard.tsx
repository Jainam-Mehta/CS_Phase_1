/**
 * Phase 2.5: Owner Revenue Dashboard
 * Shows total revenue from all rooms and farmers
 * Breakdown by room with active farmers count
 */

import React, { useState, useEffect } from 'react';
import { AlertCircle, Loader, DollarSign, Users, Building2 } from 'lucide-react';

interface RoomRevenue {
  room_id: string;
  daily_revenue: number;
  cumulative_revenue: number;
  active_farmers: number;
}

interface RevenueSummary {
  owner_id: string;
  total_daily_revenue: number;
  total_cumulative_revenue: number;
  active_rooms: number;
  by_room: RoomRevenue[];
}

interface OwnerRevenueDashboardProps {
  ownerId: string;
}

const OwnerRevenueDashboard: React.FC<OwnerRevenueDashboardProps> = ({ ownerId }) => {
  const [revenue, setRevenue] = useState<RevenueSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchRevenueSummary();
  }, [ownerId]);

  const fetchRevenueSummary = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `http://localhost:8000/api/v2/owner/revenue/summary/${ownerId}`
      );

      if (!response.ok) throw new Error('Failed to fetch revenue summary');

      const data = await response.json();
      setRevenue(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load revenue data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchRevenueSummary();
    setRefreshing(false);
  };

  const formatCurrency = (value: number) => `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

  if (loading) {
    return (
      <div className="p-6 bg-white rounded-lg border border-gray-200 flex items-center justify-center h-96">
        <div className="text-center">
          <Loader className="mx-auto animate-spin text-blue-600 mb-2" size={32} />
          <p className="text-gray-600">Loading revenue data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
        <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
        <div>
          <h3 className="font-semibold text-red-900">Error Loading Revenue</h3>
          <p className="text-sm text-red-700 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (!revenue) {
    return (
      <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
        <p className="text-gray-600">No revenue data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Revenue Dashboard</h1>
          <p className="text-gray-600 mt-1">Track income from all storage rooms</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
        >
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Daily Revenue */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg border border-green-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-green-700">Today's Revenue</span>
            <DollarSign size={20} className="text-green-600" />
          </div>
          <p className="text-3xl font-bold text-green-700">
            {formatCurrency(revenue.total_daily_revenue)}
          </p>
          <p className="text-xs text-green-600 mt-1">
            From {revenue.by_room.filter(r => r.daily_revenue > 0).length} active room(s)
          </p>
        </div>

        {/* Total Revenue */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-700">Total Revenue</span>
            <DollarSign size={20} className="text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-blue-700">
            {formatCurrency(revenue.total_cumulative_revenue)}
          </p>
          <p className="text-xs text-blue-600 mt-1">Cumulative</p>
        </div>

        {/* Active Rooms */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg border border-purple-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-purple-700">Active Rooms</span>
            <Building2 size={20} className="text-purple-600" />
          </div>
          <p className="text-3xl font-bold text-purple-700">{revenue.active_rooms}</p>
          <p className="text-xs text-purple-600 mt-1">
            {revenue.by_room.reduce((sum, r) => sum + r.active_farmers, 0)} farmer(s)
          </p>
        </div>
      </div>

      {/* Rooms Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Revenue by Room</h2>
        </div>

        {revenue.by_room.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">No revenue data available for any rooms</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Room
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">
                    Daily Revenue
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">
                    Total Revenue
                  </th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">
                    Active Farmers
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {revenue.by_room.map((room, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <p className="font-semibold text-gray-900">
                          {room.room_id.slice(0, 8)}...
                        </p>
                        <p className="text-xs text-gray-500">ID: {room.room_id}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="font-semibold text-green-600">
                        {formatCurrency(room.daily_revenue)}
                      </p>
                      {room.daily_revenue === 0 && (
                        <p className="text-xs text-gray-500">No activity</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="font-semibold text-blue-600">
                        {formatCurrency(room.cumulative_revenue)}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                          room.active_farmers > 0
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        <Users size={14} />
                        {room.active_farmers}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Summary Row */}
        {revenue.by_room.length > 0 && (
          <div className="bg-gray-50 p-6 border-t space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="font-semibold text-gray-900">Total Daily Revenue:</span>
              <span className="font-bold text-green-600 text-lg">
                {formatCurrency(revenue.total_daily_revenue)}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="font-semibold text-gray-900">Total Cumulative Revenue:</span>
              <span className="font-bold text-blue-600 text-lg">
                {formatCurrency(revenue.total_cumulative_revenue)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-900">
          <span className="font-semibold">Note:</span> Revenue is calculated based on daily storage
          costs from active farmers. Daily revenue shows today's earnings, while total revenue
          represents cumulative earnings from all farmers across all rooms.
        </p>
      </div>
    </div>
  );
};

export default OwnerRevenueDashboard;
