import React from 'react';
import { PencilIcon, TrashIcon, DocumentDuplicateIcon } from '@heroicons/react/24/outline';

const LunchTable = ({ data, loading, onEdit, onDelete, onDuplicate }) => {
  if (loading) {
    return <div className="animate-pulse h-64 bg-gray-100 rounded-xl"></div>;
  }

  if (!data || data.length === 0) {
    return <div className="text-center py-12 text-gray-500">No assignments found</div>;
  }

  return (
    <div className="bg-white rounded-xl shadow overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Start</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">End</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {data.map(item => (
            <tr key={item.id}>
              <td className="px-6 py-4 whitespace-nowrap">{item.employeeName}</td>
              <td className="px-6 py-4 whitespace-nowrap">{item.startDate}</td>
              <td className="px-6 py-4 whitespace-nowrap">{item.endDate}</td>
              <td className="px-6 py-4">
                <span className={`px-2 py-1 text-xs rounded-full ${item.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                  {item.status}
                </span>
              </td>
              <td className="px-6 py-4 text-right space-x-2">
                <button onClick={() => onEdit(item)} className="text-indigo-600 hover:text-indigo-800">
                  <PencilIcon className="h-5 w-5 inline" />
                </button>
                <button onClick={() => onDelete(item.id)} className="text-red-600 hover:text-red-800">
                  <TrashIcon className="h-5 w-5 inline" />
                </button>
                <button onClick={() => onDuplicate(item)} className="text-gray-600 hover:text-gray-800">
                  <DocumentDuplicateIcon className="h-5 w-5 inline" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default LunchTable;