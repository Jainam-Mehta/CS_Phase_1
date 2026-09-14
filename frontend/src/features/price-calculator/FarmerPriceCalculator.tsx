import React, { useEffect, useState, useMemo } from 'react';
import { useAuthStore } from '../../stores/useAuthStore';
import { useFarmerStore } from '../../stores/useFarmerStore';
import { useMarketPrices } from '../../hooks/useMarketPrices';
import { supabase } from '../../lib/supabase';
import { Card, CardContent } from '../../components/ui/Card';
import { Calculator, TrendingUp, IndianRupee, PieChart, Activity, Clock, Percent } from 'lucide-react';

// REMOVED: Hardcoded MARKET_TRENDS_DB - now using useMarketPrices hook with live/simulated data
// Note: This entire component is hidden via FEATURE_FLAGS.PRICE_CALCULATOR
// Kept for future when ML predictions are re-enabled

const FarmerPriceCalculator: React.FC = () => {
  const { user } = useAuthStore();
  const { activeRoomId, activeProductId } = useFarmerStore();
  
  const [profileId, setProfileId] = useState<string | null>(null);
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Extract unique product names for market price fetching
  const productNames = useMemo(() => {
    return [...new Set(batches.map(b => b.product).filter(Boolean))];
  }, [batches]);

  // Use market prices hook (fetches from API/store with 24hr cache)
  const { getTrend, loading: pricesLoading, error: pricesError } = useMarketPrices(productNames);

  const [storageCostPerKg, setStorageCostPerKg] = useState<number>(2.5);

  useEffect(() => {
     if (!user?.id) {
         setLoading(false);
         return;
     }

     const load = async () => {
         setLoading(true);
         const { data: profile } = await supabase.from('profiles').select('id').eq('auth_user_id', user.id).maybeSingle();
         if (!profile) return;
         setProfileId(profile.id);

         if (activeRoomId) {
             const { data: roomData } = await supabase
               .from('cold_storage_rooms')
               .select('storage_rate_per_kg_month')
               .eq('id', activeRoomId)
               .maybeSingle();

             if (roomData?.storage_rate_per_kg_month) {
                 setStorageCostPerKg(Number(roomData.storage_rate_per_kg_month));
             }
         }

         // NEW SCHEMA: Query batch_room_allocations -> batches -> products
         let query = supabase
           .from('batch_room_allocations')
           .select(`
             quantity_kg,
             assigned_at,
             removed_at,
             batches!inner(
               id,
               batch_code,
               farmer_id,
               product_id,
               harvest_date,
               expiry_date,
               initial_quantity_kg,
               remaining_quantity_kg,
               quality_grade,
               remarks,
               created_at,
               products(name)
             )
           `)
           .eq('batches.farmer_id', profile.id)
           .is('removed_at', null);
         
         if (activeRoomId) query = query.eq('room_id', activeRoomId);
         
         if (activeProductId) {
             // If filtering by product, we need to get the product_id first
             const { data: productData } = await supabase
               .from('products')
               .select('id')
               .eq('name', activeProductId)
               .single();
             
             if (productData) {
                 query = query.eq('batches.product_id', productData.id);
             }
         }

         const { data: allocationData } = await query;
         
         // Transform to match expected structure
         const transformedBatches = allocationData?.map((allocation: any) => ({
             ...allocation.batches,
             room_id: allocation.room_id,
             quantity_kg: allocation.quantity_kg,
             assigned_at: allocation.assigned_at,
             product: Array.isArray(allocation.batches.products) ? allocation.batches.products[0]?.name : allocation.batches.products?.name || 'Unknown',
             status: 'Stored'
         })) || [];
         
         setBatches(transformedBatches);
         setLoading(false);
     };

     load();
  }, [user?.id, activeRoomId, activeProductId]);

  if (loading || pricesLoading) {
      return <div className="p-8"><div className="animate-pulse h-64 bg-slate-100 dark:bg-slate-800 rounded-xl"></div></div>;
  }

  // Storage cost dynamically evaluated from cold_storage_rooms table
  let totalCurrentValue = 0;
  let totalFutureValue = 0;
  let totalStorageCost = 0;
  let optimalKgSoldNow = 0;

  batches.forEach(b => {
      const kg = b.initial_quantity_kg || 0;
      const productName = b.product || b.products?.name || 'Unknown';
      const trend = getTrend(productName); // Now fetches from market store
      
      totalCurrentValue += (kg * trend.current);
      totalFutureValue += (kg * trend.predicted);
      totalStorageCost += (kg * storageCostPerKg);
      
      if (trend.predicted <= trend.current) {
          optimalKgSoldNow += kg;
      }
  });

  const aggregateProfitNow = totalCurrentValue;
  const aggregateProfitFuture = totalFutureValue - totalStorageCost;
  const roi = totalFutureValue > 0 ? ((aggregateProfitFuture - totalCurrentValue) / totalCurrentValue) * 100 : 0;

  return (
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto min-h-screen">
       <div className="flex items-center gap-3 mb-8">
         <Calculator className="w-8 h-8 text-indigo-500" />
         <div>
           <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">AI Price Analytics</h1>
           <p className="text-slate-500 dark:text-slate-400 mt-1">Algorithmic sales timeline mapping dynamically generated from live perishable batches.</p>
         </div>
      </div>
      
      {batches.length === 0 ? (
          <Card className="border border-slate-200 dark:border-slate-800 bg-transparent shadow-none text-center p-16">
             <Activity className="w-12 h-12 text-slate-300 mx-auto mb-4" />
             <h3 className="text-lg font-bold text-slate-700 dark:text-slate-400">Analytics Engine Offline</h3>
             <p className="text-slate-500 text-sm mt-2">Add stored batches via Inventory to fuel the AI predictive tracking engine.</p>
          </Card>
      ) : (
          <>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                 <Card className="border border-slate-200 dark:border-slate-700 shadow-sm bg-white dark:bg-slate-800">
                     <CardContent className="p-6">
                         <div className="flex items-start justify-between mb-4"><div className="p-2 bg-slate-50 dark:bg-slate-900 rounded-lg"><IndianRupee className="w-5 h-5 text-slate-500"/></div></div>
                         <p className="text-xs uppercase tracking-widest font-bold text-slate-500 mb-1">Total Current Value</p>
                         <p className="text-3xl font-extrabold text-slate-900 dark:text-white">₹{totalCurrentValue.toLocaleString()}</p>
                     </CardContent>
                 </Card>
                 <Card className="border border-indigo-200 dark:border-indigo-900/50 shadow-sm bg-indigo-50/50 dark:bg-indigo-900/10">
                     <CardContent className="p-6">
                         <div className="flex items-start justify-between mb-4"><div className="p-2 bg-white dark:bg-slate-900 rounded-lg"><TrendingUp className="w-5 h-5 text-indigo-500"/></div></div>
                         <p className="text-xs uppercase tracking-widest font-bold text-slate-500 mb-1">Predicted Value</p>
                         <p className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400">₹{totalFutureValue.toLocaleString()}</p>
                     </CardContent>
                 </Card>
                 <Card className="border border-slate-200 dark:border-slate-700 shadow-sm bg-white dark:bg-slate-800">
                     <CardContent className="p-6">
                         <div className="flex items-start justify-between mb-4"><div className="p-2 bg-slate-50 dark:bg-slate-900 rounded-lg"><PieChart className="w-5 h-5 text-slate-500"/></div></div>
                         <p className="text-xs uppercase tracking-widest font-bold text-slate-500 mb-1">Cost Overheads</p>
                         <p className="text-3xl font-extrabold text-slate-900 dark:text-white">₹{totalStorageCost.toLocaleString()}</p>
                     </CardContent>
                 </Card>
                 <Card className="border border-emerald-200 dark:border-emerald-900/50 shadow-sm bg-emerald-50/50 dark:bg-emerald-900/10">
                     <CardContent className="p-6">
                         <div className="flex items-start justify-between mb-4"><div className="p-2 bg-white dark:bg-slate-900 rounded-lg"><Percent className="w-5 h-5 text-emerald-500"/></div></div>
                         <p className="text-xs uppercase tracking-widest font-bold text-slate-500 mb-1">Expected ROI</p>
                         <p className={`text-3xl font-extrabold ${roi > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                             {roi > 0 ? '+' : ''}{roi.toFixed(1)}%
                         </p>
                     </CardContent>
                 </Card>
             </div>

             <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Algorithm Action Hooks</h2>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {batches.map(b => {
                     const trend = getTrend(b.product); // Now fetches from market store
                     const positive = trend.predicted > trend.current;
                     
                     // Determine optimal action window based on price trend
                     let window = 'Hold';
                     if (trend.predicted > trend.current * 1.1) {
                         window = 'Wait 7-14 Days';
                     } else if (trend.predicted < trend.current) {
                         window = 'Sell Immediately';
                     }

                     return (
                         <Card key={b.id} className="border border-slate-200 dark:border-slate-700 shadow-sm hover:border-indigo-300 transition-colors">
                             <CardContent className="p-6">
                                 <div className="flex justify-between items-start mb-4">
                                     <h3 className="text-xl font-bold text-slate-900 dark:text-white capitalize">{b.product} <span className="text-sm font-medium text-slate-400">({b.initial_quantity_kg}kg)</span></h3>
                                     <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${positive ? 'bg-indigo-50 text-indigo-700' : 'bg-orange-50 text-orange-700'}`}>
                                         {window}
                                     </span>
                                 </div>
                                 <div className="flex justify-between items-end mb-4">
                                     <div>
                                         <p className="text-xs uppercase tracking-widest font-bold text-slate-400">Current Value</p>
                                         <p className="font-bold text-lg dark:text-white">₹{(trend.current * b.initial_quantity_kg).toLocaleString()}</p>
                                     </div>
                                     <div className="text-right">
                                         <p className="text-xs uppercase tracking-widest font-bold text-slate-400">Projected Value</p>
                                         <p className={`font-bold text-lg ${positive ? 'text-emerald-500' : 'text-red-500'}`}>
                                             ₹{(trend.predicted * b.initial_quantity_kg).toLocaleString()}
                                         </p>
                                     </div>
                                 </div>
                             </CardContent>
                         </Card>
                     );
                 })}
             </div>
          </>
      )}
    </div>
  );
};

export default FarmerPriceCalculator;
