/**
 * Phase 2.3: Room Pricing Setup Component
 * Owner sets daily pricing per room (₹/crate/day)
 */

import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Save, Loader, Plus, Trash2 } from 'lucide-react';

interface Room {
  id: string;
  room_code: string;
  room_name: string;
  site_id: string;
}

interface CurrentPricing {
  room_id: string;
  price_per_crate: number;
  effective_from: string;
  effective_until?: string;
}

interface RoomPricingSetupProps {
  ownerId: string;
  onSave?: (roomId: string, price: number) => void;
}

const RoomPricingSetup: React.FC<RoomPricingSetupProps> = ({ ownerId, onSave }) => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [currentPricing, setCurrentPricing] = useState<Record<string, CurrentPricing>>({});
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchRoomsAndPricing();
  }, [ownerId]);

  const fetchRoomsAndPricing = async () => {
    try {
      setLoading(true);
      // Fetch rooms (from storage API)
      const roomsResponse = await fetch('http://localhost:8000/api/storage/');
      if (!roomsResponse.ok) throw new Error('Failed to fetch rooms');
      const roomsData = await roomsResponse.json();
      setRooms(roomsData);

      // Fetch current pricing for each room
      const pricingData: Record<string, CurrentPricing> = {};
      const pricesData: Record<string, number> = {};

      for (const room of roomsData) {
        try {
          const pricingResponse = await fetch(
            `http://localhost:8000/api/v2/owner/rooms/${room.id}/pricing`
          );
          if (pricingResponse.ok) {
            const pricing = await pricingResponse.json();
            pricingData[room.id] = pricing;
            pricesData[room.id] = pricing.price_per_crate || 5;
          } else {
            pricesData[room.id] = 5; // Default price
          }
        } catch {
          pricesData[room.id] = 5; // Default on error
        }
      }

      setCurrentPricing(pricingData);
      setPrices(pricesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load rooms');
    } finally {
      setLoading(false);
    }
  };

  const handlePriceChange = (roomId: string, value: number) => {
    setPrices({
      ...prices,
      [roomId]: Math.max(0, value)
    });
  };

  const handleSavePrice = async (roomId: string) => {
    setError(null);
    setSuccess(null);

    const price = prices[roomId];
    if (!price || price <= 0) {
      setError('Price must be greater than 0');
      return;
    }

    try {
      setSaving(roomId);

      const payload = {
        room_id: roomId,
        owner_id: ownerId,
        price_per_crate: price,
        effective_from: new Date().toISOString().split('T')[0],
        effective_until: null
      };

      const response = await fetch('http://localhost:8000/api/v2/owner/rooms/pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to set pricing');
      }

      const data = await response.json();
      setSuccess(`Price set for room: ₹${price}/crate`);

      // Update current pricing
      setCurrentPricing({
        ...currentPricing,
        [roomId]: {
          room_id: roomId,
          price_per_crate: price,
          effective_from: data.effective_from
        }
      });

      if (onSave) onSave(roomId, price);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set pricing');
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-white rounded-lg border border-gray-200 flex items-center justify-center h-96">
        <div className="text-center">
          <Loader className="mx-auto animate-spin text-blue-600 mb-2" size={32} />
          <p className="text-gray-600">Loading rooms...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h1 className="text-2xl font-bold text-gray-900">Set Room Pricing</h1>
        <p className="text-gray-600 mt-1">Configure daily storage rate for each room</p>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <h3 className="font-semibold text-red-900">Error</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
          <CheckCircle className="text-green-600 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <h3 className="font-semibold text-green-900">Success</h3>
            <p className="text-sm text-green-700 mt-1">{success}</p>
          </div>
        </div>
      )}

      {/* Rooms Grid */}
      {rooms.length === 0 ? (
        <div className="p-8 bg-blue-50 border border-blue-200 rounded-lg text-center">
          <p className="text-gray-600">No rooms available</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rooms.map(room => {
            const pricing = currentPricing[room.id];
            const price = prices[room.id];

            return (
              <div
                key={room.id}
                className="bg-white p-6 rounded-lg border border-gray-200 space-y-4"
              >
                <div>
                  <h3 className="font-semibold text-gray-900">{room.room_name}</h3>
                  <p className="text-sm text-gray-600">{room.room_code}</p>
                </div>

                {/* Current Pricing Info */}
                {pricing && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                    <p className="text-sm text-blue-900">
                      <span className="font-medium">Current Price:</span> ₹{pricing.price_per_crate}/crate
                    </p>
                    <p className="text-xs text-blue-700 mt-1">
                      Since: {new Date(pricing.effective_from).toLocaleDateString()}
                    </p>
                  </div>
                )}

                {/* Price Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    New Price per Crate (₹)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="0.5"
                      step="0.5"
                      value={price}
                      onChange={(e) => handlePriceChange(room.id, parseFloat(e.target.value))}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={() => handleSavePrice(room.id)}
                      disabled={saving === room.id}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 flex items-center gap-2 transition-colors"
                    >
                      {saving === room.id ? (
                        <>
                          <Loader size={16} className="animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save size={16} />
                          Set Price
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    1 crate = 25 kg of product
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Info Box */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-900">
          <span className="font-semibold">Note:</span> Pricing is charged per day per crate. The price you set here will be applied to all new farmer approvals for this room. Existing agreements will maintain their approved price.
        </p>
      </div>
    </div>
  );
};

export default RoomPricingSetup;
