import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';
import { useOnboarding } from '../../hooks/useOnboarding';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Check, AlertCircle, Warehouse, Clock, Sprout } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { FarmerRoomAccess } from '../../lib/supabase';
import { RoomRequestStatus } from '../../constants/roomRequestStatus';

const RoomSelection: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuthStore();
  const { loading: onboardingLoading, step, completeStep } = useOnboarding();
  const [rooms, setRooms] = useState<any[]>([]);
  // Room IDs are UUIDs (strings) from Supabase — never numbers
  const [selectedRooms, setSelectedRooms] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [localityId, setLocalityId] = useState<string | null>(null);
  const isExtensionMode = searchParams.get('mode') === 'extension';

  useEffect(() => {
    if (step === 'rooms' || isExtensionMode) {
      loadFarmerLocality();
    }
  }, [step, isExtensionMode]);

  const loadFarmerLocality = async () => {
    try {
      if (!user?.id) {
        throw new Error('No authenticated user found');
      }

      // Get farmer profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('locality_id, district_id')
        .eq('auth_user_id', user.id)
        .single();

      if (!profile) {
        throw new Error('Farmer profile not found');
      }

      // If locality is set, use it; otherwise load rooms by district
      if (profile.locality_id) {
        setLocalityId(profile.locality_id);
        loadRooms(profile.locality_id);
      } else if (profile.district_id) {
        // Load rooms by district if locality is not set
        loadRoomsByDistrict(profile.district_id);
      } else {
        setError('Please set your location in your profile first.');
      }
    } catch (err) {
      console.error('Error loading farmer locality:', err);
      setError('Failed to load your location. Please try again.');
    }
  };

  const loadRooms = async (localityId: string) => {
    try {
      const { data, error } = await supabase
        .from('cold_storage_rooms')
        .select(`
          *,
          facilities!inner(
            facility_name,
            locality_id,
            district_id,
            owner_profile_id,
            profiles!inner(
              first_name,
              last_name
            )
          )
        `)
        .eq('facilities.locality_id', localityId)
        .order('room_name');
      
      if (error) throw error;
      setRooms(data || []);
    } catch (err) {
      console.error('Error loading rooms:', err);
      setError('Failed to load available rooms. Please check your internet connection and try again.');
    }
  };

  const loadRoomsByDistrict = async (districtId: string) => {
    try {
      const { data, error } = await supabase
        .from('cold_storage_rooms')
        .select(`
          *,
          facilities!inner(
            facility_name,
            locality_id,
            district_id,
            owner_profile_id,
            profiles!inner(
              first_name,
              last_name
            )
          )
        `)
        .eq('facilities.district_id', districtId)
        .order('room_name');
      
      if (error) throw error;
      setRooms(data || []);
    } catch (err) {
      console.error('Error loading rooms by district:', err);
      setError('Failed to load available rooms. Please check your internet connection and try again.');
    }
  };

  const handleRoomToggle = (roomId: string) => {
    setSelectedRooms(prev => {
      const newSet = new Set(prev);
      if (newSet.has(roomId)) {
        newSet.delete(roomId);
      } else {
        newSet.add(roomId);
      }
      return newSet;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (selectedRooms.size === 0) {
      setError('Please select at least one room');
      return;
    }

    setLoading(true);

    try {
      if (!user?.id) {
        throw new Error('No authenticated user found');
      }

      // Get farmer profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      if (!profile) {
        throw new Error('Farmer profile not found');
      }

      // Create pending room requests
      const roomRequests = Array.from(selectedRooms).map(roomId => ({
        farmer_id: profile.id,
        room_id: roomId,
        status: RoomRequestStatus.Pending,
      }));

      const { error: insertError } = await supabase
        .from('farmer_room_access')
        .insert(roomRequests);

      if (insertError) throw insertError;

      // Get farmer's selected products
      const { data: farmerProducts } = await supabase
        .from('farmer_products')
        .select('product_id')
        .eq('farmer_id', profile.id);

      // Get product details
      const { data: products } = await supabase
        .from('products')
        .select('*')
        .in('id', farmerProducts?.map(p => p.product_id) || []);

      // Store onboarding completion
      const storageRequest = localStorage.getItem('storageAccessRequest');
      let parsedRequest = storageRequest ? JSON.parse(storageRequest) : {};
      
      parsedRequest.rooms = Array.from(selectedRooms);
      localStorage.setItem('storageAccessRequest', JSON.stringify(parsedRequest));

      // In extension mode, navigate to product selection to continue the flow
      // In normal onboarding mode, complete the step and navigate to product selection
      if (isExtensionMode) {
          navigate('/product-selection?mode=extension');
      } else {
          // Notify onboarding hook that this step is complete
          completeStep('rooms');
          // Navigate to product selection
          navigate('/product-selection');
      }
    } catch (err) {
      console.error('Error submitting room requests:', err);
      setError('Failed to submit room requests. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Don't render if still loading onboarding state
  // Allow rendering in extension mode regardless of onboarding step
  if (!isExtensionMode && onboardingLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-400 via-blue-400 to-purple-400 p-4">
      <div className="w-full max-w-7xl">
        <Card variant="default" className="w-full">
          <CardHeader className="text-center relative">
            {/* Step Indicator */}
            <div className="absolute top-4 right-4">
              <span className="px-3 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-sm font-medium rounded-full">
                Step 2/3
              </span>
            </div>
            
            <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Warehouse className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-3xl">Select Storage Rooms</CardTitle>
            <p className="text-gray-500 dark:text-gray-400 mt-2">
              Choose the cold storage rooms you want to request access to
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-error-50 dark:bg-error-900/20 text-error-600 dark:text-error-400 rounded-lg text-sm">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              {rooms.length === 0 ? (
                <div className="text-center py-8">
                  <Warehouse className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">
                    No rooms available in your locality. Please contact support.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  {rooms.map((room) => (
                    <button
                      key={room.id}
                      type="button"
                      onClick={() => handleRoomToggle(room.id)}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        selectedRooms.has(room.id)
                          ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                          : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-1">
                          <Warehouse className="h-4 w-4 text-gray-600 dark:text-gray-400 flex-shrink-0" />
                          <span className="font-semibold text-sm text-gray-900 dark:text-gray-100 line-clamp-1">
                            {room.room_name || room.room_code || 'Storage Room'}
                          </span>
                        </div>
                        {selectedRooms.has(room.id) && (
                          <Check className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5 line-clamp-1">
                        {room.facilities?.facility_name || 'Unknown Facility'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                        {room.facilities?.profiles 
                          ? `${room.facilities.profiles.first_name} ${room.facilities.profiles.last_name}`
                          : 'Unknown Owner'}
                      </p>
                    </button>
                  ))}
                </div>
              )}

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                      Approval Required
                    </p>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      Your room requests will be reviewed by the Owner. You will be notified once access is granted.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-slate-700">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedRooms.size} room{selectedRooms.size !== 1 ? 's' : ''} selected
                </p>
                <Button
                  type="submit"
                  variant="primary"
                  loading={loading}
                  disabled={selectedRooms.size === 0 || rooms.length === 0}
                >
                  Continue to Product Selection
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RoomSelection;
