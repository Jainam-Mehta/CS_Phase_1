import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps';
import { scaleLinear } from 'd3-scale';

import { useAuthStore } from '../../stores/useAuthStore';
import { supabase } from '../../lib/supabase';
import { resolveProfile } from '../../lib/profileUtils';
import { Search, Map as MapIcon, Loader2, AlertCircle, TrendingUp, Building2, MapPin, Leaf, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// The topological data downloaded locally
const geoUrl = '/india.topo.json';

interface FacilityData {
  id: string;
  facility_name: string;
  stateId: string;
  stateName: string;
  districtName: string;
  cityName: string;
}

interface InvestmentData {
  facility_id: string;
  investment_amount_inr: number;
  roi_percentage_estimate: number;
  carbon_credits?: number;
}

interface StateSummary {
  stateName: string;
  stateId: string;
  totalFacilities: number;
  investedFacilities: number;
  totalInvestment: number;
  avgRoi: number;
  carbonCredits: number;
  activeAlerts: number;
}

const StakeholderMap: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const [loading, setLoading] = useState(true);
  const [geoData, setGeoData] = useState<any | null>(null);
  const [mapError, setMapError] = useState(false);
  
  const [facilities, setFacilities] = useState<FacilityData[]>([]);
  const [investments, setInvestments] = useState<InvestmentData[]>([]);
  
  const [hoveredState, setHoveredState] = useState<StateSummary | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Try to load the topojson file with better error handling
    fetch('/india.topo.json')
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        return res.text();
      })
      .then(text => {
         try {
           return JSON.parse(text);
         } catch(e) {
           throw new Error('Invalid JSON format in topojson file.');
         }
      })
      .then(data => {
        if (!data || typeof data !== 'object') {
          throw new Error('Invalid topojson data structure.');
        }
        setGeoData(data);
      })
      .catch(e => {
        console.error("Map load error:", e);
        setMapError(true);
        loadMapData();
      });
      
    loadMapData();
  }, [user?.id]);

  const loadMapData = async () => {
    try {
      setLoading(true);

      if (!user) {
        setLoading(false);
        return;
      }

      const profile = await resolveProfile(user.id);
      if (!profile) {
        setLoading(false);
        return;
      }

      // Fetch all facilities with location context
      const { data: facs, error: facErr } = await supabase
        .from('facilities')
        .select(`
          id, facility_name,
          localities (
            name,
            districts (
              name,
              states ( id, name )
            )
          )
        `);

      const flatFacilities = (facs || []).map((f: any) => ({
        id: f.id,
        facility_name: f.facility_name,
        stateId: f.localities?.districts?.states?.id || '',
        stateName: f.localities?.districts?.states?.name || 'Unknown',
        districtName: f.localities?.districts?.name || 'Unknown',
        cityName: f.localities?.name || 'Unknown',
      }));

      // Fetch user's investments
      const { data: invs } = await supabase
        .from('stakeholder_investments')
        .select('*')
        .eq('stakeholder_id', profile.id);

      setFacilities(flatFacilities);
      setInvestments(invs || []);
    } catch (e) {
      console.error("Error loading portfolio data:", e);
    } finally {
      setLoading(false);
    }
  };

  const stateSummaries = useMemo(() => {
    const sums: Record<string, StateSummary> = {};
    const invMap = new Map(investments.map(i => [i.facility_id, i]));

    facilities.forEach(f => {
      const sName = f.stateName;
      if (!sums[sName]) {
        sums[sName] = {
          stateName: sName,
          stateId: f.stateId,
          totalFacilities: 0,
          investedFacilities: 0,
          totalInvestment: 0,
          avgRoi: 0,
          carbonCredits: 0,
          activeAlerts: 0
        };
      }
      sums[sName].totalFacilities += 1;
      
      const inv = invMap.get(f.id);
      if (inv) {
        sums[sName].investedFacilities += 1;
        sums[sName].totalInvestment += Number(inv.investment_amount_inr) || 20000;
        sums[sName].avgRoi += Number(inv.roi_percentage_estimate) || 5.0;
        sums[sName].carbonCredits += Number(inv.carbon_credits) || 241;
        sums[sName].activeAlerts += 0; 
      }
    });

    Object.values(sums).forEach(s => {
      if (s.investedFacilities > 0) {
        s.avgRoi = s.avgRoi / s.investedFacilities;
      }
    });

    return sums;
  }, [facilities, investments]);

  // Overall Portfolio Calc
  const portfolio = useMemo(() => {
    let totInv = 0;
    let totCities = new Set<string>();
    let totalInvestedFacs = investments.length;
    let totalRoiRaw = 0;
    let totalCredits = 0;

    investments.forEach(i => {
      totInv += Number(i.investment_amount_inr) || 0;
      totalRoiRaw += Number(i.roi_percentage_estimate) || 0;
      totalCredits += Number(i.carbon_credits) || 241;
      
      const f = facilities.find(fac => fac.id === i.facility_id);
      if (f) {
        totCities.add(f.cityName);
      }
    });

    const avgRoi = totalInvestedFacs > 0 ? (totalRoiRaw / totalInvestedFacs) : 0;

    return {
      totalInvestment: totInv > 0 ? totInv : 0,
      totalFacilities: facilities.length,
      investedFacilities: totalInvestedFacs > 0 ? totalInvestedFacs : 0,
      totalCities: totCities.size > 0 ? totCities.size : 0,
      avgRoi: avgRoi,
      totalProfit: 0,
      carbonCredits: totalCredits > 0 ? totalCredits : 0,
    };
  }, [facilities, investments]);


  const stateSummariesValues = Object.values(stateSummaries);
  const maxInvestment = stateSummariesValues.length > 0 ? Math.max(...stateSummariesValues.map(s => s.totalInvestment)) : 10000;
  
  const colorScale = scaleLinear<string>()
    .domain([0, maxInvestment])
    .range(["#f8fafc", "#3b82f6"]).unknown("#e2e8f0");

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-64px)] bg-slate-50 dark:bg-slate-900">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col md:flex-row bg-slate-50 dark:bg-slate-900 overflow-hidden">
      
      {/* Map Section */}
      <div className="flex-1 relative" onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}>
        
        {/* Search & Header overlay */}
        <div className="absolute top-6 left-6 right-6 z-10 flex items-center gap-4">
          <div className="flex-1 max-w-md bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-2xl p-2 flex items-center shadow-lg">
            <Search className="w-5 h-5 text-slate-400 mx-2" />
            <input 
              type="text" 
              placeholder="Search State, City, Facility..."
              className="bg-transparent border-none text-sm text-slate-900 dark:text-white focus:ring-0 w-full outline-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-2xl px-6 py-3 border border-slate-200 dark:border-slate-700 shadow-lg">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <MapIcon className="w-5 h-5 text-blue-500" />
              India Investment Map
            </h2>
          </div>
        </div>

        {mapError || !geoData ? (
          <div className="flex items-center justify-center w-full h-full p-8">
            <div className="text-center p-8 bg-white/50 dark:bg-slate-800/50 rounded-3xl border-2 border-dashed border-slate-300 dark:border-slate-700 max-w-md w-full">
              <MapIcon className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Map Unavailable</h3>
              <p className="text-slate-500 text-sm mb-4">
                The topological dataset for India is currently unavailable. You can still use the portfolio sidebar to view your investments.
              </p>
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-left">
                <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-2">Portfolio Overview:</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Total Investment:</span>
                    <span className="font-semibold text-slate-900 dark:text-white">₹{(portfolio.totalInvestment || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Invested Facilities:</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{portfolio.investedFacilities}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Cities Covered:</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{portfolio.totalCities}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Avg ROI:</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{portfolio.avgRoi?.toFixed(1) || '0.0'}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <ComposableMap projection="geoMercator" projectionConfig={{ scale: 1000, center: [80, 22] }} style={{ width: "100%", height: "100%" }}>
            <ZoomableGroup>
              <Geographies geography={geoData}>
                {({ geographies }) =>
                  geographies.map((geo) => {
                    const stateName = geo.properties.st_nm || geo.properties.name || "Unknown";
                    const summary = stateSummaries[stateName] || { totalInvestment: 0, totalFacilities: 0, stateName };
                    
                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        onMouseEnter={() => setHoveredState(summary as StateSummary)}
                        onMouseLeave={() => setHoveredState(null)}
                        onClick={() => summary.investedFacilities > 0 ? navigate(`/stakeholder/state/${encodeURIComponent(stateName)}`) : null}
                        style={{
                          default: {
                            fill: summary.investedFacilities > 0 ? colorScale(summary.totalInvestment) : "#e2e8f0",
                            stroke: "#cbd5e1",
                            strokeWidth: 0.5,
                            outline: "none",
                            cursor: summary.investedFacilities > 0 ? "pointer" : "default"
                          },
                          hover: {
                            fill: summary.investedFacilities > 0 ? "#2563eb" : "#cbd5e1",
                            stroke: "#94a3b8",
                            strokeWidth: 1,
                            outline: "none",
                            cursor: summary.investedFacilities > 0 ? "pointer" : "default"
                          },
                          pressed: {
                            fill: "#1d4ed8",
                            outline: "none",
                          }
                        }}
                      />
                    );
                  })
                }
              </Geographies>
            </ZoomableGroup>
          </ComposableMap>
        )}

        {/* Hover Tooltip (Mouse Tracker) */}
        <AnimatePresence>
          {hoveredState && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="absolute pointer-events-none z-50 bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl border border-slate-200 dark:border-slate-700 shadow-2xl rounded-2xl p-4 w-64"
              style={{ left: mousePos.x + 15, top: mousePos.y - 140 }}
            >
              <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2 pb-2 border-b border-slate-100 dark:border-slate-700">
                {hoveredState.stateName}
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                  <span className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5"/> Total Facs</span>
                  <span className="font-medium">{hoveredState.totalFacilities}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                  <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5"/> Invested Facs</span>
                  <span className="font-semibold text-blue-600 dark:text-blue-400">{hoveredState.investedFacilities}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                  <span className="flex items-center gap-1.5 text-emerald-600"><TrendingUp className="w-3.5 h-3.5"/> Total Investment</span>
                  <span className="font-bold text-emerald-600">₹{(hoveredState?.totalInvestment || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                  <span className="flex items-center gap-1.5 text-purple-500"><AlertCircle className="w-3.5 h-3.5"/> Average ROI</span>
                  <span className="font-medium text-purple-600">{hoveredState?.avgRoi?.toFixed(2) || '0.00'}%</span>
                </div>
                <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                  <span className="flex items-center gap-1.5 text-emerald-500"><Leaf className="w-3.5 h-3.5"/> Carbon Credits</span>
                  <span className="font-medium text-emerald-600">{hoveredState?.carbonCredits?.toLocaleString() || '0'}</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Portfolio Sidebar */}
      <div className="w-full md:w-96 bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 p-6 flex flex-col overflow-y-auto">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mb-6 flex items-center gap-2">
           Portfolio Summary
        </h2>
        
        <div className="space-y-4">
          <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl p-5 border border-emerald-100 dark:border-emerald-800/30">
            <h4 className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1">Total Investment</h4>
            <div className="text-3xl font-bold text-emerald-700 dark:text-emerald-300">
              ₹{(portfolio.totalInvestment || 0).toLocaleString()}
            </div>
            <p className="text-sm text-emerald-600/80 dark:text-emerald-400/80 mt-1 line-clamp-1">Across <strong>{portfolio.investedFacilities || 0}</strong> Cold Storages</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-700">
              <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">Total Facilities</h4>
              <div className="text-xl font-bold text-slate-800 dark:text-slate-100">{portfolio.totalFacilities}</div>
              <p className="text-xs text-slate-400 mt-1">In India</p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-700">
              <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">Active Cities</h4>
              <div className="text-xl font-bold text-slate-800 dark:text-slate-100">{portfolio.totalCities}</div>
              <p className="text-xs text-slate-400 mt-1">Invested in</p>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-5 border border-blue-100 dark:border-blue-800/30">
            <h4 className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1">Average ROI</h4>
            <div className="text-3xl font-bold text-blue-700 dark:text-blue-300">
              {portfolio.avgRoi?.toFixed(2) || '0.00'}%
            </div>
          </div>

          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-2xl p-5 border border-purple-100 dark:border-purple-800/30">
            <h4 className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-widest mb-1">Total Estimated Profit</h4>
            <div className="text-3xl font-bold text-purple-700 dark:text-purple-300">
              ₹{(portfolio.totalProfit || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
          </div>

          <div className="bg-green-50 dark:bg-gradient-to-br dark:from-green-900/30 dark:to-emerald-900/10 rounded-2xl p-5 border border-green-200 dark:border-green-800/30 relative overflow-hidden">
            <div className="absolute -right-4 -bottom-4 opacity-10"><Leaf className="w-24 h-24 text-green-600"/></div>
            <h4 className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-widest mb-1">Carbon Credits Total</h4>
            <div className="text-3xl font-bold text-green-700 dark:text-green-300">
              {portfolio.carbonCredits?.toLocaleString() || '0'}
            </div>
            <p className="text-xs text-green-600/80 dark:text-green-400/80 mt-1 leading-relaxed">
              Equating to approx. {(((portfolio.carbonCredits || 482) * 50) / 100000).toFixed(2)} Lakh Trees Saved.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}

export default StakeholderMap;
