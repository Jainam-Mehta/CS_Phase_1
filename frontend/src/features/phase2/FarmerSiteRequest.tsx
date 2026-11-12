/**
 * Phase 2.1: Farmer Site Request Component
 * Farmer submits request for site access + products
 * Flow: Select room → Select products → Submit
 */

import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Send, Loader } from 'lucide-react';
import ProductSelection from './ProductSelection';

interface Room {
  id: string;
  room_code: string;
  room_name: string;
  capacity_kg: number;
  current_utilization_kg: number;
}

interface SelectedProduct {
  product_id: string;
  product_name: string;
  quantity_kg: number;
  product_type?: string;
}

interface FarmerSiteRequestProps {
  farmerId: string;
  onSuccess?: (requestId: string) => void;
}

const FarmerSiteRequest: React.FC<FarmerSiteRequestProps> = ({ farmerId, onSuccess }) => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string>('');
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const [remarks, setRemarks] = useState('');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Fetch available rooms
  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      // In real app, would fetch rooms available for farmer to request
      // For now, fetch all active rooms
      const response = await fetch('http://localhost:8000/api/storage/');
      if (!response.ok) throw new Error('Failed to fetch rooms');
      const data = await response.json();
      setRooms(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load rooms');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validation
    if (!selectedRoom) {
      setError('Please select a room');
      return;
    }

    if (selectedProducts.length === 0) {
      setError('Please select at least one product');
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        farmer_id: farmerId,
        room_id: selectedRoom,
        products: selectedProducts,
        remarks: remarks || null
      };

      const response = await fetch('http://localhost:8000/api/v2/farmer/sites/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to submit request');
      }

      const data = await response.json();
      setSuccess(`Request submitted successfully! Request ID: ${data.request_id}`);

      // Reset form
      setSelectedRoom('');
      setSelectedProducts([]);
      setRemarks('');

      if (onSuccess) {
        onSuccess(data.request_id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-white rounded-lg border border-gray-200">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          <div className="h-10 bg-gray-100 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 bg-white p-6 rounded-lg border border-gray-200">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Request Cold Storage Access</h1>
        <p className="text-gray-600 mt-1">Select a storage room and choose products you wish to store</p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <h3 className="font-semibold text-red-900">Error</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Success Alert */}
      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
          <CheckCircle className="text-green-600 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <h3 className="font-semibold text-green-900">Success</h3>
            <p className="text-sm text-green-700 mt-1">{success}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Select Room */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900">Step 1: Select Storage Room</h2>

          <label className="block text-sm font-medium text-gray-900">
            Available Rooms
          </label>

          {rooms.length === 0 ? (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-700">
              No rooms available for request
            </div>
          ) : (
            <select
              value={selectedRoom}
              onChange={(e) => setSelectedRoom(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a room...</option>
              {rooms.map(room => (
                <option key={room.id} value={room.id}>
                  {room.room_name} ({room.room_code}) - {room.capacity_kg} kg capacity
                </option>
              ))}
            </select>
          )}

          {selectedRoom && (
            <div className="mt-3 p-4 bg-blue-50 border border-blue-200 rounded">
              {(() => {
                const room = rooms.find(r => r.id === selectedRoom);
                if (!room) return null;
                return (
                  <div className="text-sm text-blue-900">
                    <p className="font-semibold mb-2">{room.room_name}</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="font-medium">Capacity:</span> {room.capacity_kg.toLocaleString()} kg
                      </div>
                      <div>
                        <span className="font-medium">Current:</span> {room.current_utilization_kg.toLocaleString()} kg
                      </div>
                      <div>
                        <span className="font-medium">Available:</span>{' '}
                        {(room.capacity_kg - room.current_utilization_kg).toLocaleString()} kg
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* Step 2: Select Products */}
        {selectedRoom && (
          <div className="space-y-3 pt-6 border-t">
            <h2 className="text-lg font-semibold text-gray-900">Step 2: Select Products</h2>
            <ProductSelection
              onSelect={setSelectedProducts}
              maxProducts={10}
            />
          </div>
        )}

        {/* Step 3: Remarks */}
        {selectedRoom && selectedProducts.length > 0 && (
          <div className="space-y-3 pt-6 border-t">
            <h2 className="text-lg font-semibold text-gray-900">Step 3: Additional Information</h2>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Remarks (Optional)
              </label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Any additional information for the storage owner..."
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Summary */}
            <div className="p-4 bg-gray-50 border border-gray-200 rounded space-y-2">
              <h3 className="font-semibold text-gray-900">Request Summary</h3>
              <div className="text-sm text-gray-700 space-y-1">
                <p>
                  <span className="font-medium">Room:</span>{' '}
                  {rooms.find(r => r.id === selectedRoom)?.room_name}
                </p>
                <p>
                  <span className="font-medium">Products:</span> {selectedProducts.length}
                </p>
                <p>
                  <span className="font-medium">Total Quantity:</span>{' '}
                  {selectedProducts.reduce((sum, p) => sum + p.quantity_kg, 0).toLocaleString()} kg
                </p>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-blue-400 flex items-center justify-center gap-2 transition-colors"
            >
              {submitting ? (
                <>
                  <Loader size={18} className="animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send size={18} />
                  Submit Request
                </>
              )}
            </button>
          </div>
        )}
      </form>
    </div>
  );
};

export default FarmerSiteRequest;
