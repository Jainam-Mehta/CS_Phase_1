import React from 'react';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Clock, Warehouse, RefreshCw, AlertCircle } from 'lucide-react';

interface WaitingForApprovalProps {
  onRefresh?: () => void;
  error?: string;
}

const WaitingForApproval: React.FC<WaitingForApprovalProps> = ({ onRefresh, error }) => {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card variant="default" className="max-w-2xl mx-auto">
        <CardContent className="p-12 text-center">
          <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock className="h-12 w-12 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">
            Waiting for Room Approval
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Your selected storage rooms are pending approval from the Owner. You will be notified once access is granted.
          </p>
          
          {error && (
            <div className="mb-6 flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}
          
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <Warehouse className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-left">
                <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                  What happens next?
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  The Owner will review your room request and approve access. Once approved, you'll be able to monitor your storage rooms in real-time.
                </p>
              </div>
            </div>
          </div>
          {onRefresh && (
            <Button
              variant="outline"
              onClick={onRefresh}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Check Status
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default WaitingForApproval;
