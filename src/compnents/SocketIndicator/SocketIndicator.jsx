import React from 'react';
import { Wifi, WifiOff } from 'lucide-react';

const SocketIndicator = ({ connected }) => {
  return (
    <div className="relative">
      <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'} absolute -top-1 -right-1`}></div>
      {connected ? (
        <Wifi size={20} className="text-gray-600" />
      ) : (
        <WifiOff size={20} className="text-gray-600" />
      )}
    </div>
  );
};

export default SocketIndicator;