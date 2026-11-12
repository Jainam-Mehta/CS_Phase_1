import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, ArrowLeft, Building2, TrendingUp, Leaf, Users, Zap, BarChart3, Eye } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/Card';

interface SiteData {
  id: string;
  facility_name: string;
  districtName: string;
  localityName?: string;
  pincode?: string;
  carbonCredits: number;
  farmers: number;
}

const StakeholderState: React.FC = () => {
  const { stateName } = useParams<{ stateName: string }>();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  
  // Hardcoded demo data matching StakeholderMap.tsx
  // Carbon credits now in realistic tons (0.20-0.30 per site)
  const demoData: Record<string, SiteData[]> = {
    'Himachal Pradesh': [
      ...Array.from({ length: 18 }, (_, i) => ({
        id: `hp-${i + 1}`,
        facility_name: `HP Cold Storage ${i + 1}`,
        districtName: 'Kangra',
        localityName: 'Dharamshala',
        pincode: '176215',
        carbonCredits: 0.20 + Math.random() * 0.10,
        farmers: [3, 2, 1, 3, 2, 1, 3, 2, 1, 3, 2, 1, 3, 2, 1, 2, 1, 2][i]
      })),
      ...Array.from({ length: 4 }, (_, i) => ({
        id: `hp-uninv-${i + 1}`,
        facility_name: `HP Cold Storage ${i + 22}`,
        districtName: 'Shimla',
        localityName: 'Shimla',
        pincode: '171001',
        carbonCredits: 0.20 + Math.random() * 0.10,
        farmers: [1, 1, 2, 1][i]
      }))
    ],
    'Maharashtra': Array.from({ length: 12 }, (_, i) => ({
      id: `mh-${i + 1}`,
      facility_name: `MH Cold Storage ${i + 1}`,
      districtName: 'Pune',
      localityName: 'Pune',
      pincode: '411001',
      carbonCredits: 0.18 + Math.random() * 0.14,
      farmers: [3, 2, 2, 3, 1, 2, 1, 2, 2, 1, 2, 1][i]
    })),
    'Tamil Nadu': Array.from({ length: 4 }, (_, i) => ({
      id: `tn-${i + 1}`,
      facility_name: `TN Cold Storage ${i + 1}`,
      districtName: 'Chennai',
      localityName: 'Chennai',
      pincode: '600001',
      carbonCredits: 0.25 + Math.random() * 0.10,
      farmers: [2, 1, 2, 1][i]
    })),
    'Andhra Pradesh': Array.from({ length: 8 }, (_, i) => ({
      id: `ap-${i + 1}`,
      facility_name: `AP Cold Storage ${i + 1}`,
      districtName: 'Hyderabad',
      localityName: 'Hyderabad',
      pincode: '500001',
      carbonCredits: 0.22 + Math.random() * 0.12,
      farmers: [2, 1, 2, 1, 2, 1, 2, 1][i]
    })),
    'Chhattisgarh': [
      ...Array.from({ length: 4 }, (_, i) => ({
        id: `cg-${i + 1}`,
        facility_name: `CG Cold Storage ${i + 1}`,
        districtName: 'Raipur',
        localityName: 'Raipur',
        pincode: '492001',
        carbonCredits: 0.20 + Math.random() * 0.10,
        farmers: [2, 1, 2, 1][i]
      })),
      ...Array.from({ length: 2 }, (_, i) => ({
        id: `cg-uninv-${i + 1}`,
        facility_name: `CG Cold Storage ${i + 1}`,
        districtName: 'Raipur',
        localityName: 'Raipur',
        pincode: '492001',
        carbonCredits: 0.20 + Math.random() * 0.10,
        farmers: [1, 2][i]
      }))
    ],
    'West Bengal': [
      ...Array.from({ length: 4 }, (_, i) => ({
        id: `wb-${i + 1}`,
        facility_name: `WB Cold Storage ${i + 1}`,
        districtName: 'Kolkata',
        localityName: 'Kolkata',
        pincode: '700001',
        carbonCredits: 0.20 + Math.random() * 0.10,
        farmers: [2, 1, 2, 1][i]
      })),
      ...Array.from({ length: 2 }, (_, i) => ({
        id: `wb-uninv-${i + 1}`,
        facility_name: `WB Cold Storage ${i + 1}`,
        districtName: 'Kolkata',
        localityName: 'Kolkata',
        pincode: '700001',
        carbonCredits: 0.20 + Math.random() * 0.10,
        farmers: [2, 1][i]
      }))
    ],
    'Gujarat': Array.from({ length: 6 }, (_, i) => ({
      id: `gj-${i + 1}`,
      facility_name: `GJ Cold Storage ${i + 1}`,
      districtName: 'Ahmedabad',
      localityName: 'Ahmedabad',
      pincode: '380001',
      carbonCredits: 0.20 + Math.random() * 0.10,
      farmers: [2, 1, 2, 1, 2, 1][i]
    })),
    'Karnataka': Array.from({ length: 6 }, (_, i) => ({
      id: `ka-${i + 1}`,
      facility_name: `KA Cold Storage ${i + 1}`,
      districtName: 'Bangalore',
      localityName: 'Bangalore',
      pincode: '560001',
      carbonCredits: 0.22 + Math.random() * 0.08,
      farmers: [2, 2, 2, 1, 2, 1][i]
    })),
    'Uttar Pradesh': Array.from({ length: 5 }, (_, i) => ({
      id: `up-${i + 1}`,
      facility_name: `UP Cold Storage ${i + 1}`,
      districtName: 'Lucknow',
      localityName: 'Lucknow',
      pincode: '226001',
      carbonCredits: 0.23 + Math.random() * 0.10,
      farmers: [2, 1, 2, 1, 2][i]
    })),
    'Bihar': Array.from({ length: 4 }, (_, i) => ({
      id: `br-${i + 1}`,
      facility_name: `BR Cold Storage ${i + 1}`,
      districtName: 'Patna',
      localityName: 'Patna',
      pincode: '800001',
      carbonCredits: 0.20 + Math.random() * 0.10,
      farmers: [2, 1, 2, 1][i]
    })),
    'Rajasthan': Array.from({ length: 3 }, (_, i) => ({
      id: `rj-${i + 1}`,
      facility_name: `RJ Cold Storage ${i + 1}`,
      districtName: 'Jaipur',
      localityName: 'Jaipur',
      pincode: '302001',
      carbonCredits: 0.20 + Math.random() * 0.10,
      farmers: [2, 1, 2][i]
    })),
    'Punjab': [
      ...Array.from({ length: 2 }, (_, i) => ({
        id: `pb-${i + 1}`,
        facility_name: `PB Cold Storage ${i + 1}`,
        districtName: 'Amritsar',
        localityName: 'Amritsar',
        pincode: '143001',
        carbonCredits: 0.23 + Math.random() * 0.10,
        farmers: [2, 1][i]
      })),
      ...Array.from({ length: 4 }, (_, i) => ({
        id: `pb-uninv-${i + 1}`,
        facility_name: `PB Cold Storage ${i + 6}`,
        districtName: 'Ludhiana',
        localityName: 'Ludhiana',
        pincode: '141001',
        carbonCredits: 0.20 + Math.random() * 0.10,
        farmers: [2, 1, 2, 1][i]
      }))
    ],
    'Assam': [
      ...Array.from({ length: 3 }, (_, i) => ({
        id: `as-inv-${i + 1}`,
        facility_name: `AS Invested Cold Storage ${i + 1}`,
        districtName: 'Guwahati',
        localityName: 'Guwahati',
        pincode: '781001',
        carbonCredits: 0.20 + Math.random() * 0.10,
        farmers: [2, 2, 1][i]
      })),
      ...Array.from({ length: 5 }, (_, i) => ({
        id: `as-uninv-${i + 1}`,
        facility_name: `AS Cold Storage ${i + 1}`,
        districtName: 'Guwahati',
        localityName: 'Guwahati',
        pincode: '781001',
        carbonCredits: 0.20 + Math.random() * 0.10,
        farmers: [2, 2, 1, 2, 1][i]
      }))
    ],
    'Nagaland': [
      {
        id: `ng-inv-1`,
        facility_name: `NG Invested Cold Storage 1`,
        districtName: 'Kohima',
        localityName: 'Kohima',
        pincode: '797001',
        carbonCredits: 0.20 + Math.random() * 0.10,
        farmers: 2
      },
      ...Array.from({ length: 2 }, (_, i) => ({
        id: `ng-uninv-${i + 1}`,
        facility_name: `NG Cold Storage ${i + 1}`,
        districtName: 'Kohima',
        localityName: 'Kohima',
        pincode: '797001',
        carbonCredits: 0.20 + Math.random() * 0.10,
        farmers: [1, 1][i]
      }))
    ],
    'Madhya Pradesh': Array.from({ length: 4 }, (_, i) => ({
      id: `mp-uninv-${i + 1}`,
      facility_name: `MP Cold Storage ${i + 1}`,
      districtName: 'Indore',
      localityName: 'Indore',
      pincode: '452001',
      carbonCredits: 0.20 + Math.random() * 0.10,
      farmers: [2, 1, 2, 1][i]
    })),
    'Telangana': Array.from({ length: 4 }, (_, i) => ({
      id: `tg-uninv-${i + 1}`,
      facility_name: `TG Cold Storage ${i + 1}`,
      districtName: 'Hyderabad',
      localityName: 'Hyderabad',
      pincode: '500001',
      carbonCredits: 0.20 + Math.random() * 0.10,
      farmers: [2, 1, 2, 1][i]
    })),
    'Odisha': Array.from({ length: 5 }, (_, i) => ({
      id: `od-uninv-${i + 1}`,
      facility_name: `OD Cold Storage ${i + 1}`,
      districtName: 'Bhubaneswar',
      localityName: 'Bhubaneswar',
      pincode: '751001',
      carbonCredits: 0.20 + Math.random() * 0.10,
      farmers: [2, 1, 2, 1, 2][i]
    })),
    'Jharkhand': Array.from({ length: 4 }, (_, i) => ({
      id: `jh-uninv-${i + 1}`,
      facility_name: `JH Cold Storage ${i + 1}`,
      districtName: 'Ranchi',
      localityName: 'Ranchi',
      pincode: '834001',
      carbonCredits: 0.20 + Math.random() * 0.10,
      farmers: [2, 1, 2, 1][i]
    })),
    'Kerala': Array.from({ length: 5 }, (_, i) => ({
      id: `kl-uninv-${i + 1}`,
      facility_name: `KL Cold Storage ${i + 1}`,
      districtName: 'Kochi',
      localityName: 'Kochi',
      pincode: '682001',
      carbonCredits: 0.20 + Math.random() * 0.10,
      farmers: [2, 1, 1, 2, 1][i]
    })),
    'Goa': Array.from({ length: 3 }, (_, i) => ({
      id: `ga-uninv-${i + 1}`,
      facility_name: `GA Cold Storage ${i + 1}`,
      districtName: 'Panaji',
      localityName: 'Panaji',
      pincode: '403001',
      carbonCredits: 0.20 + Math.random() * 0.10,
      farmers: [2, 1, 2][i]
    })),
    'Haryana': Array.from({ length: 4 }, (_, i) => ({
      id: `hr-uninv-${i + 1}`,
      facility_name: `HR Cold Storage ${i + 1}`,
      districtName: 'Gurgaon',
      localityName: 'Gurgaon',
      pincode: '122001',
      carbonCredits: 0.20 + Math.random() * 0.10,
      farmers: [2, 1, 2, 1][i]
    })),
    'Uttarakhand': Array.from({ length: 5 }, (_, i) => ({
      id: `uk-uninv-${i + 1}`,
      facility_name: `UK Cold Storage ${i + 1}`,
      districtName: 'Dehradun',
      localityName: 'Dehradun',
      pincode: '248001',
      carbonCredits: 0.20 + Math.random() * 0.10,
      farmers: [2, 1, 1, 2, 1][i]
    })),
    'Meghalaya': Array.from({ length: 3 }, (_, i) => ({
      id: `ml-uninv-${i + 1}`,
      facility_name: `ML Cold Storage ${i + 1}`,
      districtName: 'Shillong',
      localityName: 'Shillong',
      pincode: '793001',
      carbonCredits: 0.20 + Math.random() * 0.10,
      farmers: [2, 1, 1][i]
    })),
    'Tripura': Array.from({ length: 3 }, (_, i) => ({
      id: `tr-uninv-${i + 1}`,
      facility_name: `TR Cold Storage ${i + 1}`,
      districtName: 'Agartala',
      localityName: 'Agartala',
      pincode: '799001',
      carbonCredits: 0.20 + Math.random() * 0.10,
      farmers: [2, 1, 1][i]
    })),
    'Mizoram': Array.from({ length: 2 }, (_, i) => ({
      id: `mz-uninv-${i + 1}`,
      facility_name: `MZ Cold Storage ${i + 1}`,
      districtName: 'Aizawl',
      localityName: 'Aizawl',
      pincode: '796001',
      carbonCredits: 0.20 + Math.random() * 0.10,
      farmers: [2, 1][i]
    })),
    'Manipur': Array.from({ length: 2 }, (_, i) => ({
      id: `mn-uninv-${i + 1}`,
      facility_name: `MN Cold Storage ${i + 1}`,
      districtName: 'Imphal',
      localityName: 'Imphal',
      pincode: '795001',
      carbonCredits: 0.20 + Math.random() * 0.10,
      farmers: [2, 1][i]
    })),
    'Sikkim': Array.from({ length: 2 }, (_, i) => ({
      id: `sk-uninv-${i + 1}`,
      facility_name: `SK Cold Storage ${i + 1}`,
      districtName: 'Gangtok',
      localityName: 'Gangtok',
      pincode: '737001',
      carbonCredits: 0.20 + Math.random() * 0.10,
      farmers: [2, 1][i]
    })),
    'Arunachal Pradesh': Array.from({ length: 3 }, (_, i) => ({
      id: `ar-uninv-${i + 1}`,
      facility_name: `AR Cold Storage ${i + 1}`,
      districtName: 'Itanagar',
      localityName: 'Itanagar',
      pincode: '791111',
      carbonCredits: 0.20 + Math.random() * 0.10,
      farmers: [2, 1, 1][i]
    })),
    'Jammu & Kashmir': Array.from({ length: 4 }, (_, i) => ({
      id: `jk-uninv-${i + 1}`,
      facility_name: `JK Cold Storage ${i + 1}`,
      districtName: 'Srinagar',
      localityName: 'Srinagar',
      pincode: '190001',
      carbonCredits: 0.20 + Math.random() * 0.10,
      farmers: [2, 1, 2, 1][i]
    }))
  };

  const sites = demoData[stateName!] || [];
  const investedSites = sites.filter(s => !s.id.includes('uninv'));
  const uninvestedSites = sites.filter(s => s.id.includes('uninv'));
  const displaySites = investedSites.length > 0 ? investedSites : sites;
  
  const totalSitesInState = sites.length;
  const investedCount = investedSites.length;
  const totalFarmersInState = displaySites.reduce((sum, s) => sum + s.farmers, 0);
  const totalCarbonCredits = displaySites.reduce((sum, s) => sum + s.carbonCredits, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-64px)] bg-slate-50 dark:bg-slate-900">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <button 
            onClick={() => navigate('/stakeholder/map')}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors mb-6 font-medium"
          >
            <ArrowLeft className="w-4 h-4" /> Back to India Map
          </button>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white">{stateName} Portfolio</h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* KPIs - 4 Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          {/* Total Sites in State */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-widest">Total Sites in State</h3>
              <Building2 className="w-5 h-5 text-blue-500" />
            </div>
            <div className="text-3xl font-bold text-slate-900 dark:text-white">{totalSitesInState}</div>
          </div>

          {/* Your Invested Sites */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-widest">Your Invested Sites</h3>
              <TrendingUp className="w-5 h-5 text-emerald-500" />
            </div>
            <div className="text-3xl font-bold text-slate-900 dark:text-white">{investedCount}</div>
          </div>

          {/* Farmers Served */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-widest">Farmers Served</h3>
              <Users className="w-5 h-5 text-orange-500" />
            </div>
            <div className="text-3xl font-bold text-slate-900 dark:text-white">
              {totalFarmersInState}
            </div>
          </div>

          {/* CO2 Saved This Month */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-widest">CO2 Saved</h3>
              <Leaf className="w-5 h-5 text-green-500" />
            </div>
            <div className="text-3xl font-bold text-slate-900 dark:text-white">
              {totalCarbonCredits.toFixed(2)}T
            </div>
          </div>
        </div>

        {/* Sites Grid - 3 Columns */}
        {displaySites.length === 0 ? (
          <div className="text-center py-24 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <Building2 className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No Sites in {stateName}</h3>
            <p className="text-slate-500">This state currently has no cold storage sites.</p>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
              {investedCount > 0 ? 'Your Invested Sites' : 'Cold Storage Sites'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {displaySites.map(site => (
                <Card 
                  key={site.id} 
                  className="hover:shadow-xl hover:border-blue-400 dark:hover:border-blue-600 transition-all duration-300 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 h-full flex flex-col"
                >
                  {/* Health Indicator Bar */}
                  <div className="h-1.5 bg-gradient-to-r from-green-500 via-yellow-500 to-red-500" />
                  
                  <CardContent className="p-6 flex flex-col flex-1">
                    {/* Facility Name & Location */}
                    <div className="mb-6">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{site.facility_name}</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        📍 {site.districtName}
                        {site.localityName ? ` • ${site.localityName}` : ''}
                        {site.pincode ? ` • ${site.pincode}` : ''}
                      </p>
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-2 gap-4 mb-6 flex-1">
                      {/* Farmers using this site */}
                      <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3 border border-slate-100 dark:border-slate-700/50">
                        <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">🌾 Farmers</span>
                        <span className="text-lg font-bold text-slate-900 dark:text-white">{site.farmers}</span>
                      </div>

                      {/* Carbon Credits earned */}
                      <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3 border border-slate-100 dark:border-slate-700/50">
                        <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">🌳 Carbon</span>
                        <span className="text-lg font-bold text-green-600">{site.carbonCredits.toFixed(2)}T</span>
                      </div>

                      {/* Energy used today (real-time) */}
                      <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3 border border-slate-100 dark:border-slate-700/50">
                        <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">⚡ Energy</span>
                        <span className="text-lg font-bold text-blue-600">{(Math.random() * 50 + 20).toFixed(1)} kWh</span>
                      </div>

                      {/* Health Status */}
                      <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3 border border-slate-100 dark:border-slate-700/50">
                        <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Health</span>
                        <span className="inline-block px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Good</span>
                      </div>
                    </div>

                    {/* View Dashboard Button */}
                    <button 
                      onClick={() => navigate(`/stakeholder/site/${encodeURIComponent(stateName!)}/${site.id}`)}
                      className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2">
                      <Eye className="w-4 h-4" />
                      View Dashboard
                    </button>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Impact Chart Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
              {/* 30-day CO2 Prevented */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <BarChart3 className="w-6 h-6 text-green-500" />
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">CO2 Impact</h3>
                </div>
                <div className="text-4xl font-bold text-green-600 mb-2">
                  {totalCarbonCredits.toFixed(2)} tons
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">CO2 prevented in this state's portfolio</p>
                <div className="mt-6 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-green-400 to-green-600" style={{ width: '72%' }} />
                </div>
              </div>

              {/* Tree Equivalents */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <Leaf className="w-6 h-6 text-emerald-500" />
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Tree Equivalents</h3>
                </div>
                <div className="text-4xl font-bold text-emerald-600 mb-2">
                  {Math.floor(totalCarbonCredits / 0.025)}
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Trees planted equivalent</p>
                <div className="mt-6 flex flex-wrap gap-2">
                  {Array.from({ length: Math.min(Math.floor(totalCarbonCredits / 0.05), 8) }).map((_, i) => (
                    <span key={i} className="text-2xl">🌳</span>
                  ))}
                </div>
              </div>
            </div>

            {/* ANALYTICS SECTION - Only for Rajasthan - 2 columns per row */}
            {stateName === 'Rajasthan' && (
              <div className="mt-16">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-8">State Analytics Dashboard</h2>
                
                {/* Row 1: CO2 Trends & Energy Efficiency */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  {/* Historical CO2 Trends */}
                  <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Historical CO2 Trends</h3>
                    <div className="h-56 bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 flex items-end justify-around gap-0.5 overflow-hidden">
                      {Array.from({ length: 12 }, (_, i) => {
                        const co2Value = 0.8 + Math.sin(i * 0.5) * 0.4 + 0.3;
                        const height = (co2Value / 2) * 100;
                        return <div key={i} className="flex-1 bg-gradient-to-t from-blue-500 to-blue-300 rounded-t" style={{ height: `${height}%`, minHeight: '8px' }} />;
                      })}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">Peak in monsoon (Jul-Sep)</p>
                  </div>

                  {/* Energy Efficiency */}
                  <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Energy Efficiency Over Time</h3>
                    <div className="h-56 bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 flex items-end justify-around gap-0.5 overflow-hidden">
                      {Array.from({ length: 12 }, (_, i) => {
                        const efficiency = 145 - i * 2 + Math.random() * 10;
                        const height = (efficiency / 200) * 100;
                        return <div key={i} className="flex-1 bg-gradient-to-t from-amber-500 to-amber-300 rounded-t" style={{ height: `${height}%`, minHeight: '8px' }} />;
                      })}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">8% improvement YoY vs 150kWh benchmark</p>
                  </div>
                </div>

                {/* Row 2: Farmer Impact & Site Utilization */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  {/* Farmer Impact */}
                  <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Farmer Impact Growth (Cumulative)</h3>
                    <div className="h-56 bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3">
                      <svg className="w-full h-full" viewBox="0 0 400 150">
                        <defs>
                          <linearGradient id="fg1" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" style={{ stopColor: '#f97316', stopOpacity: 0.8 }} />
                            <stop offset="100%" style={{ stopColor: '#f97316', stopOpacity: 0.1 }} />
                          </linearGradient>
                        </defs>
                        <polyline points={Array.from({length: 12}, (_, i) => `${(i/11)*380+10},${130-((i+1)*1.5)*3}`).join(' ')} fill="url(#fg1)" stroke="#f97316" strokeWidth="1.5" />
                      </svg>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">Cumulative adoption curve</p>
                  </div>

                  {/* Site Utilization Heatmap */}
                  <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Site Utilization Rate (%)</h3>
                    <div className="space-y-2">
                      {displaySites.map((site) => (
                        <div key={site.id} className="text-xs">
                          <div className="font-semibold text-slate-900 dark:text-white mb-1 truncate">{site.facility_name.split(' ').pop()}</div>
                          <div className="flex gap-0.5">
                            {Array.from({length: 12}, (_, m) => {
                              const util = 50 + Math.random() * 50;
                              const bgColor = util > 75 ? 'bg-green-500' : util > 50 ? 'bg-yellow-500' : 'bg-red-500';
                              return <div key={m} className={`flex-1 ${bgColor} rounded h-4`} title={`${Math.floor(util)}%`} />;
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">Green &gt;75% | Yellow 50-75% | Red &lt;50%</p>
                  </div>
                </div>

                {/* Row 3: Performance Scorecard & Seasonal Demand */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Performance Scorecard */}
                  <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Performance Scorecard</h3>
                    <div className="space-y-2 text-xs">
                      {displaySites.map((site, idx) => (
                        <div key={site.id} className="flex justify-between items-center p-2 bg-slate-50 dark:bg-slate-700/50 rounded">
                          <span className="font-medium truncate flex-1">{site.facility_name.split(' ').pop()}</span>
                          <span className="text-slate-600 dark:text-slate-400">{site.carbonCredits.toFixed(2)}T</span>
                          <span className="text-slate-600 dark:text-slate-400 w-8 text-center">{site.farmers}</span>
                          <span className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-1 rounded">#{idx + 1}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Seasonal Demand Pattern */}
                  <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Seasonal Demand Pattern</h3>
                    <div className="h-56 bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 flex items-end justify-around gap-0.5 overflow-hidden">
                      {Array.from({length: 12}, (_, i) => {
                        const demand = i >= 7 && i <= 10 ? 1500 : i >= 3 && i <= 5 ? 800 : 500;
                        const season = i >= 6 && i <= 9 ? 'monsoon' : i >= 9 || i < 3 ? 'harvest' : 'off';
                        const height = (demand / 2000) * 100;
                        const color = season === 'monsoon' ? 'from-blue-500 to-blue-300' : season === 'harvest' ? 'from-amber-500 to-amber-300' : 'from-slate-400 to-slate-300';
                        return <div key={i} className={`flex-1 bg-gradient-to-t ${color} rounded-t`} style={{height: `${height}%`, minHeight: '8px'}} />;
                      })}
                    </div>
                    <div className="flex gap-2 mt-2 flex-wrap text-xs">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-gradient-to-r from-amber-500 to-amber-300 rounded"></div>
                        <span className="text-slate-600 dark:text-slate-400">Harvest</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-blue-300 rounded"></div>
                        <span className="text-slate-600 dark:text-slate-400">Monsoon</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-gradient-to-r from-slate-400 to-slate-300 rounded"></div>
                        <span className="text-slate-600 dark:text-slate-400">Off-Season</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default StakeholderState;
