import React, { useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Award, CheckCircle, AlertTriangle, Heart, TrendingDown, FileCheck } from 'lucide-react';

const ProductQuality: React.FC = () => {
  const qualityData = [
    { product: 'Potato', grade: 'A', inspection: '2024-01-15', inspector: 'Dr. Sharma', issues: 0, status: 'passed', healthScore: 95, spoilageRisk: 5, compliance: 98 },
    { product: 'Paneer', grade: 'A', inspection: '2024-01-14', inspector: 'Dr. Patel', issues: 0, status: 'passed', healthScore: 92, spoilageRisk: 8, compliance: 97 },
    { product: 'Tomato', grade: 'B', inspection: '2024-01-13', inspector: 'Dr. Singh', issues: 2, status: 'warning', healthScore: 78, spoilageRisk: 22, compliance: 85 },
    { product: 'Apple', grade: 'A', inspection: '2024-01-12', inspector: 'Dr. Kumar', issues: 0, status: 'passed', healthScore: 88, spoilageRisk: 12, compliance: 94 },
    { product: 'Mango', grade: 'A', inspection: '2024-01-11', inspector: 'Dr. Verma', issues: 1, status: 'passed', healthScore: 90, spoilageRisk: 10, compliance: 96 },
    { product: 'Milk', grade: 'A', inspection: '2024-01-10', inspector: 'Dr. Gupta', issues: 0, status: 'passed', healthScore: 94, spoilageRisk: 6, compliance: 99 },
  ];

  // Calculate KPIs from quality data
  const kpis = useMemo(() => {
    const totalInspections = qualityData.length;
    const passedInspections = qualityData.filter((q) => q.status === 'passed').length;
    const warningInspections = qualityData.filter((q) => q.status === 'warning').length;
    
    const avgHealthScore = qualityData.reduce((sum, q) => sum + q.healthScore, 0) / qualityData.length;
    const avgSpoilageRisk = qualityData.reduce((sum, q) => sum + q.spoilageRisk, 0) / qualityData.length;
    const avgCompliance = qualityData.reduce((sum, q) => sum + q.compliance, 0) / qualityData.length;
    
    const gradeA = qualityData.filter((q) => q.grade === 'A').length;
    const gradeB = qualityData.filter((q) => q.grade === 'B').length;
    
    return {
      totalInspections,
      passedInspections,
      warningInspections,
      avgHealthScore,
      avgSpoilageRisk,
      avgCompliance,
      gradeA,
      gradeB,
    };
  }, [qualityData]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Product Quality
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Monitor and maintain product quality standards
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card variant="default">
          <CardContent className="p-4">
            <div className="flex flex-col items-center">
              <Heart className="h-6 w-6 text-red-500 mb-2" />
              <p className="text-xs text-gray-500 dark:text-gray-400">Health Score</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{kpis.avgHealthScore.toFixed(0)}%</p>
            </div>
          </CardContent>
        </Card>
        <Card variant="default">
          <CardContent className="p-4">
            <div className="flex flex-col items-center">
              <TrendingDown className="h-6 w-6 text-orange-500 mb-2" />
              <p className="text-xs text-gray-500 dark:text-gray-400">Spoilage Risk</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{kpis.avgSpoilageRisk.toFixed(0)}%</p>
            </div>
          </CardContent>
        </Card>
        <Card variant="default">
          <CardContent className="p-4">
            <div className="flex flex-col items-center">
              <FileCheck className="h-6 w-6 text-green-500 mb-2" />
              <p className="text-xs text-gray-500 dark:text-gray-400">Compliance</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{kpis.avgCompliance.toFixed(0)}%</p>
            </div>
          </CardContent>
        </Card>
        <Card variant="default">
          <CardContent className="p-4">
            <div className="flex flex-col items-center">
              <Award className="h-6 w-6 text-blue-500 mb-2" />
              <p className="text-xs text-gray-500 dark:text-gray-400">Grade A</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{kpis.gradeA}</p>
            </div>
          </CardContent>
        </Card>
        <Card variant="default">
          <CardContent className="p-4">
            <div className="flex flex-col items-center">
              <CheckCircle className="h-6 w-6 text-green-500 mb-2" />
              <p className="text-xs text-gray-500 dark:text-gray-400">Passed</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{kpis.passedInspections}</p>
            </div>
          </CardContent>
        </Card>
        <Card variant="default">
          <CardContent className="p-4">
            <div className="flex flex-col items-center">
              <AlertTriangle className="h-6 w-6 text-yellow-500 mb-2" />
              <p className="text-xs text-gray-500 dark:text-gray-400">Warnings</p>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{kpis.warningInspections}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quality Table */}
      <Card variant="default">
        <CardHeader>
          <CardTitle>Recent Quality Inspections</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-slate-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Grade</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Health Score</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Spoilage Risk</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Compliance</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Inspector</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                {qualityData.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-slate-800/50">
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100">{item.product}</td>
                    <td className="px-6 py-4">
                      <Badge variant={item.grade === 'A' ? 'success' : 'warning'}>{item.grade}</Badge>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`font-bold ${item.healthScore >= 90 ? 'text-green-600' : item.healthScore >= 80 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {item.healthScore}%
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`font-bold ${item.spoilageRisk <= 10 ? 'text-green-600' : item.spoilageRisk <= 20 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {item.spoilageRisk}%
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`font-bold ${item.compliance >= 95 ? 'text-green-600' : item.compliance >= 90 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {item.compliance}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-900 dark:text-gray-100">{item.inspector}</td>
                    <td className="px-6 py-4 text-gray-900 dark:text-gray-100">{item.inspection}</td>
                    <td className="px-6 py-4">
                      <Badge variant={item.status === 'passed' ? 'success' : 'warning'}>{item.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductQuality;
