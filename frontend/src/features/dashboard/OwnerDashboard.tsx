import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../stores/useAuthStore';
import { useSiteStore } from '../../stores/useSiteStore';
import { supabase } from '../../lib/supabase';
import { HVACDiagram } from './components/HVACDiagram';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import OwnerReport from '../reports/OwnerReport';

// NO DEMO DATA - All data from database

const OwnerDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const { selectedFacilityId } = useSiteStore();
  const [loading, setLoading] = useState(true);

  // States
  const [rooms, setRooms] = useState<any[]>([]);
  const [dbSensors, setDbSensors] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [stakeholders, setStakeholders] = useState<any[]>([]);
  const [liveTimestamp, setLiveTimestamp] = useState(new Date().toLocaleTimeString());
  const [latestCondition, setLatestCondition] = useState<any>(null);
  
  // Real database data for charts - NO DEMO DATA
  const [revenueHistory, setRevenueHistory] = useState<any[]>([]);
  const [farmerActivity, setFarmerActivity] = useState<any[]>([]);
  const [energyHistory, setEnergyHistory] = useState<any[]>([]);

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
  }, [user?.id, selectedFacilityId]); // Only depend on user.id, not entire user object

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

        // Fetch latest conditions - get most recent record with both temp and humidity
        // Query all conditions for these rooms and merge the latest data
        const { data: condData } = await supabase
          .from('cold_storage_conditions')
          .select('*')
          .in('room_id', roomIds)
          .order('recorded_at', { ascending: false })
          .limit(100);

        // Find the most recent record that has temperature AND humidity
        let latestComplete = null;
        if (condData && condData.length > 0) {
          for (const record of condData) {
            if (record.temperature !== null && record.humidity !== null) {
              latestComplete = record;
              break;
            }
          }
          // Fallback: if no complete record, just use the latest one
          if (!latestComplete) {
            latestComplete = condData[0];
          }
        }

        setLatestCondition(latestComplete || null);

        // Fetch Inventory/Allocations (to calculate Total Farmers)
        const { data: invData } = await supabase
          .from('batch_room_allocations')
          .select('*, batches(farmer_id)')
          .in('room_id', roomIds);
          
        setInventory(invData || []);
        
        // Fetch Stakeholders invested in this facility (via owner's company)
        const { data: ownerProfile } = await supabase
          .from('profiles')
          .select('owner_company_id')
          .eq('auth_user_id', user?.id)
          .single();
        
        let stakeholdersList: any[] = [];
        if (ownerProfile?.owner_company_id) {
          const { data: stakeholderInvestments } = await supabase
            .from('stakeholder_investments')
            .select('stakeholder_id')
            .eq('owner_company_id', ownerProfile.owner_company_id)
            .eq('active', true);
          
          stakeholdersList = stakeholderInvestments?.map(s => s.stakeholder_id) || [];
        }
        
        setStakeholders(stakeholdersList);
        
        // Fetch real chart data from database
        // 1. Revenue history - last 4 weeks from farmer_payments
        const fourWeeksAgo = new Date();
        fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
        
        const { data: paymentsData } = await supabase
          .from('farmer_payments')
          .select('amount_inr, payment_date')
          .eq('facility_id', selectedFacilityId)
          .gte('payment_date', fourWeeksAgo.toISOString())
          .order('payment_date', { ascending: true });
          
        // Group by week
        const weeklyRevenue = [
          { time: 'Week 1', value: 0 },
          { time: 'Week 2', value: 0 },
          { time: 'Week 3', value: 0 },
          { time: 'Week 4', value: 0 }
        ];
        
        (paymentsData || []).forEach((payment: any) => {
          const paymentDate = new Date(payment.payment_date);
          const daysDiff = Math.floor((new Date().getTime() - paymentDate.getTime()) / (1000 * 60 * 60 * 24));
          const weekIndex = Math.min(3, Math.floor(daysDiff / 7));
          weeklyRevenue[3 - weekIndex].value += (payment.amount_inr / 100000); // Convert to lakhs
        });
        
        setRevenueHistory(weeklyRevenue);
        
        // 2. Farmer activity - last 7 days (batch additions)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const { data: batchesData } = await supabase
          .from('batches')
          .select('created_at')
          .eq('facility_id', selectedFacilityId)
          .gte('created_at', sevenDaysAgo.toISOString());
          
        // Group by day
        const activityByDay: any[] = [];
        for (let i = 6; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const day = date.toLocaleDateString('en-US', { weekday: 'short' });
          const dayStart = new Date(date.setHours(0, 0, 0, 0));
          const dayEnd = new Date(date.setHours(23, 59, 59, 999));
          
          const batchesAddedCount = (batchesData || []).filter((b: any) => {
            const batchDate = new Date(b.created_at);
            return batchDate >= dayStart && batchDate <= dayEnd;
          }).length;
          
          activityByDay.push({
            day,
            checkIns: 0, // Could fetch from access logs if available
            batchesAdded: batchesAddedCount,
            batchesRemoved: 0
          });
        }
        
        setFarmerActivity(activityByDay);
        
        // 3. Energy consumption - last 8 days (including today)
        const today = new Date(); // Get current system date
        const eightDaysAgo = new Date(today);
        eightDaysAgo.setDate(today.getDate() - 7); // Go back 7 days to get 8 days total including today
        
        console.log('Energy Chart - Today\'s date:', today.toDateString());
        console.log('Energy Chart - 7 days ago:', eightDaysAgo.toDateString());
        
        const { data: energyData } = await supabase
          .from('energy_consumption')
          .select('energy_kwh, timestamp')
          .eq('facility_id', selectedFacilityId)
          .gte('timestamp', eightDaysAgo.toISOString())
          .order('timestamp', { ascending: true });
          
        // Group by day - last 8 days including today
        const energyByDay: any[] = [];
        for (let i = 7; i >= 0; i--) {
          const currentDate = new Date(); // Fresh date object for each iteration
          currentDate.setDate(currentDate.getDate() - i);
          
          // Format as DD/MM (day/month)
          const day = currentDate.getDate();
          const month = currentDate.getMonth() + 1;
          const dateStr = `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}`;
          
          // Log the date being processed
          console.log(`Energy Chart Day ${8-i}: ${currentDate.toDateString()} → ${dateStr}`);
          
          const dayStart = new Date(currentDate);
          dayStart.setHours(0, 0, 0, 0);
          const dayEnd = new Date(currentDate);
          dayEnd.setHours(23, 59, 59, 999);
          
          const dayEnergy = (energyData || [])
            .filter((e: any) => {
              const energyDate = new Date(e.timestamp);
              return energyDate >= dayStart && energyDate <= dayEnd;
            })
            .reduce((sum: number, e: any) => sum + (e.energy_kwh || 0), 0);
          
          energyByDay.push({
            time: dateStr,
            value: Number(dayEnergy.toFixed(1))
          });
        }
        
        console.log('Energy Chart - Final dates:', energyByDay.map(d => d.time).join(', '));
        setEnergyHistory(energyByDay);
      } else {
        setDbSensors([]);
        setLatestCondition(null);
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

  // Derived calculations from real database data
  const isSensorActive = (s: any) => {
    const st = s.status?.toLowerCase();
    // A sensor is ONLY active if database status is active/online AND a real reading has passed through it
    const hasPassedReading = s.last_reading_value != null || (s.last_seen != null && s.last_seen !== '');
    return (st === 'active' || st === 'online') && hasPassedReading;
  };

  const totalSensors = dbSensors.length;
  const activeSensors = dbSensors.filter(isSensorActive).length;
  const inactiveSensors = totalSensors - activeSensors;

  // Farmers count from real data
  const uniqueFarmers = inventory.length > 0 
    ? new Set(inventory.filter((i) => i.batches?.farmer_id).map((i) => i.batches.farmer_id)).size
    : 0;
  
  // Stakeholders count from actual database query
  const totalStakeholders = stakeholders.length;

  // Storage from real data
  const totalCapacity = rooms.length > 0 
    ? rooms.reduce((acc, rm) => acc + (Number(rm.capacity_kg) || 0), 0)
    : 0;
  const currentUtilization = rooms.length > 0
    ? rooms.reduce((acc, rm) => acc + (Number(rm.current_utilization_kg) || 0), 0)
    : 0;
  const storagePercentage = totalCapacity > 0 ? ((currentUtilization / totalCapacity) * 100).toFixed(1) : '0';

  // System Status based on actual alerts and sensor health
  const getSystemStatus = () => {
    // Critical conditions
    if (inactiveSensors >= totalSensors * 0.5) { // 50% or more sensors offline
      return { status: 'Critical', color: 'from-red-500 to-rose-600', reason: `${inactiveSensors} sensors offline` };
    }
    
    // Warning conditions  
    if (inactiveSensors > 0) {
      return { status: 'Warning', color: 'from-yellow-400 to-amber-500', reason: `${inactiveSensors} sensor${inactiveSensors > 1 ? 's' : ''} offline` };
    }
    
    // Check for maintenance needed (from sensors in maintenance status)
    const maintenanceNeeded = dbSensors.filter(s => s.status === 'maintenance').length;
    if (maintenanceNeeded > 0) {
      return { status: 'Warning', color: 'from-yellow-400 to-amber-500', reason: `${maintenanceNeeded} maintenance required` };
    }
    
    // All good
    return { status: 'Optimal', color: 'from-green-500 to-emerald-600', reason: 'All systems operational' };
  };

  const systemStatusInfo = getSystemStatus();
  
  // Last Updated time from real sensor data
  const lastSyncTime = (dbSensors.length > 0 && dbSensors[0].last_seen)
    ? new Date(dbSensors[0].last_seen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : new Date().toLocaleTimeString();

  // Inverter & Energy Values (Solar, Grid, Total kWh)
  const solarPercentage = latestCondition?.solar_percentage ?? 0;
  const gridPercentage = solarPercentage > 0 ? Math.max(0, 100 - solarPercentage) : 100;
  const totalEnergyKwh = latestCondition?.energy_consumption_kwh ?? 0;

  // Calculate monthly energy from energyHistory
  const monthlyEnergy = energyHistory.reduce((sum, day) => sum + day.value, 0);
  const solarEnergy = monthlyEnergy * (solarPercentage / 100);
  const gridEnergy = monthlyEnergy * (gridPercentage / 100);

  // Calculate Compressor Health Score Dynamically
  const computeCompressorHealth = () => {
    let score = 100;
    let status: 'Optimal' | 'Warning' | 'Critical' = 'Optimal';
    let reason = 'System operational within design parameters';

    if (!latestCondition) {
      return { score: 100, status: 'Optimal' as const, reason: 'Standby - awaiting initial telemetry' };
    }

    const temp = latestCondition?.temperature;
    if (temp !== undefined && temp !== null) {
      if (temp > 8) {
        score -= 20;
        status = 'Warning';
        reason = 'High thermal load on evaporator coils';
      }
    }
    const compStatus = latestCondition?.compressor_status;
    if (compStatus === 'Warning' || compStatus === 'Fault') {
      score -= 30;
      status = 'Critical';
      reason = 'Compressor thermal overload detected';
    }

    return { score: Math.max(20, Math.min(100, score)), status, reason };
  };

  const compressorHealthInfo = computeCompressorHealth();

  // Sensor existence checks - EXACT MATCH ONLY, NO FALSE POSITIVES
  const hasTempSensor = dbSensors.some(s => s.sensor_type === 'Temperature');
  const hasHumSensor = dbSensors.some(s => s.sensor_type === 'Humidity');
  const hasDoorSensor = dbSensors.some(s => s.sensor_type === 'Door');
  const hasSuctionPressureSensor = dbSensors.some(s => s.sensor_type === 'SuctionPressure');
  const hasDischargePressureSensor = dbSensors.some(s => s.sensor_type === 'DischargePressure');
  const hasAmbientTempSensor = dbSensors.some(s => s.sensor_type === 'AmbientTemperature');
  const hasAmbientHumSensor = dbSensors.some(s => s.sensor_type === 'AmbientHumidity');

  // Sensor installed status - check database first, then fallback to conditions table if data exists
  const isTempInstalled = hasTempSensor;
  const isHumInstalled = hasHumSensor;
  const isDoorInstalled = hasDoorSensor;
  const isSuctionPressureInstalled = hasSuctionPressureSensor;
  const isDischargePressureInstalled = hasDischargePressureSensor;
  const isAmbientTempInstalled = hasAmbientTempSensor;
  const isAmbientHumInstalled = hasAmbientHumSensor;

  // Dynamic Universal HVAC Sensors Mapping - STRICTLY DATABASE DRIVEN - NO DEMO VALUES
  const hvacSensors = [
    {
      id: 'internal-storage-temp',
      label: 'Storage Temp',
      value: latestCondition?.temperature ?? null,
      unit: '°C',
      status: latestCondition?.temperature === undefined || latestCondition?.temperature === null
        ? 'unknown'
        : latestCondition.temperature > 8 ? 'warning' : 'optimal',
      x: 23,
      y: 28,
      iconType: 'temp' as const,
      isInstalled: isTempInstalled,
      category: 'storage' as const,
      thresholds: { min: 0, max: 6 },
    },
    {
      id: 'internal-storage-hum',
      label: 'Storage Humidity',
      value: latestCondition?.humidity ?? null,
      unit: '%',
      status: latestCondition?.humidity === undefined || latestCondition?.humidity === null
        ? 'unknown'
        : latestCondition.humidity < 80 ? 'warning' : 'optimal',
      x: 23,
      y: 43,
      iconType: 'humidity' as const,
      isInstalled: isHumInstalled,
      category: 'storage' as const,
      thresholds: { min: 80, max: 95 },
    },
    {
      id: 'door-access-state',
      label: 'Door Access',
      value: latestCondition?.door_status ?? (isDoorInstalled ? 'Closed' : null),
      unit: '',
      status: latestCondition?.door_status === 'Open' ? 'warning' : 'optimal',
      x: 14,
      y: 53,
      iconType: 'door' as const,
      isInstalled: isDoorInstalled,
      category: 'storage' as const,
    },
    {
      id: 'suction-pressure-line',
      label: 'Suction Pressure',
      value: latestCondition?.suction_pressure ?? null,
      unit: 'PSI',
      status: latestCondition?.suction_pressure === undefined || latestCondition?.suction_pressure === null
        ? 'unknown'
        : 'optimal',
      x: 58,
      y: 22.5,
      iconType: 'pressure' as const,
      isInstalled: isSuctionPressureInstalled,
      category: 'mechanical' as const,
      thresholds: { min: 120, max: 160 },
    },
    {
      id: 'compressor-health-node',
      label: 'Compressor Motor',
      value: `${compressorHealthInfo.score}%`,
      unit: '',
      status: compressorHealthInfo.status === 'Optimal' ? 'optimal' : compressorHealthInfo.status === 'Warning' ? 'warning' : 'critical',
      x: 75,
      y: 22,
      iconType: 'compressor' as const,
      isInstalled: true,
      category: 'mechanical' as const,
    },
    {
      id: 'discharge-pressure-line',
      label: 'Discharge Pressure',
      value: latestCondition?.discharge_pressure ?? null,
      unit: 'PSI',
      status: latestCondition?.discharge_pressure === undefined || latestCondition?.discharge_pressure === null
        ? 'unknown'
        : 'optimal',
      x: 88,
      y: 35,
      iconType: 'pressure' as const,
      isInstalled: isDischargePressureInstalled,
      category: 'mechanical' as const,
      thresholds: { min: 180, max: 240 },
    },
    {
      id: 'outdoor-ambient-temp',
      label: 'Outdoor Temp',
      value: latestCondition?.ambient_temperature ?? null,
      unit: '°C',
      status: latestCondition?.ambient_temperature === undefined || latestCondition?.ambient_temperature === null
        ? 'unknown'
        : 'optimal',
      x: 18,
      y: 91.5,
      iconType: 'ambientTemp' as const,
      isInstalled: isAmbientTempInstalled,
      category: 'ambient' as const,
    },
    {
      id: 'outdoor-ambient-hum',
      label: 'Outdoor Humidity',
      value: latestCondition?.ambient_humidity ?? null,
      unit: '%',
      status: latestCondition?.ambient_humidity === undefined || latestCondition?.ambient_humidity === null
        ? 'unknown'
        : 'optimal',
      x: 31,
      y: 91.5,
      iconType: 'ambientHum' as const,
      isInstalled: isAmbientHumInstalled,
      category: 'ambient' as const,
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
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            System Overview
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Real-time industrial cold storage analytics</p>
        </div>
        <OwnerReport />
      </div>
      
      {/* 2. HVAC System Map on Top */}
      <div className="w-full mb-10">
        <HVACDiagram 
          sensors={hvacSensors as any} 
          inverterData={{
            solarPercentage,
            gridPercentage,
            totalKwh: totalEnergyKwh,
            status: 'optimal',
          }}
          compressorHealth={compressorHealthInfo}
          systemLive={true}
        />
      </div>

      {/* 3. 4 Dashboard KPI Cards below HVAC */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        {/* Card 1: Sensors */}
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

        {/* Card 2: Farmers & Stakeholders */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col">
          <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-4 uppercase tracking-wider">Farmers & Stakeholders</h3>
          <div className="mt-auto space-y-1">
            <div className="text-3xl font-bold text-slate-900 dark:text-white">{uniqueFarmers} <span className="text-sm font-medium text-slate-500">Farmers</span></div>
            <div className="text-sm text-slate-600 dark:text-slate-400">{totalStakeholders} Stakeholders</div>
          </div>
        </div>

        {/* Card 3: Storage */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col">
          <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-4 uppercase tracking-wider">Storage Utilization</h3>
          <div className="mt-auto">
            <div className="flex justify-between items-end mb-2">
              <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{storagePercentage}%</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${storagePercentage}%` }}></div>
            </div>
          </div>
        </div>

        {/* Card 4: System Status with Last Updated */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col">
          <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">System Status</h3>
          <p className="text-3xl font-bold text-slate-900 dark:text-white mt-auto">{systemStatusInfo.status}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{systemStatusInfo.reason}</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-3">Last Updated: {lastSyncTime}</p>
        </div>
      </div>

      {/* 4. Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Revenue Chart */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
          <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Revenue (₹ Lakh)</h3>
          <p className="text-xs text-slate-400 mb-4">{new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
          <div className="h-48 -ml-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueHistory} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.5} />
                <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} width={30} />
                <RechartsTooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', fontSize: '12px', color: '#ffffff' }} labelStyle={{ color: '#ffffff' }} />
                <Area type="monotone" dataKey="value" stroke="#10b981" fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4">
            <p className="text-xs text-slate-500">Monthly Revenue</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white">₹{revenueHistory.reduce((sum, week) => sum + week.value, 0).toFixed(1)} L</p>
          </div>
        </div>

        {/* Farmer Activity Chart - Bar/Column style */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
          <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Farmer Activity</h3>
          <p className="text-xs text-slate-400 mb-4">Last 7 Days</p>
          <div className="h-48 overflow-visible">
            <div className="flex items-end justify-between h-full gap-2 pb-8">
              {farmerActivity.map((day: any, index: number) => {
                const maxActivity = Math.max(...farmerActivity.map((d: any) => d.checkIns + d.batchesAdded), 1);
                const totalActivity = day.checkIns + day.batchesAdded;
                const heightPercent = (totalActivity / maxActivity) * 100;
                
                return (
                  <div key={index} className="flex-1 flex flex-col items-center group relative">
                    <div className="relative w-full mb-2" style={{ height: '140px' }}>
                      {/* Batches Added (Top) */}
                      <div 
                        className="absolute bottom-0 w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-lg transition-all duration-300 group-hover:from-blue-600 group-hover:to-blue-500 cursor-pointer"
                        style={{ height: `${(day.batchesAdded / maxActivity) * 100}%` }}
                        title={`${day.batchesAdded} batches added`}
                      />
                      {/* Check-ins (Bottom) */}
                      <div 
                        className="absolute bottom-0 w-full bg-gradient-to-t from-emerald-500 to-emerald-400 rounded-t-lg transition-all duration-300 group-hover:from-emerald-600 group-hover:to-emerald-500 cursor-pointer"
                        style={{ height: `${(day.checkIns / maxActivity) * 100}%` }}
                        title={`${day.checkIns} check-ins`}
                      />
                      {/* Tooltip - positioned to not cause overflow */}
                      <div className="opacity-0 group-hover:opacity-100 absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs rounded px-2 py-1 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-10">
                        {day.checkIns} visits · {day.batchesAdded} batches
                      </div>
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{day.day}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="mt-4 flex justify-between items-center">
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-emerald-500 rounded"></div>
                <span className="text-slate-600 dark:text-slate-400">Check-ins</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-blue-500 rounded"></div>
                <span className="text-slate-600 dark:text-slate-400">Batches</span>
              </div>
            </div>
          </div>
        </div>

        {/* Energy Consumption Chart - 8 days with live readings */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
          <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Energy Consumption</h3>
          <p className="text-xs text-slate-400 mb-4">Daily Usage (Last 8 Days)</p>
          <div className="h-48 -ml-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={energyHistory} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorEnergy" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.5} />
                <XAxis dataKey="time" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} angle={-45} textAnchor="end" height={60} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} width={30} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', fontSize: '12px', color: '#ffffff' }}
                  labelStyle={{ color: '#ffffff' }}
                  formatter={(value: any) => [`${value} kWh`, 'Consumption']}
                />
                <Area type="monotone" dataKey="value" stroke="#f59e0b" fillOpacity={1} fill="url(#colorEnergy)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-500">Solar</p>
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{solarEnergy.toFixed(1)} <span className="text-xs text-slate-500 font-normal">kWh</span></p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Grid</p>
              <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{gridEnergy.toFixed(1)} <span className="text-xs text-slate-500 font-normal">kWh</span></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OwnerDashboard;
