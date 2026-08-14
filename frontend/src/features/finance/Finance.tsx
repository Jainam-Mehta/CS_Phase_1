import React, { useMemo, useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import RupeeIcon from '../../components/icons/RupeeIcon';
import { TrendingUp, Wallet, Zap, Droplets, Factory, Calendar, Truck } from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import LineChart from '../../components/ui/LineChart';

const Finance: React.FC = () => {
  const { user } = useAuthStore();
  const [financeData, setFinanceData] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);

  // Fetch finance data from API
  useEffect(() => {
    const fetchFinanceData = async () => {
      // Replaced localhost:8000 endpoints with zero-state UI mock
      setFinanceData({
        revenue: 0,
        expenses: 0,
        energy_cost: 0,
        travel_cost: 0,
        fertilizer_cost: 0,
        maintenance_cost: 0
      });
    };

    const fetchOrders = async () => {
      setOrders([]);
    };

    fetchFinanceData();
    fetchOrders();
  }, [user?.id]);

  // Calculate KPIs from finance data and orders
  const kpis = useMemo(() => {
    const revenue = financeData?.revenue || 0;
    const expenses = financeData?.expenses || 0;
    const energyCost = financeData?.energy_cost || 0;
    const travelCost = financeData?.travel_cost || 0;
    const fertilizerCost = financeData?.fertilizer_cost || 0;
    const maintenanceCost = financeData?.maintenance_cost || 0;
    
    // Profit = Revenue - Expenses
    const profit = revenue - expenses;

    return {
      revenue,
      expenses,
      profit,
      energyCost,
      travelCost,
      fertilizerCost,
      maintenanceCost,
    };
  }, [financeData]);

  // Generate financial graph data (monthly profit trend)
  const graphData = useMemo(() => {
    // Generate 6 months of profit data
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const baseProfit = kpis.profit > 0 ? kpis.profit : 10000;
    
    const data = months.map((_, index) => {
      // Generate realistic profit trend with some variation
      const variation = (Math.sin(index) * 0.2 + 1) * baseProfit;
      return variation;
    });

    return {
      data,
      timestamps: months,
    };
  }, [kpis.profit]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Finance
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Financial overview and performance metrics
        </p>
      </div>

      {/* Top 4 Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card variant="default">
          <CardContent className="p-4">
            <div className="flex flex-col items-center">
              <RupeeIcon className="h-6 w-6 text-green-500 mb-2" />
              <p className="text-xs text-gray-500 dark:text-gray-400">Revenue</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">₹{(kpis.revenue / 1000).toFixed(0)}K</p>
            </div>
          </CardContent>
        </Card>
        <Card variant="default">
          <CardContent className="p-4">
            <div className="flex flex-col items-center">
              <Wallet className="h-6 w-6 text-red-500 mb-2" />
              <p className="text-xs text-gray-500 dark:text-gray-400">Expenses</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">₹{(kpis.expenses / 1000).toFixed(0)}K</p>
            </div>
          </CardContent>
        </Card>
        <Card variant="default">
          <CardContent className="p-4">
            <div className="flex flex-col items-center">
              <TrendingUp className="h-6 w-6 text-green-500 mb-2" />
              <p className="text-xs text-gray-500 dark:text-gray-400">Profit</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">₹{(kpis.profit / 1000).toFixed(0)}K</p>
            </div>
          </CardContent>
        </Card>
        <Card variant="default">
          <CardContent className="p-4">
            <div className="flex flex-col items-center">
              <Zap className="h-6 w-6 text-yellow-500 mb-2" />
              <p className="text-xs text-gray-500 dark:text-gray-400">Energy Cost</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">₹{(kpis.energyCost / 1000).toFixed(0)}K</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financial Summary */}
      <Card variant="default">
        <CardHeader>
          <CardTitle>Financial Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Total Revenue</span>
              <span className="text-lg font-bold text-green-600 dark:text-green-400">₹{kpis.revenue.toFixed(0)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Total Expenses</span>
              <span className="text-lg font-bold text-red-600 dark:text-red-400">₹{kpis.expenses.toFixed(0)}</span>
            </div>
            <div className="border-t border-gray-200 dark:border-slate-700 pt-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Net Profit</span>
                <span className="text-xl font-bold text-green-600 dark:text-green-400">₹{kpis.profit.toFixed(0)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Graphs Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 6-Month Profit Trend */}
        <Card variant="default" className="h-full">
          <CardHeader>
            <CardTitle>6-Month Profit Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <LineChart
              title="6-Month Profit Trend"
              data={graphData.data}
              timestamps={graphData.timestamps}
              color="#10b981"
              unit="₹"
              minValue={Math.min(...graphData.data) * 0.9}
              maxValue={Math.max(...graphData.data) * 1.1}
            />
          </CardContent>
        </Card>

        {/* Expense Breakdown - Hollow Donut Chart */}
        <Card variant="default" className="h-full">
          <CardHeader>
            <CardTitle>Expense Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between h-full">
              <div className="relative w-64 h-64 flex-shrink-0">
                <svg viewBox="0 0 100 100" className="w-full h-full">
                  {/* Background circle */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="20"
                    className="dark:stroke-slate-700"
                  />
                  
                  {/* Energy Cost segment */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#eab308"
                    strokeWidth="20"
                    strokeDasharray={`${(kpis.energyCost / kpis.expenses) * 251.2} 251.2`}
                    transform="rotate(-90 50 50)"
                  />
                  
                  {/* Travel Cost segment */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="20"
                    strokeDasharray={`${(kpis.travelCost / kpis.expenses) * 251.2} 251.2`}
                    transform={`rotate(${(kpis.energyCost / kpis.expenses) * 360 - 90} 50 50)`}
                  />
                  
                  {/* Fertilizer Cost segment */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#22c55e"
                    strokeWidth="20"
                    strokeDasharray={`${(kpis.fertilizerCost / kpis.expenses) * 251.2} 251.2`}
                    transform={`rotate(${((kpis.energyCost + kpis.travelCost) / kpis.expenses) * 360 - 90} 50 50)`}
                  />
                  
                  {/* Maintenance Cost segment */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#f97316"
                    strokeWidth="20"
                    strokeDasharray={`${(kpis.maintenanceCost / kpis.expenses) * 251.2} 251.2`}
                    transform={`rotate(${((kpis.energyCost + kpis.travelCost + kpis.fertilizerCost) / kpis.expenses) * 360 - 90} 50 50)`}
                  />
                </svg>
                
                {/* Center text */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">₹{(kpis.expenses / 1000).toFixed(0)}K</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
                  </div>
                </div>
              </div>
              
              {/* Legend - on the right side */}
              <div className="flex flex-col gap-3 ml-6">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Electricity</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">₹{(kpis.energyCost / 1000).toFixed(0)}K</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Travel</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">₹{(kpis.travelCost / 1000).toFixed(0)}K</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Fertilizer</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">₹{(kpis.fertilizerCost / 1000).toFixed(0)}K</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Maintenance</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">₹{(kpis.maintenanceCost / 1000).toFixed(0)}K</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
};

export default Finance;
