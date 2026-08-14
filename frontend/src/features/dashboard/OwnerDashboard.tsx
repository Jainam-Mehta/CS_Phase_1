import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../stores/useAuthStore';
import { useSiteStore } from '../../stores/useSiteStore';
import { supabase } from '../../lib/supabase';
import { HVACDiagram } from './components/HVACDiagram';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

// Demo data generator for presentation
const getOwnerDemoData = () => {
  const now = new Date();
  
  // Generate 24h revenue curve
  const revenueHistory = [];
  for (let i = 0; i < 24; i++) {
    const hour = (now.getHours() - 23 + i + 24) % 24;
    const baseRevenue = 3.8 + Math.sin(i / 4) * 0.5 + Math.random() * 0.2;
    revenueHistory.push({ time: `${hour}:00`, value: parseFloat(baseRevenue.toFixed(2)) });
  }
  
  // Generate occupancy curve
  const occupancyHistory = [];
  for (let i = 0; i < 24; i++) {
    const hour = (now.getHours() - 23 + i + 24) % 24;
    const baseOccupancy = 87 + Math.cos(i / 3) * 5 + Math.random() * 2;
    occupancyHistory.push({ time: `${hour}:00`, value: Math.round(baseOccupancy) });
  }
  
  // Generate energy curve
  const energyHistory = [];
  for (let i = 0; i < 24; i++) {
    const hour = (now.getHours() - 23 + i + 24) % 24;
    const baseEnergy = 12.4 + Math.sin(i / 2) * 2 + Math.random() * 1;
    energyHistory.push({ time: `${hour}:00`, value: parseFloat(baseEnergy.toFixed(1)) });
  }
  
  return {
    revenue: { total: 45.2, monthly: 3.8 },
    occupancy: { percentage: 87, capacity: 5000 },
    farmers: { total: 142 },
    energy: { monthly: 2.32 },
    profit: { total: 18.6, expenses: 26.6 },
    alerts: { active: 1 },
    charts: {
      revenueHistory,
      occupancyHistory,
      energyHistory
    },
    lastUpdated: now.toLocaleTimeString()
  };
};

const OwnerDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const { selectedFacilityId } = useSiteStore();
  const [loading, setLoading] = useState(true);

  // States
  const [rooms, setRooms] = useState<any[]>([]);
  const [dbSensors, setDbSensors] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [demoData, setDemoData] = useState<any>(null);
  const [liveTimestamp, setLiveTimestamp] = useState(new Date().toLocaleTimeString());

  // Update timestamp every second
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveTimestamp(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (user?.id && selectedFacilityId) {
      loadFacilityData();
    }
  }, [user, selectedFacilityId]);

  // Set demo data as fallback when real data is missing
  useEffect(() => {
    if (!loading) {
      setDemoData(getOwnerDemoData());
    }
  }, [loading]);

  const loadFacilityData = async () => {
    try {
      setLoading(true);

      // Fetch Rooms for selected facility
      const { data: rmData } = await supabase
        .from('cold_storage_rooms')
        .select('*')
        .eq('facility_id', selectedFacilityId);

      const resolvedRooms = rmData || [];
      setRooms(resolvedRooms);

      if (resolvedRooms.length > 0) {
        const roomIds = resolvedRooms.map((r) => r.id);

        // Fetch Sensors
        const { data: sensorData } = await supabase
          .from('sensor_devices')
          .select('*')
          .in('room_id', roomIds);

        setDbSensors(sensorData || []);

        // Fetch Inventory/Allocations (to calculate Total Farmers)
        const { data: invData } = await supabase
          .from('batch_room_allocations')
          .select('*, batches(farmer_id)')
          .in('room_id', roomIds);
          
        setInventory(invData || []);
      } else {
        setDbSensors([]);
        setInventory([]);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  // Derived calculations with demo fallbacks
  const totalSensors = dbSensors.length || 24;
  const activeSensors = dbSensors.filter((s) => s.status === 'active').length || 22;
  const inactiveSensors = totalSensors - activeSensors;

  // Farmers count with demo fallback
  const uniqueFarmers = inventory.length > 0 
    ? new Set(inventory.filter((i) => i.batches?.farmer_id).map((i) => i.batches.farmer_id)).size
    : (demoData?.farmers?.total || 142);

  // Storage with demo fallback
  const totalCapacity = rooms.length > 0 
    ? rooms.reduce((acc, rm) => acc + (Number(rm.capacity_kg) || 0), 0)
    : (demoData?.occupancy?.capacity * 1000 || 5000000);
  const currentUtilization = rooms.length > 0
    ? rooms.reduce((acc, rm) => acc + (Number(rm.current_utilization_kg) || 0), 0)
    : Math.round(totalCapacity * 0.87);
  const storagePercentage = totalCapacity > 0 ? ((currentUtilization / totalCapacity) * 100).toFixed(1) : (demoData?.occupancy?.percentage || 87);

  // System Status & Last Updated with demo fallback
  const lastSyncTime = (dbSensors.length > 0 && dbSensors[0].last_reading_at) 
    ? new Date(dbSensors[0].last_reading_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
    : (demoData?.lastUpdated || new Date().toLocaleTimeString());

  const systemStatus =
    inactiveSensors > 0 ? 'Warning' : activeSensors > 0 ? 'Optimal' : 'Optimal';
  const systemStatusColor =
    systemStatus === 'Optimal'
      ? 'from-green-500 to-emerald-600'
      : systemStatus === 'Warning'
      ? 'from-yellow-400 to-amber-500'
      : 'from-slate-500 to-slate-600';

  // Demo energy values
  const solarEnergy = demoData?.energy?.monthly * 0.65 || 8.1;
  const gridEnergy = demoData?.energy?.monthly * 0.35 || 4.3;

  // Resolve HVAC Values
  const getSensorValue = (type: string) => {
    const s = dbSensors.find((s) => s.device_type === type);
    if (!s) {
      // Demo fallback values
      const demoValues: Record<string, number> = {
        'Temperature': 4.2,
        'Humidity': 85,
        'Compressor': 92,
        'Pressure': 145,
        'Ambient Temperature': 28,
        'Ambient Humidity': 65,
        'Battery': 89
      };
      return demoValues[type] ?? null;
    }
    return s.last_reading_value ?? null;
  };

  const getSensorStatus = (type: string): 'optimal' | 'warning' | 'critical' | 'unknown' => {
    const s = dbSensors.find((s) => s.device_type === type);
    if (!s || !s.last_reading_value) return 'unknown';
    if (s.status === 'maintenance') return 'warning';
    if (s.status === 'offline') return 'critical';
    return 'optimal';
  };

  const hvacSensors = [
    {
      id: 'evap-temp',
      label: 'Cold Storage Temperature',
      value: getSensorValue('Temperature'),
      unit: '°C',
      status: getSensorStatus('Temperature'),
      x: 20,
      y: 40,
    },
    {
      id: 'evap-hum',
      label: 'Cold Storage Humidity',
      value: getSensorValue('Humidity'),
      unit: '%',
      status: getSensorStatus('Humidity'),
      x: 23,
      y: 65,
    },
    {
      id: 'comp-curr',
      label: 'Compressor Health',
      value: getSensorValue('Compressor'),
      unit: '%',
      status: getSensorStatus('Compressor'),
      x: 76,
      y: 35,
    },
    {
      id: 'comp-press',
      label: 'Pressure',
      value: getSensorValue('Pressure'),
      unit: 'Psi',
      status: getSensorStatus('Pressure'),
      x: 85,
      y: 25,
    },
    {
      id: 'cond-ambient-temp',
      label: 'Ambient Temperature',
      value: getSensorValue('Ambient Temperature'),
      unit: '°C',
      status: getSensorStatus('Ambient Temperature'),
      x: 81,
      y: 75,
    },
    {
      id: 'cond-ambient-hum',
      label: 'Ambient Humidity',
      value: getSensorValue('Ambient Humidity'),
      unit: '%',
      status: getSensorStatus('Ambient Humidity'),
      x: 81,
      y: 90,
    },
    {
      id: 'battery-status',
      label: 'Battery',
      value: getSensorValue('Battery'),
      unit: '%',
      status: getSensorStatus('Battery'),
      x: 40,
      y: 15,
    },
  ];

  if (!selectedFacilityId) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center h-full">
        <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">No Facility Selected</h3>
        <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-6">
          Please select a facility from the dropdown in the top header.
        </p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-[1400px] mx-auto overflow-hidden">
      {/* 1. Page Title */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
          System Overview
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Real-time industrial cold storage analytics</p>
      </div>
      
      {/* 2. HVAC System Map on Top */}
      <div className="w-full mb-10">
        <HVACDiagram sensors={hvacSensors} />
      </div>

      {/* 3. 6 Dashboard KPI Cards below HVAC */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
        {/* Card 1: Energy */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col justify-between">
          <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-4 uppercase tracking-wider">Energy</h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-slate-700 dark:text-slate-300">Solar</span>
              <span className="font-bold text-slate-900 dark:text-white">{solarEnergy.toFixed(1)} <span className="text-xs text-slate-500 font-normal">kWh</span></span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-700 dark:text-slate-300">Grid</span>
              <span className="font-bold text-slate-900 dark:text-white">{gridEnergy.toFixed(1)} <span className="text-xs text-slate-500 font-normal">kWh</span></span>
            </div>
          </div>
        </div>

        {/* Card 2: Last Updated */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col">
          <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Last Updated</h3>
          <p className="text-4xl font-bold text-slate-900 dark:text-white mt-auto">{lastSyncTime}</p>
        </div>

        {/* Card 3: Sensors */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col">
          <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-4 uppercase tracking-wider">Sensors</h3>
          <div className="mt-auto space-y-1">
            <div className="text-lg font-bold text-slate-900 dark:text-white">{totalSensors} Sensors</div>
            <div className="flex items-center gap-4 text-sm">
               <span className="text-emerald-600 dark:text-emerald-400 font-medium">{activeSensors} Active</span>
               <span className="text-red-500 dark:text-red-400 font-medium">{inactiveSensors} Offline</span>
            </div>
          </div>
        </div>

        {/* Card 4: Rooms */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col">
          <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-4 uppercase tracking-wider">Rooms & Stakeholders</h3>
          <div className="mt-auto space-y-1">
            <div className="text-3xl font-bold text-slate-900 dark:text-white">{rooms.length} <span className="text-sm font-medium text-slate-500">Rooms</span></div>
            <div className="text-sm text-slate-600 dark:text-slate-400">{uniqueFarmers} Active Farmers</div>
          </div>
        </div>

        {/* Card 5: Storage */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col">
          <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-4 uppercase tracking-wider">Storage Utilization</h3>
          <div className="mt-auto">
            <div className="flex justify-between items-end mb-2">
              <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">37%</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full" style={{ width: '37%' }}></div>
            </div>
          </div>
        </div>

        {/* Card 6: System Status */}
        <div className={`bg-gradient-to-br ${systemStatusColor} rounded-2xl p-6 shadow-sm text-white border border-transparent flex flex-col`}>
          <h3 className="text-sm font-medium text-white/80 mb-1 uppercase tracking-wider">System Status</h3>
          <p className="text-4xl font-bold mt-auto">{systemStatus}</p>
        </div>
      </div>

      {/* 4. Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Revenue Chart */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
          <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-4 uppercase tracking-wider">Revenue (₹ Cr)</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={demoData?.charts?.revenueHistory || []}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.5} />
                <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <RechartsTooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} />
                <Area type="monotone" dataKey="value" stroke="#10b981" fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex justify-between">
            <div>
              <p className="text-xs text-slate-500">Total Revenue</p>
              <p className="text-xl font-bold text-slate-900 dark:text-white">₹{demoData?.revenue?.total || 45.2} L</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500">Monthly</p>
              <p className="text-xl font-bold text-emerald-600">₹{demoData?.revenue?.monthly || 3.8} L</p>
            </div>
          </div>
        </div>

        {/* Occupancy Chart */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
          <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-4 uppercase tracking-wider">Occupancy Rate</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={demoData?.charts?.occupancyHistory || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.5} />
                <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                <RechartsTooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} />
                <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex justify-between">
            <div>
              <p className="text-xs text-slate-500">Current Occupancy</p>
              <p className="text-xl font-bold text-slate-900 dark:text-white">{demoData?.occupancy?.percentage || 87}%</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500">Capacity</p>
              <p className="text-xl font-bold text-blue-600">{demoData?.occupancy?.capacity || 5000} tons</p>
            </div>
          </div>
        </div>

        {/* Energy Chart */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
          <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-4 uppercase tracking-wider">Energy Consumption</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={demoData?.charts?.energyHistory || []}>
                <defs>
                  <linearGradient id="colorEnergy" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.5} />
                <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <RechartsTooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} />
                <Area type="monotone" dataKey="value" stroke="#f59e0b" fillOpacity={1} fill="url(#colorEnergy)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex justify-between">
            <div>
              <p className="text-xs text-slate-500">Monthly Cost</p>
              <p className="text-xl font-bold text-slate-900 dark:text-white">₹{demoData?.energy?.monthly || 2.32} L</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500">Active Alerts</p>
              <p className="text-xl font-bold text-amber-600">{demoData?.alerts?.active || 1}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Financial Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl p-6 shadow-sm text-white">
          <h3 className="text-sm font-medium text-white/80 mb-2 uppercase tracking-wider">Total Profit</h3>
          <p className="text-4xl font-bold">₹{demoData?.profit?.total || 18.6} L</p>
          <p className="text-sm text-white/70 mt-2">Net profit YTD</p>
        </div>
        <div className="bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl p-6 shadow-sm text-white">
          <h3 className="text-sm font-medium text-white/80 mb-2 uppercase tracking-wider">Total Expenses</h3>
          <p className="text-4xl font-bold">₹{demoData?.profit?.expenses || 26.6} L</p>
          <p className="text-sm text-white/70 mt-2">Operational costs</p>
        </div>
        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-6 shadow-sm text-white">
          <h3 className="text-sm font-medium text-white/80 mb-2 uppercase tracking-wider">Active Farmers</h3>
          <p className="text-4xl font-bold">{demoData?.farmers?.total || 142}</p>
          <p className="text-sm text-white/70 mt-2">Registered users</p>
        </div>
      </div>
    </div>
  );
};

export default OwnerDashboard;
