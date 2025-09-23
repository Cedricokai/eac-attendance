import React from 'react';
import { LogOut, User, Settings } from 'lucide-react';

const UserDropdown = ({ open, onClose, user, onLogout }) => {
  if (!open) return null;

  return (
    <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg z-50">
      <div className="py-1">
        <div className="px-4 py-2 border-b border-gray-100">
          <p className="text-sm font-medium text-gray-900">{user?.name || 'User'}</p>
          <p className="text-xs text-gray-500 capitalize">{user?.role || 'employee'}</p>
        </div>
        
        <button
          onClick={onClose}
          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
        >
          <User size={16} className="mr-2" />
          Profile
        </button>
        
        <button
          onClick={onClose}
          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
        >
          <Settings size={16} className="mr-2" />
          Settings
        </button>
        
        <button
          onClick={() => {
            onLogout();
            onClose();
          }}
          className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
        >
          <LogOut size={16} className="mr-2" />
          Sign out
        </button>
      </div>
    </div>
  );
};

export default UserDropdown;