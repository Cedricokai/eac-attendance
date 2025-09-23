import React from 'react';
import { Bell, Check, X } from 'lucide-react';

const NotificationCenter = ({ open, onClose }) => {
  if (!open) return null;

  // Mock notifications - replace with real data
  const notifications = [
    { id: 1, title: 'New attendance record', message: 'John Doe checked in at 8:30 AM', read: false },
    { id: 2, title: 'Leave request', message: 'Jane Smith requested leave for tomorrow', read: true },
    { id: 3, title: 'System update', message: 'New version available (v2.1.0)', read: false }
  ];

  return (
    <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg z-50">
      <div className="p-4 border-b border-gray-200 flex justify-between items-center">
        <h3 className="font-medium">Notifications</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
          <X size={18} />
        </button>
      </div>
      
      <div className="max-h-96 overflow-y-auto">
        {notifications.map((notification) => (
          <div 
            key={notification.id} 
            className={`p-4 border-b border-gray-100 ${!notification.read ? 'bg-blue-50' : ''}`}
          >
            <div className="flex justify-between">
              <h4 className="font-medium text-sm">{notification.title}</h4>
              {!notification.read && (
                <span className="h-2 w-2 rounded-full bg-blue-500"></span>
              )}
            </div>
            <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
            <div className="flex justify-end mt-2">
              <button className="text-xs text-blue-600 hover:text-blue-800 flex items-center">
                <Check size={14} className="mr-1" /> Mark as read
              </button>
            </div>
          </div>
        ))}
      </div>
      
      <div className="p-2 text-center">
        <button className="text-sm text-blue-600 hover:text-blue-800">
          View all notifications
        </button>
      </div>
    </div>
  );
};

export default NotificationCenter;