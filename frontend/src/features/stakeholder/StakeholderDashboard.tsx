import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';
import { supabase } from '../../lib/supabase';
import { resolveProfile } from '../../lib/profileUtils';
import { 
  Loader2, ArrowLeft, Building2, TrendingUp, AlertCircle, 
  Leaf, Activity, Thermometer, Droplets, Zap, DoorOpen, 
  Download, Filter, Share2, BarChart4, DollarSign, Package
} from 'lucide-react';

interface FullAccessDashboardProps {}

const StakeholderDashboard: React.FC<FullAccessDashboardProps> = () => {
  const { facilityId } = useParams<{ facilityId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const [loading, setLoading] = useState(true);
  const [facility, setFacility] = useState<any>(null);
  const [investment, setInvestment] = useState<any>(null);
  
  // Real-time telemetry simulated or fetched
  const [telemetry, setTelemetry] = useState({
     temperature: 2.4,
     humidity: 88,
     energyKwh: 342,
     doorStatus: 'Closed' as 'Open' | 'Closed',
     status: 'Optimal'
  });

  const [alerts, setAlerts] = useState<any[]>([]);

  useEffect(() => {
    if (user && facilityId) {
       loadFacilityData();
    }
  }, [user, facilityId]);

  const loadFacilityData = async () => {
    try {
      setLoading(true);
      const profile = await resolveProfile(user!.id);
      if (!profile) {
        setLoading(false);
        return;
      }

      const { data: fac, error: facError } = await supabase
        .from('facilities')
        .select(`
          id, facility_name, capacity_total_kg, capacity_used_kg, address, owner_profile_id, status,
          localities ( name, districts ( name, states ( name ) ) )
        `)
        .eq('id', facilityId)
        .maybeSingle();
        
      if (facError) {
        console.error("Error loading facility:", facError);
      }
      
      const { data: inv, error: invError } = await supabase
        .from('stakeholder_investments')
        .select('*')
        .eq('stakeholder_id', profile.id)
        .eq('facility_id', facilityId)
        .eq('status', 'Active')
        .maybeSingle();

      if (invError) {
        console.error("Error loading investment:", invError);
      }

      if (fac) setFacility(fac);
      if (inv) setInvestment(inv);

      // Try to get latest alerts (non-blocking)
      try {
        const { data: alData } = await supabase
          .from('alerts')
          .select('*')
          .eq('status', 'Unresolved')
          .order('created_at', { ascending: false })
          .limit(3);
        
        setAlerts(alData || []);
      } catch (alertError) {
        console.error("Error loading alerts:", alertError);
        setAlerts([]);
      }

    } catch (e) {
      console.error("Error in loadFacilityData:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = (type: string, format: string) => {
    // In production, this would trigger an edge function or PDF rendering pipeline
    alert(`Generating ${type} report as ${format}...`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-64px)] bg-slate-50 dark:bg-slate-900">
         <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (!facility || !investment) {
     return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-64px)] bg-slate-50 dark:bg-slate-900">
         <AlertCircle className="w-16 h-16 text-rose-500 mb-4" />
         <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Access Denied</h2>
         <p className="text-slate-500 max-w-md text-center mt-2">You do not have active investment access to this facility.</p>
         <button onClick={() => navigate('/stakeholder/map')} className="mt-6 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium">Return to Map</button>
      </div>
     );
  }

  const occPct = facility.capacity_total_kg > 0 ? (facility.capacity_used_kg / facility.capacity_total_kg) * 100 : 0;
  const stateStr = facility.localities?.districts?.states?.name || 'State';
  const districtStr = facility.localities?.districts?.name || 'District';
  const capVal = Number(investment.investment_amount_inr) || 0;
  const roiVal = Number(investment.roi_percentage_estimate) || 0;
  
  // Real-time calculated estimates (financial & carbon)
  const estProfitMonthly = capVal * (roiVal / 100) / 12;
  const estCarbonCredits = Math.floor(capVal / 50000); // Dummy generation
  const treeEq = (estCarbonCredits * 0.05).toFixed(1);

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto min-h-[calc(100vh-64px)]">
      
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-8 gap-6">
        <div>
          <button 
            onClick={() => navigate(`/stakeholder/district/${encodeURIComponent(districtStr)}`)}
            className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors mb-4 font-medium"
          >
            <ArrowLeft className="w-4 h-4" /> Back to {districtStr}
          </button>
          <div className="flex items-center gap-3 mb-2">
             <span className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase">
               Active Portfolio
             </span>
             <span className={facility.status === 'Active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase' : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 px-3 py-1 rounded-full text-xs font-bold uppercase'}>
               System {facility.status || 'Active'}
             </span>
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
            {facility.facility_name}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-base md:text-lg flex items-center gap-2">
            <Building2 className="w-5 h-5"/> {facility.address} &middot; {districtStr}, {stateStr}
          </p>
        </div>

        <div className="flex items-center gap-3 w-full lg:w-auto overflow-x-auto pb-2 lg:pb-0">
          <div className="flex flex-col">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1 px-1">Generate Report</label>
          <div className="flex bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-1 shadow-sm">
             <button onClick={() => handleExport('Monthly', 'PDF')} className="px-4 py-2 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-300 transition-colors">Monthly</button>
             <button onClick={() => handleExport('Quarterly', 'Excel')} className="px-4 py-2 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-300 transition-colors">Quarterly</button>
             <button onClick={() => handleExport('Yearly', 'CSV')} className="px-4 py-2 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-300 transition-colors">Yearly</button>
          </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
        {/* Core Financial KPIs */}
        <div className="lg:col-span-1 space-y-6">
           <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl p-6 text-white shadow-xl shadow-indigo-500/20 relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full blur-2xl transform translate-x-1/2 -translate-y-1/2" />
             <h4 className="text-indigo-100 font-medium uppercase tracking-wider text-xs mb-1">Your Investment</h4>
             <div className="text-4xl font-black mb-4">₹{capVal.toLocaleString()}</div>
             
             <div className="flex justify-between items-end border-t border-indigo-400/30 pt-4">
               <div>
                 <p className="text-indigo-200 text-xs uppercase mb-1">Est. ROI</p>
                 <p className="font-bold text-xl">{roiVal.toFixed(2)}%</p>
               </div>
               <div className="text-right">
                 <p className="text-indigo-200 text-xs uppercase mb-1">Monthly Yield</p>
                 <p className="font-bold text-xl text-emerald-300">+₹{estProfitMonthly.toLocaleString(undefined, {maximumFractionDigits:0})}</p>
               </div>
             </div>
           </div>

           {/* Carbon Highlights */}
           <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 shadow-sm group hover:border-emerald-500/30 transition-all flex flex-col justify-between h-full"> 
             <div>
               <div className="flex justify-between items-start mb-4">
                 <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl flex items-center justify-center text-emerald-500">
                    <Leaf className="w-6 h-6" />
                 </div>
                 <span className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 font-bold px-3 py-1 text-xs rounded-full uppercase">Certified</span>
               </div>
               
               <h4 className="text-slate-500 dark:text-slate-400 font-medium text-xs uppercase tracking-wider mb-1">Total CC Earned</h4>
               <div className="text-4xl font-black text-slate-900 dark:text-white mb-4">{estCarbonCredits.toLocaleString()} <span className="text-xl text-emerald-500 font-medium">CC</span></div>
               
               <div className="grid grid-cols-2 gap-2 mb-4">
                 <div className="bg-slate-50 dark:bg-slate-900 p-2 rounded-xl border border-slate-100 dark:border-slate-700/50">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">CO2 Saved</span>
                    <div className="text-sm font-bold text-slate-700 dark:text-slate-200">{(estCarbonCredits * 1.5).toLocaleString()} Tons</div>
                 </div>
                 <div className="bg-emerald-50 dark:bg-emerald-900/10 p-2 rounded-xl border border-emerald-100 dark:border-emerald-800/30">
                    <span className="text-[10px] text-emerald-600/70 dark:text-emerald-400 uppercase font-semibold">Est. Value</span>
                    <div className="text-sm font-bold text-emerald-700 dark:text-emerald-300">₹{(estCarbonCredits * 3500).toLocaleString()}</div>
                 </div>
               </div>
               <p className="text-xs text-slate-500 flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5 text-emerald-500"/> Approx. {treeEq} Lakh Trees Saved Equivalent</p>
             </div>
             
             <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest block mb-2">Historical Growth Trend</span>
                <div className="w-full h-10 flex items-end justify-between gap-1">
                   {[10, 15, 25, 30, 45, 60, 85, 100].map((h, i) => (
                      <div key={i} className="flex-1 bg-emerald-100 dark:bg-emerald-900/30 rounded-t-sm relative group hover:bg-emerald-500 transition-colors" style={{ height: `${h}%` }}>
                         <div className="hidden group-hover:block absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] py-0.5 px-1.5 rounded">{h}%</div>
                      </div>
                   ))}
                </div>
             </div>
           </div>
        </div>

        {/* Operational & Real-Time Monitoring */}
        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6">
          
           {/* Occupancy and Scale */}
           <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-3xl border border-slate-200 dark:border-slate-700 rounded-3xl p-6 md:p-8 flex flex-col justify-between shadow-sm">
             <div>
               <div className="flex justify-between items-start mb-2">
                 <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2"><Package className="w-5 h-5 text-blue-500"/> Storage Occupancy</h3>
                 <span className="bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 font-bold px-3 py-1 rounded-full text-sm">{occPct.toFixed(1)}%</span>
               </div>
               <p className="text-sm text-slate-500">Total volumetric usage against aggregate active chambers.</p>
             </div>
             
             <div className="mt-8">
                <div className="w-full h-8 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden p-1">
                   <div 
                      className="h-full bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full relative"
                      style={{ width: `${Math.min(occPct, 100)}%` }}
                   >
                     <div className="absolute inset-0 bg-white/20 w-full h-full" style={{ backgroundImage: 'linear-gradient(45deg, rgba(255,255,255,0.15) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0.15) 75%, transparent 75%, transparent)', backgroundSize: '1rem 1rem' }}></div>
                   </div>
                </div>
                <div className="flex justify-between mt-3 text-sm font-semibold">
                  <span className="text-slate-900 dark:text-white">{facility.capacity_used_kg.toLocaleString()} kg Used</span>
                  <span className="text-slate-400">{facility.capacity_total_kg.toLocaleString()} kg Max</span>
                </div>
             </div>
           </div>

           {/* Live Telemetry Mini-Widgets Matrix */}
           <div className="grid grid-cols-2 gap-4">
             <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl p-5 shadow-sm flex flex-col justify-center">
                <div className="w-10 h-10 bg-rose-50 dark:bg-rose-900/20 rounded-xl flex items-center justify-center text-rose-500 mb-3"><Thermometer className="w-5 h-5"/></div>
                <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">Avg Core Temp</p>
                <div className="text-2xl font-black text-slate-900 dark:text-white">{telemetry.temperature}°C</div>
             </div>
             <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl p-5 shadow-sm flex flex-col justify-center">
                <div className="w-10 h-10 bg-sky-50 dark:bg-sky-900/20 rounded-xl flex items-center justify-center text-sky-500 mb-3"><Droplets className="w-5 h-5"/></div>
                <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">Avg Humidity</p>
                <div className="text-2xl font-black text-slate-900 dark:text-white">{telemetry.humidity}%</div>
             </div>
             <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl p-5 shadow-sm flex flex-col justify-center">
                <div className="w-10 h-10 bg-amber-50 dark:bg-amber-900/20 rounded-xl flex items-center justify-center text-amber-500 mb-3"><Zap className="w-5 h-5"/></div>
                <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">Daily Energy</p>
                <div className="text-2xl font-black text-slate-900 dark:text-white">{telemetry.energyKwh} <span className="text-sm font-medium text-slate-400">kWh</span></div>
             </div>
             <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl p-5 shadow-sm flex flex-col justify-center">
                <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center text-slate-500 mb-3"><DoorOpen className="w-5 h-5"/></div>
                <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">Facility Access</p>
                <div className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></span> Secured
                </div>
             </div>
           </div>
        </div>
      </div>

      {/* Advanced Modules area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 shadow-sm">
           <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">AI Revenue Forecast</h3>
              <BarChart4 className="text-indigo-500 w-5 h-5" />
           </div>
           
           <div className="h-48 border-b border-l border-slate-200 dark:border-slate-700 mb-4 flex items-end justify-between px-2 pb-2 relative">
              {/* Dummy Forecast Graph */}
              <div className="absolute inset-0 z-0 flex flex-col justify-between text-xs text-slate-300 font-medium">
                 <span>Max Yield</span>
                 <span>Expected</span>
                 <span>Baseline</span>
              </div>
              {[40, 55, 65, 80, 85, 95].map((val, idx) => (
                 <div key={idx} className="w-10 bg-indigo-500/20 hover:bg-indigo-500 rounded-t-lg transition-all relative group z-10" style={{ height: `${val}%` }}>
                    <div className="hidden group-hover:block absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs py-1 px-2 rounded">
                       {val}%
                    </div>
                 </div>
              ))}
           </div>
           <div className="flex justify-between text-xs text-slate-500 font-semibold px-2">
              <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span>
           </div>
           <p className="text-sm text-slate-600 dark:text-slate-400 mt-6 leading-relaxed">
             AI engine forecasts a <strong>{roiVal.toFixed(1)}% yield stability</strong> for the next 3 quarters assuming optimal occupancy rates (+80%) are met consistently.
           </p>
         </div>

         <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 shadow-sm overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Activity className="w-5 h-5 text-rose-500"/>
                Active Incidents Log
              </h3>
            </div>

            {alerts.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center opacity-70">
                 <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/20 rounded-full flex items-center justify-center mb-3">
                   <Activity className="w-8 h-8 text-emerald-500" />
                 </div>
                 <p className="text-slate-600 dark:text-slate-300 font-medium">No unresolved incidents.</p>
                 <p className="text-xs text-slate-400 mt-1">Facility operations are nominal.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {alerts.map(al => (
                  <div key={al.id} className="flex gap-4 p-4 border border-rose-100 dark:border-rose-900/30 bg-rose-50/50 dark:bg-rose-900/10 rounded-2xl">
                     <div className="mt-1"><AlertCircle className="w-5 h-5 text-rose-500"/></div>
                     <div>
                       <h4 className="font-bold text-rose-900 dark:text-rose-100 text-sm mb-1">{al.alert_type} Warning</h4>
                       <p className="text-sm text-rose-700 dark:text-rose-300 mb-2">{al.message}</p>
                       <span className="text-xs font-semibold text-rose-500 uppercase tracking-widest">{new Date(al.created_at).toLocaleString()}</span>
                     </div>
                  </div>
                ))}
              </div>
            )}
         </div>
      </div>
    
    </div>
  );
};

export default StakeholderDashboard;
