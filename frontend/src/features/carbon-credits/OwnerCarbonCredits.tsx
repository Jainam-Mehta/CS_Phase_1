import React, { useState } from 'react';
import { Leaf, Award, RefreshCcw, ShieldCheck, X } from 'lucide-react';
import { useSiteStore } from '../../stores/useSiteStore';

const OwnerCarbonCredits: React.FC = () => {
  const { selectedFacilityId } = useSiteStore();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  if (!selectedFacilityId) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center h-[calc(100vh-64px)]">
        <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">No Facility Selected</h3>
        <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-6">
          Please select a facility from the dropdown in the top header.
        </p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-[1400px] mx-auto min-h-screen">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            Carbon Credits
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">
            Monitor and manage your verified carbon offset certificates.
          </p>
        </div>
        <button 
          onClick={() => setIsAddDialogOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors"
        >
          Add Carbon Credit
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 flex items-start gap-4">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl">
            <Leaf className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Total Offset</h3>
            <p className="text-3xl font-bold text-slate-900 dark:text-white flex items-baseline gap-1">2,450 <span className="text-lg text-slate-500 font-medium">Tons</span></p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 flex items-start gap-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
            <Award className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Credits Earned</h3>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">1,875</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 flex items-start gap-4">
          <div className="p-3 bg-amber-50 dark:bg-amber-900/30 rounded-xl">
            <RefreshCcw className="w-6 h-6 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Pending Verification</h3>
            <p className="text-3xl font-bold text-slate-900 dark:text-white flex items-baseline gap-1">125 <span className="text-lg text-slate-500 font-medium">Credits</span></p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Carbon Credit Criteria</h2>
        </div>
        
        <div className="divide-y divide-slate-100 dark:divide-slate-700">
          <div className="p-6 flex items-start gap-4">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl">
              <Leaf className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-1">Energy Efficiency</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">High-efficiency cooling systems reduce energy consumption by 35% compared to traditional cold storage.</p>
              <div className="mt-2 flex items-center gap-2">
                <div className="h-2 flex-1 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: '85%' }}></div>
                </div>
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">85%</span>
              </div>
            </div>
          </div>

          <div className="p-6 flex items-start gap-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
              <Award className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-1">Refrigerant Management</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Low-GWP refrigerants minimize environmental impact and meet international climate standards.</p>
              <div className="mt-2 flex items-center gap-2">
                <div className="h-2 flex-1 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: '92%' }}></div>
                </div>
                <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">92%</span>
              </div>
            </div>
          </div>

          <div className="p-6 flex items-start gap-4">
            <div className="p-3 bg-amber-50 dark:bg-amber-900/30 rounded-xl">
              <RefreshCcw className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-1">Waste Reduction</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Optimal storage conditions reduce food waste by 45%, extending shelf life and minimizing landfill impact.</p>
              <div className="mt-2 flex items-center gap-2">
                <div className="h-2 flex-1 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: '78%' }}></div>
                </div>
                <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">78%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden mt-6">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Recent Certificates</h2>
        </div>
        
        <div className="divide-y divide-slate-100 dark:divide-slate-700">
          <div className="p-6 flex items-start gap-4">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl">
              <ShieldCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-semibold text-slate-900 dark:text-white">Energy Efficiency Certificate Q2 2026</h3>
                <span className="text-xs font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded">Verified</span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Offset: 450 tons CO₂e | Verified by Gold Standard Registry</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">Issued: July 15, 2026</p>
            </div>
          </div>

          <div className="p-6 flex items-start gap-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
              <ShieldCheck className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-semibold text-slate-900 dark:text-white">Refrigerant Management Certificate Q1 2026</h3>
                <span className="text-xs font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">Verified</span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Offset: 325 tons CO₂e | Verified by Verra (VCS)</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">Issued: April 20, 2026</p>
            </div>
          </div>

          <div className="p-6 flex items-start gap-4">
            <div className="p-3 bg-amber-50 dark:bg-amber-900/30 rounded-xl">
              <RefreshCcw className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-semibold text-slate-900 dark:text-white">Waste Reduction Certificate Q4 2025</h3>
                <span className="text-xs font-semibold uppercase tracking-widest text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded">Verified</span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Offset: 280 tons CO₂e | Verified by Internal Audit</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">Issued: January 10, 2026</p>
            </div>
          </div>
        </div>
      </div>

      {/* Add Carbon Credit Dialog */}
      {isAddDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-700">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Register Carbon Credit</h3>
              <button 
                onClick={() => setIsAddDialogOpen(false)}
                className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
              </button>
            </div>
            <div className="p-6">
              <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); setIsAddDialogOpen(false); }}>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Credit Amount (Tons)
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:text-white"
                    placeholder="e.g. 10.5"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Verification Source
                  </label>
                  <select 
                    required
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:text-white"
                  >
                    <option value="">Select Registry</option>
                    <option value="gold-standard">Gold Standard</option>
                    <option value="vcs">Verra (VCS)</option>
                    <option value="other">Other / Internal Audit</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Certificate ID (Optional)
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:text-white"
                    placeholder="Enter issuance ID if applicable"
                  />
                </div>
                
                <div className="pt-4 flex justify-end gap-3">
                  <button 
                    type="button" 
                    onClick={() => setIsAddDialogOpen(false)}
                    className="px-5 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="px-5 py-2.5 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 shadow-sm transition-colors"
                  >
                    Register Credit
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OwnerCarbonCredits;
