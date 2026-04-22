// SyncControlPanel.jsx
import React, { useState } from 'react';
import { RefreshCw, Calendar, AlertCircle, Check } from 'lucide-react';

function SyncControlPanel({ onSync, onSyncComplete }) {
  const [syncDirection, setSyncDirection] = useState('both');
  const [dateRange, setDateRange] = useState({
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [syncHistory, setSyncHistory] = useState([]);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const result = await onSync(dateRange, syncDirection);
      setSyncResult(result);
      
      setSyncHistory(prev => [{
        id: Date.now(),
        timestamp: new Date().toISOString(),
        direction: syncDirection,
        dateRange,
        result: result
      }, ...prev.slice(0, 9)]);
      
      onSyncComplete?.(result);
    } catch (error) {
      setSyncResult({ error: error.message });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <RefreshCw size={20} />
          Attendance ↔ Timesheet Sync
        </h3>
        <div className="text-sm text-gray-500">
          Last sync: {syncHistory[0]?.timestamp ? new Date(syncHistory[0].timestamp).toLocaleString() : 'Never'}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Sync Direction</label>
          <select
            value={syncDirection}
            onChange={(e) => setSyncDirection(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="attendanceToTimesheet">Attendance → Timesheet</option>
            <option value="timesheetToAttendance">Timesheet → Attendance</option>
            <option value="both">Two-way Sync</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
      </div>

      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-gray-600">
          {syncDirection === 'both' && 'Will sync records in both directions'}
          {syncDirection === 'attendanceToTimesheet' && 'Will convert attendance to timesheet'}
          {syncDirection === 'timesheetToAttendance' && 'Will convert timesheet to attendance'}
        </div>
        
        <button
          onClick={handleSync}
          disabled={isSyncing}
          className={`px-6 py-2 rounded-lg font-medium flex items-center gap-2 ${
            isSyncing
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {isSyncing ? (
            <>
              <RefreshCw size={16} className="animate-spin" />
              Syncing...
            </>
          ) : (
            <>
              <RefreshCw size={16} />
              Start Sync
            </>
          )}
        </button>
      </div>

      {syncResult && (
        <div className={`p-4 rounded-lg mb-4 ${
          syncResult.error 
            ? 'bg-red-50 border border-red-200' 
            : 'bg-green-50 border border-green-200'
        }`}>
          <div className="flex items-start gap-3">
            {syncResult.error ? (
              <AlertCircle className="text-red-500 mt-1" size={20} />
            ) : (
              <Check className="text-green-500 mt-1" size={20} />
            )}
            <div>
              <h4 className="font-medium">
                {syncResult.error ? 'Sync Failed' : 'Sync Completed'}
              </h4>
              <p className="text-sm mt-1">
                {syncResult.error || 'Data synchronized successfully'}
              </p>
            </div>
          </div>
        </div>
      )}

      {syncHistory.length > 0 && (
        <div className="border-t pt-4">
          <h4 className="font-medium text-gray-700 mb-2">Recent Sync History</h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {syncHistory.map((item) => (
              <div key={item.id} className="text-sm p-2 bg-gray-50 rounded">
                <div className="flex justify-between">
                  <span>{new Date(item.timestamp).toLocaleString()}</span>
                  <span className={`px-2 py-1 rounded text-xs ${
                    item.direction === 'attendanceToTimesheet' 
                      ? 'bg-blue-100 text-blue-800'
                      : item.direction === 'timesheetToAttendance'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-purple-100 text-purple-800'
                  }`}>
                    {item.direction}
                  </span>
                </div>
                <div className="text-gray-500">
                  {item.dateRange.start} to {item.dateRange.end}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default SyncControlPanel;