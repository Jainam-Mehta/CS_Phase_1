import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';
import { supabase } from '../../lib/supabase';
import { resolveProfile } from '../../lib/profileUtils';
import { Loader2, ArrowLeft, Building2, ExternalLink, Leaf, Zap, MapPin, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/Card';

interface FacilityDisplay {
  id: string;
  facility_name: string;
  stateName: string;
  investmentAmount: number;
  roi: number;
  capacity_total_kg: number;
  capacity_used_kg: number;
  address: string;
}

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
      
      // NO DEMO DATA - All districts use database query
      const profile = await resolveProfile(user!.id);
      if (!profile) throw new Error('Profile not found');

      // 1. First, get the state name for this district from districts table
      const { data: districtData, error: distErr } = await supabase
        .from('districts')
        .select('name, states(name)')
        .eq('name', districtName)
        .maybeSingle();
      
      if (distErr) throw distErr;
      
      // Extract state name from the district data
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

      if (distFacilities.length === 0) {
        setFacilities([]);
        setLoading(false);
        return;
      }

      // 3. Fetch user's investments for these facilities
      const facIds = distFacilities.map((f: any) => f.id);
      
      const { data: invs, error: invErr } = await supabase
        .from('stakeholder_investments')
        .select('*')
        .eq('stakeholder_id', profile.id)
        .in('facility_id', facIds)
        .eq('status', 'Active');
        
      if (invErr) throw invErr;

      const invMap = new Map((invs || []).map((i: any) => [i.facility_id, i]));
      
      const res: FacilityDisplay[] = [];
      distFacilities.forEach((f: any) => {
        const inv = invMap.get(f.id);
        if (inv) {
          res.push({
            id: f.id,
            facility_name: f.facility_name,
            stateName: stateNameFromDb,
            investmentAmount: Number(inv.investment_amount_inr) || 0,
            roi: Number(inv.roi_percentage_estimate) || 0,
            capacity_total_kg: Number(f.total_capacity_kg) || 0,
            capacity_used_kg: Number(f.current_utilization_kg) || 0,
            address: f.address || 'Address not listed'
          });
        }
      });

      setFacilities(res);
      
    } catch (e) {
      console.error(e);
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
    <div className="p-8 max-w-6xl mx-auto min-h-[calc(100vh-64px)]">
      <button 
        onClick={() => stateNameStr ? navigate(`/stakeholder/state/${encodeURIComponent(stateNameStr)}`) : navigate('/stakeholder/map')}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors mb-6 font-medium"
      >
        <ArrowLeft className="w-4 h-4" /> Back to {stateNameStr || 'State'}
      </button>

      <div className="mb-10">
        <div className="flex items-center gap-3 text-sm font-semibold text-blue-600 dark:text-blue-400 tracking-wider uppercase mb-2">
          <MapPin className="w-4 h-4" /> {stateNameStr || 'India'}
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">{districtName} Cold Storages</h1>
        <p className="text-slate-500 dark:text-slate-400">Select a facility to view its detailed stakeholder dashboard.</p>
      </div>

      {facilities.length === 0 ? (
        <div className="text-center py-24 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <Building2 className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No active investments found</h3>
          <p className="text-slate-500">You don't have investments in {districtName} anymore.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {facilities.map(fac => {
             const carbonCredits = Math.floor(fac.investmentAmount / 50000);
             return (
              <Card 
                key={fac.id} 
                className="rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm hover:shadow-lg transition-shadow"
              >
                <div className="p-1 h-3 bg-gradient-to-r from-blue-600 to-emerald-500 w-full" />
                <CardContent className="p-6">
                  <div className="flex items-start gap-4 mb-6">
                    <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center shrink-0 border border-indigo-100 dark:border-indigo-800/50">
                      <Building2 className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">{fac.facility_name}</h3>
                      <p className="text-sm font-medium text-slate-500 flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {fac.address}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                      <span className="text-xs text-slate-400 block uppercase tracking-widest font-semibold mb-1">Your Investment</span>
                      <span className="text-2xl font-bold text-slate-900 dark:text-white">₹{(fac.investmentAmount / 100000).toFixed(2)} L</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-emerald-50 dark:bg-emerald-900/10 p-3 rounded-xl border border-emerald-100 dark:border-emerald-800/30">
                        <span className="text-xs text-emerald-600/70 dark:text-emerald-400 block uppercase tracking-widest font-semibold mb-1">ROI</span>
                        <span className="text-lg font-bold text-emerald-600 flex items-center gap-1"><TrendingUp className="w-4 h-4"/> {fac.roi.toFixed(1)}%</span>
                      </div>
                      
                      <div className="bg-green-50 dark:bg-green-900/10 p-3 rounded-xl border border-green-100 dark:border-green-800/30">
                        <span className="text-xs text-green-600/70 dark:text-green-400 block uppercase tracking-widest font-semibold mb-1">Carbon Credits</span>
                        <span className="text-lg font-bold text-green-600 flex items-center gap-1"><Leaf className="w-4 h-4"/> {carbonCredits}</span>
                      </div>
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
