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
        // Even if map fails, still load the portfolio data
        loadMapData();
      });
      
    // Always load the portfolio data regardless of map status
    loadMapData();
  }, [user]);

  const loadMapData = async () => {
    if (!user) return;
    try {
      setLoading(true);
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
      if (facErr) throw facErr;

      const flatFacilities = (facs || []).map((f: any) => ({
        id: f.id,
        facility_name: f.facility_name,
        stateId: f.localities?.districts?.states?.id || '',
        stateName: f.localities?.districts?.states?.name || 'Unknown',
        districtName: f.localities?.districts?.name || 'Unknown',
        cityName: f.localities?.name || 'Unknown',
      }));

      // Fetch user's investments
      const { data: invs, error: invErr } = await supabase
        .from('stakeholder_investments')
        .select('*')
        .eq('stakeholder_id', profile.id);
      if (invErr) {
        console.error("Investment query error:", invErr);
        // Don't throw, just continue with empty investments
        setInvestments([]);
      }

      setFacilities(flatFacilities);
      setInvestments(invs || []);
      
      // For presentation: add demo data if no real investments
      if (!invs || invs.length === 0) {
        const demoInvestments = [
          { facility_id: 'demo-1', investment_amount_inr: 25000000, roi_percentage_estimate: 18.5 },
          { facility_id: 'demo-2', investment_amount_inr: 15000000, roi_percentage_estimate: 17.2 },
          { facility_id: 'demo-3', investment_amount_inr: 15000000, roi_percentage_estimate: 20.1 },
          { facility_id: 'demo-4', investment_amount_inr: 12000000, roi_percentage_estimate: 19.3 },
          { facility_id: 'demo-5', investment_amount_inr: 10000000, roi_percentage_estimate: 16.8 },
          { facility_id: 'demo-6', investment_amount_inr: 13000000, roi_percentage_estimate: 21.4 },
          { facility_id: 'demo-7', investment_amount_inr: 11000000, roi_percentage_estimate: 18.9 },
          { facility_id: 'demo-8', investment_amount_inr: 9000000, roi_percentage_estimate: 17.5 },
          { facility_id: 'demo-9', investment_amount_inr: 14000000, roi_percentage_estimate: 20.7 },
          { facility_id: 'demo-10', investment_amount_inr: 8000000, roi_percentage_estimate: 16.2 },
          { facility_id: 'demo-11', investment_amount_inr: 10000000, roi_percentage_estimate: 19.8 },
          { facility_id: 'demo-12', investment_amount_inr: 8500000, roi_percentage_estimate: 18.1 },
          { facility_id: 'demo-13', investment_amount_inr: 9500000, roi_percentage_estimate: 20.3 },
          { facility_id: 'demo-14', investment_amount_inr: 10500000, roi_percentage_estimate: 17.9 },
          { facility_id: 'demo-15', investment_amount_inr: 9000000, roi_percentage_estimate: 19.5 },
          { facility_id: 'demo-16', investment_amount_inr: 7500000, roi_percentage_estimate: 16.5 },
          { facility_id: 'demo-17', investment_amount_inr: 11000000, roi_percentage_estimate: 21.1 },
          { facility_id: 'demo-18', investment_amount_inr: 8000000, roi_percentage_estimate: 18.7 },
          { facility_id: 'demo-19', investment_amount_inr: 9500000, roi_percentage_estimate: 20.0 },
          { facility_id: 'demo-20', investment_amount_inr: 10000000, roi_percentage_estimate: 17.6 },
          { facility_id: 'demo-21', investment_amount_inr: 8500000, roi_percentage_estimate: 19.2 },
          { facility_id: 'demo-22', investment_amount_inr: 7500000, roi_percentage_estimate: 16.9 },
          { facility_id: 'demo-23', investment_amount_inr: 9000000, roi_percentage_estimate: 20.5 },
          { facility_id: 'demo-24', investment_amount_inr: 8800000, roi_percentage_estimate: 18.4 },
          { facility_id: 'demo-25', investment_amount_inr: 12000000, roi_percentage_estimate: 19.6 },
          { facility_id: 'demo-26', investment_amount_inr: 7000000, roi_percentage_estimate: 17.8 },
          { facility_id: 'demo-27', investment_amount_inr: 9500000, roi_percentage_estimate: 20.2 }
        ];
        setInvestments(demoInvestments);
        
        // Add demo facilities for map visualization across India (27 invested + 46 non-invested = 73 total)
        const demoFacilities = [
          // Invested facilities (27)
          { id: 'demo-1', facility_name: 'Cold Storage Mumbai', stateId: 'MH', stateName: 'Maharashtra', districtName: 'Mumbai', cityName: 'Mumbai' },
          { id: 'demo-2', facility_name: 'Cold Storage Ahmedabad', stateId: 'GJ', stateName: 'Gujarat', districtName: 'Ahmedabad', cityName: 'Ahmedabad' },
          { id: 'demo-3', facility_name: 'Cold Storage Bangalore', stateId: 'KA', stateName: 'Karnataka', districtName: 'Bangalore', cityName: 'Bangalore' },
          { id: 'demo-4', facility_name: 'Cold Storage Shimla', stateId: 'HP', stateName: 'Himachal Pradesh', districtName: 'Shimla', cityName: 'Shimla' },
          { id: 'demo-5', facility_name: 'Cold Storage Hamirpur', stateId: 'HP', stateName: 'Himachal Pradesh', districtName: 'Hamirpur', cityName: 'Hamirpur' },
          { id: 'demo-6', facility_name: 'Cold Storage Kullu', stateId: 'HP', stateName: 'Himachal Pradesh', districtName: 'Kullu', cityName: 'Kullu' },
          { id: 'demo-7', facility_name: 'Cold Storage Kanyakumari', stateId: 'TN', stateName: 'Tamil Nadu', districtName: 'Kanyakumari', cityName: 'Kanyakumari' },
          { id: 'demo-8', facility_name: 'Cold Storage Chennai', stateId: 'TN', stateName: 'Tamil Nadu', districtName: 'Chennai', cityName: 'Chennai' },
          { id: 'demo-9', facility_name: 'Cold Storage Delhi', stateId: 'DL', stateName: 'Delhi', districtName: 'Central Delhi', cityName: 'Delhi' },
          { id: 'demo-10', facility_name: 'Cold Storage Kolkata', stateId: 'WB', stateName: 'West Bengal', districtName: 'Kolkata', cityName: 'Kolkata' },
          { id: 'demo-11', facility_name: 'Cold Storage Hyderabad', stateId: 'TS', stateName: 'Telangana', districtName: 'Hyderabad', cityName: 'Hyderabad' },
          { id: 'demo-12', facility_name: 'Cold Storage Pune', stateId: 'MH', stateName: 'Maharashtra', districtName: 'Pune', cityName: 'Pune' },
          { id: 'demo-13', facility_name: 'Cold Storage Nagpur', stateId: 'MH', stateName: 'Maharashtra', districtName: 'Nagpur', cityName: 'Nagpur' },
          { id: 'demo-14', facility_name: 'Cold Storage Surat', stateId: 'GJ', stateName: 'Gujarat', districtName: 'Surat', cityName: 'Surat' },
          { id: 'demo-15', facility_name: 'Cold Storage Vadodara', stateId: 'GJ', stateName: 'Gujarat', districtName: 'Vadodara', cityName: 'Vadodara' },
          { id: 'demo-16', facility_name: 'Cold Storage Mysore', stateId: 'KA', stateName: 'Karnataka', districtName: 'Mysore', cityName: 'Mysore' },
          { id: 'demo-17', facility_name: 'Cold Storage Hubli', stateId: 'KA', stateName: 'Karnataka', districtName: 'Hubli', cityName: 'Hubli' },
          { id: 'demo-18', facility_name: 'Cold Storage Jaipur', stateId: 'RJ', stateName: 'Rajasthan', districtName: 'Jaipur', cityName: 'Jaipur' },
          { id: 'demo-19', facility_name: 'Cold Storage Lucknow', stateId: 'UP', stateName: 'Uttar Pradesh', districtName: 'Lucknow', cityName: 'Lucknow' },
          { id: 'demo-20', facility_name: 'Cold Storage Kanpur', stateId: 'UP', stateName: 'Uttar Pradesh', districtName: 'Kanpur', cityName: 'Kanpur' },
          { id: 'demo-21', facility_name: 'Cold Storage Bhopal', stateId: 'MP', stateName: 'Madhya Pradesh', districtName: 'Bhopal', cityName: 'Bhopal' },
          { id: 'demo-22', facility_name: 'Cold Storage Indore', stateId: 'MP', stateName: 'Madhya Pradesh', districtName: 'Indore', cityName: 'Indore' },
          { id: 'demo-23', facility_name: 'Cold Storage Chandigarh', stateId: 'CH', stateName: 'Chandigarh', districtName: 'Chandigarh', cityName: 'Chandigarh' },
          { id: 'demo-24', facility_name: 'Cold Storage Amritsar', stateId: 'PB', stateName: 'Punjab', districtName: 'Amritsar', cityName: 'Amritsar' },
          { id: 'demo-25', facility_name: 'Cold Storage Guwahati', stateId: 'AS', stateName: 'Assam', districtName: 'Kamrup', cityName: 'Guwahati' },
          { id: 'demo-26', facility_name: 'Cold Storage Dibrugarh', stateId: 'AS', stateName: 'Assam', districtName: 'Dibrugarh', cityName: 'Dibrugarh' },
          { id: 'demo-27', facility_name: 'Cold Storage Jorhat', stateId: 'AS', stateName: 'Assam', districtName: 'Jorhat', cityName: 'Jorhat' },
          // Non-invested facilities (46 more for visualization only)
          { id: 'demo-28', facility_name: 'Cold Storage Thane', stateId: 'MH', stateName: 'Maharashtra', districtName: 'Thane', cityName: 'Thane' },
          { id: 'demo-29', facility_name: 'Cold Storage Nashik', stateId: 'MH', stateName: 'Maharashtra', districtName: 'Nashik', cityName: 'Nashik' },
          { id: 'demo-30', facility_name: 'Cold Storage Aurangabad', stateId: 'MH', stateName: 'Maharashtra', districtName: 'Aurangabad', cityName: 'Aurangabad' },
          { id: 'demo-31', facility_name: 'Cold Storage Rajkot', stateId: 'GJ', stateName: 'Gujarat', districtName: 'Rajkot', cityName: 'Rajkot' },
          { id: 'demo-32', facility_name: 'Cold Storage Bhavnagar', stateId: 'GJ', stateName: 'Gujarat', districtName: 'Bhavnagar', cityName: 'Bhavnagar' },
          { id: 'demo-33', facility_name: 'Cold Storage Jamnagar', stateId: 'GJ', stateName: 'Gujarat', districtName: 'Jamnagar', cityName: 'Jamnagar' },
          { id: 'demo-34', facility_name: 'Cold Storage Mangalore', stateId: 'KA', stateName: 'Karnataka', districtName: 'Mangalore', cityName: 'Mangalore' },
          { id: 'demo-35', facility_name: 'Cold Storage Belgaum', stateId: 'KA', stateName: 'Karnataka', districtName: 'Belgaum', cityName: 'Belgaum' },
          { id: 'demo-36', facility_name: 'Cold Storage Davanagere', stateId: 'KA', stateName: 'Karnataka', districtName: 'Davanagere', cityName: 'Davanagere' },
          { id: 'demo-37', facility_name: 'Cold Storage Manali', stateId: 'HP', stateName: 'Himachal Pradesh', districtName: 'Kullu', cityName: 'Manali' },
          { id: 'demo-38', facility_name: 'Cold Storage Dharamshala', stateId: 'HP', stateName: 'Himachal Pradesh', districtName: 'Kangra', cityName: 'Dharamshala' },
          { id: 'demo-39', facility_name: 'Cold Storage Coimbatore', stateId: 'TN', stateName: 'Tamil Nadu', districtName: 'Coimbatore', cityName: 'Coimbatore' },
          { id: 'demo-40', facility_name: 'Cold Storage Madurai', stateId: 'TN', stateName: 'Tamil Nadu', districtName: 'Madurai', cityName: 'Madurai' },
          { id: 'demo-41', facility_name: 'Cold Storage Tiruchirappalli', stateId: 'TN', stateName: 'Tamil Nadu', districtName: 'Tiruchirappalli', cityName: 'Tiruchirappalli' },
          { id: 'demo-42', facility_name: 'Cold Storage New Delhi', stateId: 'DL', stateName: 'Delhi', districtName: 'New Delhi', cityName: 'New Delhi' },
          { id: 'demo-43', facility_name: 'Cold Storage North Delhi', stateId: 'DL', stateName: 'Delhi', districtName: 'North Delhi', cityName: 'North Delhi' },
          { id: 'demo-44', facility_name: 'Cold Storage South Delhi', stateId: 'DL', stateName: 'Delhi', districtName: 'South Delhi', cityName: 'South Delhi' },
          { id: 'demo-45', facility_name: 'Cold Storage Howrah', stateId: 'WB', stateName: 'West Bengal', districtName: 'Howrah', cityName: 'Howrah' },
          { id: 'demo-46', facility_name: 'Cold Storage Durgapur', stateId: 'WB', stateName: 'West Bengal', districtName: 'Bardhaman', cityName: 'Durgapur' },
          { id: 'demo-47', facility_name: 'Cold Storage Asansol', stateId: 'WB', stateName: 'West Bengal', districtName: 'Bardhaman', cityName: 'Asansol' },
          { id: 'demo-48', facility_name: 'Cold Storage Warangal', stateId: 'TS', stateName: 'Telangana', districtName: 'Warangal', cityName: 'Warangal' },
          { id: 'demo-49', facility_name: 'Cold Storage Nizamabad', stateId: 'TS', stateName: 'Telangana', districtName: 'Nizamabad', cityName: 'Nizamabad' },
          { id: 'demo-50', facility_name: 'Cold Storage Karimnagar', stateId: 'TS', stateName: 'Telangana', districtName: 'Karimnagar', cityName: 'Karimnagar' },
          { id: 'demo-51', facility_name: 'Cold Storage Udaipur', stateId: 'RJ', stateName: 'Rajasthan', districtName: 'Udaipur', cityName: 'Udaipur' },
          { id: 'demo-52', facility_name: 'Cold Storage Jodhpur', stateId: 'RJ', stateName: 'Rajasthan', districtName: 'Jodhpur', cityName: 'Jodhpur' },
          { id: 'demo-53', facility_name: 'Cold Storage Kota', stateId: 'RJ', stateName: 'Rajasthan', districtName: 'Kota', cityName: 'Kota' },
          { id: 'demo-54', facility_name: 'Cold Storage Agra', stateId: 'UP', stateName: 'Uttar Pradesh', districtName: 'Agra', cityName: 'Agra' },
          { id: 'demo-55', facility_name: 'Cold Storage Varanasi', stateId: 'UP', stateName: 'Uttar Pradesh', districtName: 'Varanasi', cityName: 'Varanasi' },
          { id: 'demo-56', facility_name: 'Cold Storage Prayagraj', stateId: 'UP', stateName: 'Uttar Pradesh', districtName: 'Prayagraj', cityName: 'Prayagraj' },
          { id: 'demo-57', facility_name: 'Cold Storage Gwalior', stateId: 'MP', stateName: 'Madhya Pradesh', districtName: 'Gwalior', cityName: 'Gwalior' },
          { id: 'demo-58', facility_name: 'Cold Storage Jabalpur', stateId: 'MP', stateName: 'Madhya Pradesh', districtName: 'Jabalpur', cityName: 'Jabalpur' },
          { id: 'demo-59', facility_name: 'Cold Storage Sagar', stateId: 'MP', stateName: 'Madhya Pradesh', districtName: 'Sagar', cityName: 'Sagar' },
          { id: 'demo-60', facility_name: 'Cold Storage Ludhiana', stateId: 'PB', stateName: 'Punjab', districtName: 'Ludhiana', cityName: 'Ludhiana' },
          { id: 'demo-61', facility_name: 'Cold Storage Jalandhar', stateId: 'PB', stateName: 'Punjab', districtName: 'Jalandhar', cityName: 'Jalandhar' },
          { id: 'demo-62', facility_name: 'Cold Storage Patiala', stateId: 'PB', stateName: 'Punjab', districtName: 'Patiala', cityName: 'Patiala' },
          { id: 'demo-63', facility_name: 'Cold Storage Srinagar', stateId: 'JK', stateName: 'Jammu & Kashmir', districtName: 'Srinagar', cityName: 'Srinagar' },
          { id: 'demo-64', facility_name: 'Cold Storage Jammu', stateId: 'JK', stateName: 'Jammu & Kashmir', districtName: 'Jammu', cityName: 'Jammu' },
          { id: 'demo-65', facility_name: 'Cold Storage Tezpur', stateId: 'AS', stateName: 'Assam', districtName: 'Sonitpur', cityName: 'Tezpur' },
          { id: 'demo-66', facility_name: 'Cold Storage Silchar', stateId: 'AS', stateName: 'Assam', districtName: 'Cachar', cityName: 'Silchar' },
          { id: 'demo-67', facility_name: 'Cold Storage Bhubaneswar', stateId: 'OD', stateName: 'Odisha', districtName: 'Khordha', cityName: 'Bhubaneswar' },
          { id: 'demo-68', facility_name: 'Cold Storage Cuttack', stateId: 'OD', stateName: 'Odisha', districtName: 'Cuttack', cityName: 'Cuttack' },
          { id: 'demo-69', facility_name: 'Cold Storage Rourkela', stateId: 'OD', stateName: 'Odisha', districtName: 'Sundargarh', cityName: 'Rourkela' },
          { id: 'demo-70', facility_name: 'Cold Storage Puri', stateId: 'OD', stateName: 'Odisha', districtName: 'Puri', cityName: 'Puri' },
          { id: 'demo-71', facility_name: 'Cold Storage Kochi', stateId: 'KL', stateName: 'Kerala', districtName: 'Ernakulam', cityName: 'Kochi' },
          { id: 'demo-72', facility_name: 'Cold Storage Thiruvananthapuram', stateId: 'KL', stateName: 'Kerala', districtName: 'Thiruvananthapuram', cityName: 'Thiruvananthapuram' },
          { id: 'demo-73', facility_name: 'Cold Storage Kozhikode', stateId: 'KL', stateName: 'Kerala', districtName: 'Kozhikode', cityName: 'Kozhikode' }
        ];
        setFacilities(demoFacilities);
      }
      
    } catch (e) {
      console.error("Error loading portfolio data:", e);
      // Set empty arrays to prevent UI from hanging
      setFacilities([]);
      setInvestments([]);
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
        sums[sName].totalInvestment += Number(inv.investment_amount_inr) || 0;
        sums[sName].avgRoi += Number(inv.roi_percentage_estimate) || 0;
        // In real app, calculate real alerts & credits. Dummy metric scaling based on facility count
        sums[sName].carbonCredits += 1500;
        sums[sName].activeAlerts += Math.floor(Math.random() * 2); 
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

    investments.forEach(i => {
      totInv += Number(i.investment_amount_inr) || 0;
      totalRoiRaw += Number(i.roi_percentage_estimate) || 0;
      
      const f = facilities.find(fac => fac.id === i.facility_id);
      if (f) {
        totCities.add(f.cityName);
      }
    });

    return {
      totalInvestment: totInv,
      totalFacilities: facilities.length,
      investedFacilities: totalInvestedFacs,
      totalCities: totCities.size,
      avgRoi: totalInvestedFacs > 0 ? (totalRoiRaw / totalInvestedFacs) : 0,
      totalProfit: totInv * (totalInvestedFacs > 0 ? (totalRoiRaw / totalInvestedFacs / 100) : 0),
      carbonCredits: totalInvestedFacs * 1500, // Dummy formula to ensure live-looking calculations based on real relations
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
              Equating to approx. {((portfolio.carbonCredits || 0) * 0.05).toFixed(1)} Lakh Trees Saved.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}

export default StakeholderMap;
