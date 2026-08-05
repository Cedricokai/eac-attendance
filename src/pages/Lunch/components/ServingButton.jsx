import React from 'react';
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

const ServingButton = ({ employee, onServe, disabled }) => {
  if (disabled) {
    return (
      <button className="px-3 py-1 bg-gray-200 text-gray-500 rounded-lg cursor-not-allowed" disabled>
        Served
      </button>
    );
  }

  return (
    <button
      onClick={() => onServe(employee.id)}
      className="flex items-center gap-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
    >
      <CheckIcon className="h-5 w-5" />
      Serve
    </button>
  );
};

export default ServingButton;