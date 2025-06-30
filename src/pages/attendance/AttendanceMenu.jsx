import React from 'react';

const AttendanceMenu = ({
  query,
  setQuery,
  globalDate,
  setGlobalDate,
  clearTableAndForm,
  resetClearedDates,
  validateAttendance,
  isAllSelected,
  setIsCreateMenuOpen // 🔥 this controls modal visibility
}) => {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 p-4 bg-white shadow-md rounded-xl border border-gray-200 gap-4">
      {/* Left Side: Search + Filters */}
      <div className="flex flex-col md:flex-row items-start md:items-center gap-4 w-full md:w-auto">
        {/* Search */}
        <div className="flex items-center border border-gray-300 rounded-lg h-12 px-2 w-[300px] bg-white">
          <input
            type="text"
            placeholder="Search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full outline-none text-sm"
          />
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
            className="size-5 text-gray-400"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
            />
          </svg>
        </div>

        {/* Category Dropdown */}
        <div className="relative w-48">
          <select
            name="category"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-zinc-500"
          >
            <option value="">Select Category</option>
            <option value="Projects">Projects</option>
            <option value="Site Services">Site Services</option>
            <option value="Ahafo North">Ahafo North</option>
          </select>
        </div>

        {/* Date Picker */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
            📅 Date:
          </label>
          <input
            type="date"
            value={globalDate}
            onChange={(e) => setGlobalDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Right Side: Action Buttons */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* Add Attendance Button */}
        <button
          onClick={() => setIsCreateMenuOpen(true)}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition duration-200 font-medium"
        >
          ➕ Add Attendance
        </button>

        {/* Clear View Button */}
        <button
          onClick={clearTableAndForm}
          className={`px-4 py-2 rounded-lg font-medium transition duration-200 ${
            globalDate
              ? 'bg-amber-500 text-white hover:bg-amber-600'
              : 'bg-amber-200 text-white cursor-not-allowed'
          }`}
          disabled={!globalDate}
        >
          🧹 Clear View {globalDate ? `(${globalDate})` : ''}
        </button>

        {/* Reset All Button */}
        <button
          onClick={resetClearedDates}
          className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition duration-200 font-medium"
          title="Show all hidden records"
        >
          🔄 Reset All
        </button>

        {/* Validate All Button */}
        <button
          onClick={validateAttendance}
          disabled={!isAllSelected}
          className={`px-4 py-2 rounded-lg font-medium transition duration-200 ${
            isAllSelected
              ? 'bg-green-500 text-white hover:bg-green-600 cursor-pointer'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          ✅ Validate All
        </button>
      </div>
    </div>
  );
};

export default AttendanceMenu;
