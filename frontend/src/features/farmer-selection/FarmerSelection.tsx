import React from 'react';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Thermometer, Droplets, AlertTriangle, CheckCircle, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';

const FarmerSelection: React.FC = () => {
  const navigate = useNavigate();
  const { setUser } = useAuthStore();

  const farmers = [
    {
      id: 'ram',
      name: 'Ram Patil',
      coldStorage: 'Nashik Cold Storage',
      health: 'green',
      healthScore: 94,
      temperature: -4.8,
      humidity: 79,
      storageId: 'cs-ram',
    },
  ];

  const handleSelectFarmer = (farmer: typeof farmers[0]) => {
    setUser({
      id: farmer.id,
      name: farmer.name,
      email: `${farmer.id.toLowerCase()}@example.com`,
      role: 'farmer',
      sites: [],
    });
    navigate('/');
  };

  const getHealthBadge = (health: string) => {
    switch (health) {
      case 'green':
        return <Badge variant="success">Good</Badge>;
      case 'yellow':
        return <Badge variant="warning">Warning</Badge>;
      case 'red':
        return <Badge variant="error">Critical</Badge>;
      default:
        return <Badge variant="info">{health}</Badge>;
    }
  };

  const getHealthIcon = (health: string) => {
    switch (health) {
      case 'green':
        return <CheckCircle className="h-6 w-6 text-green-500" />;
      case 'yellow':
        return <AlertTriangle className="h-6 w-6 text-yellow-500" />;
      case 'red':
        return <AlertTriangle className="h-6 w-6 text-red-500" />;
      default:
        return <AlertTriangle className="h-6 w-6 text-gray-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-accent-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-6">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Select Your Profile
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Choose your farmer profile to access your cold storage dashboard
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {farmers.map((farmer) => (
            <Card
              key={farmer.id}
              variant="default"
              className="hover:shadow-xl transition-all duration-300 cursor-pointer border-2 hover:border-primary-500 h-full"
              onClick={() => handleSelectFarmer(farmer)}
            >
              <CardContent className="p-6 h-full flex flex-col">
                <div className="flex flex-col items-center text-center flex-grow">
                  <div className="h-16 w-16 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mb-4">
                    <User className="h-8 w-8 text-primary-600 dark:text-primary-400" />
                  </div>
                  
                  <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">
                    {farmer.name}
                  </h3>
                  
                  <div className="flex items-center gap-2 mb-4">
                    {getHealthIcon(farmer.health)}
                    {getHealthBadge(farmer.health)}
                  </div>

                  <div className="w-full bg-gray-100 dark:bg-slate-800 rounded-lg p-3 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Thermometer className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {farmer.coldStorage}
                      </span>
                    </div>
                  </div>

                  <div className="w-full space-y-2 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Thermometer className="h-4 w-4 text-blue-500" />
                        <span className="text-gray-600 dark:text-gray-400">Temp</span>
                      </div>
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {farmer.temperature.toFixed(1)}°C
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Droplets className="h-4 w-4 text-cyan-500" />
                        <span className="text-gray-600 dark:text-gray-400">Humidity</span>
                      </div>
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {farmer.humidity}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                        <span className="text-gray-600 dark:text-gray-400">Health Score</span>
                      </div>
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {farmer.healthScore}/100
                      </span>
                    </div>
                  </div>

                  <Button variant="primary" className="w-full">
                    Select
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-6">
          <Button variant="outline" onClick={() => navigate('/role-selection')}>
            Back to Role Selection
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FarmerSelection;
