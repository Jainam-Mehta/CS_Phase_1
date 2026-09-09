import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Leaf, Award, TreePine, Recycle, Sun, Factory, Plus } from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import { supabase } from '../../lib/supabase';
import type { CarbonCredit } from '../../lib/supabase';

const CarbonCredits: React.FC = () => {
  const { user } = useAuthStore();
  const [credits, setCredits] = useState<CarbonCredit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    activity: '',
    credits: '',
    co2Saved: '',
    activityDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    fetchCarbonCredits();
  }, [user?.id]);

  const fetchCarbonCredits = async () => {
    // Carbon credits table currently does not exist in live database schema, returning dummy zero state
    setCredits([]);
    setLoading(false);
  };

  const handleAddCredit = async () => {
    // Mocking add since DB table does not exist
    setShowAddModal(false);
    setFormData({
      activity: '',
      credits: '',
      co2Saved: '',
      activityDate: new Date().toISOString().split('T')[0],
    });
  };

  // Calculate KPIs from credit data
  const kpis = {
    totalCredits: credits.reduce((sum, c) => sum + (c.credits || 0), 0),
    verifiedCredits: credits.filter((c) => c.status === 'verified').reduce((sum, c) => sum + (c.credits || 0), 0),
    pendingCredits: credits.filter((c) => c.status === 'pending').reduce((sum, c) => sum + (c.credits || 0), 0),
    totalCO2Saved: credits.reduce((sum, c) => sum + (c.co2_saved || 0), 0),
    treesSaved: credits.reduce((sum, c) => sum + (c.co2_saved || 0), 0) * 45, // 1 ton CO2 = 45 trees
    solarOffset: credits
      .filter((c) => c.activity.toLowerCase().includes('solar'))
      .reduce((sum, c) => sum + (c.co2_saved || 0), 0),
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Carbon Credits
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Track and manage carbon credits
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Carbon Credit
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card variant="default">
          <CardContent className="p-4">
            <div className="flex flex-col items-center">
              <Leaf className="h-6 w-6 text-green-500 mb-2" />
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Credits</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{kpis.totalCredits}</p>
            </div>
          </CardContent>
        </Card>
        <Card variant="default">
          <CardContent className="p-4">
            <div className="flex flex-col items-center">
              <Award className="h-6 w-6 text-blue-500 mb-2" />
              <p className="text-xs text-gray-500 dark:text-gray-400">Verified</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{kpis.verifiedCredits}</p>
            </div>
          </CardContent>
        </Card>
        <Card variant="default">
          <CardContent className="p-4">
            <div className="flex flex-col items-center">
              <TreePine className="h-6 w-6 text-yellow-500 mb-2" />
              <p className="text-xs text-gray-500 dark:text-gray-400">Pending</p>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{kpis.pendingCredits}</p>
            </div>
          </CardContent>
        </Card>
        <Card variant="default">
          <CardContent className="p-4">
            <div className="flex flex-col items-center">
              <Recycle className="h-6 w-6 text-purple-500 mb-2" />
              <p className="text-xs text-gray-500 dark:text-gray-400">CO2 Saved</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{kpis.totalCO2Saved}t</p>
            </div>
          </CardContent>
        </Card>
        <Card variant="default">
          <CardContent className="p-4">
            <div className="flex flex-col items-center">
              <Factory className="h-6 w-6 text-green-500 mb-2" />
              <p className="text-xs text-gray-500 dark:text-gray-400">Trees Saved</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{kpis.treesSaved}</p>
            </div>
          </CardContent>
        </Card>
        <Card variant="default">
          <CardContent className="p-4">
            <div className="flex flex-col items-center">
              <Sun className="h-6 w-6 text-orange-500 mb-2" />
              <p className="text-xs text-gray-500 dark:text-gray-400">Solar Offset</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{kpis.solarOffset}t</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Credits Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {credits.length === 0 ? (
          <div className="col-span-full text-center py-8 text-gray-500 dark:text-gray-400">
            No carbon credits yet. Click "Add Carbon Credit" to add your first credit.
          </div>
        ) : (
          credits.map((credit) => (
            <Card key={credit.id} variant="default">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="h-12 w-12 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <Leaf className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <Badge variant={credit.status === 'verified' ? 'success' : 'warning'}>{credit.status}</Badge>
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">{credit.activity}</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Date</span>
                    <span className="text-gray-900 dark:text-gray-100">{credit.activity_date}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Credits</span>
                    <span className="font-bold text-green-600 dark:text-green-400">+{credit.credits}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 dark:text-gray-400">CO2 Saved</span>
                    <span className="font-bold text-purple-600 dark:text-purple-400">{credit.co2_saved}t</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Add Carbon Credit Modal */}
      {showAddModal && (
        <Modal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          title="Add Carbon Credit"
          size="md"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Activity *
              </label>
              <input
                type="text"
                value={formData.activity}
                onChange={(e) => setFormData({ ...formData, activity: e.target.value })}
                placeholder="e.g., Solar Panel Installation"
                className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Credits *
              </label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={formData.credits}
                onChange={(e) => setFormData({ ...formData, credits: e.target.value })}
                placeholder="Number of credits earned"
                className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                CO2 Saved (tons) *
              </label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={formData.co2Saved}
                onChange={(e) => setFormData({ ...formData, co2Saved: e.target.value })}
                placeholder="CO2 saved in tons"
                className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Activity Date *
              </label>
              <input
                type="date"
                value={formData.activityDate}
                onChange={(e) => setFormData({ ...formData, activityDate: e.target.value })}
                className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowAddModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleAddCredit}
                disabled={!formData.activity || !formData.credits || !formData.co2Saved}
              >
                Add Credit
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default CarbonCredits;
