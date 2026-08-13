import React from "react";
import { useSettings } from "../Eac-attendance/context/SettingsContext";

const Home = () => {
  const { settings } = useSettings();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-blue-900 text-white mr-0"> {/* Added ml-56 to match navbar width */}
      {/* Header */}
      <header className="text-center mb-8 w-full max-w-1x3"> {/* Added width constraints */}
        <div className="mb-6">
          <div className="w-20 h-20 bg-yellow-400 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-yellow-400/20">
            <span className="text-2xl">⚡</span>
          </div>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
          {settings.companyName || "EAC Electrical Solution Limited"}
          <span className="block text-yellow-400 mt-2 text-2xl md:text-3xl font-light">
            Transport Management System
          </span>
        </h1>
        <p className="text-gray-300 text-lg max-w-2xl mx-auto leading-relaxed">
          Streamline your fleet operations with comprehensive vehicle tracking, 
          driver management, and maintenance scheduling in one unified platform.
        </p>
      </header>

      {/* Dashboard Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-6xl mb-12 px-6"> {/* Added px-6 for padding */}
        {/* Vehicles Card */}
        <div className="group bg-gray-800/90 backdrop-blur-sm rounded-xl p-6 shadow-xl hover:shadow-2xl hover:shadow-yellow-400/20 transform hover:-translate-y-1 transition-all duration-300 border border-gray-700 hover:border-yellow-400/30">
          <div className="text-center mb-4">
            <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
              <span className="text-xl">🚚</span>
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Vehicle Fleet</h2>
          </div>
          <p className="text-gray-400 text-sm mb-6 text-center leading-relaxed">
            Comprehensive tracking and management of all company vehicles
          </p>
          <div className="text-center">
            <a
              href="/vehicles"
              className="inline-block bg-blue-600 hover:bg-blue-500 text-white font-medium px-6 py-2.5 rounded-lg transition-all duration-200 shadow-lg hover:shadow-blue-500/25 hover:scale-105"
            >
              View Fleet
            </a>
          </div>
        </div>

        {/* Drivers Card */}
        <div className="group bg-gray-800/90 backdrop-blur-sm rounded-xl p-6 shadow-xl hover:shadow-2xl hover:shadow-green-400/20 transform hover:-translate-y-1 transition-all duration-300 border border-gray-700 hover:border-green-400/30">
          <div className="text-center mb-4">
            <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
              <span className="text-xl">👨‍✈️</span>
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Driver Management</h2>
          </div>
          <p className="text-gray-400 text-sm mb-6 text-center leading-relaxed">
            Maintain complete driver profiles, certifications, and availability
          </p>
          <div className="text-center">
            <a
              href="/drivers"
              className="inline-block bg-green-600 hover:bg-green-500 text-white font-medium px-6 py-2.5 rounded-lg transition-all duration-200 shadow-lg hover:shadow-green-500/25 hover:scale-105"
            >
              Manage Drivers
            </a>
          </div>
        </div>

        {/* Maintenance Card */}
        <div className="group bg-gray-800/90 backdrop-blur-sm rounded-xl p-6 shadow-xl hover:shadow-2xl hover:shadow-orange-400/20 transform hover:-translate-y-1 transition-all duration-300 border border-gray-700 hover:border-orange-400/30">
          <div className="text-center mb-4">
            <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
              <span className="text-xl">🛠️</span>
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Maintenance</h2>
          </div>
          <p className="text-gray-400 text-sm mb-6 text-center leading-relaxed">
            Schedule and track maintenance activities with automated reminders
          </p>
          <div className="text-center">
            <a
              href="/maintenance"
              className="inline-block bg-orange-600 hover:bg-orange-500 text-white font-medium px-6 py-2.5 rounded-lg transition-all duration-200 shadow-lg hover:shadow-orange-500/25 hover:scale-105"
            >
              View Schedule
            </a>
          </div>
        </div>

        {/* Fuel Card */}
        <div className="group bg-gray-800/90 backdrop-blur-sm rounded-xl p-6 shadow-xl hover:shadow-2xl hover:shadow-purple-400/20 transform hover:-translate-y-1 transition-all duration-300 border border-gray-700 hover:border-purple-400/30">
          <div className="text-center mb-4">
            <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
              <span className="text-xl">⛽</span>
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Fuel Management</h2>
          </div>
          <p className="text-gray-400 text-sm mb-6 text-center leading-relaxed">
            Monitor fuel consumption, costs, and optimize fuel efficiency
          </p>
          <div className="text-center">
            <a
              href="/fuel"
              className="inline-block bg-purple-600 hover:bg-purple-500 text-white font-medium px-6 py-2.5 rounded-lg transition-all duration-200 shadow-lg hover:shadow-purple-500/25 hover:scale-105"
            >
              Analyze Data
            </a>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
     

      {/* Footer */}
      <footer className="mt-8 text-gray-500 text-sm text-center w-full max-w-6xl px-6"> {/* Added width and padding constraints */}
        <div className="flex items-center justify-center space-x-2 mb-2">
          <div className="w-1 h-1 bg-yellow-400 rounded-full"></div>
          <div className="w-1 h-1 bg-yellow-400 rounded-full"></div>
          <div className="w-1 h-1 bg-yellow-400 rounded-full"></div>
        </div>
        © {new Date().getFullYear()} {settings.companyName || "EAC Electrical Solution Limited"} — Transport Management System
      </footer>
    </div>
  );
};

export default Home;
