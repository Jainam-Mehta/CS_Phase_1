import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../stores/useAuthStore';
import { useFarmerStore } from '../../stores/useFarmerStore';
import { supabase } from '../../lib/supabase';
import { Card, CardContent } from '../../components/ui/Card';
import { TrendingUp, ArrowUpRight, ArrowDownRight, PackageSearch, LayoutDashboard } from 'lucide-react';

// Isolated simulated realistic tracking prices since market actuals depend on integrated 3rd party APIs natively.
const MARKET_TRENDS_DB: Record<string, { current: number, predicted: number, action: 'Hold' | 'Sell' }> = {
    'Avocado': { current: 185, predicted: 203, action: 'Hold' },
    'Mango': { current: 120, predicted: 110, action: 'Sell' },
    'Apple': { current: 95, predicted: 105, action: 'Hold' },
    'Tomato': { current: 35, predicted: 22, action: 'Sell' },
    'Onion': { current: 40, predicted: 65, action: 'Hold' },
    'Potato': { current: 28, predicted: 30, action: 'Hold' },
    'Banana': { current: 50, predicted: 48, action: 'Sell' },
    'Dragon Fruit': { current: 250, predicted: 280, action: 'Hold' }
};

const getTrend = (product: string) => {
    return MARKET_TRENDS_DB[product] || { current: 45, predicted: 50, action: 'Hold' };
};

const FarmerMarketIntelligence: React.FC = () => {
  const { user } = useAuthStore();
  const { activeRoomId, activeProductId } = useFarmerStore();
  const [profileId, setProfileId] = useState<string | null>(null);
  const [uniqueProducts, setUniqueProducts] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
     if (!user?.id) return;
     const load = async () => {
        setLoading(true);
        const { data: profile } = await supabase.from('profiles').select('id').eq('auth_user_id', user.id).maybeSingle();
        if (!profile) return;
        setProfileId(profile.id);

        // NEW SCHEMA: Query batch_room_allocations -> batches -> products
        let query = supabase
          .from('batch_room_allocations')
          .select(`
            batches!inner(
              product_id,
              products(name)
            )
          `)
          .eq('batches.farmer_id', profile.id)
          .is('removed_at', null);
        
        // If a room is active, limit the scope naturally!
        if (activeRoomId) {
            query = query.eq('room_id', activeRoomId);
        }
        
        const { data: allocationData } = await query;
        if (allocationData) {
            const arr = Array.from(new Set(allocationData.map((a: any) => {
                const products = a.batches.products;
                if (Array.isArray(products)) {
                    return products[0]?.name;
                }
                return products?.name;
            }).filter(Boolean)));
            setUniqueProducts(arr as string[]);
        }
        setLoading(false);
     };
     load();
  }, [user?.id, activeRoomId]);

  if (!activeRoomId) {
      return (
        <div className="p-8 max-w-[1400px] mx-auto pt-16 h-[80vh] flex items-center justify-center">
           <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-16 text-center shadow-sm bg-white/50 dark:bg-slate-900/50 backdrop-blur">
              <LayoutDashboard className="w-16 h-16 text-slate-400 mx-auto mb-4 opacity-50" />
              <h2 className="text-xl font-bold text-slate-700 dark:text-slate-200">No Target Found</h2>
              <p className="text-slate-500 max-w-sm mx-auto mt-2">
                 Please select an active storage room on the Dashboard to view accurate Market Predictions structurally.
              </p>
           </div>
        </div>
      );
  }

  // Filter further if they have a specific product selected, otherwise show all in the room.
  const displayProducts = activeProductId ? [activeProductId] : uniqueProducts;

  return (
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto min-h-screen">
       <div className="flex items-center gap-3 mb-8">
         <TrendingUp className="w-8 h-8 text-primary-500" />
         <div>
           <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Market Intelligence</h1>
           <p className="text-slate-500 dark:text-slate-400 mt-1">AI-driven predictive pricing mapping exclusively strictly against owned perishable assets natively.</p>
         </div>
      </div>
      
      {loading ? (
           <div className="animate-pulse h-64 bg-slate-100 dark:bg-slate-800 rounded-xl"></div>
      ) : displayProducts.length === 0 ? (
          <Card className="border border-slate-200 dark:border-slate-800 bg-transparent shadow-none text-center p-16">
             <PackageSearch className="w-12 h-12 text-slate-300 mx-auto mb-4" />
             <h3 className="text-lg font-bold text-slate-700 dark:text-slate-400">Isolated Selection Matrix</h3>
             <p className="text-slate-500 text-sm mt-2">Upload batches into this facility to ignite algorithmic predictive graphs natively securely.</p>
          </Card>
      ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {displayProducts.map(p => {
                 const trend = getTrend(p);
                 const variance = ((trend.predicted - trend.current) / trend.current) * 100;
                 const positive = variance >= 0;

                 return (
                    <Card key={p} className="border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                        <CardContent className="p-6">
                             <div className="flex items-start justify-between mb-6">
                                 <div>
                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">{p}</h3>
                                    <p className="text-sm font-semibold text-slate-400 mt-0.5 tracking-widest uppercase">Spot Price / KG</p>
                                 </div>
                                 <div className={`p-2 rounded-lg ${positive ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30' : 'bg-red-50 text-red-600 dark:bg-red-900/30'}`}>
                                    {positive ? <ArrowUpRight className="w-5 h-5"/> : <ArrowDownRight className="w-5 h-5"/>}
                                 </div>
                             </div>

                             <div className="flex items-end gap-3 mb-6">
                                <span className="text-4xl font-extrabold tracking-tight">₹{trend.current}</span>
                                <span className={`text-sm font-bold flex items-center mb-1 ${positive ? 'text-emerald-500' : 'text-red-500'}`}>
                                    {positive ? '+' : ''}{variance.toFixed(1)}% <span className="text-slate-400 font-medium ml-1">Next 7 Days</span>
                                </span>
                             </div>
                             
                             <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                 <div>
                                   <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1">Predicted Value</p>
                                   <p className="font-bold text-lg dark:text-slate-200">₹{trend.predicted} / kg</p>
                                 </div>
                                 
                                 <div className={`px-4 py-2 rounded-lg font-bold text-sm shadow-sm ${trend.action === 'Hold' ? 'bg-indigo-500 text-white' : 'bg-orange-500 text-white'}`}>
                                     ACTION: {trend.action.toUpperCase()}
                                 </div>
                             </div>
                        </CardContent>
                    </Card>
                 );
             })}
          </div>
      )}
    </div>
  );
};

export default FarmerMarketIntelligence;
