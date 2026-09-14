import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../stores/useAuthStore';
import { useSiteStore } from '../../stores/useSiteStore';
import { supabase } from '../../lib/supabase';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Users, IndianRupee, Zap, Wrench, Package, Calendar, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { convertKgToCrates } from '../../utils/units';

// NO DEMO DATA - All data from database

const OwnerFinance: React.FC = () => {
  const { user } = useAuthStore();
  const { selectedFacilityId } = useSiteStore();
  const [loading, setLoading] = useState(true);
  const [financeData, setFinanceData] = useState<any>(null);

  useEffect(() => {
    if (user?.id && selectedFacilityId) {
      loadFinanceData();
    }
  }, [user?.id, selectedFacilityId]);

  const loadFinanceData = async () => {
    try {
      setLoading(true);

      // 1. Get rooms for selected facility
      const { data: rmData } = await supabase
        .from('cold_storage_rooms')
        .select('id, storage_rate_per_kg_month')
        .eq('facility_id', selectedFacilityId);

      const resolvedRooms = rmData || [];
      const roomIds = resolvedRooms.map((r) => r.id);

      if (roomIds.length === 0) {
        // No rooms - set empty data
        setFinanceData({
          currentMonth: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
          totalRevenue: 0,
          totalExpenses: 0,
          totalProfit: 0,
          profitMargin: '0.0',
          farmerRevenue: [],
          expenses: [],
          monthlyTrend: [],
          totalCrates: 0,
          totalFarmers: 0,
          avgPricePerCrate: '0',
        });
        setLoading(false);
        return;
      }

      // 2. Fetch expenses for facility rooms
      const { data: expData } = await supabase
        .from('expenses')
        .select('category, amount')
        .in('room_id', roomIds);

      // 3. Fetch approved farmer allocations & sales
      const { data: allocData } = await supabase
        .from('batch_room_allocations')
        .select(`
          room_id,
          quantity_kg,
          batches!inner(
            id,
            farmer_id,
            remaining_quantity_kg,
            profiles(first_name, last_name)
          )
        `)
        .in('room_id', roomIds)
        .is('removed_at', null);

      // Process expenses
      let energyCost = 0;
      let maintenanceCost = 0;
      let partsCost = 0;
      let otherCost = 0;

      (expData || []).forEach((exp: any) => {
        const amt = Number(exp.amount) || 0;
        const cat = (exp.category || '').toLowerCase();
        if (cat.includes('energy')) energyCost += amt;
        else if (cat.includes('maint')) maintenanceCost += amt;
        else if (cat.includes('parts')) partsCost += amt;
        else otherCost += amt;
      });

      const totalExp = energyCost + maintenanceCost + partsCost + otherCost;

      // Group farmer revenue from allocations using actual room storage rates
      const farmerMap = new Map<string, { farmer: string; crates: number; total: number; location: string }>();

      (allocData || []).forEach((alloc: any) => {
        const b = alloc.batches;
        if (!b) return;
        const farmerId = b.farmer_id;
        const name = b.profiles ? `${b.profiles.first_name || ''} ${b.profiles.last_name || ''}`.trim() : 'Farmer';
        const qtyKg = Number(alloc.quantity_kg) || 0;
        const crates = convertKgToCrates(qtyKg);
        
        // Dynamic room storage rate per kg/month (default to ₹2.5/kg if not set)
        const roomObj = resolvedRooms.find(r => r.id === alloc.room_id);
        const ratePerKgMonth = Number(roomObj?.storage_rate_per_kg_month) || 2.5;
        const rev = qtyKg * ratePerKgMonth;

        if (farmerMap.has(farmerId)) {
          const curr = farmerMap.get(farmerId)!;
          curr.crates += crates;
          curr.total += rev;
        } else {
          farmerMap.set(farmerId, {
            farmer: name || 'Farmer',
            crates,
            total: rev,
            location: 'Local Facility',
          });
        }
      });

      // 4. Fetch actual realized sales revenue for batches in these rooms
      const batchIds = (allocData || []).map((a: any) => a.batches?.id).filter(Boolean);
      let realizedSalesRevenue = 0;
      if (batchIds.length > 0) {
        const { data: salesData } = await supabase
          .from('sales')
          .select('quantity_kg, selling_price')
          .in('batch_id', batchIds);
        
        (salesData || []).forEach((s: any) => {
          realizedSalesRevenue += (Number(s.quantity_kg) || 0) * (Number(s.selling_price) || 0);
        });
      }

      const farmerRevenueList = Array.from(farmerMap.values());

      // Storage fees + realized sales revenue
      const storageFeeRev = farmerRevenueList.reduce((sum, f) => sum + f.total, 0);
      const totalRev = storageFeeRev + realizedSalesRevenue;
      
      const finalExpensesList = [
        { category: 'Energy Costs', amount: energyCost, percentage: totalExp > 0 ? Number(((energyCost / totalExp) * 100).toFixed(1)) : 0, color: '#f59e0b', icon: Zap },
        { category: 'Maintenance', amount: maintenanceCost, percentage: totalExp > 0 ? Number(((maintenanceCost / totalExp) * 100).toFixed(1)) : 0, color: '#8b5cf6', icon: Wrench },
        { category: 'Parts & Equipment', amount: partsCost, percentage: totalExp > 0 ? Number(((partsCost / totalExp) * 100).toFixed(1)) : 0, color: '#3b82f6', icon: Package },
        { category: 'Other Expenses', amount: otherCost, percentage: totalExp > 0 ? Number(((otherCost / totalExp) * 100).toFixed(1)) : 0, color: '#10b981', icon: DollarSign },
      ];

      const finalTotalExpenses = totalExp;
      const finalProfit = totalRev - finalTotalExpenses;
      const profitMargin = totalRev > 0 ? ((finalProfit / totalRev) * 100).toFixed(1) : (finalTotalExpenses > 0 ? '-100.0' : '0.0');
      
      // Fetch monthly trend from farmer_payments - last 6 months
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      const { data: paymentsHistory } = await supabase
        .from('farmer_payments')
        .select('amount_inr, payment_date')
        .eq('facility_id', selectedFacilityId)
        .gte('payment_date', sixMonthsAgo.toISOString())
        .order('payment_date', { ascending: true });
        
      // Fetch expenses history for same period
      const { data: expensesHistory } = await supabase
        .from('expenses')
        .select('amount, created_at')
        .in('room_id', roomIds)
        .gte('created_at', sixMonthsAgo.toISOString());
        
      // Group by month
      const monthlyData: any = {};
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
        const monthName = monthNames[date.getMonth()];
        
        monthlyData[monthKey] = {
          month: monthName,
          revenue: 0,
          expenses: 0,
          profit: 0
        };
      }
      
      // Aggregate payments into months
      (paymentsHistory || []).forEach((payment: any) => {
        const date = new Date(payment.payment_date);
        const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
        if (monthlyData[monthKey]) {
          monthlyData[monthKey].revenue += (payment.amount_inr / 100000); // Convert to lakhs
        }
      });
      
      // Aggregate expenses into months
      (expensesHistory || []).forEach((expense: any) => {
        const date = new Date(expense.created_at);
        const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
        if (monthlyData[monthKey]) {
          monthlyData[monthKey].expenses += (expense.amount / 100000); // Convert to lakhs
        }
      });
      
      // Calculate profit for each month
      const monthlyTrendData = Object.values(monthlyData).map((month: any) => ({
        ...month,
        profit: Number((month.revenue - month.expenses).toFixed(1))
      }));

      setFinanceData({
        currentMonth: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        totalRevenue: totalRev,
        totalExpenses: finalTotalExpenses,
        totalProfit: finalProfit,
        profitMargin,
        farmerRevenue: farmerRevenueList,
        expenses: finalExpensesList,
        monthlyTrend: monthlyTrendData,
        totalCrates: farmerRevenueList.reduce((sum: number, f: any) => sum + f.crates, 0),
        totalFarmers: farmerRevenueList.length,
        avgPricePerCrate: (totalRev / Math.max(1, farmerRevenueList.reduce((sum: number, f: any) => sum + f.crates, 0))).toFixed(2),
      });
    } catch (error) {
      console.error('Error loading finance data:', error);
      // Set empty data on error - NO DEMO FALLBACK
      setFinanceData({
        currentMonth: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        totalRevenue: 0,
        totalExpenses: 0,
        totalProfit: 0,
        profitMargin: '0.0',
        farmerRevenue: [],
        expenses: [],
        monthlyTrend: [],
        totalCrates: 0,
        totalFarmers: 0,
        avgPricePerCrate: '0',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (!selectedFacilityId) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center h-full">
        <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">No Facility Selected</h3>
        <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-6">
          Please select a facility from the dropdown to view financial data.
        </p>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return `₹${(amount / 100000).toFixed(2)} L`;
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString('en-IN');
  };

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
          Financial Overview
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Complete breakdown of revenue, expenses, and profits for {financeData?.currentMonth}
        </p>
      </div>

      {/* Top KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        {/* Total Revenue */}
        <Card variant="default" className="border-l-4 border-l-emerald-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Revenue</h3>
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-900 dark:text-white mb-1">
              {formatCurrency(financeData?.totalRevenue)}
            </p>
          </CardContent>
        </Card>

        {/* Total Expenses */}
        <Card variant="default" className="border-l-4 border-l-red-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Expenses</h3>
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-900 dark:text-white mb-1">
              {formatCurrency(financeData?.totalExpenses)}
            </p>
          </CardContent>
        </Card>

        {/* Net Profit */}
        <Card variant="default" className="border-l-4 border-l-blue-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Net Profit</h3>
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <IndianRupee className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-900 dark:text-white mb-1">
              {formatCurrency(financeData?.totalProfit)}
            </p>
            <div className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400">
              <span>Profit Margin: {financeData?.profitMargin}%</span>
            </div>
          </CardContent>
        </Card>

        {/* Active Farmers */}
        <Card variant="default" className="border-l-4 border-l-purple-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Active Farmers</h3>
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-900 dark:text-white mb-1">
              {financeData?.totalFarmers}
            </p>
            <div className="text-sm text-slate-600 dark:text-slate-400">
              {formatNumber(financeData?.totalCrates)} crates stored
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
        {/* Expenses Breakdown - Donut Chart */}
        <Card variant="default" className="xl:col-span-1">
          <CardHeader>
            <CardTitle>Expense Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={financeData?.expenses}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="amount"
                  >
                    {financeData?.expenses.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', fontSize: '12px', color: '#ffffff' }}
                    labelStyle={{ color: '#ffffff' }}
                    formatter={(value: any) => [`₹${(value / 1000).toFixed(1)}K`, '']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3 mt-4">
              {financeData?.expenses.map((expense: any, index: number) => {
                const Icon = expense.icon;
                return (
                  <div key={index} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: expense.color }}></div>
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-slate-500" />
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{expense.category}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        ₹{(expense.amount / 1000).toFixed(1)}K
                      </p>
                      <p className="text-xs text-slate-500">{expense.percentage}%</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Monthly Trend - Bar Chart */}
        <Card variant="default" className="xl:col-span-2">
          <CardHeader>
            <CardTitle>6-Month Financial Trend (₹ Lakhs)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={financeData?.monthlyTrend} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.5} />
                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} width={40} />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', fontSize: '12px', color: '#ffffff' }}
                    labelStyle={{ color: '#ffffff' }}
                    formatter={(value: any) => [`₹${value} L`, '']}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <Bar dataKey="revenue" fill="#10b981" radius={[8, 8, 0, 0]} name="Revenue" />
                  <Bar dataKey="expenses" fill="#ef4444" radius={[8, 8, 0, 0]} name="Expenses" />
                  <Bar dataKey="profit" fill="#3b82f6" radius={[8, 8, 0, 0]} name="Profit" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Farmer Revenue Table */}
      <Card variant="default">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Revenue by Farmer</CardTitle>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span className="text-slate-600 dark:text-slate-400">{financeData?.currentMonth}</span>
              </div>
              <div className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full font-medium">
                Avg: ₹{financeData?.avgPricePerCrate}/crate
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-6 py-4 text-left font-semibold text-slate-700 dark:text-slate-300">Farmer Name</th>
                  <th className="px-6 py-4 text-left font-semibold text-slate-700 dark:text-slate-300">Location</th>
                  <th className="px-6 py-4 text-right font-semibold text-slate-700 dark:text-slate-300">Crates Stored</th>
                  <th className="px-6 py-4 text-right font-semibold text-slate-700 dark:text-slate-300">Price/Crate</th>
                  <th className="px-6 py-4 text-right font-semibold text-slate-700 dark:text-slate-300">Total Revenue</th>
                  <th className="px-6 py-4 text-right font-semibold text-slate-700 dark:text-slate-300">% of Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {financeData?.farmerRevenue.map((farmer: any, index: number) => {
                  const percentage = ((farmer.total / financeData.totalRevenue) * 100).toFixed(1);
                  return (
                    <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-500 rounded-full flex items-center justify-center text-white font-semibold">
                            {farmer.farmer.charAt(0)}
                          </div>
                          <span className="font-medium text-slate-900 dark:text-white">{farmer.farmer}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{farmer.location}</td>
                      <td className="px-6 py-4 text-right font-medium text-slate-900 dark:text-white">
                        {formatNumber(farmer.crates)}
                      </td>
                      <td className="px-6 py-4 text-right text-slate-600 dark:text-slate-400">
                        ₹{farmer.pricePerCrate}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
                        ₹{formatNumber(farmer.total)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-xs font-medium">
                          {percentage}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-50 dark:bg-slate-800/50 border-t-2 border-slate-300 dark:border-slate-600">
                <tr>
                  <td className="px-6 py-4 font-bold text-slate-900 dark:text-white" colSpan={2}>TOTAL</td>
                  <td className="px-6 py-4 text-right font-bold text-slate-900 dark:text-white">
                    {formatNumber(financeData?.totalCrates)}
                  </td>
                  <td className="px-6 py-4"></td>
                  <td className="px-6 py-4 text-right font-bold text-emerald-600 dark:text-emerald-400 text-lg">
                    ₹{formatNumber(financeData?.totalRevenue)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded text-xs font-bold">
                      100%
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OwnerFinance;
