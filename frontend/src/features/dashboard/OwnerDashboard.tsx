import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../stores/useAuthStore';
import { useSiteStore } from '../../stores/useSiteStore';
import { supabase } from '../../lib/supabase';
import { HVACDiagram } from './components/HVACDiagram';
import { DesktopOnlyWrapper } from '../../components/common/DesktopOnlyWrapper';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import OwnerReport from '../reports/OwnerReport';
import { convertKgToCrates } from '../../utils/units';


const OwnerDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const { selectedFacilityId, selectedRoomId } = useSiteStore();
  const [loading, setLoading] = useState(true);

  // States
  const [rooms, setRooms] = useState<any[]>([]);
  const [siteName, setSiteName] = useState<string>('');
  const [dbSensors, setDbSensors] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [stakeholders, setStakeholders] = useState<any[]>([]);
  const [liveTimestamp, setLiveTimestamp] = useState(new Date().toLocaleTimeString());
  const [latestCondition, setLatestCondition] = useState<any>(null);
  const [latestSiteEnergy, setLatestSiteEnergy] = useState<any>(null);
  
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
  }, [user?.id, selectedFacilityId, selectedRoomId]); // Also react to room changes

  const loadFacilityData = async () => {
    try {
      setLoading(true);
      console.log('=== OWNER DASHBOARD LOAD STARTED (OPTIMIZED) ===');
      console.log('User ID:', user?.id);
      console.log('Selected Facility ID:', selectedFacilityId);

      // PHASE 1: CRITICAL DATA (must load first) - Run in parallel
      const [siteDataResp, roomsResp] = await Promise.all([
        supabase.from('sites').select('facility_name').eq('id', selectedFacilityId).single(),
        supabase.from('cold_storage_rooms').select('*').eq('site_id', selectedFacilityId)
      ]);

      const siteData = siteDataResp.data;
      const rmData = roomsResp.data;

      setSiteName(siteData?.facility_name || 'Your Site');

      const resolvedRooms = rmData || [];
      setRooms(resolvedRooms);

      if (resolvedRooms.length === 0) {
        setDbSensors([]);
        setLatestCondition(null);
        setLatestSiteEnergy(null);
        setInventory([]);
        setStakeholders([]);
        setRevenueHistory([]);
        setFarmerActivity([]);
        setEnergyHistory([]);
        setLoading(false);
        return;
      }

      const roomToUse = selectedRoomId || resolvedRooms[0].id;
      const roomIds = [roomToUse];

      // PHASE 2: CORE DASHBOARD DATA - Run all 3 in parallel
      const [sensorsResp, condResp, invResp, energyResp] = await Promise.all([
        supabase.from('sensor_devices').select('*').in('room_id', roomIds),
        supabase.from('cold_storage_conditions').select('*').in('room_id', roomIds).order('recorded_at', { ascending: false }).limit(100),
        supabase.from('batch_room_allocations').select('batch_id, room_id, quantity_kg').in('room_id', roomIds).is('removed_at', null),
        supabase.from('energy_consumption').select('kwh_solar, kwh_grid, kwh_total, battery_charge_kwh, battery_discharge_kwh, recorded_at').eq('site_id', selectedFacilityId).order('recorded_at', { ascending: false }).limit(1)
      ]);

      setDbSensors(sensorsResp.data || []);
      setInventory(invResp.data || []);
      setLatestSiteEnergy(energyResp.data?.[0] || null);

      // Process condition data for temperature/humidity display
      const condData = condResp.data;
      let latestComplete = null;
      let tempReadings: number[] = [];
      let humidityReadings: number[] = [];
      
      if (condData && condData.length > 0) {
        const mostRecentTimestamp = condData[0].recorded_at;
        const recentWindow = condData.filter(
          r => r.recorded_at === mostRecentTimestamp || 
               (new Date(r.recorded_at).getTime() - new Date(mostRecentTimestamp).getTime()) < 5000
        );
        
        for (const record of recentWindow) {
          if (record.temperature !== null) tempReadings.push(parseFloat(record.temperature));
          if (record.humidity !== null) humidityReadings.push(parseFloat(record.humidity));
        }
        
        latestComplete = condData[0];
        if (tempReadings.length > 0) {
          const avgTemp = tempReadings.reduce((a, b) => a + b, 0) / tempReadings.length;
          latestComplete.temperature = parseFloat(avgTemp.toFixed(2));
        }
        if (humidityReadings.length > 0) {
          const avgHumidity = humidityReadings.reduce((a, b) => a + b, 0) / humidityReadings.length;
          latestComplete.humidity = parseFloat(avgHumidity.toFixed(2));
        }
      }

      setLatestCondition(latestComplete || null);

      // PHASE 3: SECONDARY DATA (stakeholders, charts) - Load in background WITHOUT blocking
      // This phase loads asynchronously so main dashboard shows in 2-5 seconds
      (async () => {
        try {
          const [stakeholderResp, ownerSitesResp] = await Promise.all([
            supabase.from('stakeholder_investments').select('stakeholder_id').eq('site_id', selectedFacilityId).eq('status', 'active'),
            supabase.from('sites').select('id').eq('owner_profile_id', user?.id)
          ]);

          const stakeholdersList = stakeholderResp.data?.map(s => s.stakeholder_id) || [];
          setStakeholders(stakeholdersList);

          // Get batch IDs from allocations for all charts
          const batchIds = (invResp.data || []).map((a: any) => a.batch_id).filter(Boolean);

          // ========== REVENUE CHART: Daily storage revenue for current month ==========
          // Query farmer_daily_storage_costs instead of sales to get storage income
          const now = new Date();
          const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
          
          const dailyRevenue = [];
          
          // Fetch all daily storage costs for this month across ALL SITES for this owner
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
          const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          monthEnd.setHours(23, 59, 59, 999);

          const { data: storageCostsForMonth } = await supabase
            .from('farmer_daily_storage_costs')
            .select('daily_cost, cost_date')
            .eq('owner_id', user?.id)  // Filter by current owner - aggregate all their sites
            .gte('cost_date', monthStart.toISOString().split('T')[0])
            .lte('cost_date', monthEnd.toISOString().split('T')[0])
            .order('cost_date', { ascending: true });

          // Group storage revenue by day
          const revenueByDay = new Map<number, number>();
          for (let d = 1; d <= daysInMonth; d++) {
            revenueByDay.set(d, 0);
          }

          (storageCostsForMonth || []).forEach((cost: any) => {
            const costDate = new Date(cost.cost_date);
            const day = costDate.getDate();
            const current = revenueByDay.get(day) || 0;
            revenueByDay.set(day, current + (Number(cost.daily_cost) || 0));
          });

          // Build chart data
          for (let day = 1; day <= daysInMonth; day++) {
            dailyRevenue.push({
              time: String(day),
              value: revenueByDay.get(day) || 0
            });
          }

          setRevenueHistory(dailyRevenue);
          console.log('📊 Daily Storage Revenue Chart:', daysInMonth, 'days in month, total storage revenue: ₹', dailyRevenue.reduce((s, d) => s + d.value, 0).toFixed(2));

          // ========== FIX 2: Farmer activity - include BOTH removals AND sales ==========
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

          // Fetch removals (explicit removal by farmer)
          const { data: batchesRemovedResp } = await supabase
            .from('batch_room_allocations')
            .select('batch_id, removed_at')
            .in('room_id', roomIds)
            .not('removed_at', 'is', 'null')
            .gte('removed_at', sevenDaysAgo.toISOString())
            .order('removed_at', { ascending: false });

          // Fetch sales (removal via sale)
          const { data: salesForActivity } = await supabase
            .from('sales')
            .select('batch_id, sold_at, quantity_kg')
            .in('batch_id', batchIds)
            .gte('sold_at', sevenDaysAgo.toISOString())
            .order('sold_at', { ascending: false });

          // Fetch allocations (additions)
          const { data: batchesAddedResp } = await supabase
            .from('batch_room_allocations')
            .select('batch_id, assigned_at, quantity_kg')
            .in('room_id', roomIds)
            .gte('assigned_at', sevenDaysAgo.toISOString())
            .order('assigned_at', { ascending: false });

          console.log('🔍 Dashboard Farmer Activity Debug:');
          console.log('  Batches Added (last 7 days):', batchesAddedResp?.length || 0);
          console.log('  Batches Removed via removal_at (last 7 days):', batchesRemovedResp?.length || 0);
          console.log('  Batches Removed via sales (last 7 days):', salesForActivity?.length || 0);

          const activityByDay: any[] = [];
          for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const day = date.toLocaleDateString('en-US', { weekday: 'short' });
            const dayStart = new Date(date);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(date);
            dayEnd.setHours(23, 59, 59, 999);

            // Count removals from explicit removal
            const removalsCount = (batchesRemovedResp || []).filter((b: any) => {
              const removalDate = new Date(b.removed_at);
              return removalDate >= dayStart && removalDate <= dayEnd;
            }).length;

            // Count removals from sales
            const salesCount = (salesForActivity || []).filter((s: any) => {
              const saleDate = new Date(s.sold_at);
              return saleDate >= dayStart && saleDate <= dayEnd;
            }).length;

            // Total removed = explicit removals + sales
            const totalRemoved = removalsCount + salesCount;

            // Count additions
            const batchesAddedCount = (batchesAddedResp || []).filter((b: any) => {
              const addDate = new Date(b.assigned_at);
              return addDate >= dayStart && addDate <= dayEnd;
            }).length;

            activityByDay.push({
              day,
              checkIns: totalRemoved,  // Removed/sold
              batchesAdded: batchesAddedCount  // Added/stored
            });
          }
          setFarmerActivity(activityByDay);

          // Energy consumption
          const eightDaysAgo = new Date();
          eightDaysAgo.setDate(eightDaysAgo.getDate() - 7);

          const { data: energyData } = await supabase
            .from('energy_consumption')
            .select('kwh_total, recorded_at')
            .eq('site_id', selectedFacilityId)
            .gte('recorded_at', eightDaysAgo.toISOString())
            .order('recorded_at', { ascending: true });

          const energyByDay: any[] = [];
          for (let i = 7; i >= 0; i--) {
            const currentDate = new Date();
            currentDate.setDate(currentDate.getDate() - i);
            const day = currentDate.getDate();
            const month = currentDate.getMonth() + 1;
            const dateStr = `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}`;

            const dayStart = new Date(currentDate);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(currentDate);
            dayEnd.setHours(23, 59, 59, 999);

            const dayEnergy = (energyData || [])
              .filter((e: any) => {
                const energyDate = new Date(e.recorded_at);
                return energyDate >= dayStart && energyDate <= dayEnd;
              })
              .reduce((sum: number, e: any) => sum + (e.kwh_total || 0), 0);

            energyByDay.push({
              time: dateStr,
              value: Number(dayEnergy.toFixed(1))
            });
          }
          setEnergyHistory(energyByDay);
        } catch (err) {
          console.warn('Error loading secondary data:', err);
        }
      })();

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
    // A sensor is active if status is online/active AND it has a reading (from any source)
    const hasPassedReading = 
      s.last_reading_value != null ||      // From sensor_devices
      s.sensor_value != null ||            // From cold_storage_conditions fallback
      s.reading != null ||                 // From frontend state
      (s.last_seen != null && s.last_seen !== '');
    return (st === 'active' || st === 'online') && hasPassedReading;
  };

  const totalSensors = dbSensors.length;
  const activeSensors = dbSensors.filter(s => isSensorActive(s)).length;
  const inactiveSensors = totalSensors - activeSensors;

  
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

  // Real Database Energy & Power Metrics (Site & Room telemetry)
  const siteSolarKwh = latestSiteEnergy ? Number(latestSiteEnergy.kwh_solar) || 0 : 0;
  const siteGridKwh = latestSiteEnergy ? Number(latestSiteEnergy.kwh_grid) || 0 : 0;
  const siteTotalKwh = latestSiteEnergy ? Number(latestSiteEnergy.kwh_total) || 0 : 0;

  // Inverter & Energy Values (Solar, Grid, Total kWh) from real database records
  const totalEnergyKwh = latestCondition?.energy_consumption_kwh ?? siteTotalKwh;
  const solarPercentage = latestCondition?.solar_percentage ?? 
    (siteTotalKwh > 0 ? Number(((siteSolarKwh / siteTotalKwh) * 100).toFixed(1)) : 0);
  const gridPercentage = latestCondition?.grid_percentage ?? 
    (solarPercentage > 0 ? Number((100 - solarPercentage).toFixed(1)) : (totalEnergyKwh > 0 ? 100 : 0));
  const solarKw = siteSolarKwh > 0 
    ? Number(siteSolarKwh.toFixed(1)) 
    : (solarPercentage > 0 && totalEnergyKwh > 0 
        ? Number(((solarPercentage / 100) * totalEnergyKwh).toFixed(1)) 
        : 0);



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
  const hasDoorSensor = dbSensors.some(s => s.sensor_type === 'Door') || latestCondition?.door_status_1 != null;
  const hasSuctionPressureSensor = dbSensors.some(s => s.sensor_type === 'SuctionPressure');
  const hasDischargePressureSensor = dbSensors.some(s => s.sensor_type === 'DischargePressure');
  const hasAmbientTempSensor = dbSensors.some(s => s.sensor_type === 'AmbientTemperature');
  const hasAmbientHumSensor = dbSensors.some(s => s.sensor_type === 'AmbientHumidity');
  const hasOxygenSensor = dbSensors.some(s => s.sensor_type === 'Oxygen');
  const hasCO2Sensor = dbSensors.some(s => s.sensor_type === 'CO2');
  const hasEthyleneSensor = dbSensors.some(s => s.sensor_type === 'Ethylene');
  const hasAmmoniaSensor = dbSensors.some(s => s.sensor_type === 'Ammonia');
  const hasCompressorSensor = dbSensors.some(s => s.sensor_type === 'Compressor' || s.sensor_type === 'CompressorHealth' || s.sensor_type === 'Motor');
  const hasBatterySensor = dbSensors.some(s => s.sensor_type === 'Battery' || s.sensor_name?.toLowerCase().includes('battery'));
  const hasRoomSolarSensor = dbSensors.some(s => s.sensor_type === 'Solar');
  const batterySensor = dbSensors.find(s => s.sensor_type === 'Battery' || s.sensor_name?.toLowerCase().includes('battery') || s.battery_percentage != null);
  const dbBatteryPercentage = 
    latestSiteEnergy && latestSiteEnergy.battery_charge_kwh != null && latestSiteEnergy.battery_discharge_kwh != null
      ? Number(((latestSiteEnergy.battery_charge_kwh / (latestSiteEnergy.battery_charge_kwh + latestSiteEnergy.battery_discharge_kwh)) * 100).toFixed(1))
      : null;
  const isBatteryInstalled = hasBatterySensor || dbBatteryPercentage != null;
  // systemLive = true whenever any sensors are registered in the DB (the physical system exists and is ON)
  // We don't require active telemetry readings — the HVAC unit is running even if sensor data hasn't streamed yet
  const isSystemLive = dbSensors.length > 0 || Boolean(latestCondition);

  // Door Status: From cold_storage_conditions table - if ANY door shows "closed", display "Closed"
  const getDoorStatus = () => {
    if (!latestCondition) return null;
    const doorValues = [latestCondition.door_status_1, latestCondition.door_status_2, latestCondition.door_status_3, latestCondition.door_status_4];
    const anyClosed = doorValues.some(v => v === 'closed' || v === 'Closed');
    return anyClosed ? 'Closed' : 'Open';
  };

  const doorStatus = getDoorStatus();

  // Sensor installed status - check database first, then fallback to conditions table if data exists
  const isTempInstalled = hasTempSensor;
  const isHumInstalled = hasHumSensor;
  const isDoorInstalled = hasDoorSensor;
  const isSuctionPressureInstalled = hasSuctionPressureSensor;
  const isDischargePressureInstalled = hasDischargePressureSensor;
  const isAmbientTempInstalled = hasAmbientTempSensor;
  const isAmbientHumInstalled = hasAmbientHumSensor;
  const isOxygenInstalled = hasOxygenSensor;
  const isCO2Installed = hasCO2Sensor;
  const isEthyleneInstalled = hasEthyleneSensor;
  const isAmmoniaInstalled = hasAmmoniaSensor;
  const isCompressorInstalled = hasCompressorSensor || latestCondition?.compressor_status != null || Boolean(latestCondition);

  // Dynamic Universal HVAC Sensors Mapping - STRICTLY DATABASE DRIVEN - NO DEMO VALUES
  const hvacSensors = [
    {
      id: 'internal-storage-temp',
      label: 'Storage Temp',
      value: latestCondition ? (() => {
        const temps = [latestCondition.temperature_1, latestCondition.temperature_2, latestCondition.temperature_3, latestCondition.temperature_4].filter(v => v != null);
        return temps.length > 0 ? (temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1) : null;
      })() : null,
      unit: '°C',
      status: latestCondition ? (() => {
        const temps = [latestCondition.temperature_1, latestCondition.temperature_2, latestCondition.temperature_3, latestCondition.temperature_4].filter(v => v != null);
        if (temps.length === 0) return 'unknown';
        const avg = temps.reduce((a, b) => a + b, 0) / temps.length;
        return avg > 8 ? 'warning' : 'optimal';
      })() : 'unknown',
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
      value: latestCondition ? (() => {
        const hums = [latestCondition.humidity_1, latestCondition.humidity_2, latestCondition.humidity_3, latestCondition.humidity_4].filter(v => v != null);
        return hums.length > 0 ? (hums.reduce((a, b) => a + b, 0) / hums.length).toFixed(1) : null;
      })() : null,
      unit: '%',
      status: latestCondition ? (() => {
        const hums = [latestCondition.humidity_1, latestCondition.humidity_2, latestCondition.humidity_3, latestCondition.humidity_4].filter(v => v != null);
        if (hums.length === 0) return 'unknown';
        const avg = hums.reduce((a, b) => a + b, 0) / hums.length;
        return avg < 80 ? 'warning' : 'optimal';
      })() : 'unknown',
      x: 23,
      y: 43,
      iconType: 'humidity' as const,
      isInstalled: isHumInstalled,
      category: 'storage' as const,
      thresholds: { min: 80, max: 95 },
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
      value: latestCondition ? `${compressorHealthInfo.score}%` : null,
      unit: '',
      status: !latestCondition ? 'unknown' : compressorHealthInfo.status === 'Optimal' ? 'optimal' : compressorHealthInfo.status === 'Warning' ? 'warning' : 'critical',
      x: 75,
      y: 22,
      iconType: 'compressor' as const,
      isInstalled: isCompressorInstalled,
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
      id: 'door-access-state',
      label: 'Door Access',
      value: doorStatus,
      unit: '',
      status: !isDoorInstalled ? 'uninstalled' : doorStatus === 'Closed' ? 'optimal' : doorStatus === 'Open' ? 'warning' : 'unknown',
      x: 10.5,
      y: 72,
      iconType: 'door' as const,
      isInstalled: isDoorInstalled,
      category: 'storage' as const,
    },
    {
      id: 'outdoor-ambient-temp',
      label: 'Outdoor Temp',
      value: latestCondition?.ambient_temperature_1 ?? null,
      unit: '°C',
      status: latestCondition?.ambient_temperature_1 === undefined || latestCondition?.ambient_temperature_1 === null
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
      value: latestCondition?.ambient_humidity_1 ?? null,
      unit: '%',
      status: latestCondition?.ambient_humidity_1 === undefined || latestCondition?.ambient_humidity_1 === null
        ? 'unknown'
        : 'optimal',
      x: 31,
      y: 91.5,
      iconType: 'ambientHum' as const,
      isInstalled: isAmbientHumInstalled,
      category: 'ambient' as const,
    },
    // Gas Sensors - Controlled Atmosphere Management
    {
      id: 'gas-oxygen',
      label: 'Oxygen',
      value: latestCondition?.oxygen ?? null,
      unit: '%',
      status: latestCondition?.oxygen === undefined || latestCondition?.oxygen === null
        ? 'unknown'
        : 'optimal',
      x: 45,
      y: 60,
      iconType: 'gas' as const,
      isInstalled: isOxygenInstalled,
      category: 'gas' as const,
      thresholds: { min: 1, max: 5 },
    },
    {
      id: 'gas-co2',
      label: 'CO₂',
      value: latestCondition?.co2 ?? null,
      unit: 'ppm',
      status: latestCondition?.co2 === undefined || latestCondition?.co2 === null
        ? 'unknown'
        : 'optimal',
      x: 55,
      y: 60,
      iconType: 'gas' as const,
      isInstalled: isCO2Installed,
      category: 'gas' as const,
      thresholds: { min: 2000, max: 8000 },
    },
    {
      id: 'gas-ethylene',
      label: 'Ethylene',
      value: latestCondition?.ethylene ?? null,
      unit: 'ppm',
      status: latestCondition?.ethylene === undefined || latestCondition?.ethylene === null
        ? 'unknown'
        : 'optimal',
      x: 65,
      y: 60,
      iconType: 'gas' as const,
      isInstalled: isEthyleneInstalled,
      category: 'gas' as const,
      thresholds: { min: 0.1, max: 1 },
    },
    {
      id: 'gas-ammonia',
      label: 'Ammonia',
      value: latestCondition?.ammonia ?? null,
      unit: 'ppm',
      status: latestCondition?.ammonia === undefined || latestCondition?.ammonia === null
        ? 'unknown'
        : 'optimal',
      x: 75,
      y: 60,
      iconType: 'gas' as const,
      isInstalled: isAmmoniaInstalled,
      category: 'gas' as const,
      thresholds: { min: 0, max: 10 },
    },
  ];

  if (!selectedFacilityId) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center h-full">
        <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">No Site Selected</h3>
        <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-6">
          Please select a site from the dropdown in the top header.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto overflow-hidden">
      {/* 1. Page Title */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            {siteName}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Real-time industrial cold storage analytics</p>
        </div>
        <OwnerReport />
      </div>

      {/* Room Selector hidden from UI - kept in code for debugging */}
      
      {/* 2. HVAC System Map on Top */}
      <div className="w-full mb-10">
        <DesktopOnlyWrapper
          title="Industrial HVAC & Power Infrastructure"
          description="High-precision industrial cooling schematics, sensor node mapping, and circuit animations are formatted for desktop screens."
        >
          <HVACDiagram 
            sensors={hvacSensors as any} 
            inverterData={{
              solarPercentage,
              gridPercentage,
              totalKwh: totalEnergyKwh,
              solarKw,
              status: siteSolarKwh > 0 ? 'optimal' : 'offline',
            }}
            compressorHealth={compressorHealthInfo}
            batteryData={{
              percentage: dbBatteryPercentage,
              status: isBatteryInstalled ? (solarPercentage > 0 ? 'charging' : 'charged') : 'standby',
              powerKw: isBatteryInstalled && solarKw > 0 ? Number((solarKw * 0.4).toFixed(1)) : null,
            }}
            systemLive={isSystemLive}
          />
        </DesktopOnlyWrapper>
      </div>

      {/* 2. 3 Dashboard KPI Cards below HVAC */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
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

        {/* Card 2: Last Sensor Readings */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col">
          <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-4 uppercase tracking-wider">Last Sensor Readings</h3>
          <div className="mt-auto">
            <div className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
              {latestCondition?.recorded_at 
                ? new Date(latestCondition.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                : 'No Data'}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {latestCondition?.recorded_at 
                ? `${new Date(latestCondition.recorded_at).toLocaleDateString()}`
                : 'Awaiting first reading'}
            </div>
          </div>
        </div>

        {/* Card 3: System Status with Last Updated */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col">
          <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">System Status</h3>
          <p className="text-3xl font-bold text-slate-900 dark:text-white mt-auto">{systemStatusInfo.status}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{systemStatusInfo.reason}</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-3">Last Updated: {lastSyncTime}</p>
        </div>
      </div>

      {/* 3. Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Revenue Chart */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
          <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Revenue (₹)</h3>
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
                <RechartsTooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', fontSize: '12px', color: '#ffffff' }} labelStyle={{ color: '#ffffff' }} formatter={(value: any) => `₹${Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`} />
                <Area type="linear" dataKey="value" stroke="#10b981" fillOpacity={1} fill="url(#colorRevenue)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4">
            <p className="text-xs text-slate-500">Monthly Revenue</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white">₹{revenueHistory.reduce((sum, week) => sum + week.value, 0).toFixed(2)}</p>
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
                    <div className="relative w-full mb-2 flex items-end justify-center gap-1" style={{ height: '140px' }}>
                      {/* Removed / Harvested (Green - Left) */}
                      <div 
                        className="w-1/2 bg-gradient-to-t from-emerald-500 to-emerald-400 rounded-t-sm transition-all duration-300 group-hover:from-emerald-600 group-hover:to-emerald-500 cursor-pointer"
                        style={{ height: `${maxActivity > 0 ? (day.checkIns / maxActivity) * 100 : 0}%` }}
                        title={`${day.checkIns} removed`}
                      />
                      {/* Added / Stored (Blue - Right) */}
                      <div 
                        className="w-1/2 bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-sm transition-all duration-300 group-hover:from-blue-600 group-hover:to-blue-500 cursor-pointer"
                        style={{ height: `${maxActivity > 0 ? (day.batchesAdded / maxActivity) * 100 : 0}%` }}
                        title={`${day.batchesAdded} added`}
                      />
                      {/* Tooltip */}
                      <div className="opacity-0 group-hover:opacity-100 absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs rounded px-2 py-1 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-10">
                        {day.checkIns} removed · {day.batchesAdded} added
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
                <span className="text-slate-600 dark:text-slate-400">Removed/Harvested</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-blue-500 rounded"></div>
                <span className="text-slate-600 dark:text-slate-400">Added/Stored</span>
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
                <Area type="linear" dataKey="value" stroke="#f59e0b" fillOpacity={1} fill="url(#colorEnergy)" isAnimationActive={false} />
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
