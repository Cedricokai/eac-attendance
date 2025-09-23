import { useState } from "react";

export default function EmployeeForm({ 
  employee, 
  setEmployee,
  onSubmit,
  submitText = "Submit",
  onCancel
}) {
  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (!employee.firstName) newErrors.firstName = "First name is required";
    if (!employee.lastName) newErrors.lastName = "Last name is required";
    if (!employee.email) newErrors.email = "Tag number is required";
    if (!employee.jobPosition) newErrors.jobPosition = "Job position is required";
    if (!employee.workType) newErrors.workType = "Work type is required";
    if (!employee.minimumRate) newErrors.minimumRate = "Rate is required";
    if (!employee.category) newErrors.category = "Category is required";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSubmit();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border border-gray-300 rounded-lg p-6 h-[550px]">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
        <div className="relative">
          <select
            value={employee.category}
            onChange={(e) => setEmployee({...employee, category: e.target.value})}
            className={`w-full px-3 py-2 border ${errors.category ? 'border-red-500' : 'border-gray-300'} rounded-lg shadow-sm`}
          >
            <option value="">Select Category</option>
            <option value="Projects">Projects</option>
            <option value="Site Services">Site Services</option>
            <option value="Ahafo North">Ahafo North</option>
          </select>
          {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mt-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
          <div className="relative">
            <input
              type="text"
              placeholder="First name"
              value={employee.firstName}
              onChange={(e) => setEmployee({ ...employee, firstName: e.target.value })}
              className={`w-full px-3 py-2 border ${errors.firstName ? 'border-red-500' : 'border-gray-300'} rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
            />
            {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
          <div className="relative">
            <input
              type="text"
              placeholder="Last name"
              value={employee.lastName}
              onChange={(e) => setEmployee({ ...employee, lastName: e.target.value })}
              className={`w-full px-3 py-2 border ${errors.lastName ? 'border-red-500' : 'border-gray-300'} rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
            />
            {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>}
          </div>
        </div>
      </div>

      <div className="mt-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">Tag number</label>
        <div className="relative">
          <input
            type="text"
            placeholder=""
            value={employee.email}
            onChange={(e) => setEmployee({ ...employee, email: e.target.value })}
            className={`w-full px-3 py-2 border ${errors.email ? 'border-red-500' : 'border-gray-300'} rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
          />
          {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
        </div>
      </div>

      <div className="mt-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">Job Position</label>
        <div className="relative">
          <input
            type="text"
            placeholder="Quantity surveyor"
            value={employee.jobPosition}
            onChange={(e) => setEmployee({ ...employee, jobPosition: e.target.value })}
            className={`w-full px-3 py-2 border ${errors.jobPosition ? 'border-red-500' : 'border-gray-300'} rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
          />
          {errors.jobPosition && <p className="text-red-500 text-xs mt-1">{errors.jobPosition}</p>}
        </div>
      </div>

      <div className="mt-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">Work Type</label>
        <div className="relative">
          <input
            type="text"
            placeholder="Regular"
            value={employee.workType}
            onChange={(e) => setEmployee({ ...employee, workType: e.target.value })}
            className={`w-full px-3 py-2 border ${errors.workType ? 'border-red-500' : 'border-gray-300'} rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
          />
          {errors.workType && <p className="text-red-500 text-xs mt-1">{errors.workType}</p>}
        </div>
      </div>

      <div className="mt-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">Rate</label>
        <div className="relative">
          <input
            type="text"
            placeholder="0.00"
            value={employee.minimumRate}
            onChange={(e) => setEmployee({ ...employee, minimumRate: e.target.value })}
            className={`w-full px-3 py-2 border ${errors.minimumRate ? 'border-red-500' : 'border-gray-300'} rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
          />
          {errors.minimumRate && <p className="text-red-500 text-xs mt-1">{errors.minimumRate}</p>}
        </div>
      </div>
      
      <div className="flex justify-end mt-8 gap-4">
        {onCancel && (
          <button
            type="button"
            className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition duration-200"
            onClick={onCancel}
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition duration-200"
        >
          {submitText}
        </button>
      </div>
    </form>
  );
}
