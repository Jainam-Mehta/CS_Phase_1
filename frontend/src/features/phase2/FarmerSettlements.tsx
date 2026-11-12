/**
 * Phase 2.8: Farmer Settlements Component
 * Shows settlement history after storage period ends
 */

import React, { useState, useEffect } from 'react';
import { AlertCircle, Loader, CheckCircle, Clock } from 'lucide-react';

interface Settlement {
  settlement_id: string;
  room_id: string;
  period_end: string;
  amount: number;
  cumulative_cost: number;
  status: string;
}

interface FarmerSettlementsProps {
  farmerId: string;
}

const FarmerSettlements: React.FC<FarmerSettlementsProps> = ({ farmerId }) => {
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSettlements();
  }, [farmerId]);

  const fetchSettlements = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `http://localhost:8000/api/v2/farmer/settlements/${farmerId}`
      );

      if (!response.ok) throw new Error('Failed to fetch settlements');

      const data = await response.json();
      setSettlements(data.settlements || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settlements');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

  if (loading) {
    return (
      <div className="p-6 bg-white rounded-lg border border-gray-200 flex items-center justify-center h-96">
        <div className="text-center">
          <Loader className="mx-auto animate-spin text-blue-600 mb-2" size={32} />
          <p className="text-gray-600">Loading settlements...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
        <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
        <div>
          <h3 className="font-semibold text-red-900">Error Loading Settlements</h3>
          <p className="text-sm text-red-700 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  const completedSettlements = settlements.filter(s => s.status === 'Completed');
  const pendingSettlements = settlements.filter(s => s.status === 'Pending');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h1 className="text-2xl font-bold text-gray-900">Storage Settlements</h1>
        <p className="text-gray-600 mt-1">Payment records after storage period ends</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Total Settlements */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-700">Total Settlements</span>
            <CheckCircle size={20} className="text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-blue-700">{settlements.length}</p>
          <p className="text-xs text-blue-600 mt-1">
            {completedSettlements.length} completed, {pendingSettlements.length} pending
          </p>
        </div>

        {/* Total Amount Settled */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg border border-green-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-green-700">Total Amount</span>
            <CheckCircle size={20} className="text-green-600" />
          </div>
          <p className="text-3xl font-bold text-green-700">
            {formatCurrency(settlements.reduce((sum, s) => sum + s.amount, 0))}
          </p>
          <p className="text-xs text-green-600 mt-1">Across all settlements</p>
        </div>
      </div>

      {/* Pending Settlements */}
      {pendingSettlements.length > 0 && (
        <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200">
          <div className="flex items-start gap-3">
            <Clock className="text-yellow-600 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <h3 className="font-semibold text-yellow-900">Pending Settlements</h3>
              <p className="text-sm text-yellow-700 mt-1">
                {pendingSettlements.length} settlement(s) awaiting payment processing
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Settlements Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Settlement History</h2>
        </div>

        {settlements.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">No settlements yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Settlement ID
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Room
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    End Date
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">
                    Daily Cost
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">
                    Cumulative Cost
                  </th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {settlements.map((settlement, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-gray-900">
                        {settlement.settlement_id.slice(0, 8)}...
                      </p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {settlement.room_id.slice(0, 8)}...
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(settlement.period_end).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="text-sm font-medium text-blue-600">
                        {formatCurrency(settlement.amount)}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="text-sm font-bold text-green-600">
                        {formatCurrency(settlement.cumulative_cost)}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          settlement.status === 'Completed'
                            ? 'bg-green-100 text-green-800'
                            : settlement.status === 'Pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {settlement.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Summary */}
        {settlements.length > 0 && (
          <div className="bg-gray-50 p-6 border-t space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="font-semibold text-gray-900">Total Amount:</span>
              <span className="font-bold text-green-600 text-lg">
                {formatCurrency(settlements.reduce((sum, s) => sum + s.amount, 0))}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="font-semibold text-gray-900">Completed:</span>
              <span className="font-semibold text-gray-600">
                {completedSettlements.length} of {settlements.length}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-900">
          <span className="font-semibold">Note:</span> A settlement is created after your storage period
          ends. The amount shown is your total cumulative storage cost. Once the owner processes payment,
          the settlement status changes to Completed.
        </p>
      </div>
    </div>
  );
};

export default FarmerSettlements;
