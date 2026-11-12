import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { AlertCircle, Check } from 'lucide-react';

interface RoomPricingSetupProps {
  roomId: string;
  ownerId: string;
  roomName?: string;
}

export const RoomPricingSetup: React.FC<RoomPricingSetupProps> = ({ roomId, ownerId, roomName = 'Room' }) => {
  const [pricePerCrate, setPricePerCrate] = useState<number>(1.40);
  const [effectiveFrom, setEffectiveFrom] = useState<string>(new Date().toISOString().split('T')[0]);
  const [effectiveUntil, setEffectiveUntil] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [existingPricing, setExistingPricing] = useState<any>(null);

  useEffect(() => {
    loadExistingPricing();
  }, [roomId]);

  const loadExistingPricing = async () => {
    try {
      const { data } = await supabase
        .from('room_pricing')
        .select('*')
        .eq('room_id', roomId)
        .order('effective_from', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        setExistingPricing(data);
        setPricePerCrate(data.price_per_crate);
        setEffectiveFrom(data.effective_from);
        setEffectiveUntil(data.effective_until || '');
      }
    } catch (err) {
      console.error('Error loading existing pricing:', err);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      // Validate inputs
      if (!pricePerCrate || pricePerCrate <= 0) {
        throw new Error('Price per crate must be greater than 0');
      }

      if (!effectiveFrom) {
        throw new Error('Effective from date is required');
      }

      if (effectiveUntil && effectiveUntil < effectiveFrom) {
        throw new Error('Effective until date must be after effective from date');
      }

      // Get site code
      const { data: roomData } = await supabase
        .from('cold_storage_rooms')
        .select('site_id')
        .eq('id', roomId)
        .single();

      if (!roomData) {
        throw new Error('Room not found');
      }

      const { data: siteData } = await supabase
        .from('sites')
        .select('site_code')
        .eq('id', roomData.site_id)
        .single();

      if (!siteData) {
        throw new Error('Site not found');
      }

      // Insert pricing record
      const { error: insertError } = await supabase
        .from('room_pricing')
        .insert({
          room_id: roomId,
          site_code: siteData.site_code,
          owner_id: ownerId,
          price_per_crate: parseFloat(pricePerCrate.toString()),
          effective_from: effectiveFrom,
          effective_until: effectiveUntil || null,
          currency: 'INR'
        });

      if (insertError) throw insertError;

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      
      // Reload existing pricing
      await loadExistingPricing();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save pricing');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          💰 Set Storage Pricing - {roomName}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
            <Check className="w-4 h-4 flex-shrink-0" />
            Pricing updated successfully!
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2 text-slate-700">
              Price per Crate (₹) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={pricePerCrate}
              onChange={(e) => setPricePerCrate(parseFloat(e.target.value) || 0)}
              placeholder="1.40"
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
            <p className="text-xs text-slate-500 mt-1">Base rate per 25kg crate per day</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2 text-slate-700">
                Effective From <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={effectiveFrom}
                onChange={(e) => setEffectiveFrom(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-slate-700">
                Effective Until (Optional)
              </label>
              <input
                type="date"
                value={effectiveUntil}
                onChange={(e) => setEffectiveUntil(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
              <p className="text-xs text-slate-500 mt-1">Leave empty for ongoing pricing</p>
            </div>
          </div>

          {existingPricing && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
              <p className="font-semibold">Current Pricing:</p>
              <p>₹{existingPricing.price_per_crate}/crate effective from {existingPricing.effective_from}</p>
            </div>
          )}
        </div>

        <Button
          onClick={handleSave}
          disabled={loading}
          variant="primary"
          className="w-full"
        >
          {loading ? 'Saving...' : 'Save Pricing'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default RoomPricingSetup;
