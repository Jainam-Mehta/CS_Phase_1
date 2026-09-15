import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Box, ChevronDown, Calculator } from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import { supabase } from '../../lib/supabase';
import type { ColdStorageRoom, Inventory, PricingHistory } from '../../lib/supabase';
import { RoomRequestStatus } from '../../constants/roomRequestStatus';

const Inventory: React.FC = () => {
  const { user } = useAuthStore();
  const [rooms, setRooms] = useState<ColdStorageRoom[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCalculator, setShowCalculator] = useState(false);
  const [pricingHistory, setPricingHistory] = useState<PricingHistory[]>([]);
  const [farmers, setFarmers] = useState<Record<number, string>>({});
  const [calculator, setCalculator] = useState({
    farmerId: '',
    roomId: '',
    crates: '',
    pricePerCrate: '1.25',
  });

  const selectedRoom = rooms.find((r) => r.id === selectedRoomId) || rooms[0];

  useEffect(() => {
    fetchRoomsAndInventory();
  }, [user?.id]);

  useEffect(() => {
    if (showCalculator) {
      fetchPricingHistory();
      fetchFarmers();
    }
  }, [showCalculator]);

  const fetchFarmers = async () => {
    if (!user) return;

    try {
      // Fetch owner's profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();

      if (!profile) return;

      // Fetch all farmers who have approved room requests with this owner's rooms
      const { data: roomRequests } = await supabase
        .from('farmer_room_access')
        .select('farmer_id')
        .eq('status', RoomRequestStatus.Approved);

      if (!roomRequests || roomRequests.length === 0) return;

      const farmerIds = [...new Set(roomRequests.map((r) => r.farmer_id))];

      // Fetch farmer profiles
      const { data: farmerProfiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', farmerIds);

      const farmerMap: Record<number, string> = {};
      farmerProfiles?.forEach((profile) => {
        const name = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
        farmerMap[profile.id] = name || `Farmer ${profile.id}`;
      });
      setFarmers(farmerMap);
    } catch (err) {
      console.error('Error fetching farmers:', err);
    }
  };

  const fetchRoomsAndInventory = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError('');

      // Fetch farmer's profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();

      if (!profile) {
        setRooms([]);
        setInventory([]);
        setLoading(false);
        return;
      }

      // Fetch farmer's approved room requests
      const { data: roomRequests } = await supabase
        .from('farmer_room_access')
        .select('room_id')
        .eq('farmer_id', profile.id)
        .eq('status', RoomRequestStatus.Approved);

      if (!roomRequests || roomRequests.length === 0) {
        setRooms([]);
        setInventory([]);
        setLoading(false);
        return;
      }

      const roomIds = roomRequests.map((r) => r.room_id);

      // Fetch rooms
      const { data: roomsData } = await supabase
        .from('cold_storage_rooms')
        .select('*')
        .in('id', roomIds);

      if (!roomsData || roomsData.length === 0) {
        setRooms([]);
        setInventory([]);
        setLoading(false);
        return;
      }

      setRooms(roomsData);
      setSelectedRoomId(roomsData[0].id);

      // Fetch inventory batches for the farmer (from batch_room_allocations joined with batches)
      const { data: inventoryData } = await supabase
        .from('batch_room_allocations')
        .select(`
          quantity_kg,
          room_id,
          batches!inner(
            id,
            batch_code,
            initial_quantity_kg,
            remaining_quantity_kg,
            products(name)
          )
        `)
        .in('room_id', roomIds)
        .is('removed_at', null);

      // Transform the data to match expected structure
      const transformedInventory = inventoryData?.map((alloc: any) => ({
        ...alloc.batches,
        room_id: alloc.room_id,
        quantity_kg: alloc.quantity_kg,
        remaining_quantity_kg: alloc.batches.remaining_quantity_kg
      })) || [];

      setInventory(transformedInventory);
    } catch (err) {
      console.error('Error fetching inventory:', err);
      setError('Failed to load inventory. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchPricingHistory = async () => {
    if (!user) return;

    try {
      // Fetch owner's profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();

      if (!profile) return;

      const { data: historyData } = await supabase
        .from('market_prices')
        .select('*')
        .order('recorded_at', { ascending: false })
        .limit(10);

      setPricingHistory(historyData || []);
    } catch (err) {
      console.error('Error fetching pricing history:', err);
    }
  };

  const handleCalculatePrice = async () => {
    if (!user || !calculator.farmerId || !calculator.roomId || !calculator.crates || !calculator.pricePerCrate) return;

    try {
      // Fetch owner's profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();

      if (!profile) {
        setError('Profile not found');
        return;
      }

      const crates = parseFloat(calculator.crates);
      const pricePerCrate = parseFloat(calculator.pricePerCrate);
      const totalPrice = crates * pricePerCrate;

      const { error } = await supabase
        .from('market_prices')
        .insert({
          source: 'calculator',
          price_per_kg: pricePerCrate,
          recorded_at: new Date().toISOString(),
        });

      if (error) throw error;

      // Refresh pricing history
      await fetchPricingHistory();

      // Reset calculator
      setCalculator({
        farmerId: '',
        roomId: '',
        crates: '',
        pricePerCrate: '1.25',
      });
    } catch (err) {
      console.error('Error calculating price:', err);
      setError('Failed to calculate price. Please try again.');
    }
  };

  // Get inventory for selected room
  const roomInventory = selectedRoom
    ? inventory.filter((inv) => inv.room_id === selectedRoomId)
    : [];

  // Calculate totals for selected room
  const totalStored = inventory.reduce((sum, inv) => sum + (Number(inv.remaining_quantity_kg) || Number(inv.initial_quantity_kg) || 0), 0);
  const freeCapacity = selectedRoom ? (Number(selectedRoom.capacity_kg) || 0) : 0; // Fake capacity metric assuming all space belongs to farmer for now
  const occupancyPercentage = selectedRoom && Number(selectedRoom.capacity_kg) > 0
    ? (totalStored / Number(selectedRoom.capacity_kg)) * 100
    : 0;

  const productQuantities = inventory.reduce((acc, inv) => {
    const name = inv.products?.name || inv.product_name || inv.commodity || 'Unknown Item';
    acc[name] = (acc[name] || 0) + (Number(inv.remaining_quantity_kg) || Number(inv.initial_quantity_kg) || 0);
    return acc;
  }, {} as Record<string, number>);

  const productEntries = Object.entries(productQuantities);

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 p-6">
        <div className="text-center py-8 text-red-600 dark:text-red-400">
          {error}
        </div>
      </div>
    );
  }

  if (rooms.length === 0) {
    return (
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Inventory
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            View and manage your stored products
          </p>
        </div>
        <Card variant="default">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Box className="h-12 w-12 text-primary-600" />
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">No Rooms Available</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  You don't have any approved room requests. Please contact the storage owner.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Inventory
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          View and manage your stored products
        </p>
      </div>

      {/* Room Selector */}
      {rooms.length > 1 && (
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Select Room:</label>
          <div className="relative">
            <select
              value={selectedRoomId}
              onChange={(e) => setSelectedRoomId(e.target.value)}
              className="appearance-none bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-4 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.room_name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
      )}

      {/* Horizontal Bar Chart - Product Quantities */}
      <Card variant="default">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Product Quantities
          </h3>
          {productEntries.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No inventory stored in this room
            </div>
          ) : (
            <div className="space-y-4">
              {productEntries.map(([productName, quantity]: any) => {
                const maxQuantity = Math.max(...(Object.values(productQuantities) as number[]));
                const barWidth = maxQuantity > 0 ? (quantity / maxQuantity) * 100 : 0;
                
                return (
                  <div key={productName}>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {productName}
                      </span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {quantity} kg
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-4">
                      <div
                        className="bg-blue-500 dark:bg-blue-400 h-4 rounded-full transition-all"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Battery-style Storage Indicator */}
      <Card variant="default">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Storage Capacity
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Free Capacity</span>
              <span className="text-green-600 dark:text-green-400 font-semibold">
                {freeCapacity.toFixed(0)} kg
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Occupied</span>
              <span className="text-red-600 dark:text-red-400 font-semibold">
                {totalStored.toFixed(0)} kg
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Total Capacity</span>
              <span className="text-gray-900 dark:text-white font-semibold">
                {selectedRoom?.capacity_kg || 0} kg
              </span>
            </div>
            
            {/* Battery-style indicator */}
            <div className="mt-6">
              <div className="relative h-24 bg-gray-200 dark:bg-slate-700 rounded-lg overflow-hidden">
                {/* Red section (occupied) */}
                <div
                  className="absolute bottom-0 left-0 right-0 bg-red-500 dark:bg-red-400 transition-all"
                  style={{ height: `${occupancyPercentage}%` }}
                />
                {/* Green section (free) */}
                <div
                  className="absolute top-0 left-0 right-0 bg-green-500 dark:bg-green-400 transition-all"
                  style={{ height: `${100 - occupancyPercentage}%` }}
                />
                {/* Percentage label */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold text-white drop-shadow-lg">
                    {occupancyPercentage.toFixed(0)}%
                  </span>
                </div>
              </div>
              <div className="flex justify-between mt-2 text-xs text-gray-500 dark:text-gray-400">
                <span>Free</span>
                <span>Occupied</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Price Calculator */}
      <Card variant="default">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Price Calculator
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCalculator(!showCalculator)}
            >
              {showCalculator ? 'Hide' : 'Show'}
            </Button>
          </div>
        </CardHeader>
        {showCalculator && (
          <CardContent className="p-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Farmer
                </label>
                <select
                  value={calculator.farmerId}
                  onChange={(e) => setCalculator({ ...calculator, farmerId: e.target.value })}
                  className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Choose a farmer...</option>
                  {Object.entries(farmers).map(([id, name]) => (
                    <option key={id} value={id}>{name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Room
                </label>
                <select
                  value={calculator.roomId}
                  onChange={(e) => setCalculator({ ...calculator, roomId: e.target.value })}
                  className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Choose a room...</option>
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.room_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Number of Crates
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={calculator.crates}
                  onChange={(e) => setCalculator({ ...calculator, crates: e.target.value })}
                  placeholder="Enter number of crates"
                  className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Price per Crate (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={calculator.pricePerCrate}
                  onChange={(e) => setCalculator({ ...calculator, pricePerCrate: e.target.value })}
                  placeholder="Default: 1.25"
                  className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              {calculator.crates && calculator.pricePerCrate && (
                <div className="bg-gray-50 dark:bg-slate-800 p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Price:</span>
                    <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                      ₹{(parseFloat(calculator.crates) * parseFloat(calculator.pricePerCrate)).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
              <Button
                variant="primary"
                onClick={handleCalculatePrice}
                disabled={!calculator.farmerId || !calculator.roomId || !calculator.crates || !calculator.pricePerCrate}
                className="w-full"
              >
                Calculate & Save
              </Button>
            </div>

            {/* Pricing History */}
            {pricingHistory.length > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-slate-700">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Recent Calculations</h4>
                <div className="space-y-2">
                  {pricingHistory.map((history) => (
                    <div
                      key={history.id}
                      className="flex justify-between items-center p-3 bg-gray-50 dark:bg-slate-800 rounded-lg text-sm"
                    >
                      <div>
                        <span className="text-gray-900 dark:text-white font-medium">
                          {history.crates} crates
                        </span>
                        <span className="text-gray-500 dark:text-gray-400 ml-2">
                          @ ₹{history.price_per_crate}/crate
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-green-600 dark:text-green-400 font-semibold">
                          ₹{history.total_price.toFixed(2)}
                        </span>
                        <span className="text-gray-500 dark:text-gray-400 ml-2">
                          {history.calculation_date}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
};

export default Inventory;
