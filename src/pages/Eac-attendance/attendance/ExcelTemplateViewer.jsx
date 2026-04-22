import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { 
  Download, 
  FileText, 
  Calendar, 
  Users, 
  ChevronLeft, 
  ChevronRight,
  Filter,
  Search,
  Printer,
  Upload,
  Check,
  X,
  AlertCircle,
  Clock,
  CalendarDays,
  Save,
  Eye,
  EyeOff,
  CheckCircle,
  RefreshCw,
  CalendarRange,
  Send,
  FileSpreadsheet
} from 'lucide-react';

const ExcelTemplateViewer = ({ 
  employees = [], 
  jobName = "SITE SERVICES",
  apiBaseUrl = "http://localhost:8080",
  onSaveToTimesheet, // Callback to save data back to main timesheet
  onBackToTimesheet // Callback to go back to main timesheet
}) => {
  const [attendanceData, setAttendanceData] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [importedExcelData, setImportedExcelData] = useState([]);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importPreview, setImportPreview] = useState([]);
  const [importErrors, setImportErrors] = useState([]);
  const [isProcessingImport, setIsProcessingImport] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Show/hide template
  const [showTemplate, setShowTemplate] = useState(false);
  
  // Verification state
  const [verificationData, setVerificationData] = useState([]);
  const [showVerificationPanel, setShowVerificationPanel] = useState(false);
  const [selectedEmployeeForDetail, setSelectedEmployeeForDetail] = useState(null);
  const [isSavingToTimesheet, setIsSavingToTimesheet] = useState(false);

  // Attendance codes mapping
  const attendanceCodes = {
    'P': { text: 'Present', color: 'bg-green-100 text-green-800 border-green-300', pay: true },
    'A': { text: 'Absent', color: 'bg-red-100 text-red-800 border-red-300', pay: false },
    'L': { text: 'Leave', color: 'bg-blue-100 text-blue-800 border-blue-300', pay: false },
    'H': { text: 'Holiday', color: 'bg-yellow-100 text-yellow-800 border-yellow-300', pay: false },
    'HP': { text: 'Holiday Present', color: 'bg-purple-100 text-purple-800 border-purple-300', pay: true },
    'S': { text: 'Sick Leave', color: 'bg-orange-100 text-orange-800 border-orange-300', pay: false },
    'WP': { text: 'Weekend Present', color: 'bg-indigo-100 text-indigo-800 border-indigo-300', pay: true },
    'P/M L': { text: 'Paternity/Maternity Leave', color: 'bg-pink-100 text-pink-800 border-pink-300', pay: false }
  };

  // Days - will be extracted from imported Excel
  const [days, setDays] = useState([]);

  // Initialize with sample data or empty
  useEffect(() => {
    if (employees.length > 0 && !importPreview.length) {
      // Initialize empty attendance data
      const initialData = {};
      employees.forEach(employee => {
        initialData[employee.id] = {};
      });
      setAttendanceData(initialData);
      setFilteredEmployees(employees);
    }
  }, [employees]);

  // Process Excel file
  const handleFileImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsProcessingImport(true);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to JSON array
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
        
        if (jsonData.length < 3) {
          setErrorMessage('Excel file is empty or missing data');
          return;
        }

        console.log("Excel Data Sample:", jsonData.slice(0, 5));
        
        // Find the header row (row with dates)
        let headerRowIndex = -1;
        let nameColumnIndex = 0; // Usually column A is names
        
        // Look for row that contains dates (numbers 1-31)
        for (let i = 0; i < Math.min(10, jsonData.length); i++) {
          const row = jsonData[i];
          if (Array.isArray(row)) {
            // Check if this row has date numbers (like your Excel sample)
            const hasDateNumbers = row.some((cell, index) => {
              if (index > 0) { // Skip first column (names)
                const cellValue = String(cell).trim();
                return !isNaN(parseInt(cellValue)) && parseInt(cellValue) >= 1 && parseInt(cellValue) <= 31;
              }
              return false;
            });
            
            if (hasDateNumbers) {
              headerRowIndex = i;
              break;
            }
          }
        }

        // Alternative: Look for attendance codes row (row with P, A, L, H, etc.)
        if (headerRowIndex === -1) {
          for (let i = 0; i < Math.min(10, jsonData.length); i++) {
            const row = jsonData[i];
            if (Array.isArray(row)) {
              const hasAttendanceCodes = row.some((cell, index) => {
                if (index > 0) {
                  const cellValue = String(cell).trim().toUpperCase();
                  return ['P', 'A', 'L', 'H', 'S', 'WP', 'HP'].includes(cellValue);
                }
                return false;
              });
              
              if (hasAttendanceCodes) {
                headerRowIndex = i - 1; // Header is row above attendance data
                break;
              }
            }
          }
        }

        console.log("Header Row Index:", headerRowIndex);

        if (headerRowIndex === -1) {
          // If still not found, use row 2 (as in your sample)
          headerRowIndex = 1;
        }

        // Extract days from header row
        const headerRow = jsonData[headerRowIndex] || [];
        const extractedDays = [];
        
        // Start from column 2 (B) to extract days
        for (let col = 1; col < headerRow.length; col++) {
          const cellValue = String(headerRow[col] || '').trim();
          const dayNumber = parseInt(cellValue);
          
          if (!isNaN(dayNumber) && dayNumber >= 1 && dayNumber <= 31) {
            // Create date object for this day
            const date = new Date();
            date.setDate(dayNumber);
            date.setMonth(new Date().getMonth()); // Current month
            
            extractedDays.push({
              date: date.getDate(),
              dayOfMonth: date.getDate(),
              day: date.toLocaleDateString('en-US', { weekday: 'short' }),
              fullDate: date.toISOString().split('T')[0],
              columnIndex: col,
              isWeekend: [0, 6].includes(date.getDay())
            });
          }
        }
        
        console.log("Extracted Days:", extractedDays);
        setDays(extractedDays);

        // Find name column - look for column with employee names
        nameColumnIndex = 0; // Default to first column
        
        // Process employee data starting from row after header
        const matchedEmployees = [];
        const errors = [];
        
        for (let rowIndex = headerRowIndex + 1; rowIndex < jsonData.length; rowIndex++) {
          const row = jsonData[rowIndex];
          if (!row || row.length === 0) continue;
          
          const name = String(row[nameColumnIndex] || '').trim();
          if (!name || name === '' || name.toLowerCase() === 'summary') continue;
          
          // Try to match with existing employees
          const matchedEmployee = employees.find(emp => {
            const fullName = `${emp.firstName || ''} ${emp.lastName || ''}`.trim().toLowerCase();
            const searchName = name.toLowerCase();
            
            return fullName === searchName ||
                   fullName.includes(searchName) ||
                   searchName.includes(fullName) ||
                   emp.employeeId?.toLowerCase() === searchName ||
                   (emp.firstName?.toLowerCase() === searchName.split(' ')[0] && 
                    emp.lastName?.toLowerCase() === searchName.split(' ')[1]);
          });

          if (matchedEmployee) {
            // Extract attendance data for each day
            const attendance = {};
            
            extractedDays.forEach(day => {
              const cellValue = String(row[day.columnIndex] || '').trim().toUpperCase();
              if (cellValue) {
                // Map Excel values to attendance codes
                let attendanceCode = 'P'; // Default
                
                if (cellValue === 'P' || cellValue === 'PRESENT') attendanceCode = 'P';
                else if (cellValue === 'A' || cellValue === 'ABSENT') attendanceCode = 'A';
                else if (cellValue === 'L' || cellValue === 'LEAVE') attendanceCode = 'L';
                else if (cellValue === 'H' || cellValue === 'HOLIDAY') attendanceCode = 'H';
                else if (cellValue === 'S' || cellValue === 'SICK') attendanceCode = 'S';
                else if (cellValue === 'WP' || cellValue === 'WEEKEND PRESENT') attendanceCode = 'WP';
                else if (cellValue === 'HP' || cellValue === 'HOLIDAY PRESENT') attendanceCode = 'HP';
                else attendanceCode = cellValue; // Use as-is
                
                attendance[day.fullDate] = attendanceCode;
              }
            });
            
            matchedEmployees.push({
              employee: matchedEmployee,
              importedData: {
                name: name,
                rowNumber: rowIndex + 1,
                attendance: attendance
              }
            });
          } else {
            errors.push({
              name: name,
              rowNumber: rowIndex + 1,
              error: 'No matching employee found'
            });
          }
        }

        console.log("Matched Employees:", matchedEmployees.length);
        console.log("Errors:", errors.length);
        
        setImportPreview(matchedEmployees);
        setImportErrors(errors);
        setIsImportModalOpen(true);
        setErrorMessage('');
        
      } catch (error) {
        console.error('Error processing Excel file:', error);
        setErrorMessage(`Error processing file: ${error.message}`);
      } finally {
        setIsProcessingImport(false);
      }
    };

    reader.onerror = () => {
      setErrorMessage('Error reading file');
      setIsProcessingImport(false);
    };

    reader.readAsArrayBuffer(file);
  };

  // Apply imported data to view
  const applyImportedData = () => {
    if (!importPreview.length) return;

    const newAttendanceData = { ...attendanceData };
    const newFilteredEmployees = [];
    
    importPreview.forEach(item => {
      const employeeId = item.employee.id;
      
      // Add to filtered employees
      newFilteredEmployees.push(item.employee);
      
      // Initialize attendance data
      if (!newAttendanceData[employeeId]) {
        newAttendanceData[employeeId] = {};
      }
      
      // Apply imported attendance
      Object.entries(item.importedData.attendance).forEach(([date, code]) => {
        newAttendanceData[employeeId][date] = code;
      });
    });

    setAttendanceData(newAttendanceData);
    setFilteredEmployees(newFilteredEmployees);
    setSuccessMessage(`Successfully loaded ${importPreview.length} employee records`);
    setIsImportModalOpen(false);
    setImportPreview([]);
    setImportErrors([]);

    // Clear success message after 5 seconds
    setTimeout(() => setSuccessMessage(''), 5000);
  };

  // Calculate summary for an employee
  const calculateEmployeeSummary = (employeeId) => {
    const summary = {
      present: 0,
      absent: 0,
      leave: 0,
      holiday: 0,
      sick: 0,
      weekendPresent: 0,
      holidayPresent: 0,
      payDays: 0,
      totalDays: days.length
    };

    days.forEach(day => {
      const status = attendanceData[employeeId]?.[day.fullDate];
      if (status) {
        switch(status.toUpperCase()) {
          case 'P': summary.present++; break;
          case 'A': summary.absent++; break;
          case 'L': summary.leave++; break;
          case 'H': summary.holiday++; break;
          case 'S': summary.sick++; break;
          case 'WP': summary.weekendPresent++; break;
          case 'HP': summary.holidayPresent++; break;
        }
      }
    });

    summary.payDays = summary.present + summary.weekendPresent + summary.holidayPresent;
    
    return summary;
  };

  // Generate verification data
  const generateVerificationData = () => {
    const verification = [];
    
    filteredEmployees.forEach(employee => {
      const employeeData = {
        id: employee.id,
        name: `${employee.firstName} ${employee.lastName}`,
        employeeId: employee.employeeId,
        position: employee.position || employee.jobPosition,
        days: [],
        summary: calculateEmployeeSummary(employee.id)
      };
      
      days.forEach(day => {
        const status = attendanceData[employee.id]?.[day.fullDate] || '';
        employeeData.days.push({
          date: day.fullDate,
          day: day.day,
          status: status,
          statusText: attendanceCodes[status]?.text || 'Unknown',
          isPayable: attendanceCodes[status]?.pay || false
        });
      });
      
      verification.push(employeeData);
    });
    
    setVerificationData(verification);
    setShowVerificationPanel(true);
  };

  // Save to main timesheet
  const saveToMainTimesheet = async () => {
    if (!onSaveToTimesheet) {
      setErrorMessage('No save handler provided');
      return;
    }

    setIsSavingToTimesheet(true);
    try {
      // Format data for main timesheet
      const timesheetData = [];
      
      verificationData.forEach(employeeData => {
        employeeData.days.forEach(day => {
          if (day.isPayable && day.status) {
            timesheetData.push({
              employeeId: employeeData.id,
              date: day.date,
              status: day.status,
              regularHours: 8, // Default 8 hours
              overtimeHours: 0,
              totalHours: 8,
              remarks: `Imported from Excel - ${employeeData.name}`
            });
          }
        });
      });

      // Call the callback to save to main timesheet
      const result = await onSaveToTimesheet(timesheetData);
      
      if (result.success) {
        setSuccessMessage(`Successfully sent ${timesheetData.length} attendance records to main timesheet`);
        setTimeout(() => {
          setSuccessMessage('');
          setShowVerificationPanel(false);
          // Optionally go back to main timesheet
          if (onBackToTimesheet) {
            onBackToTimesheet();
          }
        }, 3000);
      } else {
        throw new Error(result.message || 'Failed to save to timesheet');
      }
    } catch (error) {
      setErrorMessage(`Error sending to timesheet: ${error.message}`);
    } finally {
      setIsSavingToTimesheet(false);
    }
  };

  // Export current view to Excel
  const exportToExcel = () => {
    if (filteredEmployees.length === 0) {
      setErrorMessage('No data to export');
      return;
    }

    // Create data for export
    const exportData = [];
    
    // Add headers
    const headers = ['ID', 'Name', 'Position', 'Staff ID', ...days.map(d => `${d.date}/${d.day}`)];
    exportData.push(headers);
    
    // Add employee rows
    filteredEmployees.forEach((employee, index) => {
      const row = [
        index + 1,
        `${employee.firstName || ''} ${employee.lastName || ''}`,
        employee.position || employee.jobPosition || 'N/A',
        employee.employeeId || 'N/A',
        ...days.map(day => attendanceData[employee.id]?.[day.fullDate] || '')
      ];
      exportData.push(row);
    });
    
    // Create workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(exportData);
    
    // Add some styling
    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cell_address = {c: C, r: R};
        const cell_ref = XLSX.utils.encode_cell(cell_address);
        
        if (R === 0) {
          // Header row styling
          ws[cell_ref].s = {
            fill: { fgColor: { rgb: "4472C4" } },
            font: { bold: true, color: { rgb: "FFFFFF" } },
            alignment: { horizontal: "center" }
          };
        }
      }
    }
    
    XLSX.utils.book_append_sheet(wb, ws, 'Imported Attendance');
    XLSX.writeFile(wb, `Imported_Attendance_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Render verification panel
  const renderVerificationPanel = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b bg-green-50">
          <div>
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <CheckCircle className="text-green-600" />
              Data Verification & Review
            </h2>
            <p className="text-sm text-gray-600">
              Review imported attendance data before sending to main timesheet
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowVerificationPanel(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              <EyeOff size={16} className="inline mr-2" />
              Hide
            </button>
            <button
              onClick={saveToMainTimesheet}
              disabled={isSavingToTimesheet}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {isSavingToTimesheet ? (
                <>
                  <RefreshCw size={16} className="inline mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send size={16} className="inline mr-2" />
                  Send to Timesheet
                </>
              )}
            </button>
          </div>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[70vh]">
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-blue-800 mb-2">Import Summary</h3>
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-blue-600">Total Employees</div>
                <div className="font-semibold">{verificationData.length}</div>
              </div>
              <div>
                <div className="text-green-600">Total Pay Days</div>
                <div className="font-semibold">
                  {verificationData.reduce((sum, emp) => sum + emp.summary.payDays, 0)}
                </div>
              </div>
              <div>
                <div className="text-purple-600">Total Present Days</div>
                <div className="font-semibold">
                  {verificationData.reduce((sum, emp) => sum + emp.summary.present, 0)}
                </div>
              </div>
              <div>
                <div className="text-indigo-600">Days Range</div>
                <div className="font-semibold">
                  {days.length} days
                </div>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            {verificationData.map((employee, idx) => (
              <div key={employee.id} className="border rounded-lg p-4 hover:bg-gray-50">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-semibold text-gray-900">
                      {idx + 1}. {employee.name}
                    </h4>
                    <div className="text-sm text-gray-600">
                      ID: {employee.employeeId} • Position: {employee.position}
                    </div>
                  </div>
                  <div className="flex gap-4 text-sm">
                    <div className="bg-green-100 text-green-800 px-2 py-1 rounded">
                      Present: {employee.summary.present}
                    </div>
                    <div className="bg-red-100 text-red-800 px-2 py-1 rounded">
                      Absent: {employee.summary.absent}
                    </div>
                    <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      Leave: {employee.summary.leave}
                    </div>
                    <button
                      onClick={() => setSelectedEmployeeForDetail(
                        selectedEmployeeForDetail === employee.id ? null : employee.id
                      )}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      {selectedEmployeeForDetail === employee.id ? 'Hide Details' : 'Show Details'}
                    </button>
                  </div>
                </div>
                
                {selectedEmployeeForDetail === employee.id && (
                  <div className="mt-3 pt-3 border-t">
                    <div className="text-sm font-medium text-gray-700 mb-2">Daily Breakdown:</div>
                    <div className="grid grid-cols-10 gap-1">
                      {employee.days.map((day, dayIdx) => (
                        <div 
                          key={dayIdx} 
                          className={`p-1 rounded text-center text-xs border ${attendanceCodes[day.status]?.color || 'bg-gray-100'}`}
                          title={`${day.day} ${new Date(day.date).getDate()}: ${day.statusText}`}
                        >
                          <div className="font-medium">{new Date(day.date).getDate()}</div>
                          <div className="font-bold">{day.status || '-'}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // Main render - Only show template button initially
  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Success/Error Messages */}
      {successMessage && (
        <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
          {successMessage}
        </div>
      )}
      
      {errorMessage && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          {errorMessage}
        </div>
      )}

      {/* Header with Import/Export controls */}
      <div className="flex justify-between items-center mb-6 pb-4 border-b">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            {showTemplate ? 'Excel Template Viewer' : 'Excel Data Import'}
          </h1>
          <p className="text-gray-600">
            {showTemplate ? 'View and verify imported Excel data' : 'Import attendance data from Excel files'}
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Back button */}
          {onBackToTimesheet && (
            <button
              onClick={onBackToTimesheet}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <ChevronLeft size={18} />
              Back to Timesheet
            </button>
          )}
          
          {/* Import Excel Button - ALWAYS VISIBLE */}
          <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer">
            {isProcessingImport ? (
              <RefreshCw size={18} className="animate-spin" />
            ) : (
              <Upload size={18} />
            )}
            {isProcessingImport ? 'Processing...' : 'Import Excel File'}
            <input
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleFileImport}
              className="hidden"
              disabled={isProcessingImport}
            />
          </label>
          
          {/* Show/Hide Template Button */}
          <button
            onClick={() => setShowTemplate(!showTemplate)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            {showTemplate ? (
              <>
                <EyeOff size={18} />
                Hide Data
              </>
            ) : (
              <>
                <Eye size={18} />
                Show Imported Data
              </>
            )}
          </button>
          
          {/* Export Button */}
          {filteredEmployees.length > 0 && (
            <button
              onClick={exportToExcel}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              <Download size={18} />
              Export Data
            </button>
          )}
          
          {/* Send to Timesheet Button */}
          {filteredEmployees.length > 0 && (
            <button
              onClick={generateVerificationData}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Send size={18} />
              Send to Timesheet
            </button>
          )}
        </div>
      </div>

      {/* Initial State - Show import instructions */}
      {!showTemplate && filteredEmployees.length === 0 && (
        <div className="text-center py-16 bg-gray-50 rounded-lg">
          <div className="inline-block p-4 bg-blue-100 rounded-full mb-4">
            <FileSpreadsheet size={48} className="text-blue-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            Import Excel Attendance Data
          </h3>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            Click the "Import Excel File" button above to upload your attendance sheet.<br />
            The system will automatically match employee names and load attendance data.
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg">
            <AlertCircle size={18} />
            <span>Supported formats: .xlsx, .xls, .csv</span>
          </div>
        </div>
      )}

      {/* Show imported data when template is visible */}
      {showTemplate && filteredEmployees.length > 0 && (
        <>
          {/* Import Summary */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-blue-800">Imported Data Summary</h3>
                <p className="text-lg">
                  {filteredEmployees.length} Employees • {days.length} Days
                </p>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-600">Total Pay Days</div>
                <div className="text-xl font-bold text-green-600">
                  {filteredEmployees.reduce((sum, emp) => sum + calculateEmployeeSummary(emp.id).payDays, 0)}
                </div>
              </div>
            </div>
          </div>

          {/* Attendance Legend */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold mb-2">Attendance Codes</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(attendanceCodes).map(([code, info]) => (
                <div key={code} className={`px-3 py-1 rounded-full text-sm border ${info.color}`}>
                  {code} - {info.text} {info.pay ? '✓' : ''}
                </div>
              ))}
              <div className="px-3 py-1 rounded-full text-sm bg-gray-100 border border-gray-300">
                ✓ = Payable
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>

          {/* Attendance Table */}
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Position
                  </th>
                  
                  {/* Day Columns */}
                  {days.slice(0, 15).map(day => (
                    <th key={day.date} className={`px-2 py-3 text-center text-xs font-medium ${day.isWeekend ? 'bg-orange-50' : ''}`}>
                      <div className="font-semibold">{day.day}</div>
                      <div className="text-lg">{day.date}</div>
                    </th>
                  ))}
                  
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Summary
                  </th>
                </tr>
              </thead>
              
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredEmployees
                  .filter(employee => {
                    const fullName = `${employee.firstName || ''} ${employee.lastName || ''}`.toLowerCase();
                    const position = (employee.position || '').toLowerCase();
                    return fullName.includes(searchTerm.toLowerCase()) || 
                           position.includes(searchTerm.toLowerCase());
                  })
                  .map((employee, index) => {
                    const summary = calculateEmployeeSummary(employee.id);
                    
                    return (
                      <tr key={employee.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">
                            {employee.firstName} {employee.lastName}
                          </div>
                        </td>
                        
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {employee.employeeId || 'N/A'}
                        </td>
                        
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {employee.position || employee.jobPosition || 'N/A'}
                        </td>
                        
                        {/* Attendance Cells */}
                        {days.slice(0, 15).map(day => {
                          const status = attendanceData[employee.id]?.[day.fullDate] || '';
                          const codeInfo = attendanceCodes[status] || { color: 'bg-gray-100 text-gray-800' };
                          
                          return (
                            <td key={day.date} className={`px-2 py-2 text-center ${day.isWeekend ? 'bg-orange-50' : ''}`}>
                              <div className={`inline-block px-1 py-1 rounded border ${codeInfo.color} font-bold`}>
                                {status || '-'}
                              </div>
                            </td>
                          );
                        })}
                        
                        <td className="px-2 py-2">
                          <div className="relative group">
                            <div className="flex items-center justify-center gap-2 px-2 py-1 bg-gray-50 rounded text-xs cursor-help border">
                              <span className="text-green-600 font-bold">{summary.present}</span>
                              <span>/</span>
                              <span className="text-red-600 font-bold">{summary.absent}</span>
                              <span>/</span>
                              <span className="text-blue-600 font-bold">{summary.leave}</span>
                            </div>
                            
                            <div className="absolute left-1/2 transform -translate-x-1/2 bottom-full mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded-lg p-2 whitespace-nowrap z-50 shadow-lg">
                              <div className="flex flex-col gap-1">
                                <div className="flex justify-between gap-4">
                                  <span>Present:</span>
                                  <span className="font-bold">{summary.present}</span>
                                </div>
                                <div className="flex justify-between gap-4">
                                  <span>Absent:</span>
                                  <span className="font-bold">{summary.absent}</span>
                                </div>
                                <div className="flex justify-between gap-4">
                                  <span>Leave:</span>
                                  <span className="font-bold">{summary.leave}</span>
                                </div>
                                <div className="flex justify-between gap-4 border-t pt-1 mt-1">
                                  <span>Pay Days:</span>
                                  <span className="font-bold text-green-300">{summary.payDays}</span>
                                </div>
                              </div>
                              <div className="absolute left-1/2 transform -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900"></div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                }
              </tbody>
            </table>
          </div>

          {/* Pagination Note */}
          <div className="mt-4 text-sm text-gray-500 text-center">
            Showing first 15 days of {days.length} total days. {days.length > 15 && 'Use horizontal scroll to view all days.'}
          </div>

          {/* Summary Stats */}
          <div className="mt-6 grid grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg border">
              <div className="text-sm text-blue-600">Total Employees</div>
              <div className="text-2xl font-bold">{filteredEmployees.length}</div>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg border">
              <div className="text-sm text-green-600">Total Present Days</div>
              <div className="text-2xl font-bold">
                {filteredEmployees.reduce((total, emp) => total + calculateEmployeeSummary(emp.id).present, 0)}
              </div>
            </div>
            
            <div className="bg-red-50 p-4 rounded-lg border">
              <div className="text-sm text-red-600">Total Absent Days</div>
              <div className="text-2xl font-bold">
                {filteredEmployees.reduce((total, emp) => total + calculateEmployeeSummary(emp.id).absent, 0)}
              </div>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-lg border">
              <div className="text-sm text-purple-600">Total Pay Days</div>
              <div className="text-2xl font-bold">
                {filteredEmployees.reduce((total, emp) => total + calculateEmployeeSummary(emp.id).payDays, 0)}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold text-gray-800">Import Preview</h2>
              <button
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportPreview([]);
                  setImportErrors([]);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {/* Matched Employees */}
              {importPreview.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold text-green-600 mb-3">
                    ✓ {importPreview.length} Employees Matched
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Row</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Imported Name</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Matched Employee</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Staff ID</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Days Found</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Status</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {importPreview.slice(0, 10).map((item, idx) => (
                          <tr key={idx} className="hover:bg-green-50">
                            <td className="px-4 py-3 text-sm text-gray-500">{item.importedData.rowNumber}</td>
                            <td className="px-4 py-3 text-sm font-medium">{item.importedData.name}</td>
                            <td className="px-4 py-3 text-sm">
                              {item.employee.firstName} {item.employee.lastName}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">
                              {item.employee.employeeId || 'N/A'}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                                {Object.keys(item.importedData.attendance).length} days
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                                ✓ Ready
                              </span>
                            </td>
                          </tr>
                        ))}
                        {importPreview.length > 10 && (
                          <tr>
                            <td colSpan={6} className="px-4 py-3 text-center text-sm text-gray-500">
                              ... and {importPreview.length - 10} more employees
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              
              {/* Errors */}
              {importErrors.length > 0 && (
                <div>
                  <h3 className="font-semibold text-red-600 mb-3 flex items-center gap-2">
                    <AlertCircle size={18} />
                    {importErrors.length} Unmatched Names
                  </h3>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="max-h-40 overflow-y-auto mb-3">
                      <ul className="space-y-2">
                        {importErrors.slice(0, 10).map((error, idx) => (
                          <li key={idx} className="text-sm text-red-700 flex items-start gap-2">
                            <span className="font-medium">Row {error.rowNumber}:</span>
                            <span>"{error.name}" - {error.error}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <p className="text-sm text-red-600">
                      These employees were not found in the database. They will be skipped.
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex justify-between items-center p-6 border-t bg-gray-50">
              <div className="text-sm text-gray-600">
                <strong>Note:</strong> Imported attendance will be displayed for review before sending to timesheet.
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setIsImportModalOpen(false);
                    setImportPreview([]);
                    setImportErrors([]);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={applyImportedData}
                  disabled={importPreview.length === 0}
                  className={`px-4 py-2 rounded-lg ${
                    importPreview.length === 0
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  Load {importPreview.length} Employee{importPreview.length !== 1 ? 's' : ''}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Verification Panel */}
      {showVerificationPanel && renderVerificationPanel()}
    </div>
  );
};

export default ExcelTemplateViewer;