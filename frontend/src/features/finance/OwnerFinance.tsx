import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../stores/useAuthStore';
import { useSiteStore } from '../../stores/useSiteStore';
import { supabase } from '../../lib/supabase';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Users, IndianRupee, Zap, Wrench, Package, Calendar, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { convertKgToCrates } from '../../utils/units';


const OwnerFinance: React.FC = () => {
  const { user } = useAuthStore();
  const { selectedFacilityId, selectedRoomId } = useSiteStore();
  const [loading, setLoading] = useState(true);
  const [financeData, setFinanceData] = useState<any>(null);
  const [siteName, setSiteName] = useState<string>('');
  const [paymentStatus, setPaymentStatus] = useState<{ [key: string]: string }>({});
  const [isSavingPayment, setIsSavingPayment] = useState(false);

  useEffect(() => {
    if (user?.id && selectedFacilityId) {
      loadFinanceData();
    }
  }, [user?.id, selectedFacilityId, selectedRoomId]);

  const loadFinanceData = async () => {
    try {
      setLoading(true);
      console.log('=== FINANCE DATA LOAD STARTED ===');

      // Fetch Site Name
      const { data: siteData } = await supabase
        .from('sites')
        .select('facility_name')
        .eq('id', selectedFacilityId)
        .single();

      setSiteName(siteData?.facility_name || 'Your Site');

      // Get owner profile
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', authUser.id)
        .single();

      if (!profile) return;

      // Get ALL rooms (not just selected room) - Profits tab is universal
      const { data: allRooms } = await supabase
        .from('cold_storage_rooms')
        .select('id')
        .eq('site_id', selectedFacilityId);

      const roomIds = allRooms?.map((r: any) => r.id) || [];

      // 2. Fetch STAKEHOLDER INVESTMENT REVENUE (from approved investments, not payments)
      // Revenue = sum of investment_amount_inr where status='active' for THIS SITE
      const { data: stakeholderInvestments } = await supabase
        .from('stakeholder_investments')
        .select('investment_amount_inr')
        .eq('site_id', selectedFacilityId)
        .eq('status', 'active');

      let stakeholderRevenue = 0;
      (stakeholderInvestments || []).forEach((investment: any) => {
        stakeholderRevenue += Number(investment.investment_amount_inr) || 0;
      });

      console.log('Stakeholder Investment Revenue (from approved investments):', stakeholderRevenue);

      // 3. Fetch FARMER SALES REVENUE (actual revenue from sales with snapshot pricing)
      let farmerRevenue = 0;
      let totalCrates = 0;
      let totalFarmers = 0;
      let farmerAllocations: any[] = [];
      let salesData: any[] = [];

      if (roomIds.length > 0) {
        // Get all batches in these rooms (via allocations)
        const { data: allocData, error: allocError } = await supabase
          .from('batch_room_allocations')
          .select('batch_id, room_id, quantity_kg')
          .in('room_id', roomIds)
          .is('removed_at', null);  // Only active allocations

        if (allocError) {
          console.warn('Error fetching allocations:', allocError);
        } else {
          farmerAllocations = allocData || [];
        }

        console.log('Allocations found:', farmerAllocations.length);
        if (farmerAllocations.length > 0) {
          console.log('First allocation:', farmerAllocations[0]);
        }

        // Extract unique batch IDs
        const batchIds = [...new Set(farmerAllocations.map((a: any) => a.batch_id).filter(Boolean))];
        console.log('Batch IDs extracted:', batchIds);
        console.log('Room IDs:', roomIds);

        // Fetch SALES data with batches info (actual revenue)
        if (batchIds.length > 0) {
          const { data: salesRecords } = await supabase
            .from('sales')
            .select(`
              id, quantity_kg, selling_price, batch_id, sold_at, buyer,
              batches!inner(id, farmer_id, snapshot_price_per_kg)
            `)
            .in('batch_id', batchIds)
            .order('sold_at', { ascending: false });

          salesData = salesRecords || [];
          console.log('Sales records found:', salesData.length);
          if (salesData.length > 0) {
            console.log('First sale:', salesData[0]);
          }

          // Calculate revenue from actual sales using selling_price
          const uniqueFarmers = new Set<string>();
          
          (salesData || []).forEach((sale: any) => {
            const qtyKg = Number(sale.quantity_kg) || 0;
            const crates = convertKgToCrates(qtyKg);
            const totalAmount = Number(sale.selling_price) || 0;
            
            totalCrates += crates;
            farmerRevenue += totalAmount;
            
            // Track unique farmers
            const batch = Array.isArray(sale.batches) ? sale.batches[0] : sale.batches;
            if (batch?.farmer_id) {
              uniqueFarmers.add(batch.farmer_id);
            }
          });
          
          totalFarmers = uniqueFarmers.size;
        }
      }

      console.log('Farmer Sales Revenue (actual selling_price):', farmerRevenue);

      console.log('Total Revenue (Stakeholder + Farmer Storage):', stakeholderRevenue + farmerRevenue);

      // 4. Fetch EXPENSES (if table exists)
      // Skip expenses query - table doesn't exist
      let expData: any[] = [];
      // Removed: expenses table query (returns 404 - table not available)

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

      const totalExpenses = energyCost + maintenanceCost + partsCost + otherCost;
      const totalExp = energyCost + maintenanceCost + partsCost + otherCost;

      // 5. Build farmer revenue breakdown from allocations (group by farmer + room)
      let farmerStorageData: any[] = [];
      
      if (roomIds.length > 0) {
        // Query allocations grouped by farmer and room
        const { data: allocData } = await supabase
          .from('batch_room_allocations')
          .select(`
            batch_id,
            room_id,
            quantity_kg,
            batches!inner(farmer_id)
          `)
          .in('room_id', roomIds)
          .is('removed_at', null);  // Only active allocations

        // Get room and site info for all rooms
        const { data: roomData } = await supabase
          .from('cold_storage_rooms')
          .select(`
            id,
            room_name,
            site_id,
            sites(facility_name)
          `)
          .in('id', roomIds);

        // Create room lookup
        const roomLookup: any = {};
        (roomData || []).forEach((room: any) => {
          roomLookup[room.id] = room;
        });

        // Group allocations by (farmer_id, room_id) and calculate totals
        const farmerRoomMap = new Map<string, {farmer_id: string, room_id: string, total_kg: number}>();
        
        (allocData || []).forEach((alloc: any) => {
          const farmer_id = alloc.batches?.farmer_id;
          const room_id = alloc.room_id;
          const qty_kg = Number(alloc.quantity_kg) || 0;
          
          if (farmer_id) {
            const key = `${farmer_id}|${room_id}`;
            if (farmerRoomMap.has(key)) {
              const curr = farmerRoomMap.get(key)!;
              curr.total_kg += qty_kg;
            } else {
              farmerRoomMap.set(key, { farmer_id, room_id, total_kg: qty_kg });
            }
          }
        });

        // Convert to array with room info
        farmerStorageData = Array.from(farmerRoomMap.values()).map((item: any) => ({
          farmer_id: item.farmer_id,
          room_id: item.room_id,
          quantity_kg: item.total_kg,
          room: roomLookup[item.room_id] || {}
        }));
      }

      // Get farmer names
      const farmerIds = new Set<string>();
      farmerStorageData.forEach((row: any) => {
        if (row.farmer_id) farmerIds.add(row.farmer_id);
      });

      let farmerProfiles: any = {};
      if (farmerIds.size > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', Array.from(farmerIds));
        
        (profiles || []).forEach((p: any) => {
          farmerProfiles[p.id] = p.full_name;
        });
      }

      // Get payment history to calculate PAID amounts (already settled payments)
      const { data: paymentHistory } = await supabase
        .from('farmer_payment_history')
        .select('farmer_id, amount_paid')
        .in('farmer_id', Array.from(farmerIds));

      const farmerPaymentTotals: any = {};
      const farmerPaidAmounts: any = {};  // Track how much has been paid
      (paymentHistory || []).forEach((payment: any) => {
        farmerPaymentTotals[payment.farmer_id] = (farmerPaymentTotals[payment.farmer_id] || 0) + Number(payment.amount_paid);
        farmerPaidAmounts[payment.farmer_id] = (farmerPaidAmounts[payment.farmer_id] || 0) + Number(payment.amount_paid);
      });

      // Build farmer revenue map with site & room info - TWO REVENUE COLUMNS
      const farmerMap = new Map<string, { 
        farmer_id: string;
        farmer: string;
        room_id: string;
        siteName: string; 
        roomName: string; 
        crates: number; 
        unpaidRevenue: number;
        totalRevenue: number;
      }>();

      (farmerStorageData || []).forEach((row: any) => {
        const farmerId = row.farmer_id;
        const farmerName = farmerProfiles[farmerId] || 'Unknown Farmer';
        const siteName = row.room?.sites?.facility_name || 'Site';
        const roomName = row.room?.room_name || 'Room';
        const roomId = row.room_id;
        const quantity_kg = Number(row.quantity_kg) || 0;
        const crates = Math.ceil(quantity_kg / 25);  // 1 crate = 25kg
        
        // Use the actual sales revenue for this farmer if available
        const farmerSalesRevenue = (salesData || [])
          .filter((sale: any) => {
            const batch = Array.isArray(sale.batches) ? sale.batches[0] : sale.batches;
            return batch?.farmer_id === farmerId;
          })
          .reduce((sum: number, sale: any) => sum + (Number(sale.selling_price) || 0), 0);

        // UNPAID = current sales revenue - what they've already paid
        // TOTAL = just the current sales revenue (don't add payment history - that's already subtracted)
        const unpaidRev = Math.max(0, farmerSalesRevenue - (farmerPaidAmounts[farmerId] || 0));
        const totalRev = farmerSalesRevenue;  // Total is just the sales, not sales + payments

        const key = farmerId;
        if (farmerMap.has(key)) {
          const curr = farmerMap.get(key)!;
          curr.crates += crates;
          curr.unpaidRevenue += unpaidRev;
          curr.totalRevenue += totalRev;
        } else {
          farmerMap.set(key, {
            farmer_id: farmerId,
            farmer: farmerName,
            room_id: roomId,
            siteName: siteName,
            roomName: roomName,
            crates,
            unpaidRevenue: unpaidRev,    // Current outstanding charges
            totalRevenue: totalRev       // Current + all previous payments
          });
        }
      });

      console.log('Final farmer map with site & room:', Array.from(farmerMap.values()));
      const farmerRevenueList = Array.from(farmerMap.values());
      
      // Recalculate totals from farmer revenue list (not from global sales)
      // This ensures KPI matches the table rows
      const recalculatedTotalCrates = farmerRevenueList.reduce((sum: number, f: any) => sum + (f.crates || 0), 0);
      const recalculatedTotalUnpaidRevenue = farmerRevenueList.reduce((sum: number, f: any) => sum + (f.unpaidRevenue || 0), 0);
      const recalculatedTotalRevenue = farmerRevenueList.reduce((sum: number, f: any) => sum + (f.totalRevenue || 0), 0);
      
      console.log('=== REVENUE TOTALS DEBUG ===');
      console.log('Recalculated Total Unpaid:', recalculatedTotalUnpaidRevenue);
      console.log('Recalculated Total Revenue:', recalculatedTotalRevenue);
      console.log('Individual farmers:', farmerRevenueList.map(f => ({farmer: f.farmer, unpaid: f.unpaidRevenue, total: f.totalRevenue})));
      
      // Total revenue = stakeholder investments + farmer revenue from table
      const totalRevenue = stakeholderRevenue + recalculatedTotalRevenue;
      
      // TOTAL PROFIT = Total Revenue - Expenses
      const finalTotalProfit = totalRevenue - totalExpenses;
      const profitMargin = totalRevenue > 0 ? (((totalRevenue - totalExpenses) / totalRevenue) * 100).toFixed(1) : (totalExpenses > 0 ? '-100.0' : '0.0');
      
      const finalExpensesList = [
        { category: 'Energy Costs', amount: energyCost, percentage: totalExp > 0 ? Number(((energyCost / totalExp) * 100).toFixed(1)) : 0, color: '#f59e0b', icon: Zap },
        { category: 'Maintenance', amount: maintenanceCost, percentage: totalExp > 0 ? Number(((maintenanceCost / totalExp) * 100).toFixed(1)) : 0, color: '#8b5cf6', icon: Wrench },
        { category: 'Parts & Equipment', amount: partsCost, percentage: totalExp > 0 ? Number(((partsCost / totalExp) * 100).toFixed(1)) : 0, color: '#3b82f6', icon: Package },
        { category: 'Other Expenses', amount: otherCost, percentage: totalExp > 0 ? Number(((otherCost / totalExp) * 100).toFixed(1)) : 0, color: '#10b981', icon: IndianRupee },
      ];
      
      // Fetch monthly trend - last 6 months
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      // Fetch stakeholder investment history (monthly)
      const { data: stakeholderMonthly } = await supabase
        .from('stakeholder_investments')
        .select('investment_amount_inr, investment_date')
        .eq('site_id', selectedFacilityId)
        .eq('status', 'active')
        .gte('investment_date', sixMonthsAgo.toISOString())
        .order('investment_date', { ascending: true });

      // Fetch farmer storage allocations (historical - this is current state, not historical payments)
      // Note: This gives current allocations, not historical monthly breakdown
      // EXCLUDE removed allocations to match the current revenue calculation
      const { data: farmerMonthlyAllocations } = await supabase
        .from('batch_room_allocations')
        .select(`
          room_id,
          quantity_kg,
          assigned_at,
          batches!inner(
            farmer_id
          )
        `)
        .in('room_id', roomIds)
        .is('removed_at', null)
        .gte('assigned_at', sixMonthsAgo.toISOString())
        .order('assigned_at', { ascending: true });
      
      console.log('===== STAKEHOLDER INVESTMENTS DEBUG =====');
      console.log('Stakeholder Investments (last 6 months):', stakeholderMonthly);
      console.log('Farmer Allocations (last 6 months):', farmerMonthlyAllocations);
        
      // Expenses table not available - skip historical expenses
      let expensesHistory: any = [];
        
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
      
      console.log('Farmer Monthly Allocations:', farmerMonthlyAllocations);
      console.log('Stakeholder Monthly Investments:', stakeholderMonthly);
      console.log('Six months ago date:', sixMonthsAgo.toISOString());
      
      // Aggregate stakeholder investments into months
      (stakeholderMonthly || []).forEach((investment: any) => {
        const date = new Date(investment.investment_date);
        const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
        console.log('Stakeholder investment date:', date, 'monthKey:', monthKey, 'amount:', investment.investment_amount_inr);
        if (monthlyData[monthKey]) {
          monthlyData[monthKey].revenue += Number(investment.investment_amount_inr) || 0;
        }
      });

      // Aggregate farmer storage revenue into months - use SALES data (actual revenue)
      (salesData || []).forEach((sale: any) => {
        const soldDate = sale.sold_at ? new Date(sale.sold_at) : new Date();
        const monthKey = `${soldDate.getFullYear()}-${soldDate.getMonth()}`;
        
        const amount = Number(sale.selling_price) || 0;
        
        console.log('Sale date:', soldDate, 'monthKey:', monthKey, 'amount:', amount);
        if (monthlyData[monthKey]) {
          monthlyData[monthKey].revenue += amount;
        }
      });
      
      // Aggregate expenses into months
      (expensesHistory || []).forEach((expense: any) => {
        const date = new Date(expense.created_at);
        const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
        if (monthlyData[monthKey]) {
          monthlyData[monthKey].expenses += (expense.amount || 0); // Store raw value
        }
      });
      
      // Calculate profit for each month
      const monthlyTrendData = Object.values(monthlyData).map((month: any) => ({
        ...month,
        profit: Number((month.revenue - month.expenses).toFixed(1))
      }));

      console.log('Final Monthly Trend Data (with stakeholder investments + farmer storage):', monthlyTrendData);

      const avgPricePerCrate = totalCrates > 0 ? (farmerRevenue / totalCrates).toFixed(2) : '0.00';

      setFinanceData({
        currentMonth: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        totalRevenue: totalRevenue,
        totalUnpaidRevenue: recalculatedTotalUnpaidRevenue,
        totalExpenses: totalExpenses,
        totalProfit: finalTotalProfit,
        profitMargin,
        farmerRevenue: farmerRevenueList,
        expenses: finalExpensesList,
        monthlyTrend: monthlyTrendData,
        totalCrates: recalculatedTotalCrates,
        totalFarmers: farmerRevenueList.length,
        avgPricePerCrate: recalculatedTotalCrates > 0 ? (recalculatedTotalRevenue / recalculatedTotalCrates).toFixed(2) : '0',
      });
    } catch (error) {
      console.error('Error loading finance data:', error);
      // Set empty data on error - NO DEMO FALLBACK
      setFinanceData({
        currentMonth: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        totalRevenue: 0,
        totalUnpaidRevenue: 0,
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

  const handlePaymentStatusChange = async (farmerId: string, currentStatus: string, unpaidRevenue: number) => {
    try {
      setIsSavingPayment(true);
      
      // Validate: Can't record a payment if there's no unpaid revenue
      if (unpaidRevenue <= 0) {
        alert('No pending payment to record. Unpaid revenue is ₹0 or less.');
        setIsSavingPayment(false);
        return;
      }
      
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        alert('Not authenticated');
        return;
      }

      // Only allow marking as PAID (recording payment)
      if (currentStatus === 'paid') {
        alert('Payment already marked as Paid');
        return;
      }

      // Get farmer's room from financeData to populate room_id
      const farmerData = financeData?.farmerRevenue?.find((f: any) => f.farmer_id === farmerId);
      const roomId = farmerData?.room_id || selectedRoomId;
      
      // Record payment in farmer_payment_history
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      
      const { error: historyError } = await supabase
        .from('farmer_payment_history')
        .insert({
          farmer_id: farmerId,
          owner_id: authUser.id,
          site_id: selectedFacilityId,
          room_id: roomId,
          period_start_date: today,
          period_end_date: today,
          total_daily_entries: 1,
          total_crates_stored: farmerData?.crates || 0,
          total_quantity_kg: (farmerData?.crates || 0) * 25,
          amount_paid: unpaidRevenue,
          payment_received_by_owner_id: authUser.id,
          payment_method: 'owner_dashboard',
          remarks: 'Payment recorded from Owner Finance dashboard',
          payment_date: new Date().toISOString()
        });

      if (historyError) {
        console.error('Error creating payment history:', historyError);
        alert(`Error recording payment: ${historyError.message}`);
        return;
      }

      // 3. Create farmer notification (non-blocking)
      try {
        supabase.from('farmer_notifications').insert({
          farmer_id: farmerId,
          notification_type: 'payment_recorded',
          title: 'Payment Recorded',
          message: `Your payment of ₹${unpaidRevenue.toFixed(2)} has been recorded by the facility owner.`,
          is_read: false
        });
      } catch (err) {
        console.warn('Could not send farmer notification:', err);
      }

      console.log(`Payment of ₹${unpaidRevenue.toFixed(2)} from farmer recorded successfully.`);

      // 4. Update UI state
      setPaymentStatus(prev => ({
        ...prev,
        [farmerId]: 'paid'
      }));

      // 5. Show success message
      alert(`Payment of ₹${unpaidRevenue.toFixed(2)} recorded successfully`);
      
      // 6. Reload data to reflect changes
      await loadFinanceData();

    } catch (error) {
      console.error('Error handling payment:', error);
      alert('An unexpected error occurred while processing payment');
    } finally {
      setIsSavingPayment(false);
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
        <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">No Site Selected</h3>
        <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-6">
          Please select a site from the dropdown to view financial data.
        </p>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    if (amount == null) return '₹0';
    if (amount >= 10000000) { // 1 Crore+
      return `₹${(amount / 10000000).toFixed(2)} Cr`;
    }
    if (amount >= 100000) { // 1 Lakh+
      return `₹${(amount / 100000).toFixed(2)} L`;
    }
    if (amount >= 1000) { // 1K+
      return `₹${(amount / 1000).toFixed(2)}K`;
    }
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 1 })}`;
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString('en-IN');
  };

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
          {siteName}
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Complete breakdown of revenue, expenses, and profits for {financeData?.currentMonth}
        </p>
      </div>

      {/* Room Selector Removed - Using global useSiteStore selection */}

      {/* Top KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-6 mb-8">
        {/* Total Revenue */}
        <Card variant="default" className="border-l-4 border-l-emerald-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Revenue</h3>
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                <IndianRupee className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-900 dark:text-white mb-1">
              {formatCurrency(financeData?.totalRevenue)}
            </p>
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
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-6 py-4 text-left font-semibold text-slate-700 dark:text-slate-300">Farmer Name</th>
                  <th className="px-6 py-4 text-left font-semibold text-slate-700 dark:text-slate-300">Room</th>
                  <th className="px-6 py-4 text-right font-semibold text-slate-700 dark:text-slate-300">Crates Stored</th>
                  <th className="px-6 py-4 text-right font-semibold text-slate-700 dark:text-slate-300">Unpaid Revenue</th>
                  <th className="px-6 py-4 text-right font-semibold text-slate-700 dark:text-slate-300">Total Revenue</th>
                  <th className="px-6 py-4 text-center font-semibold text-slate-700 dark:text-slate-300">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {financeData?.farmerRevenue.map((farmer: any, index: number) => {
                  const farmerId = farmer.farmer_id; // Use the actual UUID
                  const status = paymentStatus[farmerId] || 'unpaid';
                  
                  return (
                    <tr key={farmerId} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-500 rounded-full flex items-center justify-center text-white font-semibold">
                            {farmer.farmer.charAt(0)}
                          </div>
                          <span className="font-medium text-slate-900 dark:text-white">{farmer.farmer}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                        <span className="font-medium text-slate-900 dark:text-white">{farmer.roomName || 'Room'}</span>
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-slate-900 dark:text-white">
                        {formatNumber(farmer.crates)}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-orange-600 dark:text-orange-400">
                        ₹{formatNumber(farmer.unpaidRevenue)}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
                        ₹{formatNumber(farmer.totalRevenue)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handlePaymentStatusChange(farmerId, status, farmer.unpaidRevenue)}
                          disabled={isSavingPayment}
                          className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors disabled:opacity-50 ${
                            status === 'paid'
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50'
                              : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50'
                          }`}
                        >
                          {isSavingPayment ? 'Saving...' : (status === 'paid' ? 'Paid' : 'Unpaid')}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-50 dark:bg-slate-800/50 border-t-2 border-slate-300 dark:border-slate-600">
                <tr>
                  <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">TOTAL</td>
                  <td className="px-6 py-4"></td>
                  <td className="px-6 py-4 text-right font-bold text-slate-900 dark:text-white">
                    {formatNumber(financeData?.totalCrates)}
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-orange-600 dark:text-orange-400 text-lg">
                    ₹{formatNumber(financeData?.totalUnpaidRevenue || 0)}
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-emerald-600 dark:text-emerald-400 text-lg">
                    ₹{formatNumber(financeData?.totalRevenue)}
                  </td>
                  <td className="px-6 py-4 text-center"></td>
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
