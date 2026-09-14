import React, { useEffect, useState } from 'react';
import { Wrench, CheckCircle, Calendar, Settings, AlertTriangle, PenTool, Droplets, DoorOpen, ThermometerSnowflake, Wind, Zap, Shield, X, Clock, User } from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import { useSiteStore } from '../../stores/useSiteStore';
import { supabase } from '../../lib/supabase';

// Facility maintenance items with their schedules
const FACILITY_MAINTENANCE_ITEMS = [
  {
    id: 'hvac_water',
    name: 'HVAC Water Check',
    description: 'Check and replace HVAC system water',
    icon: Droplets,
    frequency: 'Monthly',
    criticalThreshold: 90, // days - becomes critical after 3 months
    urgentThreshold: 30, // days - becomes urgent after 1 month
    category: 'hvac'
  },
  {
    id: 'door_inspection',
    name: 'Cold Storage Doors',
    description: 'Inspect door seals, hinges, and locks',
    icon: DoorOpen,
    frequency: 'Yearly',
    criticalThreshold: 365,
    urgentThreshold: 330,
    category: 'structural'
  },
  {
    id: 'metal_sheets',
    name: 'Metal Sheets Inspection',
    description: 'Check for rust, leakage, and structural damage',
    icon: Shield,
    frequency: 'Every 6 Months',
    criticalThreshold: 180,
    urgentThreshold: 150,
    category: 'structural'
  },
  {
    id: 'refrigeration_system',
    name: 'Refrigeration System',
    description: 'Check compressors, condensers, and refrigerant levels',
    icon: ThermometerSnowflake,
    frequency: 'Every 3 Months',
    criticalThreshold: 90,
    urgentThreshold: 75,
    category: 'cooling'
  },
  {
    id: 'ventilation',
    name: 'Ventilation System',
    description: 'Inspect air circulation and filtration systems',
    icon: Wind,
    frequency: 'Every 6 Months',
    criticalThreshold: 180,
    urgentThreshold: 150,
    category: 'hvac'
  },
  {
    id: 'electrical_systems',
    name: 'Electrical Systems',
    description: 'Check wiring, circuit breakers, and backup power',
    icon: Zap,
    frequency: 'Every 6 Months',
    criticalThreshold: 180,
    urgentThreshold: 150,
    category: 'electrical'
  },
];

interface MaintenanceRecord {
  id: string;
  facility_id: string | null;
  maintenance_type: string;
  last_service_date: string;
  next_due_date: string;
  status: 'healthy' | 'due' | 'in_progress' | 'critical';
  notes?: string;
  created_at: string;
  updated_at: string;
}

const OwnerMaintenance: React.FC = () => {
  const { user } = useAuthStore();
  const { selectedFacilityId } = useSiteStore();
  const [loading, setLoading] = useState(true);
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
  
  // Modal states
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [selectedMaintenanceType, setSelectedMaintenanceType] = useState<string | null>(null);
  const [maintenanceHistory, setMaintenanceHistory] = useState<any[]>([]);
  
  // Schedule form state
  const [scheduleForm, setScheduleForm] = useState({
    maintenance_type: '',
    scheduled_date: '',
    notes: '',
    performed_by: ''
  });

  useEffect(() => {
    if (user?.id && selectedFacilityId) {
      loadMaintenanceData();
    }
  }, [user?.id, selectedFacilityId]);

  const loadMaintenanceData = async () => {
    try {
      setLoading(true);
      
      // Get facility creation date
      const { data: facilityData } = await supabase
        .from('facilities')
        .select('created_at')
        .eq('id', selectedFacilityId)
        .single();
      
      const facilityCreatedDate = facilityData?.created_at ? new Date(facilityData.created_at) : new Date();
      
      // Try to fetch from maintenance table, if not found, initialize with defaults
      const { data: existingRecords } = await supabase
        .from('facility_maintenance')
        .select('*')
        .eq('facility_id', selectedFacilityId);
      
      if (existingRecords && existingRecords.length > 0) {
        // Use existing records and calculate their status
        const recordsWithStatus = existingRecords.map((record: any) => {
          const lastServiceDate = new Date(record.last_service_date);
          const nextDueDate = new Date(record.next_due_date);
          const now = new Date();
          
          // Calculate days remaining (can be negative)
          const daysRemaining = Math.floor((nextDueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          
          // Determine status based on days remaining
          let status: 'healthy' | 'due' | 'overdue' | 'in_progress' | 'completed' = 'healthy';
          if (daysRemaining < 0) {
            status = 'in_progress'; // Overdue - mark as in progress
          } else if (daysRemaining <= 7) {
            status = 'due'; // Due within 7 days
          } else {
            status = 'healthy';
          }
          
          return {
            ...record,
            status,
            daysRemaining // Track this for sorting/filtering
          };
        });
        
        setMaintenanceRecords(recordsWithStatus);
      } else {
        // Initialize new maintenance records based on facility creation date
        const demoRecords: MaintenanceRecord[] = FACILITY_MAINTENANCE_ITEMS.map(item => {
          const lastServiceDate = facilityCreatedDate; // Use facility creation date as last service
          const nextDueDate = new Date(lastServiceDate);
          
          // Calculate next due date based on frequency
          if (item.frequency === 'Monthly') {
            nextDueDate.setMonth(nextDueDate.getMonth() + 1);
          } else if (item.frequency === 'Every 3 Months') {
            nextDueDate.setMonth(nextDueDate.getMonth() + 3);
          } else if (item.frequency === 'Every 6 Months') {
            nextDueDate.setMonth(nextDueDate.getMonth() + 6);
          } else if (item.frequency === 'Yearly') {
            nextDueDate.setFullYear(nextDueDate.getFullYear() + 1);
          }
          
          const now = new Date();
          const daysRemaining = Math.floor((nextDueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          
          let status: 'healthy' | 'due' | 'overdue' | 'in_progress' | 'completed' = 'healthy';
          if (daysRemaining < 0) {
            status = 'in_progress'; // Overdue - mark as in progress
          } else if (daysRemaining <= 7) {
            status = 'due'; // Due within 7 days
          }
          
          return {
            id: item.id,
            facility_id: selectedFacilityId,
            maintenance_type: item.id,
            last_service_date: lastServiceDate.toISOString(),
            next_due_date: nextDueDate.toISOString(),
            status,
            notes: `Initial maintenance schedule for ${item.name}`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
        });
        
        // Save to database
        await supabase
          .from('facility_maintenance')
          .insert(demoRecords);
        
        setMaintenanceRecords(demoRecords);
      }
    } catch (error) {
      console.error('Error loading maintenance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMaintenanceItem = (typeId: string) => {
    return FACILITY_MAINTENANCE_ITEMS.find(item => item.id === typeId);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getDaysSinceService = (lastServiceDate: string) => {
    return Math.floor((Date.now() - new Date(lastServiceDate).getTime()) / (1000 * 60 * 60 * 24));
  };

  const getDaysRemaining = (nextDueDate: string) => {
    return Math.floor((new Date(nextDueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const maintenanceItem = FACILITY_MAINTENANCE_ITEMS.find(item => item.id === scheduleForm.maintenance_type);
      if (!maintenanceItem) return;

      const scheduledDate = new Date(scheduleForm.scheduled_date);
      const nextDueDate = new Date(scheduledDate);
      
      // Calculate next due date based on frequency, NOT urgentThreshold
      if (maintenanceItem.frequency === 'Monthly') {
        nextDueDate.setMonth(nextDueDate.getMonth() + 1);
      } else if (maintenanceItem.frequency === 'Every 3 Months') {
        nextDueDate.setMonth(nextDueDate.getMonth() + 3);
      } else if (maintenanceItem.frequency === 'Every 6 Months') {
        nextDueDate.setMonth(nextDueDate.getMonth() + 6);
      } else if (maintenanceItem.frequency === 'Yearly') {
        nextDueDate.setFullYear(nextDueDate.getFullYear() + 1);
      }

      // 1. Insert into maintenance_logs (history) - status should be 'completed' only if actually done
      const { error: logError } = await supabase
        .from('facility_maintenance_logs')
        .insert({
          facility_id: selectedFacilityId,
          maintenance_type: scheduleForm.maintenance_type,
          service_date: scheduledDate.toISOString(),
          performed_by: scheduleForm.performed_by,
          notes: scheduleForm.notes,
          status: 'completed', // Maintenance is marked as completed when logged
          next_due_date: nextDueDate.toISOString()
        });

      if (logError) throw logError;

      // 2. Upsert into facility_maintenance (current status) - mark as healthy after completion
      const { error: statusError } = await supabase
        .from('facility_maintenance')
        .upsert({
          facility_id: selectedFacilityId,
          maintenance_type: scheduleForm.maintenance_type,
          last_service_date: scheduledDate.toISOString(),
          next_due_date: nextDueDate.toISOString(),
          status: 'healthy',
          notes: scheduleForm.notes,
          performed_by: scheduleForm.performed_by
        }, {
          onConflict: 'facility_id,maintenance_type'
        });

      if (statusError) throw statusError;

      setShowScheduleModal(false);
      setScheduleForm({ maintenance_type: '', scheduled_date: '', notes: '', performed_by: '' });
      loadMaintenanceData();
    } catch (error) {
      console.error('Error scheduling maintenance:', error);
    }
  };

  const handleLogMaintenance = async (maintenanceType: string) => {
    setSelectedMaintenanceType(maintenanceType);
    
    // Load maintenance history for this type from LOGS table
    try {
      const { data, error } = await supabase
        .from('facility_maintenance_logs')
        .select('*')
        .eq('facility_id', selectedFacilityId)
        .eq('maintenance_type', maintenanceType)
        .order('service_date', { ascending: false });

      if (error) throw error;
      setMaintenanceHistory(data || []);
    } catch (error) {
      console.error('Error loading maintenance history:', error);
      setMaintenanceHistory([]);
    }
    
    setShowLogModal(true);
  };

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

  const criticalItems = maintenanceRecords.filter(r => r.status === 'critical');
  const inProgressItems = maintenanceRecords.filter(r => r.status === 'in_progress');
  const dueItems = maintenanceRecords.filter(r => r.status === 'due');
  const healthyItems = maintenanceRecords.filter(r => r.status === 'healthy');

  return (
    <div className="p-8 max-w-[1400px] mx-auto min-h-screen">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            Facility Maintenance
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">
            Track and manage cold storage facility maintenance schedules.
          </p>
        </div>
        <button 
          onClick={() => setShowScheduleModal(true)}
          className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors flex items-center gap-2"
        >
          <Settings className="w-4 h-4" />
          Schedule Maintenance
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 flex items-start gap-4">
          <div className="p-3 bg-red-50 dark:bg-red-900/30 rounded-xl">
            <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">In Progress</h3>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">{inProgressItems.length}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 flex items-start gap-4">
          <div className="p-3 bg-orange-50 dark:bg-orange-900/30 rounded-xl">
            <AlertTriangle className="w-6 h-6 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Due Soon</h3>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">{dueItems.length}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 flex items-start gap-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
            <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Due Soon</h3>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">{dueItems.length}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 flex items-start gap-4">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl">
            <CheckCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Healthy</h3>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">{healthyItems.length}</p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Maintenance Schedule</h2>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Maintenance Type</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Frequency</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Last Service</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Next Due</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {maintenanceRecords.map((record) => {
                  const item = getMaintenanceItem(record.maintenance_type);
                  if (!item) return null;
                  
                  const Icon = item.icon;
                  const daysRemaining = getDaysRemaining(record.next_due_date);
                  
                  return (
                    <tr key={record.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${
                            record.status === 'in_progress' ? 'bg-red-50 dark:bg-red-900/30' :
                            record.status === 'due' ? 'bg-orange-50 dark:bg-orange-900/30' :
                            record.status === 'critical' ? 'bg-purple-50 dark:bg-purple-900/30' :
                            'bg-emerald-50 dark:bg-emerald-900/30'
                          }`}>
                            <Icon className={`w-5 h-5 ${
                              record.status === 'in_progress' ? 'text-red-600 dark:text-red-400' :
                              record.status === 'due' ? 'text-orange-600 dark:text-orange-400' :
                              record.status === 'critical' ? 'text-purple-600 dark:text-purple-400' :
                              'text-emerald-600 dark:text-emerald-400'
                            }`} />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900 dark:text-white">{item.name}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{item.description}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                        {item.frequency}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                        {formatDate(record.last_service_date)}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                        {formatDate(record.next_due_date)}
                        <span className="block text-xs text-slate-500 mt-0.5">
                          {daysRemaining > 0 ? `${daysRemaining} days left` : 'In progress'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {record.status === 'in_progress' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            In Progress
                          </span>
                        )}
                        {record.status === 'due' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">
                            <Calendar className="w-3.5 h-3.5" />
                            Due Soon
                          </span>
                        )}
                        {record.status === 'critical' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Critical
                          </span>
                        )}
                        {record.status === 'healthy' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                            <CheckCircle className="w-3.5 h-3.5" />
                            Healthy
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => handleLogMaintenance(record.maintenance_type)}
                          className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 text-sm font-medium inline-flex items-center gap-1"
                        >
                          <PenTool className="w-4 h-4" />
                          Log Maintenance
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Schedule Maintenance Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Schedule Maintenance</h2>
              <button 
                onClick={() => setShowScheduleModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleScheduleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Maintenance Type
                </label>
                <select
                  required
                  value={scheduleForm.maintenance_type}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, maintenance_type: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">Select maintenance type...</option>
                  {FACILITY_MAINTENANCE_ITEMS.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.frequency})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Scheduled Date
                </label>
                <input
                  type="date"
                  required
                  value={scheduleForm.scheduled_date}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, scheduled_date: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Performed By
                </label>
                <input
                  type="text"
                  required
                  placeholder="Technician name or company"
                  value={scheduleForm.performed_by}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, performed_by: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Additional notes or observations..."
                  value={scheduleForm.notes}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, notes: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
                >
                  Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Log Maintenance History Modal */}
      {showLogModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Maintenance History</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  {getMaintenanceItem(selectedMaintenanceType || '')?.name}
                </p>
              </div>
              <button 
                onClick={() => setShowLogModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              {maintenanceHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Clock className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No History Yet</h3>
                  <p className="text-slate-500 dark:text-slate-400">
                    No maintenance records found for this type.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {maintenanceHistory.map((record, index) => (
                    <div 
                      key={record.id}
                      className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
                            <Wrench className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                          </div>
                          <div>
                            <p className="font-medium text-slate-900 dark:text-white">
                              Service #{maintenanceHistory.length - index}
                            </p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                              {formatDate(record.service_date)}
                            </p>
                          </div>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          record.status === 'healthy' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' :
                          record.status === 'due' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                          record.status === 'overdue' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' :
                          'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                          {record.status}
                        </span>
                      </div>
                      
                      {record.performed_by && (
                        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 mb-2">
                          <User className="w-4 h-4" />
                          <span>Performed by: {record.performed_by}</span>
                        </div>
                      )}
                      
                      {record.notes && (
                        <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            {record.notes}
                          </p>
                        </div>
                      )}
                      
                      <div className="mt-3 flex items-center gap-4 text-xs text-slate-500 dark:text-slate-500">
                        <span>Next Due: {formatDate(record.next_due_date)}</span>
                        <span>•</span>
                        <span>Updated: {formatDate(record.updated_at)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="p-6 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setShowLogModal(false)}
                className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OwnerMaintenance;
