import React from 'react';
import { Bell, ShieldCheck, AlertCircle, Clock, CheckCircle, User, Wrench } from 'lucide-react';

const OwnerAlerts: React.FC = () => {
  return (
    <div className="p-8 max-w-[1400px] mx-auto min-h-screen">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            System Alerts
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">
            Review incidents, warnings, and maintenance notifications.
          </p>
        </div>
        <button className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors">
          Notification Settings
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 flex items-start gap-4">
          <div className="p-3 bg-red-50 dark:bg-red-900/30 rounded-xl">
            <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Critical Alerts</h3>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">1</p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">1 Solved</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 flex items-start gap-4">
          <div className="p-3 bg-amber-50 dark:bg-amber-900/30 rounded-xl">
            <Clock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Unresolved Warnings</h3>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">1</p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Needs Attention</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 flex items-start gap-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
            <Bell className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Information Logs</h3>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">2</p>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">System Updates</p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Recent Activity Log</h2>
        </div>
        
        <div className="divide-y divide-slate-100 dark:divide-slate-700">
          {/* Solved Critical Alert */}
          <div className="p-6 flex items-start gap-4">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl">
              <CheckCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-semibold text-slate-900 dark:text-white">Temperature Sensor Broken</h3>
                <span className="text-xs font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded">Solved</span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Sensor malfunction detected and repaired. Temperature monitoring restored to normal operation.</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">2 days ago</p>
            </div>
          </div>

          {/* Unresolved Warning */}
          <div className="p-6 flex items-start gap-4">
            <div className="p-3 bg-amber-50 dark:bg-amber-900/30 rounded-xl">
              <Clock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-semibold text-slate-900 dark:text-white">Energy Consumption High</h3>
                <span className="text-xs font-semibold uppercase tracking-widest text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded">Unresolved</span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">High load on HVAC system. Possible air leakage in the facility detected. Energy consumption exceeds normal thresholds.</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">5 hours ago</p>
            </div>
          </div>

          {/* Information Log 1 */}
          <div className="p-6 flex items-start gap-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
              <User className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-semibold text-slate-900 dark:text-white">New Farmer Joined Your Facility</h3>
                <span className="text-xs font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">Log</span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">New farmer registration completed successfully for Room 1 at Bajaura_site Facility.</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">1 day ago</p>
            </div>
          </div>

          {/* Information Log 2 */}
          <div className="p-6 flex items-start gap-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
              <Wrench className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-semibold text-slate-900 dark:text-white">Maintenance Was Done</h3>
                <span className="text-xs font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">Log</span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Scheduled maintenance completed. HVAC system inspected and calibrated. All systems operational.</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">43 days ago</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OwnerAlerts;
