import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { StatusIndicator } from '../../components/ui/StatusIndicator';
import { Modal } from '../../components/ui/Modal';
import { MapPin, Thermometer, Droplets, Box, Search, Plus, Zap, Activity } from 'lucide-react';
import { useAdminStorageStore, type AdminSensor } from '../../stores/useAdminStorageStore';

const ColdStorages: React.FC = () => {
  const { storages, addStorage } = useAdminStorageStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStorageType, setSelectedStorageType] = useState<'cold_room' | 'dairy_cold_storage' | null>(null);
  const [newStorage, setNewStorage] = useState({
    name: '',
    capacity: 1000,
    location: '',
    numRooms: 1,
  });
  const [selectedSensors, setSelectedSensors] = useState<{ type: AdminSensor['type']; units: number }[]>([]);

  const sensorTypes: { type: AdminSensor['type']; label: string }[] = [
    { type: 'temperature', label: 'Temperature Sensor' },
    { type: 'humidity', label: 'Humidity Sensor' },
    { type: 'door', label: 'Door Sensor' },
    { type: 'co2', label: 'CO₂ Sensor' },
    { type: 'o2', label: 'O₂ Sensor' },
    { type: 'ammonia', label: 'Ammonia Sensor' },
    { type: 'ethylene', label: 'Ethylene Sensor' },
    { type: 'outdoor_temperature', label: 'Outdoor Temperature Sensor' },
    { type: 'pressure', label: 'Pressure Sensor' },
  ];

  const filteredStorages = storages.filter((cs) =>
    cs.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cs.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddSensor = () => {
    setSelectedSensors([...selectedSensors, { type: 'temperature', units: 1 }]);
  };

  const handleSensorTypeChange = (index: number, type: AdminSensor['type']) => {
    const updated = [...selectedSensors];
    updated[index].type = type;
    setSelectedSensors(updated);
  };

  const handleSensorUnitsChange = (index: number, units: number) => {
    const updated = [...selectedSensors];
    updated[index].units = units;
    setSelectedSensors(updated);
  };

  const handleRemoveSensor = (index: number) => {
    setSelectedSensors(selectedSensors.filter((_, i) => i !== index));
  };

  const handleAddStorage = () => {
    if (!selectedStorageType || !newStorage.name || !newStorage.location) return;

    const sensors: AdminSensor[] = selectedSensors.flatMap(({ type, units }) =>
      Array.from({ length: units }, (_, i) => ({
        id: `s-${type}-${Date.now()}-${i}`,
        name: `${sensorTypes.find((s) => s.type === type)?.label || type} ${i + 1}`,
        type,
        units: 1,
        status: 'Online' as const,
        lastReading: 0,
        lastUpdated: new Date().toISOString(),
      }))
    );

    // Create site with multiple rooms
    const roomCapacity = newStorage.capacity / newStorage.numRooms;
    addStorage({
      name: newStorage.name,
      type: selectedStorageType,
      capacity: newStorage.capacity,
      location: newStorage.location,
      status: 'operational',
      healthScore: 95,
      temperature: 2.0,
      humidity: 85,
      powerSource: 'solar',
      productsStored: 0,
      sensors,
    });

    setShowAddModal(false);
    setSelectedStorageType(null);
    setNewStorage({ name: '', capacity: 1000, location: '', numRooms: 1 });
    setSelectedSensors([]);
  };

  const getPowerSourceIcon = (source: string) => {
    switch (source) {
      case 'solar':
        return <Zap className="h-4 w-4 text-yellow-500" />;
      case 'electricity':
        return <Activity className="h-4 w-4 text-blue-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Cold Storages
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage and monitor all cold storage facilities
          </p>
        </div>
        <Button variant="primary" onClick={() => setShowAddModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Cold Storage
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search cold storages..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      {/* Storage Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredStorages.map((storage) => (
          <Card key={storage.id} variant="default" className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-xl">{storage.name}</CardTitle>
                  <div className="flex items-center gap-2 mt-2 text-sm text-gray-500 dark:text-gray-400">
                    <MapPin className="h-4 w-4" />
                    {storage.location}
                  </div>
                </div>
                <Badge variant={storage.status === 'operational' ? 'success' : storage.healthScore < 70 ? 'error' : 'warning'}>
                  {storage.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Status Cards */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 dark:bg-slate-800/50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Health Score</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{storage.healthScore}%</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-slate-800/50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Capacity</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{storage.capacity} tons</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-slate-800/50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Products Stored</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{storage.productsStored} tons</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-slate-800/50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Sensors Installed</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{storage.sensors.length}</p>
                  </div>
                </div>

                {/* Environmental */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2">
                    <Thermometer className="h-4 w-4 text-blue-500" />
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Temperature</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{storage.temperature}°C</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Droplets className="h-4 w-4 text-cyan-500" />
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Humidity</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{storage.humidity}%</p>
                    </div>
                  </div>
                </div>

                {/* Power Source */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-slate-700">
                  <div className="flex items-center gap-2">
                    {getPowerSourceIcon(storage.powerSource)}
                    <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                      {storage.powerSource.replace('_', ' ')}
                    </span>
                  </div>
                  <StatusIndicator status="online" />
                </div>

                <Button variant="outline" className="w-full">View Details</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add Storage Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setSelectedStorageType(null);
          setNewStorage({ name: '', capacity: 1000, location: '', numRooms: 1 });
          setSelectedSensors([]);
        }}
        title="Add New Cold Storage"
        size="lg"
      >
        <div className="space-y-6">
          {!selectedStorageType ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Choose Storage Type</p>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setSelectedStorageType('cold_room')}
                  className="p-6 border-2 border-gray-200 dark:border-slate-700 rounded-lg hover:border-primary-500 dark:hover:border-primary-500 transition-colors text-left"
                >
                  <Box className="h-8 w-8 text-primary-500 mb-2" />
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">Cold Storage</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">For fruits, vegetables, and general produce</p>
                </button>
                <button
                  onClick={() => setSelectedStorageType('dairy_cold_storage')}
                  className="p-6 border-2 border-gray-200 dark:border-slate-700 rounded-lg hover:border-primary-500 dark:hover:border-primary-500 transition-colors text-left"
                >
                  <Droplets className="h-8 w-8 text-cyan-500 mb-2" />
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">Dairy Cold Storage</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">For milk, cheese, and dairy products</p>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Storage Name
                  </label>
                  <input
                    type="text"
                    value={newStorage.name}
                    onChange={(e) => setNewStorage({ ...newStorage, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Enter storage name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Location
                  </label>
                  <input
                    type="text"
                    value={newStorage.location}
                    onChange={(e) => setNewStorage({ ...newStorage, location: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Enter location"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Capacity (metric tons)
                  </label>
                  <input
                    type="number"
                    value={newStorage.capacity}
                    onChange={(e) => setNewStorage({ ...newStorage, capacity: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Enter capacity"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Number of Rooms
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={newStorage.numRooms}
                    onChange={(e) => setNewStorage({ ...newStorage, numRooms: Math.max(1, parseInt(e.target.value) || 1) })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Number of rooms"
                  />
                </div>
              </div>

              {/* Sensor Configuration */}
              <div className="border-t border-gray-200 dark:border-slate-700 pt-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">Sensor Configuration</h3>
                  <Button variant="outline" size="sm" onClick={handleAddSensor}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Sensor
                  </Button>
                </div>

                {selectedSensors.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                    No sensors added. Click "Add Sensor" to configure sensors.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {selectedSensors.map((sensor, index) => (
                      <div key={index} className="flex items-center gap-3 bg-gray-50 dark:bg-slate-800/50 rounded-lg p-3">
                        <select
                          value={sensor.type}
                          onChange={(e) => handleSensorTypeChange(index, e.target.value as AdminSensor['type'])}
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                          {sensorTypes.map((st) => (
                            <option key={st.type} value={st.type}>
                              {st.label}
                            </option>
                          ))}
                        </select>
                        <div className="flex items-center gap-2">
                          <label className="text-sm text-gray-600 dark:text-gray-400">Units:</label>
                          <input
                            type="number"
                            min="1"
                            value={sensor.units}
                            onChange={(e) => handleSensorUnitsChange(index, parseInt(e.target.value) || 1)}
                            className="w-16 px-2 py-1 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                          />
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => handleRemoveSensor(index)}>
                          ×
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedStorageType(null);
                    setNewStorage({ name: '', capacity: 1000, location: '', numRooms: 1 });
                    setSelectedSensors([]);
                  }}
                >
                  Back
                </Button>
                <Button variant="primary" onClick={handleAddStorage}>
                  Add Storage
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default ColdStorages;
