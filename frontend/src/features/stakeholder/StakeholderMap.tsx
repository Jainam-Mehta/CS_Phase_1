import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps';
import { scaleLinear } from 'd3-scale';

import { useAuthStore } from '../../stores/useAuthStore';
import { supabase } from '../../lib/supabase';
import { resolveProfile } from '../../lib/profileUtils';
import { Map as MapIcon, Loader2, AlertCircle, TrendingUp, Building2, MapPin, Leaf, Zap } from 'lucide-react';
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
  farmers: number; // Hardcoded farmer count
}

interface InvestmentData {
  facility_id?: string;
  site_id: string;
  investment_amount_inr: number;
  roi_percentage_estimate: number;
  carbon_credits?: number;
  status?: string;
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
  totalFarmers: number;
}

const StakeholderMap: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const [loading, setLoading] = useState(true);
  const [geoData, setGeoData] = useState<any | null>(null);
  const [mapError, setMapError] = useState(false);
  
  // Demo hardcoded investments distributed across India (95 invested)
  // Target: ~26.2 tons total = ~0.276 tons per site, scaled to realistic 2-digit values
  const demoInvestments: InvestmentData[] = [
    // Himachal Pradesh - 18 sites (majority) → 0.25 tons per site = 4.5 tons total
    ...Array.from({ length: 18 }, (_, i) => ({
      site_id: `hp-${i + 1}`,
      investment_amount_inr: 50000 + Math.random() * 100000,
      roi_percentage_estimate: 8 + Math.random() * 4,
      carbon_credits: 0.20 + Math.random() * 0.10,
      status: 'active'
    })),
    // Maharashtra - 12 sites → 0.25 tons per site = 3 tons total
    ...Array.from({ length: 12 }, (_, i) => ({
      site_id: `mh-${i + 1}`,
      investment_amount_inr: 45000 + Math.random() * 95000,
      roi_percentage_estimate: 7 + Math.random() * 5,
      carbon_credits: 0.18 + Math.random() * 0.14,
      status: 'active'
    })),
    // Gujarat - 6 sites → 0.25 tons per site = 1.5 tons total
    ...Array.from({ length: 6 }, (_, i) => ({
      site_id: `gj-${i + 1}`,
      investment_amount_inr: 48000 + Math.random() * 92000,
      roi_percentage_estimate: 7.5 + Math.random() * 4.5,
      carbon_credits: 0.20 + Math.random() * 0.10,
      status: 'active'
    })),
    // Karnataka - 6 sites → 0.25 tons per site = 1.5 tons total
    ...Array.from({ length: 6 }, (_, i) => ({
      site_id: `ka-${i + 1}`,
      investment_amount_inr: 52000 + Math.random() * 98000,
      roi_percentage_estimate: 8 + Math.random() * 4,
      carbon_credits: 0.22 + Math.random() * 0.08,
      status: 'active'
    })),
    // Tamil Nadu - 4 sites → 0.30 tons per site = 1.2 tons total
    ...Array.from({ length: 4 }, (_, i) => ({
      site_id: `tn-${i + 1}`,
      investment_amount_inr: 55000 + Math.random() * 105000,
      roi_percentage_estimate: 8.5 + Math.random() * 3.5,
      carbon_credits: 0.25 + Math.random() * 0.10,
      status: 'active'
    })),
    // Andhra Pradesh - 8 sites → 0.28 tons per site = 2.24 tons total
    ...Array.from({ length: 8 }, (_, i) => ({
      site_id: `ap-${i + 1}`,
      investment_amount_inr: 50000 + Math.random() * 100000,
      roi_percentage_estimate: 8 + Math.random() * 4,
      carbon_credits: 0.22 + Math.random() * 0.12,
      status: 'active'
    })),
    // Chhattisgarh - 4 sites → 0.25 tons per site = 1 ton total
    ...Array.from({ length: 4 }, (_, i) => ({
      site_id: `cg-${i + 1}`,
      investment_amount_inr: 46000 + Math.random() * 90000,
      roi_percentage_estimate: 7.5 + Math.random() * 4.5,
      carbon_credits: 0.20 + Math.random() * 0.10,
      status: 'active'
    })),
    // West Bengal - 4 sites → 0.25 tons per site = 1 ton total
    ...Array.from({ length: 4 }, (_, i) => ({
      site_id: `wb-${i + 1}`,
      investment_amount_inr: 47000 + Math.random() * 93000,
      roi_percentage_estimate: 7.2 + Math.random() * 4.8,
      carbon_credits: 0.20 + Math.random() * 0.10,
      status: 'active'
    })),
    // Uttar Pradesh - 5 sites → 0.27 tons per site = 1.35 tons total
    ...Array.from({ length: 5 }, (_, i) => ({
      site_id: `up-${i + 1}`,
      investment_amount_inr: 44000 + Math.random() * 88000,
      roi_percentage_estimate: 7 + Math.random() * 5,
      carbon_credits: 0.23 + Math.random() * 0.10,
      status: 'active'
    })),
    // Bihar - 4 sites → 0.25 tons per site = 1 ton total
    ...Array.from({ length: 4 }, (_, i) => ({
      site_id: `br-${i + 1}`,
      investment_amount_inr: 43000 + Math.random() * 87000,
      roi_percentage_estimate: 6.8 + Math.random() * 5.2,
      carbon_credits: 0.20 + Math.random() * 0.10,
      status: 'active'
    })),
    // Rajasthan - 3 sites → 0.25 tons per site = 0.75 tons total
    ...Array.from({ length: 3 }, (_, i) => ({
      site_id: `rj-${i + 1}`,
      investment_amount_inr: 40000 + Math.random() * 80000,
      roi_percentage_estimate: 7.5 + Math.random() * 4.5,
      carbon_credits: 0.20 + Math.random() * 0.10,
      status: 'active'
    })),
    // Punjab - 2 sites → 0.27 tons per site = 0.54 tons total
    ...Array.from({ length: 2 }, (_, i) => ({
      site_id: `pb-${i + 1}`,
      investment_amount_inr: 48000 + Math.random() * 92000,
      roi_percentage_estimate: 7.5 + Math.random() * 4.5,
      carbon_credits: 0.23 + Math.random() * 0.10,
      status: 'active'
    })),
    // Assam - 3 invested sites → 0.25 tons per site = 0.75 tons total
    ...Array.from({ length: 3 }, (_, i) => ({
      site_id: `as-inv-${i + 1}`,
      investment_amount_inr: 45000 + Math.random() * 85000,
      roi_percentage_estimate: 7 + Math.random() * 5,
      carbon_credits: 0.20 + Math.random() * 0.10,
      status: 'active'
    })),
    // Nagaland - 1 invested site → 0.25 tons
    ...Array.from({ length: 1 }, (_, i) => ({
      site_id: `ng-inv-${i + 1}`,
      investment_amount_inr: 44000 + Math.random() * 84000,
      roi_percentage_estimate: 6.8 + Math.random() * 5.2,
      carbon_credits: 0.20 + Math.random() * 0.10,
      status: 'active'
    }))
  ];

  // Farmer distribution: Mix of 3, 2, 1 per site (~1.5 avg)
  // State-wise targets: 283 total farmers across 182 sites
  const generateFarmerDistribution = () => {
    const stateDistribution: Record<string, number[]> = {
      // Himachal Pradesh (22 total: 18 inv + 4 uninv) → 27 farmers
      'hp': [3, 2, 1, 3, 2, 1, 3, 2, 1, 3, 2, 1, 3, 2, 1, 2, 1, 2, 1, 1, 2, 1], // 22 sites = 40
      // Maharashtra (12 total: 12 inv) → 19 farmers
      'mh': [3, 2, 2, 3, 1, 2, 1, 2, 2, 1, 2, 1], // 12 sites = 22
      // Tamil Nadu (4 total: 4 inv) → 6 farmers
      'tn': [2, 1, 2, 1], // 4 sites = 6
      // Andhra Pradesh (8 total: 8 inv) → 12 farmers
      'ap': [2, 1, 2, 1, 2, 1, 2, 1], // 8 sites = 12
      // Gujarat (6 total: 6 inv) → 9 farmers
      'gj': [2, 1, 2, 1, 2, 1], // 6 sites = 9
      // Karnataka (6 total: 6 inv) → 10 farmers
      'ka': [2, 2, 2, 1, 2, 1], // 6 sites = 10
      // Chhattisgarh (6 total: 4 inv + 2 uninv) → 9 farmers
      'cg': [2, 1, 2, 1, 1, 2], // 6 sites = 9
      // West Bengal (6 total: 4 inv + 2 uninv) → 9 farmers
      'wb': [2, 1, 2, 1, 2, 1], // 6 sites = 9
      // Uttar Pradesh (5 total: 5 inv) → 8 farmers
      'up': [2, 1, 2, 1, 2], // 5 sites = 8
      // Bihar (4 total: 4 inv) → 6 farmers
      'br': [2, 1, 2, 1], // 4 sites = 6
      // Rajasthan (3 total: 3 inv) → 5 farmers
      'rj': [2, 1, 2], // 3 sites = 5
      // Punjab (6 total: 2 inv + 4 uninv) → 9 farmers
      'pb': [2, 1, 2, 1, 2, 1], // 6 sites = 9
      // Assam (8 total: 3 inv + 5 uninv) → 13 farmers
      'as': [2, 2, 1, 2, 2, 1, 2, 1], // 8 sites = 13
      // Nagaland (3 total: 1 inv + 2 uninv) → 4 farmers
      'ng': [2, 1, 1], // 3 sites = 4
      // Madhya Pradesh (4 sites) → 6 farmers
      'mp': [2, 1, 2, 1], // 4 sites = 6
      // Telangana (4 sites) → 6 farmers
      'tg': [2, 1, 2, 1], // 4 sites = 6
      // Odisha (5 sites) → 8 farmers
      'od': [2, 1, 2, 1, 2], // 5 sites = 8
      // Jharkhand (4 sites) → 6 farmers
      'jh': [2, 1, 2, 1], // 4 sites = 6
      // Kerala (5 sites) → 7 farmers
      'kl': [2, 1, 1, 2, 1], // 5 sites = 7
      // Goa (3 sites) → 5 farmers
      'ga': [2, 1, 2], // 3 sites = 5
      // Haryana (4 sites) → 6 farmers
      'hr': [2, 1, 2, 1], // 4 sites = 6
      // Uttarakhand (5 sites) → 7 farmers
      'uk': [2, 1, 1, 2, 1], // 5 sites = 7
      // Meghalaya (3 sites) → 4 farmers
      'ml': [2, 1, 1], // 3 sites = 4
      // Tripura (3 sites) → 4 farmers
      'tr': [2, 1, 1], // 3 sites = 4
      // Mizoram (2 sites) → 3 farmers
      'mz': [2, 1], // 2 sites = 3
      // Manipur (2 sites) → 3 farmers
      'mn': [2, 1], // 2 sites = 3
      // Sikkim (2 sites) → 3 farmers
      'sk': [2, 1], // 2 sites = 3
      // Arunachal Pradesh (3 sites) → 4 farmers
      'ar': [2, 1, 1], // 3 sites = 4
      // Jammu & Kashmir (4 sites) → 6 farmers
      'jk': [2, 1, 2, 1] // 4 sites = 6
      // TOTAL: 182 sites, 283 farmers (avg 1.56)
    };
    return stateDistribution;
  };

  const farmersByState = generateFarmerDistribution();

  // Demo hardcoded facilities to match investments (95 invested) + uninvested sites to reach 182 total
  const demoFacilities: FacilityData[] = [
    // INVESTED STATES (95 total invested)
    ...Array.from({ length: 18 }, (_, i) => ({
      id: `hp-${i + 1}`,
      facility_name: `HP Cold Storage ${i + 1}`,
      stateId: 'HP',
      stateName: 'Himachal Pradesh',
      districtName: 'Kangra',
      cityName: 'Dharamshala',
      farmers: farmersByState['hp'][i]
    })),
    ...Array.from({ length: 12 }, (_, i) => ({
      id: `mh-${i + 1}`,
      facility_name: `MH Cold Storage ${i + 1}`,
      stateId: 'MH',
      stateName: 'Maharashtra',
      districtName: 'Pune',
      cityName: 'Pune',
      farmers: farmersByState['mh'][i]
    })),
    ...Array.from({ length: 6 }, (_, i) => ({
      id: `gj-${i + 1}`,
      facility_name: `GJ Cold Storage ${i + 1}`,
      stateId: 'GJ',
      stateName: 'Gujarat',
      districtName: 'Ahmedabad',
      cityName: 'Ahmedabad',
      farmers: farmersByState['gj'][i]
    })),
    ...Array.from({ length: 6 }, (_, i) => ({
      id: `ka-${i + 1}`,
      facility_name: `KA Cold Storage ${i + 1}`,
      stateId: 'KA',
      stateName: 'Karnataka',
      districtName: 'Bangalore',
      cityName: 'Bangalore',
      farmers: farmersByState['ka'][i]
    })),
    ...Array.from({ length: 4 }, (_, i) => ({
      id: `tn-${i + 1}`,
      facility_name: `TN Cold Storage ${i + 1}`,
      stateId: 'TN',
      stateName: 'Tamil Nadu',
      districtName: 'Chennai',
      cityName: 'Chennai',
      farmers: farmersByState['tn'][i]
    })),
    ...Array.from({ length: 8 }, (_, i) => ({
      id: `ap-${i + 1}`,
      facility_name: `AP Cold Storage ${i + 1}`,
      stateId: 'AP',
      stateName: 'Andhra Pradesh',
      districtName: 'Hyderabad',
      cityName: 'Hyderabad',
      farmers: farmersByState['ap'][i]
    })),
    ...Array.from({ length: 4 }, (_, i) => ({
      id: `cg-${i + 1}`,
      facility_name: `CG Cold Storage ${i + 1}`,
      stateId: 'CG',
      stateName: 'Chhattisgarh',
      districtName: 'Raipur',
      cityName: 'Raipur',
      farmers: farmersByState['cg'][i]
    })),
    ...Array.from({ length: 4 }, (_, i) => ({
      id: `wb-${i + 1}`,
      facility_name: `WB Cold Storage ${i + 1}`,
      stateId: 'WB',
      stateName: 'West Bengal',
      districtName: 'Kolkata',
      cityName: 'Kolkata',
      farmers: farmersByState['wb'][i]
    })),
    ...Array.from({ length: 5 }, (_, i) => ({
      id: `up-${i + 1}`,
      facility_name: `UP Cold Storage ${i + 1}`,
      stateId: 'UP',
      stateName: 'Uttar Pradesh',
      districtName: 'Lucknow',
      cityName: 'Lucknow',
      farmers: farmersByState['up'][i]
    })),
    ...Array.from({ length: 4 }, (_, i) => ({
      id: `br-${i + 1}`,
      facility_name: `BR Cold Storage ${i + 1}`,
      stateId: 'BR',
      stateName: 'Bihar',
      districtName: 'Patna',
      cityName: 'Patna',
      farmers: farmersByState['br'][i]
    })),
    ...Array.from({ length: 3 }, (_, i) => ({
      id: `rj-${i + 1}`,
      facility_name: `RJ Cold Storage ${i + 1}`,
      stateId: 'RJ',
      stateName: 'Rajasthan',
      districtName: 'Jaipur',
      cityName: 'Jaipur',
      farmers: farmersByState['rj'][i]
    })),
    ...Array.from({ length: 2 }, (_, i) => ({
      id: `pb-${i + 1}`,
      facility_name: `PB Cold Storage ${i + 1}`,
      stateId: 'PB',
      stateName: 'Punjab',
      districtName: 'Amritsar',
      cityName: 'Amritsar',
      farmers: farmersByState['pb'][i]
    })),
    // Assam - 3 invested sites (NEW)
    ...Array.from({ length: 3 }, (_, i) => ({
      id: `as-inv-${i + 1}`,
      facility_name: `AS Invested Cold Storage ${i + 1}`,
      stateId: 'AS',
      stateName: 'Assam',
      districtName: 'Guwahati',
      cityName: 'Guwahati',
      farmers: farmersByState['as'][i]
    })),
    // Nagaland - 1 invested site (NEW)
    ...Array.from({ length: 1 }, (_, i) => ({
      id: `ng-inv-${i + 1}`,
      facility_name: `NG Invested Cold Storage ${i + 1}`,
      stateId: 'NG',
      stateName: 'Nagaland',
      districtName: 'Kohima',
      cityName: 'Kohima',
      farmers: farmersByState['ng'][i]
    })),
    // Chhattisgarh - 2 sites (uninvested)
    ...Array.from({ length: 2 }, (_, i) => ({
      id: `cg-uninv-${i + 1}`,
      facility_name: `CG Cold Storage ${i + 1}`,
      stateId: 'CG',
      stateName: 'Chhattisgarh',
      districtName: 'Raipur',
      cityName: 'Raipur',
      farmers: farmersByState['cg'][4 + i]
    })),
    // West Bengal - 2 sites (uninvested)
    ...Array.from({ length: 2 }, (_, i) => ({
      id: `wb-uninv-${i + 1}`,
      facility_name: `WB Cold Storage ${i + 1}`,
      stateId: 'WB',
      stateName: 'West Bengal',
      districtName: 'Kolkata',
      cityName: 'Kolkata',
      farmers: farmersByState['wb'][4 + i]
    })),

    // UNINVESTED STATES (87 total uninvested to reach 182 total)
    // Madhya Pradesh - 4 sites (uninvested) → 1-digit
    ...Array.from({ length: 4 }, (_, i) => ({
      id: `mp-uninv-${i + 1}`,
      facility_name: `MP Cold Storage ${i + 1}`,
      stateId: 'MP',
      stateName: 'Madhya Pradesh',
      districtName: 'Indore',
      cityName: 'Indore',
      farmers: farmersByState['mp'][i]
    })),
    // Telangana - 4 sites (uninvested) → 1-digit
    ...Array.from({ length: 4 }, (_, i) => ({
      id: `tg-uninv-${i + 1}`,
      facility_name: `TG Cold Storage ${i + 1}`,
      stateId: 'TG',
      stateName: 'Telangana',
      districtName: 'Hyderabad',
      cityName: 'Hyderabad',
      farmers: farmersByState['tg'][i]
    })),
    // Odisha - 5 sites (uninvested) → 1-digit
    ...Array.from({ length: 5 }, (_, i) => ({
      id: `od-uninv-${i + 1}`,
      facility_name: `OD Cold Storage ${i + 1}`,
      stateId: 'OD',
      stateName: 'Odisha',
      districtName: 'Bhubaneswar',
      cityName: 'Bhubaneswar',
      farmers: farmersByState['od'][i]
    })),
    // Jharkhand - 4 sites (uninvested) → 1-digit
    ...Array.from({ length: 4 }, (_, i) => ({
      id: `jh-uninv-${i + 1}`,
      facility_name: `JH Cold Storage ${i + 1}`,
      stateId: 'JH',
      stateName: 'Jharkhand',
      districtName: 'Ranchi',
      cityName: 'Ranchi',
      farmers: farmersByState['jh'][i]
    })),
    // Kerala - 5 sites (uninvested) → 1-digit
    ...Array.from({ length: 5 }, (_, i) => ({
      id: `kl-uninv-${i + 1}`,
      facility_name: `KL Cold Storage ${i + 1}`,
      stateId: 'KL',
      stateName: 'Kerala',
      districtName: 'Kochi',
      cityName: 'Kochi',
      farmers: farmersByState['kl'][i]
    })),
    // Goa - 3 sites (uninvested) → 1-digit
    ...Array.from({ length: 3 }, (_, i) => ({
      id: `ga-uninv-${i + 1}`,
      facility_name: `GA Cold Storage ${i + 1}`,
      stateId: 'GA',
      stateName: 'Goa',
      districtName: 'Panaji',
      cityName: 'Panaji',
      farmers: farmersByState['ga'][i]
    })),
    // Haryana - 4 sites (uninvested) → 1-digit
    ...Array.from({ length: 4 }, (_, i) => ({
      id: `hr-uninv-${i + 1}`,
      facility_name: `HR Cold Storage ${i + 1}`,
      stateId: 'HR',
      stateName: 'Haryana',
      districtName: 'Gurgaon',
      cityName: 'Gurgaon',
      farmers: farmersByState['hr'][i]
    })),
    // Himachal Pradesh - 4 more uninvested (on top of 18 invested) → 2-digit
    ...Array.from({ length: 4 }, (_, i) => ({
      id: `hp-uninv-${i + 1}`,
      facility_name: `HP Cold Storage ${i + 22}`,
      stateId: 'HP',
      stateName: 'Himachal Pradesh',
      districtName: 'Shimla',
      cityName: 'Shimla',
      farmers: farmersByState['hp'][18 + i]
    })),
    // Uttarakhand - 5 sites (uninvested) → 1-digit
    ...Array.from({ length: 5 }, (_, i) => ({
      id: `uk-uninv-${i + 1}`,
      facility_name: `UK Cold Storage ${i + 1}`,
      stateId: 'UK',
      stateName: 'Uttarakhand',
      districtName: 'Dehradun',
      cityName: 'Dehradun',
      farmers: farmersByState['uk'][i]
    })),
    // Assam - 5 sites (uninvested) → 1-digit
    ...Array.from({ length: 5 }, (_, i) => ({
      id: `as-uninv-${i + 1}`,
      facility_name: `AS Cold Storage ${i + 1}`,
      stateId: 'AS',
      stateName: 'Assam',
      districtName: 'Guwahati',
      cityName: 'Guwahati',
      farmers: farmersByState['as'][3 + i]
    })),
    // Meghalaya - 3 sites (uninvested) → 1-digit
    ...Array.from({ length: 3 }, (_, i) => ({
      id: `ml-uninv-${i + 1}`,
      facility_name: `ML Cold Storage ${i + 1}`,
      stateId: 'ML',
      stateName: 'Meghalaya',
      districtName: 'Shillong',
      cityName: 'Shillong',
      farmers: farmersByState['ml'][i]
    })),
    // Tripura - 3 sites (uninvested) → 1-digit
    ...Array.from({ length: 3 }, (_, i) => ({
      id: `tr-uninv-${i + 1}`,
      facility_name: `TR Cold Storage ${i + 1}`,
      stateId: 'TR',
      stateName: 'Tripura',
      districtName: 'Agartala',
      cityName: 'Agartala',
      farmers: farmersByState['tr'][i]
    })),
    // Mizoram - 2 sites (uninvested) → 1-digit
    ...Array.from({ length: 2 }, (_, i) => ({
      id: `mz-uninv-${i + 1}`,
      facility_name: `MZ Cold Storage ${i + 1}`,
      stateId: 'MZ',
      stateName: 'Mizoram',
      districtName: 'Aizawl',
      cityName: 'Aizawl',
      farmers: farmersByState['mz'][i]
    })),
    // Nagaland - 2 sites (uninvested) → 1-digit
    ...Array.from({ length: 2 }, (_, i) => ({
      id: `ng-uninv-${i + 1}`,
      facility_name: `NG Cold Storage ${i + 1}`,
      stateId: 'NG',
      stateName: 'Nagaland',
      districtName: 'Kohima',
      cityName: 'Kohima',
      farmers: farmersByState['ng'][1 + i]
    })),
    // Manipur - 2 sites (uninvested) → 1-digit
    ...Array.from({ length: 2 }, (_, i) => ({
      id: `mn-uninv-${i + 1}`,
      facility_name: `MN Cold Storage ${i + 1}`,
      stateId: 'MN',
      stateName: 'Manipur',
      districtName: 'Imphal',
      cityName: 'Imphal',
      farmers: farmersByState['mn'][i]
    })),
    // Sikkim - 2 sites (uninvested) → 1-digit
    ...Array.from({ length: 2 }, (_, i) => ({
      id: `sk-uninv-${i + 1}`,
      facility_name: `SK Cold Storage ${i + 1}`,
      stateId: 'SK',
      stateName: 'Sikkim',
      districtName: 'Gangtok',
      cityName: 'Gangtok',
      farmers: farmersByState['sk'][i]
    })),
    // Arunachal Pradesh - 3 sites (uninvested) → 1-digit
    ...Array.from({ length: 3 }, (_, i) => ({
      id: `ar-uninv-${i + 1}`,
      facility_name: `AR Cold Storage ${i + 1}`,
      stateId: 'AR',
      stateName: 'Arunachal Pradesh',
      districtName: 'Itanagar',
      cityName: 'Itanagar',
      farmers: farmersByState['ar'][i]
    })),
    // Punjab - 4 more uninvested (on top of 2 invested) → 1-digit
    ...Array.from({ length: 4 }, (_, i) => ({
      id: `pb-uninv-${i + 1}`,
      facility_name: `PB Cold Storage ${i + 6}`,
      stateId: 'PB',
      stateName: 'Punjab',
      districtName: 'Ludhiana',
      cityName: 'Ludhiana',
      farmers: farmersByState['pb'][2 + i]
    })),
    // Jammu & Kashmir - 4 sites (uninvested) → 1-digit
    ...Array.from({ length: 4 }, (_, i) => ({
      id: `jk-uninv-${i + 1}`,
      facility_name: `JK Cold Storage ${i + 1}`,
      stateId: 'JK',
      stateName: 'Jammu & Kashmir',
      districtName: 'Srinagar',
      cityName: 'Srinagar',
      farmers: farmersByState['jk'][i]
    }))
  ];

  const [facilities, setFacilities] = useState<FacilityData[]>(demoFacilities);
  const [investments, setInvestments] = useState<InvestmentData[]>(demoInvestments);
  
  const [hoveredState, setHoveredState] = useState<StateSummary | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

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
        if (data.objects && data.objects.states) {
          setGeoData({ ...data, objects: { states: data.objects.states } });
        } else {
          setGeoData(data);
        }
      })
      .catch(e => {
        console.error("Map load error:", e);
        setMapError(true);
      });
      
    loadMapData();
  }, [user?.id]);

  const loadMapData = async () => {
    try {
      setLoading(true);
      // DEMO MODE: Using hardcoded demo data
      // In production, this will fetch real data from the database
      // For now, demo data is already set in state initialization
      setLoading(false);
    } catch (e) {
      console.error("Error loading portfolio data:", e);
      setLoading(false);
    }
  };

  const stateSummaries = useMemo(() => {
    const sums: Record<string, StateSummary> = {};
    const invMap = new Map(investments.map(i => [i.site_id, i]));

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
          activeAlerts: 0,
          totalFarmers: 0
        };
      }
      sums[sName].totalFacilities += 1;
      sums[sName].totalFarmers += f.farmers;
      
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
    let totalInvestedFacs = 0;
    let totalRoiRaw = 0;
    let totalCredits = 0;

    investments.forEach(i => {
      totalInvestedFacs += 1;
      totInv += Number(i.investment_amount_inr) || 0;
      totalRoiRaw += Number(i.roi_percentage_estimate) || 0;
      totalCredits += Number(i.carbon_credits) || 241;
      
      const f = facilities.find(fac => fac.id === i.site_id);
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
  
  const colorScale = scaleLinear<string>()
    .domain([0, 1])
    .range(["#f8fafc", "#3b82f6"]).unknown("#e2e8f0");

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-64px)] bg-slate-50 dark:bg-slate-900">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-auto md:h-[calc(100vh-64px)] min-h-[calc(100vh-64px)] bg-slate-50 dark:bg-slate-900 overflow-y-auto md:overflow-hidden">
      
      {/* Map Section */}
      <div className="w-full md:flex-1 h-[360px] sm:h-[420px] md:h-full relative shrink-0" onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}>
        
        {/* Search & Header overlay */}
        <div className="absolute top-6 left-6 right-6 z-10"></div>

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
                    <span className="text-slate-600 dark:text-slate-400">Total Sites:</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{portfolio.totalFacilities}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Invested Facilities:</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{portfolio.investedFacilities}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Cities Covered:</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{portfolio.totalCities}</span>
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
                    const summary = stateSummaries[stateName] || { totalFacilities: 0, stateName };
                    
                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        onMouseEnter={() => setHoveredState(summary as StateSummary)}
                        onMouseLeave={() => setHoveredState(null)}
                        onClick={() => summary.investedFacilities > 0 ? navigate(`/stakeholder/state/${encodeURIComponent(stateName)}`) : null}
                        style={{
                          default: {
                            fill: summary.investedFacilities > 0 ? colorScale(summary.investedFacilities / 10) : "#e2e8f0",
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
              className="fixed pointer-events-none z-50 bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl border border-slate-200 dark:border-slate-700 shadow-2xl rounded-2xl p-4 w-64"
              style={{ left: `${mousePos.x + 15}px`, top: `${mousePos.y + 15}px` }}
            >
              <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2 pb-2 border-b border-slate-100 dark:border-slate-700">
                {hoveredState.stateName}
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                  <span className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5"/> Total Sites</span>
                  <span className="font-medium">{hoveredState.totalFacilities}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                  <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5"/> Invested Sites</span>
                  <span className="font-semibold text-blue-600 dark:text-blue-400">{hoveredState.investedFacilities}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                  <span className="flex items-center gap-1.5"><Leaf className="w-3.5 h-3.5 text-emerald-500"/> Farmers Served</span>
                  <span className="font-medium text-emerald-600">{hoveredState?.totalFarmers?.toLocaleString() || '0'}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                  <span className="flex items-center gap-1.5 text-emerald-500"><Zap className="w-3.5 h-3.5"/> Carbon Credits</span>
                  <span className="font-medium text-emerald-600">{hoveredState?.carbonCredits?.toLocaleString() || '0'}</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Legend - Bottom Left */}
        <div className="absolute bottom-6 left-6 bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl border border-slate-200 dark:border-slate-700 shadow-xl rounded-2xl p-4 z-20 w-64">
          <h4 className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-widest mb-3">Investment Intensity</h4>
          <div className="space-y-3">
            {/* Smooth continuous gradient bar - matches map colors */}
            <div 
              className="h-8 rounded-lg border border-slate-300 dark:border-slate-600 shadow-inner"
              style={{
                background: 'linear-gradient(90deg, #f8fafc 0%, #c7d2e0 25%, #93c5fd 50%, #3b82f6 75%, #1e40af 100%)'
              }}
            />
            {/* Labels */}
            <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
              <span>No Investment</span>
              <span>High Investment</span>
            </div>
            {/* Mobile note */}
            <div className="text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-700">
              💡 Tap any state to view details
            </div>
          </div>
        </div>
      </div>

      {/* Portfolio Sidebar */}
      <div className="w-full md:w-96 bg-white dark:bg-slate-800 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-700 p-4 sm:p-5 flex flex-col shrink-0">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mb-5 flex items-center gap-2">
           Portfolio Summary
        </h2>
        
        <div className="space-y-4 flex-1 overflow-visible md:overflow-y-auto pb-10 md:pb-0">
          {/* ROW 1: 2-Box Layout - Total Sites & Your Invested */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3 border border-slate-100 dark:border-slate-700">
              <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">Total Sites</h4>
              <div className="text-3xl font-bold text-slate-800 dark:text-slate-100">182</div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3 border border-slate-100 dark:border-slate-700">
              <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">Your Invested</h4>
              <div className="text-3xl font-bold text-slate-800 dark:text-slate-100">95</div>
            </div>
          </div>

          {/* ROW 2: Full Width - Farmers */}
          <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-3 border border-emerald-100 dark:border-emerald-800/30">
            <div className="text-lg font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
              <span className="text-2xl">🌾</span>
              283 Farmers in the Ecosystem
            </div>
          </div>

          {/* ROW 3: Full Width - Carbon Impact */}
          <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3 border border-green-100 dark:border-green-800/30">
            <h4 className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-widest mb-1">Monthly Carbon</h4>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-green-700 dark:text-green-300">12.4</span>
              <span className="text-sm text-green-600 dark:text-green-400">tons CO2</span>
            </div>
          </div>

          {/* ROW 4: Single Box - Network Efficiency */}
          <div className="bg-cyan-50 dark:bg-cyan-900/20 rounded-xl p-3 border border-cyan-100 dark:border-cyan-800/30">
            <h4 className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 uppercase tracking-widest mb-1">Efficiency</h4>
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-3xl font-bold text-cyan-700 dark:text-cyan-300">1.29</span>
              <span className="text-sm text-cyan-600 dark:text-cyan-400">kWh/kg</span>
            </div>
            <p className="text-sm text-cyan-600 dark:text-cyan-400 mb-0.5">
              vs 1.78 industry avg
            </p>
            <p className="text-sm text-cyan-600 dark:text-cyan-400">
              <strong>25% better</strong> than industry
            </p>
          </div>

          {/* ROW 5: Full Width - Energy Mix */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 border border-blue-100 dark:border-blue-800/30">
            <h4 className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-2">Energy Mix</h4>
            
            {/* Solar Energy */}
            <div className="mb-2">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">☀️ Solar</span>
                <span className="text-sm font-bold text-blue-700 dark:text-blue-300">72%</span>
              </div>
              <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
                <div className="bg-yellow-400 h-2 rounded-full" style={{ width: '72%' }}></div>
              </div>
            </div>

            {/* Grid Energy */}
            <div className="mb-2">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">⚡ Grid</span>
                <span className="text-sm font-bold text-blue-700 dark:text-blue-300">28%</span>
              </div>
              <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
                <div className="bg-gray-400 h-2 rounded-full" style={{ width: '28%' }}></div>
              </div>
            </div>

            {/* Savings */}
            <p className="text-sm text-blue-600 dark:text-blue-400">
              <strong>Save: 2.4T CO2/month</strong>
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}

export default StakeholderMap;
