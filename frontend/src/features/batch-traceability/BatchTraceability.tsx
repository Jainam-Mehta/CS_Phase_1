import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { GitBranch, Package, Users, Calendar } from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import { supabase } from '../../lib/supabase';
import type { StorageBatch, ColdStorageRoom } from '../../lib/supabase';

const BatchTraceability: React.FC = () => {
  const { user } = useAuthStore();
  const [batches, setBatches] = useState<StorageBatch[]>([]);
  const [rooms, setRooms] = useState<ColdStorageRoom[]>([]);
  const [farmers, setFarmers] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchBatchesAndRooms();
  }, [user]);

  const fetchBatchesAndRooms = async () => {
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
        setBatches([]);
        setLoading(false);
        return;
      }

      // NEW SCHEMA: Query batch_room_allocations -> batches -> products
      const { data: allocationData } = await supabase
        .from('batch_room_allocations')
        .select(`
          quantity_kg,
          assigned_at,
          removed_at,
          room_id,
          batches!inner(
            id,
            batch_code,
            farmer_id,
            product_id,
            harvest_date,
            expiry_date,
            initial_quantity_kg,
            remaining_quantity_kg,
            quality_grade,
            remarks,
            created_at,
            products(name)
          )
        `)
        .eq('batches.farmer_id', profile.id)
        .is('removed_at', null)
        .order('assigned_at', { ascending: false });

      // Transform to match expected structure
      const transformedBatches = allocationData?.map((allocation: any) => ({
        ...allocation.batches,
        room_id: allocation.room_id,
        quantity_kg: allocation.quantity_kg,
        assigned_at: allocation.assigned_at,
        product_name: (() => {
          const products = allocation.batches.products;
          if (Array.isArray(products)) {
            return products[0]?.name || 'Unknown Product';
          }
          return products?.name || 'Unknown Product';
        })()
      })) || [];

      setBatches(transformedBatches);
      setFarmers({ [profile.id]: 'You' });
    } catch (err) {
      console.error('Error fetching storage batches:', err);
      setError('Failed to load storage batches. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const kpis = {
    totalBatches: batches.length,
    roomsUsed: 1, // Conceptually irrelevant for farmer here
    farmersActive: 1,
    uniqueProducts: new Set(
      batches.flatMap((b: any) => b.products?.name ? [b.products.name] : [])
    ).size,
  };

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

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Batch Traceability
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Track storage activity across all rooms
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card variant="default">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Batches</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{kpis.totalBatches}</p>
              </div>
              <GitBranch className="h-8 w-8 text-primary-500" />
            </div>
          </CardContent>
        </Card>
        <Card variant="default">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Rooms Used</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{kpis.roomsUsed}</p>
              </div>
              <Package className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card variant="default">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Farmers Active</p>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{kpis.farmersActive}</p>
              </div>
              <Users className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card variant="default">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Unique Products Stored</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{kpis.uniqueProducts}</p>
              </div>
              <Calendar className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Batches Table */}
      <Card variant="default">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-slate-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Batch Code</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Farmer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Room</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Products</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Quantity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Start Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">End Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Current Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                {batches.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                      No storage batches yet. Batches will be automatically generated when farmers store products.
                    </td>
                  </tr>
                ) : (
                  batches.map((batch: any) => {
                    const products = batch.products?.name ? [batch.products.name] : [];

                    return (
                      <tr key={batch.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50">
                        <td className="px-6 py-4 font-mono text-sm text-gray-900 dark:text-gray-100">{batch.batch_code}</td>
                        <td className="px-6 py-4 text-gray-900 dark:text-gray-100">{farmers[batch.farmer_id] || `Farmer ${batch.farmer_id}`}</td>
                        <td className="px-6 py-4 text-gray-900 dark:text-gray-100">{batch.room_name || 'Assigned Storage'}</td>
                        <td className="px-6 py-4">
                          <div className="flex gap-1 flex-wrap">
                            {products.map((product, i) => (
                              <Badge key={i} variant="info" className="text-xs">{product}</Badge>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100">{batch.remaining_quantity_kg || batch.initial_quantity_kg || 0} kg</td>
                        <td className="px-6 py-4 text-gray-900 dark:text-gray-100">{batch.harvest_date || batch.created_at?.substring(0, 10)}</td>
                        <td className="px-6 py-4 text-gray-900 dark:text-gray-100">{batch.expiry_date || '-'}</td>
                        <td className="px-6 py-4">
                          <Badge variant={
                            batch.status === 'completed' ? 'success' : 
                            batch.status === 'expired' ? 'error' : 'info'
                          } className="capitalize">
                            {batch.status || 'active'}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BatchTraceability;
