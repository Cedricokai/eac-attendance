import React, { useState, useEffect, useCallback } from 'react';

function BiometricStatus() {
  const [biometricEvents, setBiometricEvents] = useState([]);
  const [showPanel, setShowPanel] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [retryingEventId, setRetryingEventId] = useState(null);

  const getApiBaseUrl = () => {
    const hostname = window.location.hostname;
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return "http://localhost:8080";
    }
    if (hostname.startsWith("192.168.")) {
      return import.meta.env.VITE_API_BASE_URL_LOCAL;
    }
    if (hostname === "100.114.178.13") {
      return import.meta.env.VITE_API_BASE_URL_PUBLIC;
    }
    return import.meta.env.VITE_API_BASE_URL_PUBLIC;
  };

  const API_BASE_URL = getApiBaseUrl();

  const getToken = () => {
    return localStorage.getItem('jwtToken');
  };

  const fetchBiometricAttempts = useCallback(async () => {
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/ONEPASS/recent-attempts`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        
        const currentEventIds = new Set(biometricEvents.map(e => e.id));
        const newEvents = data.filter(event => !currentEventIds.has(event.id));
        
        if (newEvents.length > 0) {
          setBiometricEvents(prev => [...newEvents, ...prev].slice(0, 200));
          if (!showPanel) {
            setUnreadCount(prev => prev + newEvents.length);
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch biometric status:', error);
    }
  }, [biometricEvents, showPanel]);

  useEffect(() => {
    fetchBiometricAttempts();
    const interval = setInterval(fetchBiometricAttempts, 5000);
    return () => clearInterval(interval);
  }, [fetchBiometricAttempts]);

  // NEW: Function to retry a failed biometric record with a selected employee name
  const retryWithEmployee = async (event, selectedEmployeeName) => {
    setRetryingEventId(event.id);
    
    try {
      const token = getToken();
      
      // Create a retry payload with the selected employee name
      const retryPayload = {
        originalEventId: event.id,
        originalTimestamp: event.deviceTimestamp || event.timestamp,
        originalAction: event.action,
        selectedEmployeeName: selectedEmployeeName,
        deviceName: event.deviceName,
        signType: event.signType
      };
      
      const response = await fetch(`${API_BASE_URL}/ONEPASS/retry-attempt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(retryPayload)
      });
      
      if (response.ok) {
        const result = await response.json();
        
        // Update the event status to success
        setBiometricEvents(prev => prev.map(e => 
          e.id === event.id 
            ? { 
                ...e, 
                status: 'success', 
                employeeDbName: selectedEmployeeName,
                employeeCode: result.employeeCode,
                retried: true 
              } 
            : e
        ));
        
        // Show success message
        alert(`✅ Successfully recorded attendance for ${selectedEmployeeName}`);
        
        // Refresh the page to show new attendance record
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        const error = await response.json();
        alert(`❌ Failed to record: ${error.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Retry failed:', error);
      alert('Failed to retry. Please try again or contact support.');
    } finally {
      setRetryingEventId(null);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success': return 'bg-green-50 border-green-200 hover:bg-green-100';
      case 'error': return 'bg-red-50 border-red-200 hover:bg-red-100';
      default: return 'bg-gray-50 border-gray-200 hover:bg-gray-100';
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'success': return 'bg-green-100 text-green-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return (
          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5 text-yellow-600 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return 'N/A';
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch (e) {
      return timestamp;
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    try {
      const date = new Date(timestamp);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      if (date.toDateString() === today.toDateString()) {
        return 'Today';
      } else if (date.toDateString() === yesterday.toDateString()) {
        return 'Yesterday';
      } else {
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
      }
    } catch (e) {
      return 'N/A';
    }
  };

  const formatDateTime = (timestamp) => {
    if (!timestamp) return 'N/A';
    try {
      const date = new Date(timestamp);
      return date.toLocaleString([], { 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (e) {
      return timestamp;
    }
  };

  const getFilteredEvents = () => {
    let filtered = biometricEvents;
    
    if (filterStatus !== 'all') {
      filtered = filtered.filter(event => event.status === filterStatus);
    }
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(event => 
        (event.employeeDbName || event.deviceName || '').toLowerCase().includes(term) ||
        (event.errorMessage || '').toLowerCase().includes(term) ||
        (event.action || '').toLowerCase().includes(term)
      );
    }
    
    return filtered;
  };

  const getStatistics = () => {
    const total = biometricEvents.length;
    const success = biometricEvents.filter(e => e.status === 'success').length;
    const error = biometricEvents.filter(e => e.status === 'error').length;
    const today = biometricEvents.filter(e => {
      if (!e.timestamp) return false;
      const eventDate = new Date(e.timestamp).toDateString();
      const todayDate = new Date().toDateString();
      return eventDate === todayDate;
    }).length;
    
    return { total, success, error, today };
  };

  const stats = getStatistics();
  const filteredEvents = getFilteredEvents();

  // Compact View Component
  const CompactView = () => (
    <div className="max-h-96 overflow-y-auto">
      {isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-sm text-gray-500 mt-2">Loading...</p>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="text-center py-8">
          <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-sm text-gray-500">No biometric events yet</p>
          <p className="text-xs text-gray-400 mt-1">Waiting for device activity...</p>
        </div>
      ) : (
        filteredEvents.slice(0, 10).map((event) => (
          <div 
            key={event.id} 
            className={`border-b border-gray-100 last:border-b-0 p-3 hover:bg-gray-50 transition-colors ${getStatusColor(event.status)}`}
          >
            <div className="flex gap-3">
              <div className="flex-shrink-0">
                {getStatusIcon(event.status)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {event.employeeDbName || event.deviceName || 'Unknown Employee'}
                  </p>
                  <div className="text-right ml-2">
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      {formatTime(event.timestamp)}
                    </span>
                    <span className="text-xs text-gray-400 ml-1">
                      ({formatDate(event.timestamp)})
                    </span>
                  </div>
                </div>
                
                <div className="mt-1 flex flex-wrap gap-2">
                  <span className="text-xs text-gray-500">
                    Action: <span className="font-medium text-gray-700">{event.action || 'Unknown'}</span>
                  </span>
                  {event.signType && (
                    <span className="text-xs text-gray-500">
                      Type: <span className="font-medium text-gray-700">{event.signType}</span>
                    </span>
                  )}
                </div>
                
                {event.status === 'error' && (
                  <div className="mt-2 p-2 bg-red-50 rounded text-xs text-red-700">
                    <span className="font-medium">❌ Error:</span> {event.errorMessage}
                    {event.suggestedNames && event.suggestedNames.length > 0 && (
                      <div className="mt-2 pt-1 border-t border-red-200">
                        <span className="font-medium text-xs">💡 Click a name to retry:</span>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {event.suggestedNames.slice(0, 3).map((name, idx) => (
                            <button
                              key={idx}
                              onClick={() => retryWithEmployee(event, name)}
                              disabled={retryingEventId === event.id}
                              className="px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {retryingEventId === event.id ? 'Processing...' : name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {event.status === 'success' && (
                  <div className="mt-1 text-xs text-green-600">
                    ✓ Recorded successfully
                    {event.employeeCode && (
                      <span className="ml-2 text-gray-400">(ID: {event.employeeCode})</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))
      )}
      {filteredEvents.length > 10 && (
        <div className="p-3 text-center border-t border-gray-100">
          <p className="text-xs text-gray-500">
            + {filteredEvents.length - 10} more events. Click "Expand View" to see all.
          </p>
        </div>
      )}
    </div>
  );

  // Expanded View Component
  const ExpandedView = () => (
    <div className="flex flex-col h-full">
      {/* Statistics Cards */}
      <div className="grid grid-cols-4 gap-3 p-4 bg-gray-50 border-b border-gray-200">
        <div className="bg-white rounded-lg p-3 text-center shadow-sm">
          <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
          <div className="text-xs text-gray-500">Total Events</div>
        </div>
        <div className="bg-white rounded-lg p-3 text-center shadow-sm">
          <div className="text-2xl font-bold text-green-600">{stats.success}</div>
          <div className="text-xs text-gray-500">Successful</div>
        </div>
        <div className="bg-white rounded-lg p-3 text-center shadow-sm">
          <div className="text-2xl font-bold text-red-600">{stats.error}</div>
          <div className="text-xs text-gray-500">Failed</div>
        </div>
        <div className="bg-white rounded-lg p-3 text-center shadow-sm">
          <div className="text-2xl font-bold text-purple-600">{stats.today}</div>
          <div className="text-xs text-gray-500">Today</div>
        </div>
      </div>

      {/* Filters */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by employee name or error..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterStatus === 'all' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterStatus('success')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterStatus === 'success' 
                  ? 'bg-green-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Success
            </button>
            <button
              onClick={() => setFilterStatus('error')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterStatus === 'error' 
                  ? 'bg-red-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Errors
            </button>
          </div>
        </div>
      </div>

      {/* Events Table */}
      <div className="flex-1 overflow-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details / Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredEvents.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                  No events found matching your criteria
                </td>
              </tr>
            ) : (
              filteredEvents.map((event) => (
                <tr key={event.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(event.status)}`}>
                      {event.status === 'success' ? 'Success' : event.status === 'error' ? 'Error' : 'Pending'}
                    </span>
                   </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {event.employeeDbName || event.deviceName || 'Unknown'}
                    </div>
                    {event.employeeCode && (
                      <div className="text-xs text-gray-500">ID: {event.employeeCode}</div>
                    )}
                   </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-sm text-gray-600">{event.action || 'Unknown'}</span>
                    {event.signType && (
                      <div className="text-xs text-gray-400">{event.signType}</div>
                    )}
                   </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    {formatTime(event.timestamp)}
                   </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(event.timestamp)}
                   </td>
                  <td className="px-4 py-3">
                    {event.status === 'error' ? (
                      <div>
                        <div className="text-xs text-red-600 mb-2">
                          {event.errorMessage}
                        </div>
                        {event.suggestedNames && event.suggestedNames.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {event.suggestedNames.map((name, idx) => (
                              <button
                                key={idx}
                                onClick={() => retryWithEmployee(event, name)}
                                disabled={retryingEventId === event.id}
                                className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {retryingEventId === event.id ? 'Processing...' : `Use: ${name}`}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs text-green-600">
                        ✓ Recorded successfully
                      </div>
                    )}
                   </td>
                 </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
        <div className="text-xs text-gray-500">
          Last updated: {new Date().toLocaleTimeString()}
        </div>
        <button
          onClick={async () => {
            if (await window.appConfirm('Clear all biometric event history?')) {
              setBiometricEvents([]);
              setUnreadCount(0);
            }
          }}
          className="px-3 py-1.5 text-sm text-red-600 hover:text-red-700 font-medium"
        >
          Clear All History
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Notification Button */}
      <button
        onClick={() => {
          setShowPanel(!showPanel);
          if (showPanel) {
            setUnreadCount(0);
          }
        }}
        className="relative bg-blue-600 hover:bg-blue-700 text-white rounded-full p-3 shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Status Panel */}
      {showPanel && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowPanel(false)}
          />
          <div 
            className={`absolute bottom-16 right-0 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-50 transition-all duration-300 ${
              isExpanded ? 'w-[900px] h-[650px]' : 'w-96'
            }`}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3 flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-white">Biometric Device Status</h3>
                <p className="text-xs text-blue-100">Real-time attendance tracking</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-white hover:text-blue-200 transition-colors"
                  title={isExpanded ? "Collapse" : "Expand"}
                >
                  {isExpanded ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5L3 5 3 11M21 5L15 5M15 19L21 19 21 13M3 19L9 19" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                  )}
                </button>
                <button
                  onClick={() => setShowPanel(false)}
                  className="text-white hover:text-blue-200 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Body */}
            {isExpanded ? <ExpandedView /> : <CompactView />}
          </div>
        </>
      )}
    </div>
  );
}

export default BiometricStatus;
