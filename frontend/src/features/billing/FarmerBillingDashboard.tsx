import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../stores/useAuthStore';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { supabase } from '../../lib/supabase';
import {
  IndianRupee,
  Calendar,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Download,
  AlertCircle,
} from 'lucide-react';

interface DailyStorageCost {
  id: string;
  farmer_id: string;
  room_id: string;
  cost_date: string;
  daily_cost: number;
  cumulative_cost: number;
  quantity_kg_stored: number;
  rate_per_kg: number;
  created_at: string;
}

interface BillingStats {
  totalCosts: number;
  monthlyAverage: number;
  highestDayAmount: number;
  lowestDayAmount: number;
  costTrend: number;
  totalDaysRecorded: number;
}

const FarmerBillingDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const [billingData, setBillingData] = useState<DailyStorageCost[]>([]);
  const [stats, setStats] = useState<BillingStats>({
    totalCosts: 0,
    monthlyAverage: 0,
    highestDayAmount: 0,
    lowestDayAmount: 0,
    costTrend: 0,
    totalDaysRecorded: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7));

  useEffect(() => {
    loadBillingData();
  }, [user?.id, selectedMonth]);

  const loadBillingData = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError('');

      // Fetch all daily storage costs for this farmer
      const { data, error: fetchError } = await supabase
        .from('farmer_daily_storage_costs')
        .select('*')
        .eq('farmer_id', user.id)
        .order('cost_date', { ascending: false });

      if (fetchError) throw fetchError;

      if (!data || data.length === 0) {
        setBillingData([]);
        setStats({
          totalCosts: 0,
          monthlyAverage: 0,
          highestDayAmount: 0,
          lowestDayAmount: 0,
          costTrend: 0,
          totalDaysRecorded: 0,
        });
        return;
      }

      setBillingData(data);

      // Calculate statistics
      const totalCosts = data.reduce((sum, item) => sum + (Number(item.daily_cost) || 0), 0);
      const uniqueDays = new Set(data.map(item => item.cost_date));
      const monthlyData = data.filter(item => item.cost_date.startsWith(selectedMonth));

      const monthlyTotal = monthlyData.reduce((sum, item) => sum + (Number(item.daily_cost) || 0), 0);
      const monthlyAverage = monthlyData.length > 0 ? monthlyTotal / monthlyData.length : 0;

      const dailyCosts = data.map(item => Number(item.daily_cost) || 0);
      const highestDayAmount = Math.max(...dailyCosts);
      const lowestDayAmount = Math.min(...dailyCosts);

      // Calculate cost trend (compare this month to last month)
      const today = new Date();
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
        .toISOString()
        .slice(0, 7);

      const thisMonthData = data.filter(item => item.cost_date.startsWith(selectedMonth));
      const lastMonthData = data.filter(item => item.cost_date.startsWith(lastMonth));

      const thisMonthTotal = thisMonthData.reduce((sum, item) => sum + (Number(item.daily_cost) || 0), 0);
      const lastMonthTotal = lastMonthData.reduce((sum, item) => sum + (Number(item.daily_cost) || 0), 0);

      const costTrend = lastMonthTotal > 0 ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100 : 0;

      setStats({
        totalCosts,
        monthlyAverage: Math.round(monthlyAverage * 100) / 100,
        highestDayAmount: Math.round(highestDayAmount * 100) / 100,
        lowestDayAmount: Math.round(lowestDayAmount * 100) / 100,
        costTrend: Math.round(costTrend * 100) / 100,
        totalDaysRecorded: uniqueDays.size,
      });
    } catch (err) {
      console.error('Error loading billing data:', err);
      setError('Failed to load billing data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const currentMonthData = billingData.filter(item => item.cost_date.startsWith(selectedMonth));
  const monthlyTotal = currentMonthData.reduce((sum, item) => sum + (Number(item.daily_cost) || 0), 0);

  const handleExportCSV = () => {
    if (billingData.length === 0) return;

    const csv = [
      ['Date', 'Daily Cost (₹)', 'Cumulative Cost (₹)', 'Quantity Stored (kg)', 'Rate per kg (₹)'].join(','),
      ...billingData.map(item =>
        [
          item.cost_date,
          Number(item.daily_cost).toFixed(2),
          Number(item.cumulative_cost).toFixed(2),
          Number(item.quantity_kg_stored).toFixed(2),
          Number(item.rate_per_kg).toFixed(2),
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `billing_${selectedMonth}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  if (loading) {
    return (
      <div className="p-8 max-w-[1400px] mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-12 bg-slate-200 dark:bg-slate-700 rounded-lg w-1/3" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-slate-200 dark:bg-slate-700 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto min-h-screen">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <IndianRupee className="w-8 h-8 text-emerald-500" />
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Billing Dashboard
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Track your daily storage costs and billing history
          </p>
        </div>
      </div>

      {error && (
        <Card className="border-2 border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20 mb-6">
          <CardContent className="pt-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-700 dark:text-red-300">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Month Selector */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
            Select Month
          </label>
          <input
            type="month"
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <Button variant="outline" onClick={handleExportCSV} disabled={billingData.length === 0} className="flex items-center gap-2">
          <Download className="w-4 h-4" />
          Export CSV
        </Button>
      </div>

      {billingData.length === 0 ? (
        <Card className="border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur shadow-sm text-center p-16">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">No Billing Data Found</h3>
          <p className="text-slate-500 text-sm mt-2">
            Your billing history will appear here once you store items in cold storage rooms.
          </p>
        </Card>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            {/* Total Costs */}
            <Card className="border-none shadow-lg bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-2 bg-emerald-400/30 rounded-lg">
                    <IndianRupee className="w-5 h-5" />
                  </div>
                </div>
                <p className="text-xs font-bold text-emerald-100 uppercase tracking-widest mb-1">Total Costs</p>
                <p className="text-2xl font-extrabold tracking-tight">₹{stats.totalCosts.toLocaleString()}</p>
                <p className="text-xs text-emerald-100 mt-2">{stats.totalDaysRecorded} days recorded</p>
              </CardContent>
            </Card>

            {/* Monthly Average */}
            <Card className="border-none shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-2 bg-blue-400/30 rounded-lg">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                </div>
                <p className="text-xs font-bold text-blue-100 uppercase tracking-widest mb-1">
                  {selectedMonth} Average
                </p>
                <p className="text-2xl font-extrabold tracking-tight">₹{stats.monthlyAverage.toLocaleString()}</p>
                <p className="text-xs text-blue-100 mt-2">per day</p>
              </CardContent>
            </Card>

            {/* Highest Day */}
            <Card className="border-none shadow-lg bg-gradient-to-br from-orange-500 to-orange-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-2 bg-orange-400/30 rounded-lg">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                </div>
                <p className="text-xs font-bold text-orange-100 uppercase tracking-widest mb-1">Highest Day</p>
                <p className="text-2xl font-extrabold tracking-tight">₹{stats.highestDayAmount.toLocaleString()}</p>
              </CardContent>
            </Card>

            {/* Lowest Day */}
            <Card className="border-none shadow-lg bg-gradient-to-br from-indigo-500 to-indigo-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-2 bg-indigo-400/30 rounded-lg">
                    <TrendingDown className="w-5 h-5" />
                  </div>
                </div>
                <p className="text-xs font-bold text-indigo-100 uppercase tracking-widest mb-1">Lowest Day</p>
                <p className="text-2xl font-extrabold tracking-tight">₹{stats.lowestDayAmount.toLocaleString()}</p>
              </CardContent>
            </Card>

            {/* Cost Trend */}
            <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-2 rounded-lg ${stats.costTrend >= 0 ? 'bg-red-50 dark:bg-red-900/40 text-red-600' : 'bg-green-50 dark:bg-green-900/40 text-green-600'}`}>
                    {stats.costTrend >= 0 ? (
                      <TrendingUp className="w-5 h-5" />
                    ) : (
                      <TrendingDown className="w-5 h-5" />
                    )}
                  </div>
                </div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Trend vs Last Month</p>
                <p className={`text-2xl font-extrabold tracking-tight ${stats.costTrend >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                  {stats.costTrend > 0 ? '+' : ''}{stats.costTrend.toFixed(1)}%
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Monthly Summary */}
          <Card className="border border-slate-200 dark:border-slate-800 shadow-sm mb-8">
            <CardHeader>
              <CardTitle className="text-lg">
                {selectedMonth} Summary: ₹{monthlyTotal.toLocaleString()}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {currentMonthData.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-700">
                          <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                            Date
                          </th>
                          <th className="text-right py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                            Daily Cost (₹)
                          </th>
                          <th className="text-right py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                            Quantity (kg)
                          </th>
                          <th className="text-right py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                            Rate (₹/kg)
                          </th>
                          <th className="text-right py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                            Cumulative (₹)
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentMonthData.map(item => (
                          <tr
                            key={item.id}
                            className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                          >
                            <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                              {new Date(item.cost_date).toLocaleDateString('en-IN')}
                            </td>
                            <td className="py-3 px-4 text-right text-slate-900 dark:text-white font-medium">
                              ₹{Number(item.daily_cost).toFixed(2)}
                            </td>
                            <td className="py-3 px-4 text-right text-slate-700 dark:text-slate-300">
                              {Number(item.quantity_kg_stored).toFixed(2)}
                            </td>
                            <td className="py-3 px-4 text-right text-slate-700 dark:text-slate-300">
                              ₹{Number(item.rate_per_kg).toFixed(2)}
                            </td>
                            <td className="py-3 px-4 text-right text-slate-900 dark:text-white font-semibold">
                              ₹{Number(item.cumulative_cost).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-center text-slate-500 dark:text-slate-400 py-8">
                    No billing data for {selectedMonth}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* All-Time History */}
          <Card className="border border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">All-Time Billing History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                        Date
                      </th>
                      <th className="text-right py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                        Daily Cost (₹)
                      </th>
                      <th className="text-right py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                        Quantity (kg)
                      </th>
                      <th className="text-right py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                        Rate (₹/kg)
                      </th>
                      <th className="text-right py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                        Cumulative (₹)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {billingData.slice(0, 20).map(item => (
                      <tr
                        key={item.id}
                        className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                      >
                        <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                          {new Date(item.cost_date).toLocaleDateString('en-IN')}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-900 dark:text-white font-medium">
                          ₹{Number(item.daily_cost).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-700 dark:text-slate-300">
                          {Number(item.quantity_kg_stored).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-700 dark:text-slate-300">
                          ₹{Number(item.rate_per_kg).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-900 dark:text-white font-semibold">
                          ₹{Number(item.cumulative_cost).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {billingData.length > 20 && (
                <p className="text-center text-slate-500 dark:text-slate-400 mt-4 text-sm">
                  Showing 20 of {billingData.length} records
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default FarmerBillingDashboard;
