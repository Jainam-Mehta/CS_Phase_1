import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Leaf, Zap, Users, TrendingUp, BarChart3 } from 'lucide-react';

const SiteDashboard: React.FC = () => {
  const { stateName, siteId } = useParams<{ stateName: string; siteId: string }>();
  const navigate = useNavigate();

  // Hardcoded demo data for Rajasthan sites only
  const rajasthanSites: Record<string, any> = {
    'rj-1': {
      name: 'RJ Cold Storage 1',
      location: 'Jaipur',
      farmers: 2,
      carbonCredits: 0.20,
    },
    'rj-2': {
      name: 'RJ Cold Storage 2',
      location: 'Jaipur',
      farmers: 1,
      carbonCredits: 0.18,
    },
    'rj-3': {
      name: 'RJ Cold Storage 3',
      location: 'Jaipur',
      farmers: 2,
      carbonCredits: 0.19,
    },
  };

  const site = rajasthanSites[siteId!] || {
    name: 'Site Not Found',
    location: 'Unknown',
    farmers: 0,
    carbonCredits: 0,
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <button
            onClick={() => navigate(`/stakeholder/state/${encodeURIComponent(stateName!)}`)}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors mb-6 font-medium"
          >
            <ArrowLeft className="w-4 h-4" /> Back to {stateName}
          </button>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white">{site.name}</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">📍 {site.location}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase">Farmers Served</h3>
              <Users className="w-5 h-5 text-orange-500" />
            </div>
            <div className="text-3xl font-bold text-slate-900 dark:text-white">{site.farmers}</div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase">CO2 Saved</h3>
              <Leaf className="w-5 h-5 text-green-500" />
            </div>
            <div className="text-3xl font-bold text-slate-900 dark:text-white">{site.carbonCredits.toFixed(2)}T</div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase">Avg Utilization</h3>
              <TrendingUp className="w-5 h-5 text-blue-500" />
            </div>
            <div className="text-3xl font-bold text-slate-900 dark:text-white">68%</div>
          </div>
        </div>

        {/* Analytics */}
        <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-8">Site Analytics</h2>

        {/* Row 1: CO2 Trends & Energy Efficiency */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Historical CO2 Trends */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Historical CO2 Trends</h3>
            <div className="h-56 bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 flex items-end justify-around gap-0.5 overflow-hidden">
              {Array.from({ length: 12 }, (_, i) => {
                const co2Value = 0.15 + Math.sin(i * 0.5) * 0.08 + 0.05;
                const height = (co2Value / 0.4) * 100;
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
                const efficiency = 120 - i * 1.5 + Math.random() * 5;
                const height = (efficiency / 150) * 100;
                return <div key={i} className="flex-1 bg-gradient-to-t from-amber-500 to-amber-300 rounded-t" style={{ height: `${height}%`, minHeight: '8px' }} />;
              })}
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">23% better than benchmark</p>
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
                  <linearGradient id="fg2" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style={{ stopColor: '#f97316', stopOpacity: 0.8 }} />
                    <stop offset="100%" style={{ stopColor: '#f97316', stopOpacity: 0.1 }} />
                  </linearGradient>
                </defs>
                <polyline points={Array.from({length: 12}, (_, i) => `${(i/11)*380+10},${130-((i+1)*0.12)*100}`).join(' ')} fill="url(#fg2)" stroke="#f97316" strokeWidth="1.5" />
              </svg>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">Cumulative adoption curve</p>
          </div>

          {/* Site Utilization Monthly */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Monthly Utilization Rate (%)</h3>
            <div className="grid grid-cols-12 gap-1">
              {Array.from({ length: 12 }, (_, i) => {
                const month = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'][i];
                const util = 40 + Math.random() * 45;
                const bgColor = util > 70 ? 'bg-green-500' : util > 50 ? 'bg-yellow-500' : 'bg-red-500';
                return (
                  <div key={i} className={`${bgColor} rounded h-8 flex items-center justify-center`} title={`${Math.floor(util)}%`}>
                    <span className="text-xs font-bold text-white">{Math.floor(util)}</span>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">Green &gt;70% | Yellow 50-70% | Red &lt;50%</p>
          </div>
        </div>

        {/* Row 3: Performance Scorecard & Seasonal Demand */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Performance Scorecard */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Performance Scorecard</h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center p-2 bg-slate-50 dark:bg-slate-700/50 rounded">
                <span className="text-slate-600 dark:text-slate-400">CO2/Month</span>
                <span className="font-semibold text-green-600">{(site.carbonCredits / 12).toFixed(3)}T</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-slate-50 dark:bg-slate-700/50 rounded">
                <span className="text-slate-600 dark:text-slate-400">Farmers</span>
                <span className="font-semibold text-orange-600">{site.farmers}</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-slate-50 dark:bg-slate-700/50 rounded">
                <span className="text-slate-600 dark:text-slate-400">Efficiency Rank</span>
                <span className="font-semibold text-blue-600">#1</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-slate-50 dark:bg-slate-700/50 rounded">
                <span className="text-slate-600 dark:text-slate-400">Profit/Month</span>
                <span className="font-semibold text-emerald-600">₹{(6200 + Math.random() * 2000).toFixed(0)}</span>
              </div>
            </div>
          </div>

          {/* Seasonal Demand Pattern */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Seasonal Demand Pattern</h3>
            <div className="h-56 bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 flex items-end justify-around gap-0.5 overflow-hidden">
              {Array.from({length: 12}, (_, i) => {
                const demand = i >= 7 && i <= 10 ? 400 : i >= 3 && i <= 5 ? 200 : 120;
                const season = i >= 6 && i <= 9 ? 'monsoon' : i >= 9 || i < 3 ? 'harvest' : 'off';
                const height = (demand / 500) * 100;
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
    </div>
  );
};

export default SiteDashboard;
