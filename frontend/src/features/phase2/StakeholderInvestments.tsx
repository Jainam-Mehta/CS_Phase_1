/**
 * Phase 2.6: Stakeholder Investments Component
 * Track stakeholder investments and ROI
 */

import React, { useState, useEffect } from 'react';
import { AlertCircle, Loader, TrendingUp, DollarSign, Plus } from 'lucide-react';

interface Investment {
  investment_id: string;
  site_id: string;
  amount: number;
  status: string;
  investment_date: string;
  roi_percentage?: number;
  expected_return?: string;
}

interface StakeholderInvestmentsProps {
  stakeholderId: string;
}

const StakeholderInvestments: React.FC<StakeholderInvestmentsProps> = ({ stakeholderId }) => {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [totalInvested, setTotalInvested] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewInvestmentForm, setShowNewInvestmentForm] = useState(false);

  useEffect(() => {
    fetchInvestments();
  }, [stakeholderId]);

  const fetchInvestments = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `http://localhost:8000/api/v2/stakeholder/investments/${stakeholderId}`
      );

      if (!response.ok) throw new Error('Failed to fetch investments');

      const data = await response.json();
      setInvestments(data.investments || []);
      setTotalInvested(data.total_invested || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load investments');
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
          <p className="text-gray-600">Loading investments...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
        <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
        <div>
          <h3 className="font-semibold text-red-900">Error Loading Investments</h3>
          <p className="text-sm text-red-700 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Investments</h1>
          <p className="text-gray-600 mt-1">Track all your cold chain investments</p>
        </div>
        <button
          onClick={() => setShowNewInvestmentForm(!showNewInvestmentForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors"
        >
          <Plus size={18} />
          New Investment
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Invested */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-700">Total Invested</span>
            <DollarSign size={20} className="text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-blue-700">{formatCurrency(totalInvested)}</p>
          <p className="text-xs text-blue-600 mt-1">Across {investments.length} investment(s)</p>
        </div>

        {/* Active Investments */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg border border-green-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-green-700">Active</span>
            <TrendingUp size={20} className="text-green-600" />
          </div>
          <p className="text-3xl font-bold text-green-700">
            {investments.filter(inv => inv.status === 'approved').length}
          </p>
          <p className="text-xs text-green-600 mt-1">Currently earning returns</p>
        </div>

        {/* Pending Approvals */}
        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-6 rounded-lg border border-yellow-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-yellow-700">Pending</span>
            <TrendingUp size={20} className="text-yellow-600" />
          </div>
          <p className="text-3xl font-bold text-yellow-700">
            {investments.filter(inv => inv.status === 'pending').length}
          </p>
          <p className="text-xs text-yellow-600 mt-1">Awaiting owner approval</p>
        </div>
      </div>

      {/* New Investment Form */}
      {showNewInvestmentForm && (
        <div className="bg-white p-6 rounded-lg border border-gray-200 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Create New Investment</h2>
          <p className="text-sm text-gray-600">Coming soon - investment request form</p>
        </div>
      )}

      {/* Investments List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Investment Portfolio</h2>
        </div>

        {investments.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">No investments yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Investment ID
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Site
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Date
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">
                    ROI %
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {investments.map((inv, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-gray-900">
                        {inv.investment_id.slice(0, 8)}...
                      </p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {inv.site_id.slice(0, 8)}...
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-green-600">
                      {formatCurrency(inv.amount)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          inv.status === 'approved'
                            ? 'bg-green-100 text-green-800'
                            : inv.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(inv.investment_date).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="text-sm font-medium text-blue-600">
                        {inv.roi_percentage ? `${inv.roi_percentage}%` : '-'}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Expected Returns */}
      {investments.filter(inv => inv.status === 'approved').length > 0 && (
        <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg border border-green-200">
          <h3 className="font-semibold text-green-900 mb-2">Expected Returns</h3>
          <p className="text-sm text-green-700">
            Your approved investments are generating daily returns based on storage revenue at the facilities.
            Returns will be calculated and disbursed monthly.
          </p>
        </div>
      )}
    </div>
  );
};

export default StakeholderInvestments;
