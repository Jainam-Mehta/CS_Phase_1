import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/useAuthStore';
import { useSiteStore } from '../../stores/useSiteStore';
import { FileText, Download, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';

interface ReportData {
  facilityName: string;
  generatedAt: string;
  // Sensors
  totalSensors: number;
  onlineSensors: number;
  offlineSensors: number;
  maintenanceSensors: number;
  sensorList: { name: string; type: string; status: string; lastReading: string }[];
  // Rooms
  totalRooms: number;
  totalCapacityKg: number;
  usedCapacityKg: number;
  utilizationPct: number;
  // Farmers
  uniqueFarmers: number;
  activeBatches: number;
  // Latest conditions
  latestTemp: string;
  latestHumidity: string;
  latestAmbientTemp: string;
  compressorHealth: string;
  // Energy
  energyKwh: number;
  solarPct: number;
  // Alerts
  recentAlerts: { message: string; severity: string; created_at: string }[];
}

const OwnerReport: React.FC = () => {
  const { user } = useAuthStore();
  const { selectedFacilityId } = useSiteStore();
  const [loading, setLoading] = useState(false);
  const [rooms, setRooms] = useState<any[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [siteName, setSiteName] = useState<string>('');

  const fetchReportData = async (): Promise<ReportData> => {
    // Fetch Site Name and Rooms
    const { data: siteData } = await supabase
      .from('sites')
      .select('facility_name')
      .eq('id', selectedFacilityId)
      .single();

    setSiteName(siteData?.facility_name || 'Cold Storage Site');

    // Fetch Rooms for selected facility
    const { data: rmData } = await supabase
      .from('cold_storage_rooms')
      .select('*')
      .eq('site_id', selectedFacilityId);

    const resolvedRooms = rmData || [];
    setRooms(resolvedRooms);

    // Set default room if not already selected
    if (resolvedRooms.length > 0 && !selectedRoomId) {
      setSelectedRoomId(resolvedRooms[0].id);
    }

    const roomToUse = selectedRoomId || (resolvedRooms.length > 0 ? resolvedRooms[0].id : null);

    // Rooms
    const { data: rooms } = await supabase
      .from('cold_storage_rooms')
      .select('*')
      .eq('site_id', selectedFacilityId);

    const roomIds = roomToUse ? [roomToUse] : [];
    const totalCapacityKg = (rooms || []).reduce((s: number, r: any) => s + (r.capacity_kg || 0), 0);
    const usedCapacityKg = (rooms || []).reduce((s: number, r: any) => s + (r.current_utilization_kg || 0), 0);

    // Sensors
    const { data: sensors } = await supabase
      .from('sensor_devices')
      .select('*')
      .in('room_id', roomIds.length ? roomIds : ['none']);

    const sensorList = (sensors || []).map((s: any) => ({
      name: s.sensor_name || s.sensor_type,
      type: s.sensor_type,
      status: s.status || 'Unknown',
      lastReading: s.last_reading_value != null
        ? `${s.last_reading_value} ${s.last_reading_unit || ''}`.trim()
        : 'No Data',
    }));

    const onlineSensors = sensorList.filter(s => s.status === 'Online').length;
    const offlineSensors = sensorList.filter(s => s.status === 'Offline').length;
    const maintenanceSensors = sensorList.filter(s => s.status === 'Maintenance').length;

    // Farmers / batches
    let uniqueFarmers = 0;
    let activeBatches = 0;
    if (roomIds.length) {
      const { data: allocations } = await supabase
        .from('batch_room_allocations')
        .select('*, batches(farmer_id)')
        .in('room_id', roomIds)
        .is('removed_at', null);
      activeBatches = (allocations || []).length;
      uniqueFarmers = new Set((allocations || []).map((a: any) => a.batches?.farmer_id).filter(Boolean)).size;
    }

    // Latest conditions
    let latestTemp = 'N/A';
    let latestHumidity = 'N/A';
    let latestAmbientTemp = 'N/A';
    let energyKwh = 0;
    let solarPct = 0;
    if (roomIds.length) {
      const { data: cond } = await supabase
        .from('cold_storage_conditions')
        .select('*')
        .in('room_id', roomIds)
        .order('recorded_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cond) {
        latestTemp = cond.temperature != null ? `${cond.temperature} °C` : 'N/A';
        latestHumidity = cond.humidity != null ? `${cond.humidity} %` : 'N/A';
        latestAmbientTemp = cond.ambient_temperature != null ? `${cond.ambient_temperature} °C` : 'N/A';
        energyKwh = cond.energy_consumption_kwh || 0;
        solarPct = cond.solar_percentage || 0;
      }
    }

    // Compressor health (simple score from conditions)
    const compressorHealth = latestTemp === 'N/A' ? 'Standby' : 'Optimal';

    // Recent alerts
    const { data: alerts } = await supabase
      .from('alerts')
      .select('message, severity, created_at')
      .eq('site_id', selectedFacilityId)
      .order('created_at', { ascending: false })
      .limit(5);

    return {
      facilityName: siteData?.facility_name || 'Cold Storage Site',
      generatedAt: new Date().toLocaleString('en-IN'),
      totalSensors: sensorList.length,
      onlineSensors,
      offlineSensors,
      maintenanceSensors,
      sensorList,
      totalRooms: (rooms || []).length,
      totalCapacityKg,
      usedCapacityKg,
      utilizationPct: totalCapacityKg > 0 ? Math.round((usedCapacityKg / totalCapacityKg) * 100) : 0,
      uniqueFarmers,
      activeBatches,
      latestTemp,
      latestHumidity,
      latestAmbientTemp,
      compressorHealth,
      energyKwh,
      solarPct,
      recentAlerts: (alerts || []).map((a: any) => ({
        message: a.message,
        severity: a.severity,
        created_at: new Date(a.created_at).toLocaleString('en-IN'),
      })),
    };
  };

  const generatePDF = async () => {
    if (!selectedFacilityId) {
      alert('Please select a facility first.');
      return;
    }

    setLoading(true);
    try {
      const data = await fetchReportData();
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      const pageW = 210;
      const margin = 15;
      const contentW = pageW - margin * 2;
      let y = 0;

      // ─── HELPER FUNCTIONS ────────────────────────────────────────────────────
      const addPage = () => { doc.addPage(); y = 20; };

      const checkY = (needed: number) => { if (y + needed > 275) addPage(); };

      const header = () => {
        // Blue header bar
        doc.setFillColor(37, 99, 235);
        doc.rect(0, 0, pageW, 28, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('ColdSense AI Platform', margin, 12);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('Facility Operations Report', margin, 19);
        doc.text(`Generated: ${data.generatedAt}`, pageW - margin, 19, { align: 'right' });
        y = 36;
      };

      const sectionTitle = (title: string) => {
        checkY(12);
        doc.setFillColor(241, 245, 249);
        doc.rect(margin, y, contentW, 8, 'F');
        doc.setTextColor(30, 64, 175);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(title.toUpperCase(), margin + 3, y + 5.5);
        y += 12;
      };

      const kpiRow = (items: { label: string; value: string; color?: [number, number, number] }[]) => {
        checkY(20);
        const colW = contentW / items.length;
        items.forEach((item, i) => {
          const x = margin + i * colW;
          doc.setFillColor(248, 250, 252);
          doc.roundedRect(x, y, colW - 2, 18, 2, 2, 'F');
          doc.setTextColor(100, 116, 139);
          doc.setFontSize(7.5);
          doc.setFont('helvetica', 'normal');
          doc.text(item.label, x + 3, y + 5);
          const [r, g, b] = item.color || [15, 23, 42];
          doc.setTextColor(r, g, b);
          doc.setFontSize(13);
          doc.setFont('helvetica', 'bold');
          doc.text(item.value, x + 3, y + 14);
        });
        y += 22;
      };

      const row2col = (left: string, right: string) => {
        checkY(7);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(51, 65, 85);
        doc.text(left, margin + 2, y);
        doc.text(right, margin + contentW / 2 + 2, y);
        y += 6;
      };

      const tableHeader = (cols: { label: string; w: number }[]) => {
        checkY(8);
        doc.setFillColor(37, 99, 235);
        doc.rect(margin, y, contentW, 7, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        let x = margin + 2;
        cols.forEach(col => { doc.text(col.label, x, y + 5); x += col.w; });
        y += 8;
      };

      const tableRow = (cells: string[], cols: { label: string; w: number }[], idx: number) => {
        checkY(7);
        doc.setFillColor(idx % 2 === 0 ? 248 : 255, idx % 2 === 0 ? 250 : 255, idx % 2 === 0 ? 252 : 255);
        doc.rect(margin, y, contentW, 6.5, 'F');
        doc.setTextColor(51, 65, 85);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        let x = margin + 2;
        cells.forEach((cell, i) => {
          const maxLen = Math.floor(cols[i].w / 2.2);
          const clipped = cell.length > maxLen ? cell.substring(0, maxLen - 1) + '…' : cell;
          doc.text(clipped, x, y + 4.5);
          x += cols[i].w;
        });
        y += 6.5;
      };

      const divider = () => {
        checkY(5);
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.3);
        doc.line(margin, y, margin + contentW, y);
        y += 4;
      };

      // ─── PAGE 1 ───────────────────────────────────────────────────────────────
      header();

      // Facility title
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(15);
      doc.setFont('helvetica', 'bold');
      doc.text(data.facilityName, margin, y);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(`Owner: ${user?.name || 'N/A'}  ·  Email: ${user?.email || 'N/A'}`, margin, y + 6);
      y += 14;

      divider();

      // ── SECTION 1: OVERVIEW KPIs ──
      sectionTitle('1. Facility Overview');
      kpiRow([
        { label: 'Total Sensors', value: String(data.totalSensors), color: [30, 64, 175] },
        { label: 'Online', value: String(data.onlineSensors), color: [5, 150, 105] },
        { label: 'Offline', value: String(data.offlineSensors), color: [220, 38, 38] },
        { label: 'Maintenance', value: String(data.maintenanceSensors), color: [217, 119, 6] },
      ]);
      kpiRow([
        { label: 'Total Rooms', value: String(data.totalRooms) },
        { label: 'Active Farmers', value: String(data.uniqueFarmers) },
        { label: 'Active Batches', value: String(data.activeBatches) },
        { label: 'Storage Used', value: `${data.utilizationPct}%`, color: [37, 99, 235] },
      ]);

      // ── SECTION 2: STORAGE ──
      sectionTitle('2. Storage Utilization');
      row2col(`Total Capacity:  ${(data.totalCapacityKg / 1000).toFixed(1)} tons (${data.totalCapacityKg.toLocaleString()} kg)`,
              `Used:  ${(data.usedCapacityKg / 1000).toFixed(1)} tons (${data.usedCapacityKg.toLocaleString()} kg)`);
      row2col(`Utilization:  ${data.utilizationPct}%`,
              `Available:  ${((data.totalCapacityKg - data.usedCapacityKg) / 1000).toFixed(1)} tons`);
      y += 2;

      // Utilization bar
      checkY(10);
      doc.setFillColor(226, 232, 240);
      doc.roundedRect(margin, y, contentW, 6, 3, 3, 'F');
      const barColor = data.utilizationPct > 85 ? [220, 38, 38] : data.utilizationPct > 60 ? [217, 119, 6] : [5, 150, 105];
      doc.setFillColor(...barColor as [number, number, number]);
      doc.roundedRect(margin, y, Math.max((contentW * data.utilizationPct) / 100, 2), 6, 3, 3, 'F');
      y += 10;

      // ── SECTION 3: LIVE CONDITIONS ──
      sectionTitle('3. Latest Sensor Conditions');
      kpiRow([
        { label: 'Internal Temperature', value: data.latestTemp, color: [220, 38, 38] },
        { label: 'Internal Humidity', value: data.latestHumidity, color: [37, 99, 235] },
        { label: 'Ambient Temperature', value: data.latestAmbientTemp, color: [217, 119, 6] },
        { label: 'Compressor Health', value: data.compressorHealth, color: [5, 150, 105] },
      ]);
      kpiRow([
        { label: 'Energy Consumption', value: `${data.energyKwh} kWh` },
        { label: 'Solar Generation', value: `${data.solarPct}%`, color: [217, 119, 6] },
        { label: 'Grid Power', value: `${100 - data.solarPct}%` },
        { label: 'System Status', value: data.offlineSensors === 0 ? 'Optimal' : 'Warning', color: data.offlineSensors === 0 ? [5, 150, 105] : [220, 38, 38] },
      ]);

      // ── SECTION 4: SENSOR TABLE ──
      sectionTitle('4. Sensor Inventory');
      const sensorCols = [
        { label: 'Sensor Name', w: 55 },
        { label: 'Type', w: 45 },
        { label: 'Status', w: 30 },
        { label: 'Last Reading', w: 50 },
      ];
      tableHeader(sensorCols);
      if (data.sensorList.length === 0) {
        checkY(8);
        doc.setTextColor(100, 116, 139);
        doc.setFontSize(9);
        doc.text('No sensors registered for this facility.', margin + 3, y + 5);
        y += 10;
      } else {
        data.sensorList.forEach((s, i) => {
          tableRow([s.name, s.type, s.status, s.lastReading], sensorCols, i);
        });
      }
      y += 4;

      // ── SECTION 5: ALERTS ──
      sectionTitle('5. Recent Alerts');
      if (data.recentAlerts.length === 0) {
        checkY(8);
        doc.setTextColor(5, 150, 105);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text('✓ No recent alerts. System operating normally.', margin + 3, y);
        y += 10;
      } else {
        const alertCols = [
          { label: 'Time', w: 45 },
          { label: 'Severity', w: 25 },
          { label: 'Message', w: 110 },
        ];
        tableHeader(alertCols);
        data.recentAlerts.forEach((a, i) => {
          tableRow([a.created_at, a.severity, a.message], alertCols, i);
        });
      }

      // ── FOOTER on each page ──
      const totalPages = (doc as any).internal.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        doc.setFillColor(241, 245, 249);
        doc.rect(0, 285, pageW, 12, 'F');
        doc.setTextColor(100, 116, 139);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text('ColdSense AI Platform – Confidential Report', margin, 291);
        doc.text(`Page ${p} of ${totalPages}`, pageW - margin, 291, { align: 'right' });
      }

      // Save PDF
      const fileName = `ColdSense_Report_${data.facilityName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
      doc.save(fileName);
    } catch (err) {
      console.error('Report generation failed:', err);
      alert('Failed to generate report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={generatePDF}
      disabled={loading || !selectedFacilityId}
      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors text-sm shadow-sm"
    >
      {loading ? (
        <><Loader2 className="w-4 h-4 animate-spin" /> Generating PDF...</>
      ) : (
        <><Download className="w-4 h-4" /> Download Report</>
      )}
    </button>
  );
};

export default OwnerReport;
