// Debug component to check if data exists in Supabase
import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export const DataDebug: React.FC = () => {
  const [debug, setDebug] = useState<any>(null);

  useEffect(() => {
    const checkData = async () => {
      try {
        // Check sensor_devices
        const { data: sensors, error: sensorsError } = await supabase
          .from('sensor_devices')
          .select('*')
          .limit(5);

        // Check cold_storage_conditions
        const { data: conditions, error: conditionsError } = await supabase
          .from('cold_storage_conditions')
          .select('*')
          .order('recorded_at', { ascending: false })
          .limit(5);

        // Check sensor_readings
        const { data: readings, error: readingsError } = await supabase
          .from('sensor_readings')
          .select('*')
          .order('recorded_at', { ascending: false })
          .limit(5);

        setDebug({
          sensors: { count: sensors?.length || 0, data: sensors, error: sensorsError },
          conditions: { count: conditions?.length || 0, data: conditions, error: conditionsError },
          readings: { count: readings?.length || 0, data: readings, error: readingsError }
        });
      } catch (err) {
        setDebug({ error: err });
      }
    };

    checkData();
  }, []);

  if (!debug) return <div>Loading...</div>;

  return (
    <div style={{ padding: '20px', backgroundColor: '#f5f5f5', borderRadius: '8px', fontFamily: 'monospace' }}>
      <h2>📊 Supabase Data Debug</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <h3>sensor_devices ({debug.sensors.count} records)</h3>
        {debug.sensors.error ? (
          <p style={{ color: 'red' }}>❌ Error: {JSON.stringify(debug.sensors.error)}</p>
        ) : (
          <pre style={{ backgroundColor: 'white', padding: '10px', overflow: 'auto', maxHeight: '200px' }}>
            {JSON.stringify(debug.sensors.data, null, 2)}
          </pre>
        )}
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>cold_storage_conditions ({debug.conditions.count} records)</h3>
        {debug.conditions.error ? (
          <p style={{ color: 'red' }}>❌ Error: {JSON.stringify(debug.conditions.error)}</p>
        ) : (
          <pre style={{ backgroundColor: 'white', padding: '10px', overflow: 'auto', maxHeight: '200px' }}>
            {JSON.stringify(debug.conditions.data, null, 2)}
          </pre>
        )}
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>sensor_readings ({debug.readings.count} records)</h3>
        {debug.readings.error ? (
          <p style={{ color: 'red' }}>❌ Error: {JSON.stringify(debug.readings.error)}</p>
        ) : (
          <pre style={{ backgroundColor: 'white', padding: '10px', overflow: 'auto', maxHeight: '200px' }}>
            {JSON.stringify(debug.readings.data, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
};
