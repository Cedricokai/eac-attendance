// src/pages/Lunch/components/EmployeeLunchProfile.jsx
import React, { useState } from 'react';
import { XMarkIcon, PencilIcon } from '@heroicons/react/24/outline';
import { lunchApi } from '../services/lunchApi';

const EmployeeLunchProfile = ({ employee, onClose, onUpdate }) => {
  const [profile, setProfile] = useState(employee);
  const [editing, setEditing] = useState(false);

  const handleSave = async () => {
    try {
      await lunchApi.updateEmployeeLunchProfile(profile.id, profile);
      onUpdate();
      setEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-700">
          <XMarkIcon className="h-6 w-6" />
        </button>
        <div className="flex items-start gap-4">
          <img
            src={employee.photo || '/default-avatar.png'}
            alt={`${employee.firstName} ${employee.lastName}`}
            className="w-24 h-24 rounded-full object-cover bg-gray-200"
            onError={(e) => { e.target.src = '/default-avatar.png'; }}
          />
          <div className="flex-1">
            <h3 className="text-xl font-bold">{employee.firstName} {employee.lastName}</h3>
            <p className="text-gray-500">{employee.employeeId} • {employee.department || employee.category?.name || 'N/A'}</p>
            <div className="mt-2 space-y-1 text-sm">
              <p><span className="font-medium">Position:</span> {employee.jobPosition || 'N/A'}</p>
              <p><span className="font-medium">Shift:</span> {employee.shift || 'Day'}</p>
              <p><span className="font-medium">Lunch Status:</span> 
                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${profile.lunchStatus === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                  {profile.lunchStatus || 'Not Assigned'}
                </span>
              </p>
            </div>
          </div>
        </div>
        <div className="mt-4 border-t pt-4">
          <h4 className="font-semibold mb-2">Special Diet & Allergies</h4>
          {editing ? (
            <div className="space-y-2">
              <input
                type="text"
                value={profile.specialDiet || ''}
                onChange={(e) => setProfile({ ...profile, specialDiet: e.target.value })}
                placeholder="Special diet"
                className="w-full border rounded px-2 py-1"
              />
              <input
                type="text"
                value={profile.foodAllergy || ''}
                onChange={(e) => setProfile({ ...profile, foodAllergy: e.target.value })}
                placeholder="Food allergy"
                className="w-full border rounded px-2 py-1"
              />
              <textarea
                value={profile.notes || ''}
                onChange={(e) => setProfile({ ...profile, notes: e.target.value })}
                placeholder="Notes"
                className="w-full border rounded px-2 py-1"
                rows="2"
              />
              <button onClick={handleSave} className="bg-indigo-600 text-white px-4 py-1 rounded">Save</button>
              <button onClick={() => setEditing(false)} className="ml-2 border px-4 py-1 rounded">Cancel</button>
            </div>
          ) : (
            <div>
              <p><span className="font-medium">Special Diet:</span> {profile.specialDiet || 'None'}</p>
              <p><span className="font-medium">Food Allergy:</span> {profile.foodAllergy || 'None'}</p>
              <p><span className="font-medium">Notes:</span> {profile.notes || 'None'}</p>
              <button onClick={() => setEditing(true)} className="mt-2 text-indigo-600 flex items-center gap-1">
                <PencilIcon className="h-4 w-4" /> Edit Profile
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployeeLunchProfile;