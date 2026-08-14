import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './Card';
import { Thermometer } from 'lucide-react';

interface AmbientTemperatureCardProps {
  value?: number;
}

const AmbientTemperatureCard: React.FC<AmbientTemperatureCardProps> = ({ value }) => {
  const [ambientTemp, setAmbientTemp] = useState(value || 0);

  useEffect(() => {
    const updateAmbientTemp = () => {
      // Calculate ambient temperature - random between 24-34°C
      const randomTemp = 24 + Math.random() * 10;
      setAmbientTemp(randomTemp);
    };

    updateAmbientTemp();
    
    // Update every minute
    const interval = setInterval(updateAmbientTemp, 60000);
    
    return () => clearInterval(interval);
  }, [value]);

  return (
    <Card variant="default">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-medium text-gray-500 dark:text-gray-400">
            Ambient Temp
          </CardTitle>
          <div className="h-8 w-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
            <Thermometer className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
          {ambientTemp.toFixed(1)}°C
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          <span className="text-gray-600 dark:text-gray-400">Outside temperature</span>
        </p>
      </CardContent>
    </Card>
  );
};

export default AmbientTemperatureCard;
