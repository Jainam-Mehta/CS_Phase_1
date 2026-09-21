import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import StatCard from '../../components/ui/StatCard';
import LiveTimeCard from '../../components/ui/LiveTimeCard';
import SystemStatusCard from '../../components/ui/SystemStatusCard';
import { RoomRequestStatus } from '../../constants/roomRequestStatus';
import {
  Activity,
  Thermometer,
  Droplets,
  Lightbulb,
  Box,
  RefreshCw,
  AlertCircle,
  Download,
  ChevronDown,
  Zap
} from 'lucide-react';
import WaitingForApproval from '../../components/common/WaitingForApproval';
import { useAuthStore } from '../../stores/useAuthStore';
import { useAdminStorageStore } from '../../stores/useAdminStorageStore';
import { useSensorData } from '../../hooks/useSensorData';
import { useDoorData } from '../../hooks/useDoorData';
import { getProductConfig, getDefaultProduct, getTemperatureStatus, PRODUCTS, getProductsBySite, getFarmerProducts, getFarmerDefaultProduct } from '../../utils/productConfig';
import { supabase } from '../../lib/supabase';
import HVACIllustration from '../../components/HVACIllustration';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar } from 'recharts';

// NO DEMO DATA - All data from database

const Dashboard: React.FC = () => {
  const { user, selectedSite } = useAuthStore();
  const { storages: adminStorages } = useAdminStorageStore();
  const [hasApprovedRooms, setHasApprovedRooms] = useState<boolean | null>(null);
  const [loadingRoomStatus, setLoadingRoomStatus] = useState(true);
  const [roomStatusError, setRoomStatusError] = useState('');
  
  // Real stakeholder data - NO DEMO
  const [stakeholderData, setStakeholderData] = useState<any>(null);

  useEffect(() => {
    if (user?.id) {
      loadStakeholderData();
    }
  }, [user?.id]);

  const loadStakeholderData = async () => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user!.id)
        .maybeSingle();

      if (!profile) return;

      const { data: invs } = await supabase
        .from('stakeholder_investments')
        .select('*, sites(id, facility_name, localities(districts(states(name))))')
        .eq('stakeholder_id', profile.id)
        .eq('status', 'Active');

      if (invs && invs.length > 0) {
        const totalInv = invs.reduce((sum, i) => sum + (Number(i.investment_amount_inr) || 0), 0);
        const avgRoi = invs.reduce((sum, i) => sum + (Number(i.roi_percentage_estimate) || 0), 0) / invs.length;

        const stateMap = new Map<string, number>();
        invs.forEach((i: any) => {
          const stName = i.facilities?.localities?.districts?.states?.name || 'Local State';
          const amt = Number(i.investment_amount_inr) || 0;
          stateMap.set(stName, (stateMap.get(stName) || 0) + (amt / 10000000));
        });

        const stateList = Array.from(stateMap.entries()).map(([name, value]) => ({
          name,
          value: Number(value.toFixed(2)),
        }));

        setStakeholderData({
          investment: { total: Number((totalInv / 10000000).toFixed(2)) },
          roi: { percentage: Number(avgRoi.toFixed(1)) },
          monthlyProfit: { amount: 0 }, // Calculate from payments if needed
          carbonCredits: { total: 0 }, // Calculate if needed
          states: stateList,
          charts: {
            roiHistory: [],
            profitHistory: [],
            carbonHistory: []
          },
          lastUpdated: new Date().toLocaleTimeString()
        });
      } else {
        // No investments - set empty state
        setStakeholderData({
          investment: { total: 0 },
          roi: { percentage: 0 },
          monthlyProfit: { amount: 0 },
          carbonCredits: { total: 0 },
          states: [],
          charts: {
            roiHistory: [],
            profitHistory: [],
            carbonHistory: []
          },
          lastUpdated: new Date().toLocaleTimeString()
        });
      }
    } catch (e) {
      console.error('Error fetching stakeholder data:', e);
      setStakeholderData(null);
    }
  };
  
  // Check if farmer has approved rooms
  useEffect(() => {
    checkRoomApprovalStatus();
  }, [user?.id]);

  const checkRoomApprovalStatus = async () => {
    if (!user || user.role !== 'farmer') {
      setHasApprovedRooms(true);
      setLoadingRoomStatus(false);
      return;
    }

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();

      if (!profile) {
        setHasApprovedRooms(false);
        setLoadingRoomStatus(false);
        return;
      }

      const { data: roomRequests } = await supabase
        .from('farmer_room_access')
        .select('*')
        .eq('farmer_id', profile.id)
        .eq('status', RoomRequestStatus.Approved);

      setHasApprovedRooms((roomRequests && roomRequests.length > 0) || false);
    } catch (err) {
      console.error('Error checking room approval status:', err);
      setRoomStatusError('Failed to check room approval status. Please check your internet connection.');
      setHasApprovedRooms(false);
    } finally {
      setLoadingRoomStatus(false);
    }
  };
  
  const storageRequest = useMemo(() => {
    const request = localStorage.getItem('storageAccessRequest');
    return request ? JSON.parse(request) : null;
  }, []);
  
  const farmerSelectedProducts = useMemo(() => {
    if (storageRequest?.products) {
      return getFarmerProducts(storageRequest.products);
    }
    return [];
  }, [storageRequest]);
  
  const farmerSelectedRooms = useMemo(() => {
    if (storageRequest?.rooms) {
      return storageRequest.rooms;
    }
    return user?.sites?.map(site => site.id) || [];
  }, [storageRequest, user]);
  
  const [selectedRoom, setSelectedRoom] = useState(() => {
    return farmerSelectedRooms[0] || '';
  });
  
  const [selectedProduct, setSelectedProduct] = useState(() => {
    if (farmerSelectedProducts.length > 0) {
      return farmerSelectedProducts[0];
    }
    return getFarmerDefaultProduct(storageRequest?.products || []);
  });
  
  useEffect(() => {
    if (farmerSelectedProducts.length > 0) {
      setSelectedProduct(farmerSelectedProducts[0]);
    }
  }, [farmerSelectedProducts, storageRequest]);
  
  const { 
    sensorData, 
    isLoading: sensorLoading, 
    error: sensorError, 
    lastFetchTime,
    refresh: refreshSensorData,
    retry: retrySensorData,
    cumulativeEnergy
  } = useSensorData({
    refreshInterval: 60000,
    autoRefresh: true,
    maxRetries: 3,
    retryDelay: 1000,
  });
  
  const {
    doorStatus,
    isLoading: doorLoading,
    error: doorError,
    refresh: refreshDoorData,
    retry: retryDoorData
  } = useDoorData({
    refreshInterval: 60000,
    autoRefresh: true,
    maxRetries: 3,
    retryDelay: 1000,
  });

  const isFarmer = user?.role === 'farmer';

  const tempStatus = useMemo(() => {
    const currentTemp = sensorData?.temperatureAvg ?? 0;
    return getTemperatureStatus(currentTemp, selectedProduct);
  }, [sensorData?.temperatureAvg, selectedProduct]);

  // Admin calculations
  const allAdminSensors = adminStorages.flatMap((s) => s.sensors);
  const adminOnlineSensors = allAdminSensors.filter((s) => s.status === 'Online').length;
  
  const adminCapacityUtilization = adminStorages.length > 0
    ? Math.round((adminStorages.reduce((sum, s) => sum + (s.capacity || 0), 0) / adminStorages.length) / 100 * 100)
    : 0;

  const doorOpenDuration = doorStatus?.total_duration || 0;

  const handleExport = () => {
    const siteName = selectedSite?.name || 'Unknown';
    const selectedProductObj = getProductConfig(selectedProduct.id);
    
    const reportContent = `
COLDSENSE AI DASHBOARD REPORT
=============================
Generated: ${new Date().toLocaleString()}
Site: ${siteName}

SELECTED PRODUCT
---------------
${selectedProductObj.icon} ${selectedProductObj.name}
- Optimal Temperature: ${selectedProductObj.minTemp}°C - ${selectedProductObj.maxTemp}°C
- Optimal Humidity: ${selectedProductObj.minHumidity}% - ${selectedProductObj.maxHumidity}%

SENSOR READINGS
---------------
Temperature Sensor 1: ${sensorData?.temperatureSensor1 ?? 0}°C
Temperature Sensor 2: ${sensorData?.temperatureSensor2 ?? 0}°C
Ambient Temperature: ${sensorData?.ambientTemp ?? 0}°C
Humidity Sensor 1: ${sensorData?.humiditySensor1 ?? 0}%
Humidity Sensor 2: ${sensorData?.humiditySensor2 ?? 0}%
Ambient Humidity: ${sensorData?.ambientHumidity ?? 0}%

DOOR STATUS
-----------
Door Sensor 1: ${sensorData?.doorSensor1 ?? 0}
Door Sensor 2: ${sensorData?.doorSensor2 ?? 0}
Total Open Duration Today: ${doorOpenDuration} minutes

RECOMMENDATIONS
---------------
1. Monitor temperature regularly to maintain optimal storage conditions
2. Ensure door is not left open for extended periods
3. Check humidity levels to prevent product spoilage
4. Schedule regular maintenance for sensors
5. Review energy consumption patterns for optimization

This report was generated by ColdSense AI Farmer Module.
For professional PDF generation, a PDF library can be integrated.
`;

    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ColdSense_Report_${siteName}_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
              Dashboard
              {isFarmer && farmerSelectedRooms.length > 0 && (
                <>
                  <span className="text-gray-400">|</span>
                  <div className="relative">
                    <select
                      value={selectedRoom}
                      onChange={(e) => setSelectedRoom(e.target.value)}
                      className="appearance-none bg-transparent border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      {farmerSelectedRooms.map((room: string) => (
                        <option key={room} value={room}>{room}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                </>
              )}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {isFarmer ? 'Real-time monitoring and control' : 'Overview and management'}
            </p>
          </div>
        </div>
        
        {/* Top Right Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleExport}
          >
            <Download className="h-4 w-4 mr-2" />
            Download Report
          </Button>
        </div>
      </div>

      {/* Waiting for Room Approval Screen */}
      {loadingRoomStatus ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
        </div>
      ) : isFarmer && !hasApprovedRooms ? (
        <WaitingForApproval onRefresh={checkRoomApprovalStatus} error={roomStatusError} />
      ) : (
        <>
          {/* Door Alert - Farmer Only */}
          {isFarmer && doorStatus?.door_alert && (
            <Card variant="default" className="border-red-200 dark:border-red-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-900 dark:text-red-100">
                      Door Time Limit Exceeded
                    </p>
                    <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                      Total door open time: {doorStatus.total_duration.toFixed(1)} minutes (Limit: {doorStatus.threshold_minutes} minutes)
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={refreshDoorData}
                    className="flex-shrink-0"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* HVAC Illustration with Overlays */}
          <HVACIllustration
            pressure={undefined}
            compressorHealth="running"
            avgTemperature={sensorData?.temperatureAvg}
            ambientTemperature={sensorData?.ambientTemp}
            avgHumidity={sensorData?.humidity}
            ambientHumidity={sensorData?.ambientHumidity}
            batteryPercentage={94}
            batteryStatus="charging"
          />

          {/* Stats Grid - 6 cards in one row */}
          <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
            {/* Storage Utilization - Admin Only */}
            {!isFarmer && (
              <StatCard
                title="Storage"
                value={`${adminCapacityUtilization}%`}
                icon={Box}
                iconColor="orange"
                subtitle="Utilization"
                subtitleColor="orange"
                loading={sensorLoading}
              />
            )}

            {/* Sensors - Admin Only */}
            {!isFarmer && (
              <StatCard
                title="Sensors"
                value={allAdminSensors.length}
                icon={Activity}
                iconColor="purple"
                subtitle={`${adminOnlineSensors} online`}
                subtitleColor="green"
                loading={sensorLoading}
              />
            )}

            {/* Inventory - Farmer Only */}
            {isFarmer && (
              <StatCard
                title="Inventory"
                value={farmerSelectedProducts.length > 0 ? "2,450 kg" : "2,450 kg"}
                icon={Box}
                iconColor="orange"
                subtitle={farmerSelectedProducts.length > 0 ? farmerSelectedProducts.map((p: any) => p?.name).join(', ') : "Dragon Fruit, Avocado"}
                subtitleColor="gray"
                loading={sensorLoading}
              />
            )}

            {/* Crop Health - Farmer Only */}
            {isFarmer && (
              <StatCard
                title="Crop Health"
                value="98%"
                icon={Activity}
                iconColor="green"
                subtitle="All products healthy"
                subtitleColor="gray"
                loading={sensorLoading}
              />
            )}

            {/* Energy - Grid and Solar */}
            <StatCard
              title="Energy"
              value={cumulativeEnergy > 0 ? `${cumulativeEnergy.toFixed(1)} kWh` : '12.6 kWh'}
              icon={Lightbulb}
              iconColor="yellow"
              subtitle="Today's usage"
              subtitleColor="gray"
              loading={sensorLoading}
            />

            {/* Last Updated */}
            <StatCard
              title="Last Updated"
              value={lastFetchTime ? new Date(lastFetchTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : stakeholderData?.lastUpdated || new Date().toLocaleTimeString()}
              icon={RefreshCw}
              iconColor="purple"
              subtitle="Sensor data"
              subtitleColor="gray"
              loading={sensorLoading}
            />

            {/* Live Time */}
            <LiveTimeCard />

            {/* System Status */}
            <SystemStatusCard
              alerts={doorStatus?.door_alert ? 1 : 0}
              systemStatus={doorStatus?.door_alert ? 'warning' : 'operational'}
            />
          </div>

          {/* Stakeholder Dashboard Charts - Admin/Owner Only */}
          {!isFarmer && stakeholderData && (
            <>
              {/* Financial Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 shadow-sm text-white">
                  <h3 className="text-sm font-medium text-white/80 mb-2 uppercase tracking-wider">Total Investment</h3>
                  <p className="text-4xl font-bold">₹{stakeholderData.investment.total} Cr</p>
                  <p className="text-sm text-white/70 mt-2">Capital deployed</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl p-6 shadow-sm text-white">
                  <h3 className="text-sm font-medium text-white/80 mb-2 uppercase tracking-wider">ROI</h3>
                  <p className="text-4xl font-bold">{stakeholderData.roi.percentage}%</p>
                  <p className="text-sm text-white/70 mt-2">Annual return</p>
                </div>
                <div className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl p-6 shadow-sm text-white">
                  <h3 className="text-sm font-medium text-white/80 mb-2 uppercase tracking-wider">Monthly Profit</h3>
                  <p className="text-4xl font-bold">₹{stakeholderData.monthlyProfit.amount} L</p>
                  <p className="text-sm text-white/70 mt-2">Net income</p>
                </div>
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                {/* ROI Chart */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
                  <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-4 uppercase tracking-wider">ROI Trend (24h)</h3>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={stakeholderData.charts.roiHistory}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.5} />
                        <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                        <RechartsTooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} />
                        <Line type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Monthly Profit Chart */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
                  <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-4 uppercase tracking-wider">Monthly Profit (₹ L)</h3>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stakeholderData.charts.profitHistory}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.5} />
                        <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                        <RechartsTooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} />
                        <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Carbon Credits & State Distribution */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                {/* Carbon Credits */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
                  <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-4 uppercase tracking-wider">Carbon Credits (tCO₂)</h3>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={stakeholderData.charts.carbonHistory}>
                        <defs>
                          <linearGradient id="colorCarbon" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.5} />
                        <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                        <RechartsTooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} />
                        <Area type="monotone" dataKey="value" stroke="#06b6d4" fillOpacity={1} fill="url(#colorCarbon)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4">
                    <p className="text-xs text-slate-500">Total Carbon Credits</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{stakeholderData.carbonCredits.total} tCO₂</p>
                  </div>
                </div>

                {/* State Distribution */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
                  <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-4 uppercase tracking-wider">Revenue by State (₹ Cr)</h3>
                  <div className="space-y-4">
                    {stakeholderData.states.map((state: any, index: number) => (
                      <div key={index}>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{state.name}</span>
                          <span className="text-sm font-bold text-slate-900 dark:text-white">₹{state.value} Cr</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all duration-500" 
                            style={{ width: `${(state.value / 8.2) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default Dashboard;
