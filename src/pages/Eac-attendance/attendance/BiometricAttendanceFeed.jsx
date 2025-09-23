import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';

const BiometricAttendanceFeed = () => {
  const [biometricRecords, setBiometricRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [excelData, setExcelData] = useState([]);
  const [showExcelPreview, setShowExcelPreview] = useState(false);

  // Helper function to parse Excel timestamp (format: "2025/05/01-11:57:37")
  const parseExcelTimestamp = (timestamp) => {
    if (!timestamp) return null;
    
    // Handle Excel date numbers if needed
    if (typeof timestamp === 'number') {
      return new Date((timestamp - 25569) * 86400 * 1000);
    }
    
    // Handle string format "YYYY/MM/DD-HH:mm:ss"
    const [datePart, timePart] = timestamp.split('-');
    if (!datePart || !timePart) return null;
    
    const [year, month, day] = datePart.split('/');
    const [hours, minutes, seconds] = timePart.split(':');
    
    return new Date(year, month - 1, day, hours, minutes, seconds);
  };

  // Format date to YYYY-MM-DD
  const formatDate = (date) => {
    if (!date) return '';
    return date.toISOString().split('T')[0];
  };

  // Format time to HH:mm:ss
  const formatTime = (date) => {
    if (!date) return '';
    return date.toTimeString().split(' ')[0];
  };

  // Calculate working hours between check-in and check-out
 const calculateWorkingHours = (checkInTime, checkOutTime) => {
  if (!checkInTime || !checkOutTime) return 0;
  
  const [inHours, inMinutes, inSeconds] = checkInTime.split(':').map(Number);
  const [outHours, outMinutes, outSeconds] = checkOutTime.split(':').map(Number);
  
  // Convert to total seconds for more precise calculation
  const checkInTotalSeconds = (inHours * 3600) + (inMinutes * 60) + inSeconds;
  const checkOutTotalSeconds = (outHours * 3600) + (outMinutes * 60) + outSeconds;
  
  const diffSeconds = checkOutTotalSeconds - checkInTotalSeconds;
  
  // Convert to hours with 2 decimal places
  return (diffSeconds / 3600).toFixed(2);
};

// Improved grouping logic to handle multiple entries
const groupedRecords = excelData.reduce((acc, row) => {
  const timestamp = parseExcelTimestamp(row.Timestamp);
  if (!timestamp) return acc;
  
  const date = formatDate(timestamp);
  const time = formatTime(timestamp);
  const employeeId = row['Employee ID'];
  const key = `${employeeId}-${date}`;
  
  if (!acc[key]) {
    acc[key] = {
      employee: {
        id: employeeId,
        name: row['Employee Name']
      },
      date,
      checkIns: [],
      checkOuts: [],
      method: row.Method,
      workingHours: 0
    };
  }
  
  if (row.Action === 'SIGN ON') {
    acc[key].checkIns.push(time);
    // Sort check-ins chronologically
    acc[key].checkIns.sort();
  } else if (row.Action === 'SIGN OFF') {
    acc[key].checkOuts.push(time);
    // Sort check-outs chronologically
    acc[key].checkOuts.sort();
  }
  
  // Calculate working hours based on first check-in and last check-out
  if (acc[key].checkIns.length > 0 && acc[key].checkOuts.length > 0) {
    const firstCheckIn = acc[key].checkIns[0];
    const lastCheckOut = acc[key].checkOuts[acc[key].checkOuts.length - 1];
    acc[key].workingHours = calculateWorkingHours(firstCheckIn, lastCheckOut);
  }
  
  return acc;
}, {});


  // Prepare data for API
  // In BiometricAttendanceFeed.jsx, enhance the prepareApiData function
const prepareApiData = () => {
  return Object.values(groupedRecords).map(record => {
    // Calculate regular and overtime hours
    const regularHours = Math.min(record.workingHours, 8);
    const overtimeHours = Math.max(record.workingHours - 8, 0);
    
    return {
      employee: { id: record.employee.id },
      date: record.date,
      checkIn: record.checkIns[0] || null,
      checkOut: record.checkOuts[record.checkOuts.length - 1] || null,
      method: record.method,
      workingHours: record.workingHours,
      regularHours,
      overtimeHours,
      status: record.workingHours > 0 ? 'Present' : 'Absent'
    };
  });
};

  // Import Excel data to backend
 const importExcelData = async () => {
  try {
    const dataToSend = prepareApiData();

    const response = await fetch('http://localhost:8080/api/attendance/batch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(dataToSend)
    });

    let data = null;
    const text = await response.text(); // get raw response
    if (text) {
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.warn("Response not valid JSON, raw text:", text);
      }
    }

    if (!response.ok) {
      throw new Error((data && data.message) || 'Failed to import Excel data');
    }

    setShowExcelPreview(false);
    alert('Excel data imported successfully');
    setBiometricRecords((data && data.data) || []);
  } catch (err) {
    console.error('Import error:', err);
    alert(`Import failed: ${err.message}`);
  }
};

  // Handle Excel file upload and parse
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      
      setExcelData(jsonData);
      setShowExcelPreview(true);
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Biometric Records</h3>
        <label className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg transition text-sm cursor-pointer">
          <input 
            type="file" 
            accept=".xlsx, .xls, .csv"
            onChange={handleFileUpload}
            className="hidden"
          />
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Import Excel
        </label>
      </div>

      {loading && <p className="text-gray-500">Loading biometric data...</p>}
      {error && <p className="text-red-500">{error}</p>}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check In</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check Out</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hours Worked</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {Object.values(groupedRecords).length > 0 ? (
              Object.values(groupedRecords).map((record, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                        <span className="text-gray-700 font-medium">
                         {(record.employee?.name || '')
  .split(' ')
  .map(n => n[0])
  .join('')}

                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {record.employee.name}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {record.employee.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {record.date}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {record.checkIn || '--:--:--'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {record.checkOut || '--:--:--'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {record.workingHours > 0 ? (
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        record.workingHours >= 8 ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {record.workingHours} hrs
                      </span>
                    ) : '--'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {record.method || 'N/A'}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="px-6 py-4 text-center text-sm text-gray-500">
                  No biometric records found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Excel Preview Modal */}
      {showExcelPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Excel File Preview</h2>
              <button 
                onClick={() => setShowExcelPreview(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {excelData.length > 0 && Object.keys(excelData[0]).map(key => (
                      <th
                        key={key}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        {key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {excelData.map((row, index) => (
                    <tr key={index}>
                      {Object.values(row).map((value, i) => (
                        <td key={i} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {value}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end space-x-4 mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={() => setShowExcelPreview(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={importExcelData}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Import Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BiometricAttendanceFeed;