import React, { useState } from 'react';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import RupeeIcon from '../../components/icons/RupeeIcon';
import { FileText, Search, Download, Calendar, File, Package, Zap, Wrench, Heart, Activity } from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import { useAdminStorageStore } from '../../stores/useAdminStorageStore';
import jsPDF from 'jspdf';

const Reports: React.FC = () => {
  const { user } = useAuthStore();
  const { storages } = useAdminStorageStore();
  const [searchQuery, setSearchQuery] = useState('');

  const isFarmer = user?.role === 'farmer';

  // No demo data - will load from Supabase
  const reports: any[] = [];
  const inventory: any[] = [];
  const farmerStorage: any = null;
  const farmerInventory: any[] = [];

  const filteredReports = reports.filter((report) =>
    report.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    report.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleGenerateReport = () => {
    // Report generation will be implemented with Supabase integration
    console.log('Report generation will be implemented with Supabase');
  };

  const handleDownloadPDF = () => {
    // Generate PDF content using jsPDF
    const doc = new jsPDF();

    // Company Logo (placeholder)
    doc.setFontSize(24);
    doc.setTextColor(0, 102, 204);
    doc.text('ColdSense AI', 105, 20, { align: 'center' });
    
    // Report Title
    doc.setFontSize(18);
    doc.setTextColor(0, 0, 0);
    doc.text('Monthly Storage Report', 105, 35, { align: 'center' });

    // Report Date
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 105, 42, { align: 'center' });

    // Farmer Information
    if (isFarmer && farmerStorage) {
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text('Farmer Information', 20, 55);
      
      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60);
      doc.text(`Name: ${user?.name}`, 20, 65);
      doc.text(`Storage: ${farmerStorage.name}`, 20, 72);
      doc.text(`Location: ${farmerStorage.location}`, 20, 79);

      // Revenue Section
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text('Revenue Summary', 20, 95);

      const totalRevenue = farmerInventory.reduce((sum, inv) => sum + (inv.quantity * (inv.sellingPrice || 0)), 0);
      const profit = totalRevenue * 0.15;

      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60);
      doc.text(`Total Revenue: ₹${totalRevenue.toLocaleString()}`, 20, 105);
      doc.text(`Estimated Profit: ₹${profit.toLocaleString()} (15%)`, 20, 112);
      doc.text(`Profit Margin: 15%`, 20, 119);

      // Products Sold
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text('Products in Storage', 20, 135);

      doc.setFontSize(9);
      doc.setTextColor(60, 60, 60);
      let yPos = 145;
      farmerInventory.forEach((inv) => {
        const value = inv.quantity * (inv.sellingPrice || 0);
        doc.text(`${inv.productName}: ${inv.quantity}kg × ₹${inv.sellingPrice || 0} = ₹${value.toLocaleString()}`, 20, yPos);
        yPos += 7;
      });

      // Inventory Summary
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text('Inventory Summary', 20, yPos + 10);

      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60);
      doc.text(`Total Products: ${farmerInventory.length}`, 20, yPos + 20);
      doc.text(`Total Quantity: ${farmerInventory.reduce((sum, inv) => sum + inv.quantity, 0)}kg`, 20, yPos + 27);
      
      const avgShelfLife = farmerInventory.reduce((sum, inv) => sum + (inv.shelfLife || 0), 0) / (farmerInventory.length || 1);
      doc.text(`Average Shelf Life: ${avgShelfLife.toFixed(0)} days`, 20, yPos + 34);

      // Storage Health
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text('Storage Health', 20, yPos + 50);

      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60);
      doc.text(`Temperature: ${farmerStorage.temperature}°C`, 20, yPos + 60);
      doc.text(`Humidity: ${farmerStorage.humidity}%`, 20, yPos + 67);
      doc.text(`Health Score: ${farmerStorage.healthScore || 85}/100`, 20, yPos + 74);
      doc.text(`Capacity Utilization: ${((farmerStorage.currentLoad / farmerStorage.capacity) * 100).toFixed(0)}%`, 20, yPos + 81);

      // Simple Chart Representation
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text('Revenue Distribution', 20, yPos + 97);

      // Draw simple bar chart
      const chartY = yPos + 107;
      const barWidth = 30;
      const barSpacing = 15;
      const maxBarHeight = 40;
      const maxValue = Math.max(...farmerInventory.map(inv => inv.quantity * (inv.sellingPrice || 0)));

      farmerInventory.slice(0, 4).forEach((inv, index) => {
        const value = inv.quantity * (inv.sellingPrice || 0);
        const barHeight = (value / maxValue) * maxBarHeight;
        const x = 20 + index * (barWidth + barSpacing);
        
        // Draw bar
        doc.setFillColor(0, 102, 204);
        doc.rect(x, chartY + maxBarHeight - barHeight, barWidth, barHeight, 'F');
        
        // Draw label
        doc.setFontSize(7);
        doc.setTextColor(60, 60, 60);
        doc.text(inv.productName.substring(0, 8), x, chartY + maxBarHeight + 5, { align: 'center' });
        doc.text(`₹${(value / 1000).toFixed(0)}k`, x, chartY + maxBarHeight + 12, { align: 'center' });
      });

      // Footer
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text('Generated by ColdSense AI - Smart Cold Storage Management', 105, 280, { align: 'center' });
    } else {
      // Admin report
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text('System Overview', 20, 55);
      
      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60);
      doc.text(`Total Storages: ${storages.length}`, 20, 65);
      doc.text(`Total Inventory Items: ${inventory.length}`, 20, 72);
      doc.text(`Total Reports Generated: ${reports.length}`, 20, 79);
    }

    // Save PDF
    doc.save(`ColdSense_Report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleDownload = () => {
    // Generate PDF instead of CSV
    handleDownloadPDF();
  };

  // Report cards for admin
  const reportCards = [
    {
      id: 'inventory',
      title: 'Inventory Report',
      description: 'Complete inventory overview with stock levels, expiry dates, and valuation',
      icon: Package,
      color: 'blue',
      lastGenerated: '2 days ago',
      records: 0,
    },
    {
      id: 'revenue',
      title: 'Revenue Report',
      description: 'Financial summary including income, expenses, and profit analysis',
      icon: RupeeIcon,
      color: 'green',
      lastGenerated: '1 day ago',
      records: 24,
    },
    {
      id: 'energy',
      title: 'Energy Report',
      description: 'Energy consumption patterns, solar generation, and cost analysis',
      icon: Zap,
      color: 'yellow',
      lastGenerated: '3 days ago',
      records: 18,
    },
    {
      id: 'maintenance',
      title: 'Maintenance Report',
      description: 'Equipment status, maintenance schedules, and service history',
      icon: Wrench,
      color: 'orange',
      lastGenerated: '5 days ago',
      records: 12,
    },
    {
      id: 'quality',
      title: 'Quality Report',
      description: 'Product quality inspections, compliance scores, and health metrics',
      icon: Heart,
      color: 'red',
      lastGenerated: '1 week ago',
      records: 36,
    },
    {
      id: 'sensor',
      title: 'Sensor Report',
      description: 'Sensor performance data, calibration status, and health indicators',
      icon: Activity,
      color: 'purple',
      lastGenerated: '4 days ago',
      records: storages.reduce((sum, s) => sum + s.sensors.length, 0),
    },
  ];

  const colorMap: Record<string, string> = {
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    green: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
    yellow: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400',
    orange: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
    red: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
    purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
  };

  if (!isFarmer) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Reports
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Generate and download comprehensive reports
            </p>
          </div>
          <Button variant="primary" onClick={handleGenerateReport}>Generate New Report</Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search reports..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* Report Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reportCards.map((card) => {
            const Icon = card.icon;
            return (
              <Card key={card.id} variant="default" className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`h-12 w-12 rounded-lg ${colorMap[card.color]} flex items-center justify-center`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <Badge variant="info" size="sm">{card.records} records</Badge>
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">{card.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{card.description}</p>
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>Last generated: {card.lastGenerated}</span>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full mt-4"
                    onClick={() => handleDownload()}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Recent Reports */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Recent Reports</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredReports.slice(0, 6).map((report) => (
              <Card key={report.id} variant="default" className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="h-12 w-12 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                      <File className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                    </div>
                    <Badge variant={report.status === 'completed' ? 'success' : 'warning'}>
                      {report.status}
                    </Badge>
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">{report.name}</h3>
                  <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      <span className="capitalize">{report.type}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>{new Date(report.generatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full mt-4"
                    onClick={() => handleDownload()}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download PDF
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Reports
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Generate and view reports
          </p>
        </div>
        <Button variant="primary" onClick={handleGenerateReport}>Generate Report</Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search reports..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card variant="default">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Reports</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{reports.length}</p>
              </div>
              <FileText className="h-8 w-8 text-primary-500" />
            </div>
          </CardContent>
        </Card>
        <Card variant="default">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Completed</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {reports.filter((r) => r.status === 'completed').length}
                </p>
              </div>
              <Badge variant="success">Completed</Badge>
            </div>
          </CardContent>
        </Card>
        <Card variant="default">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Monthly</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {reports.filter((r) => r.period === 'monthly').length}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card variant="default">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Weekly</p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {reports.filter((r) => r.period === 'weekly').length}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredReports.map((report) => (
          <Card key={report.id} variant="default" className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="h-12 w-12 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                  <File className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                </div>
                <Badge variant={report.status === 'completed' ? 'success' : 'warning'}>
                  {report.status}
                </Badge>
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">{report.name}</h3>
              <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span className="capitalize">{report.type}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>{new Date(report.generatedAt).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>Storage: {report.storageId}</span>
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full mt-4"
                onClick={() => handleDownload()}
              >
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Reports;
