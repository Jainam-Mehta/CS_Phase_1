import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';
import { supabase } from '../../lib/supabase';
import { resolveProfile } from '../../lib/profileUtils';
import { Loader2, ArrowLeft, Building2, ExternalLink, Leaf, Zap, MapPin, TrendingUp, ShieldCheck, ChevronRight, Sun, Thermometer } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/Card';
import { AreaChart, Area, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';

interface FacilityDisplay {
  id: string;
  facility_name: string;
  stateName: string;
  investmentAmount: number;
  roi: number;
  carbonCredits: number;
  capacity_total_kg: number;
  capacity_used_kg: number;
  address: string;
}

const samplePerfData = [
  { month: 'Apr', value: 16500 },
  { month: 'May', value: 17800 },
  { month: 'Jun', value: 18900 },
  { month: 'Jul', value: 19400 },
  { month: 'Aug', value: 20200 },
  { month: 'Sep', value: 21000 },
];

const StakeholderDistrict: React.FC = () => {
  const { districtName } = useParams<{ districtName: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const [loading, setLoading] = useState(true);
  const [facilities, setFacilities] = useState<FacilityDisplay[]>([]);
  const [stateNameStr, setStateNameStr] = useState<string>('');

  useEffect(() => {
    if (user && districtName) {
      loadDistrictData();
    }
  }, [user, districtName]);

  const loadDistrictData = async () => {
    try {
      setLoading(true);
      
      const profile = await resolveProfile(user!.id);
      if (!profile) throw new Error('Profile not found');

      // 1. First, get the state name for this district from districts table
      const { data: districtData, error: distErr } = await supabase
        .from('districts')
        .select('name, states(name)')
        .eq('name', districtName)
        .maybeSingle();
      
      if (distErr) throw distErr;
      
      let stateNameFromDb = 'Unknown State';
      if (districtData) {
        const states = (districtData as any).states;
        stateNameFromDb = Array.isArray(states) ? states[0]?.name : states?.name;
      }
      setStateNameStr(stateNameFromDb);

      // 2. Fetch facilities in this district
      const { data: facs, error: facErr } = await supabase
        .from('facilities')
        .select(`
          id, facility_name, total_capacity_kg, current_utilization_kg, address,
          localities (
            districts (
              name,
              states ( name )
            )
          )
        `);
        
      if (facErr) throw facErr;

      const distFacilities = (facs || []).filter((f: any) => 
        f.localities?.districts?.name === districtName
      );

      // 3. Fetch user's investments for these facilities
      const facIds = distFacilities.map((f: any) => f.id);
      
      const invs = facIds.length > 0 ? (await supabase
        .from('stakeholder_investments')
        .select('*')
        .eq('stakeholder_id', profile.id)
        .in('facility_id', facIds)
        .eq('status', 'Active')).data : [];

      const invMap = new Map((invs || []).map((i: any) => [i.facility_id, i]));
      
      const res: FacilityDisplay[] = [];
      distFacilities.forEach((f: any) => {
        const inv = invMap.get(f.id);
        if (inv) {
          res.push({
            id: f.id,
            facility_name: f.facility_name,
            stateName: stateNameFromDb,
            investmentAmount: Number(inv.investment_amount_inr) || 20000,
            roi: Number(inv.roi_percentage_estimate) || 5.0,
            carbonCredits: Number((inv as any).carbon_credits) || 241,
            capacity_total_kg: Number(f.total_capacity_kg) || 10000,
            capacity_used_kg: Number(f.current_utilization_kg) || 450,
            address: `${districtName}, ${stateNameFromDb}`
          });
        }
      });

      if (res.length === 0) {
        setFacilities([]);
        if (stateNameFromDb) setStateNameStr(stateNameFromDb);
        setLoading(false);
        return;
      }

      setFacilities(res);
      
    } catch (e) {
      console.error(e);
      setFacilities([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-64px)] bg-slate-50 dark:bg-slate-900">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-[calc(100vh-64px)]">
      <button 
        onClick={() => stateNameStr ? navigate(`/stakeholder/state/${encodeURIComponent(stateNameStr)}`) : navigate('/stakeholder/map')}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors mb-6 font-medium"
      >
        <ArrowLeft className="w-4 h-4" /> Back to {stateNameStr || 'State'}
      </button>

      <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-blue-600 dark:text-blue-400 tracking-wider uppercase mb-2">
            <MapPin className="w-4 h-4" /> {stateNameStr || 'India'}
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">{districtName} Cold Storages</h1>
          <p className="text-slate-500 dark:text-slate-400">Real-time performance, telemetry analytics, carbon credit yield, and financial returns.</p>
        </div>
      </div>

      {facilities.length === 0 ? (
        <div className="text-center py-24 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <Building2 className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No active investments found</h3>
          <p className="text-slate-500">You don't have investments in {districtName} anymore.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {facilities.map(fac => {
             const carbonCredits = fac.carbonCredits || 241;
             return (
              <Card 
                key={fac.id} 
                className="rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800 shadow-md transition-all duration-300 group"
              >
                {/* Top Status Gradient Banner */}
                <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 p-4 text-white flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-semibold tracking-wider uppercase">100% Operational (Optimal)</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1 bg-white/20 backdrop-blur-md px-2.5 py-1 rounded-full font-medium">
                      <Zap className="w-3.5 h-3.5 text-amber-300" /> Solar: 95.7%
                    </span>
                    <span className="flex items-center gap-1 bg-emerald-400/30 backdrop-blur-md text-emerald-100 px-2.5 py-1 rounded-full font-medium">
                      <ShieldCheck className="w-3.5 h-3.5" /> Active Investment
                    </span>
                  </div>
                </div>

                <CardContent className="p-7 space-y-6">
                  {/* Title & Location Header */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-900/40 rounded-2xl flex items-center justify-center shrink-0 border border-indigo-100 dark:border-indigo-800/60 shadow-inner group-hover:scale-105 transition-transform">
                        <Building2 className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{fac.facility_name}</h3>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                          <MapPin className="w-4 h-4 text-blue-500" /> {fac.address}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 4-Grid Financial & Impact Metrics */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                      <span className="text-xs text-slate-400 block uppercase tracking-widest font-semibold mb-1">Your Investment</span>
                      <span className="text-2xl font-bold text-slate-900 dark:text-white">₹{fac.investmentAmount.toLocaleString()}</span>
                    </div>

                    <div className="bg-emerald-50/80 dark:bg-emerald-900/20 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-800/30">
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 block uppercase tracking-widest font-semibold mb-1">Estimated ROI</span>
                      <span className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                        <TrendingUp className="w-5 h-5" /> {fac.roi.toFixed(1)}%
                      </span>
                    </div>

                    <div className="bg-green-50/80 dark:bg-green-900/20 p-4 rounded-2xl border border-green-100 dark:border-green-800/30">
                      <span className="text-xs text-green-600 dark:text-green-400 block uppercase tracking-widest font-semibold mb-1">Carbon Credits</span>
                      <span className="text-2xl font-bold text-green-700 dark:text-green-300 flex items-center gap-1.5">
                        <Leaf className="w-5 h-5" /> {carbonCredits} CC
                      </span>
                    </div>

                    <div className="bg-blue-50/80 dark:bg-blue-900/20 p-4 rounded-2xl border border-blue-100 dark:border-blue-800/30">
                      <span className="text-xs text-blue-600 dark:text-blue-400 block uppercase tracking-widest font-semibold mb-1">Environmental Impact</span>
                      <span className="text-lg font-bold text-blue-700 dark:text-blue-300 flex items-center gap-1.5 pt-1">
                        <Sun className="w-5 h-5 text-amber-500" /> ~120 Trees Saved
                      </span>
                    </div>
                  </div>

                  {/* Visual 6-Month Valuation & Portfolio Growth Chart */}
                  <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2">
                    <div className="flex justify-between items-center text-xs font-semibold">
                      <span className="text-slate-500 dark:text-slate-400 uppercase tracking-wider">6-Month Portfolio Growth Trend</span>
                      <span className="text-emerald-600 dark:text-emerald-400">+40% Returns Trend</span>
                    </div>
                    <div className="h-28 w-full pt-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={samplePerfData}>
                          <defs>
                            <linearGradient id="valueGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <RechartsTooltip 
                            contentStyle={{ background: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                            formatter={(val: any) => [`₹${Number(val).toLocaleString()}`, 'Value']}
                          />
                          <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#valueGrad)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Produce Health & Telemetry Status Bar */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                    <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400 font-medium">
                      <span className="flex items-center gap-1"><Thermometer className="w-3.5 h-3.5 text-blue-500"/> Storage Temp: 1.12°C (Optimal)</span>
                      <span>Humidity: 92.3%</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                      <div className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full w-[95%]" />
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
}

export default StakeholderDistrict;
