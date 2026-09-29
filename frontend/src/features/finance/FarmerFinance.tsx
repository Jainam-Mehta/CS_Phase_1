import React, { useEffect, useState, useMemo } from 'react';
import { useAuthStore } from '../../stores/useAuthStore';
import { useFarmerStore } from '../../stores/useFarmerStore';
import { useMarketPrices } from '../../hooks/useMarketPrices';
import { supabase } from '../../lib/supabase';
import { Card, CardContent } from '../../components/ui/Card';
import { IndianRupee, LayoutDashboard, TrendingUp, Wallet, Receipt, CreditCard } from 'lucide-react';

// REMOVED: Hardcoded MARKET_TRENDS_DB - now using useMarketPrices hook with live/simulated data

const FarmerFinance: React.FC = () => {
  const { user } = useAuthStore();
  const { activeRoomId, activeProductId } = useFarmerStore();
  
  const [profileId, setProfileId] = useState<string | null>(null);
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Extract unique product names for market price fetching
  const productNames = useMemo(() => {
    return [...new Set(batches.map(b => b.product).filter(Boolean))];
  }, [batches]);

  // Use market prices hook (fetches from API/store with 24hr cache)
  const { getTrend, loading: pricesLoading, error: pricesError } = useMarketPrices(productNames);

  const [storageRate, setStorageRate] = useState<number>(2.5);

  useEffect(() => {
     if (!user?.id || !activeRoomId) {
         setBatches([]);
         setLoading(false);
         return;
     }

     const load = async () => {
         setLoading(true);
         const { data: profile } = await supabase.from('profiles').select('id').eq('id', user.id).maybeSingle();
         if (!profile) return;
         setProfileId(profile.id);

         // Fetch room storage rate dynamically
         const { data: roomData } = await supabase
           .from('cold_storage_rooms')
           .select('storage_rate_per_kg_month')
           .eq('id', activeRoomId)
           .maybeSingle();
         
         if (roomData?.storage_rate_per_kg_month) {
             setStorageRate(Number(roomData.storage_rate_per_kg_month));
         }

         // NEW SCHEMA: Query batch_room_allocations -> batches -> products
         let query = supabase
           .from('batch_room_allocations')
           .select(`
             quantity_kg,
             batches!inner(
               product_id,
               initial_quantity_kg,
               products(name)
             )
           `)
           .eq('room_id', activeRoomId)
           .eq('batches.farmer_id', profile.id)
           .is('removed_at', null);
         
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
         const transformedBatches = allocationData?.map((allocation: any) => {
           const products = allocation.batches.products;
           const productName = Array.isArray(products) ? products[0]?.name : products?.name;
           return {
             product: productName || 'Unknown',
             initial_quantity_kg: allocation.batches.initial_quantity_kg,
             quantity_kg: allocation.quantity_kg
           };
         }) || [];
         
         setBatches(transformedBatches);
         setLoading(false);
     };
     load();
  }, [user?.id, activeRoomId, activeProductId]);

  if (!activeRoomId) {
      return (
        <div className="p-8 max-w-[1400px] mx-auto pt-16 h-[80vh] flex items-center justify-center">
           <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-16 text-center shadow-sm bg-white/50 dark:bg-slate-900/50 backdrop-blur">
              <LayoutDashboard className="w-16 h-16 text-slate-400 mx-auto mb-4 opacity-50" />
              <h2 className="text-xl font-bold text-slate-700 dark:text-slate-200">No Target Found</h2>
              <p className="text-slate-500 max-w-sm mx-auto mt-2">
                 Please select an active storage room on the Dashboard to view accurate contextual financing structurally securely.
              </p>
           </div>
        </div>
      );
  }

  if (loading || pricesLoading) {
      return <div className="p-8"><div className="animate-pulse h-64 bg-slate-100 dark:bg-slate-800 rounded-xl"></div></div>;
  }

  // Calculate Finances using real/simulated market data
  let currentGrossValue = 0;
  let predictedGrossValue = 0;
  let totalKg = 0;

  batches.forEach(b => {
      const kg = b.initial_quantity_kg || 0;
      const trend = getTrend(b.product); // Now fetches from market store with live/simulated data
      totalKg += kg;
      currentGrossValue += (trend.current * kg);
      predictedGrossValue += (trend.predicted * kg);
  });

  // Storage rate dynamically calculated from cold_storage_rooms table
  const storageCharges = totalKg * storageRate;
  const potentialProfit = predictedGrossValue - storageCharges;

  return (
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto min-h-screen">
       <div className="flex items-center gap-3 mb-8">
         <Wallet className="w-8 h-8 text-emerald-500" />
         <div>
           <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Financial Overview</h1>
           <p className="text-slate-500 dark:text-slate-400 mt-1">Estimate asset liquidity constraints determining optimal financial horizons precisely natively.</p>
         </div>
      </div>
      
      {batches.length === 0 ? (
          <Card className="border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur shadow-sm text-center p-16">
             <IndianRupee className="w-12 h-12 text-slate-300 mx-auto mb-4" />
             <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">No Asset Data Found</h3>
             <p className="text-slate-500 text-sm mt-2">Add inventory to this Active Room evaluating dynamic financing explicitly.</p>
          </Card>
      ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
             <Card className="border-none shadow-lg bg-gradient-to-br from-emerald-500 to-emerald-600 text-white transform transition hover:-translate-y-1">
                 <CardContent className="p-6">
                     <div className="flex items-start justify-between mb-4">
                         <div className="p-2 bg-emerald-400/30 rounded-lg">
                             <Wallet className="w-5 h-5" />
                         </div>
                     </div>
                     <p className="text-sm font-bold text-emerald-100 uppercase tracking-widest mb-1">Current Market Value</p>
                     <p className="text-3xl font-extrabold tracking-tight">₹{currentGrossValue.toLocaleString()}</p>
                 </CardContent>
             </Card>

             <Card className="border-none shadow-lg bg-gradient-to-br from-indigo-500 to-indigo-600 text-white transform transition hover:-translate-y-1">
                 <CardContent className="p-6">
                     <div className="flex items-start justify-between mb-4">
                         <div className="p-2 bg-indigo-400/30 rounded-lg">
                             <TrendingUp className="w-5 h-5" />
                         </div>
                     </div>
                     <p className="text-sm font-bold text-indigo-100 uppercase tracking-widest mb-1">Expected Revenue</p>
                     <p className="text-3xl font-extrabold tracking-tight">₹{predictedGrossValue.toLocaleString()}</p>
                 </CardContent>
             </Card>

             <Card className="border-none shadow-lg bg-gradient-to-br from-orange-500 to-orange-600 text-white transform transition hover:-translate-y-1">
                 <CardContent className="p-6">
                     <div className="flex items-start justify-between mb-4">
                         <div className="p-2 bg-orange-400/30 rounded-lg">
                             <Receipt className="w-5 h-5" />
                         </div>
                     </div>
                     <p className="text-sm font-bold text-orange-100 uppercase tracking-widest mb-1">Est. Storage Charges</p>
                     <p className="text-3xl font-extrabold tracking-tight">₹{storageCharges.toLocaleString()}</p>
                 </CardContent>
             </Card>

             <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm transform transition hover:-translate-y-1">
                 <CardContent className="p-6">
                     <div className="flex items-start justify-between mb-4">
                         <div className="p-2 bg-blue-50 dark:bg-blue-900/40 rounded-lg text-blue-600">
                             <CreditCard className="w-5 h-5" />
                         </div>
                     </div>
                     <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Potential Net Profit</p>
                     <p className={`text-3xl font-extrabold tracking-tight ${potentialProfit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                         ₹{potentialProfit.toLocaleString()}
                     </p>
                 </CardContent>
             </Card>
          </div>
      )}
    </div>
  );
};

export default FarmerFinance;
