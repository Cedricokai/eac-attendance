import React, { useState } from 'react';
import { read, utils } from 'xlsx';

const BiometricAttendanceFeed = () => {
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [error, setError] = useState(null);

  // Get JWT token helper
  const getToken = () => {
    return localStorage.getItem('jwtToken');
  };

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://192.168.1.97:8080';

  // Read Excel file
  const readExcelFile = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonData = utils.sheet_to_json(worksheet);
          resolve(jsonData);
        } catch (error) {
          reject(new Error(`Failed to parse Excel file: ${error.message}`));
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  };

  // Fetch employees for name matching
  const fetchEmployees = async () => {
    try {
      const token = getToken();
      const response = await fetch('${API_BASE_URL}/api/employee', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch employees');
      return await response.json();
    } catch (error) {
      throw new Error(`Error fetching employees: ${error.message}`);
    }
  };

  // Debug Excel file structure
  const debugExcelStructure = (rawData) => {
    console.log('=== EXCEL FILE DEBUG INFO ===');
    console.log('Total rows:', rawData.length);
    
    if (rawData.length > 0) {
      console.log('First row:', rawData[0]);
      console.log('Column headers:', Object.keys(rawData[0]));
      
      // Show sample data from first few rows
      rawData.slice(0, 3).forEach((row, index) => {
        console.log(`Row ${index + 1}:`, row);
      });
      
      // Find potential name columns
      const nameColumns = Object.keys(rawData[0]).filter(key => {
        const sampleValue = rawData[0][key];
        return typeof sampleValue === 'string' && 
               sampleValue.trim().length > 2 &&
               !sampleValue.match(/\d{4}[\/-]\d{1,2}[\/-]\d{1,2}[- ]\d{1,2}:\d{1,2}/) &&
               !key.toLowerCase().includes('time') &&
               !key.toLowerCase().includes('date') &&
               !key.toLowerCase().includes('action');
      });
      
      console.log('Potential name columns:', nameColumns);
    }
  };

  // Create comprehensive name mapping
  const createNameMapping = (employees) => {
    const nameMap = new Map();
    
    console.log('=== CREATING NAME MAPPING ===');
    console.log('Total employees:', employees.length);
    
    employees.forEach(emp => {
      if (!emp.id || !emp.firstName) return;

      const firstName = emp.firstName.trim();
      const lastName = emp.lastName?.trim() || '';
      const fullName = `${firstName} ${lastName}`.trim();
      
      // Create comprehensive name variations
      const nameVariations = [
        // Full names
        fullName.toUpperCase(),
        fullName.toLowerCase(),
        
        // Last name first
        `${lastName} ${firstName}`.toUpperCase().trim(),
        
        // No spaces
        `${firstName}${lastName}`.toUpperCase(),
        `${lastName}${firstName}`.toUpperCase(),
        
        // First name only (if unique enough)
        firstName.toUpperCase(),
        firstName.toLowerCase(),
        
        // Common abbreviations
        `${firstName} ${lastName.charAt(0)}`.toUpperCase(),
        `${lastName.charAt(0)} ${firstName}`.toUpperCase(),
        
        // Handle potential middle names/initials
        firstName.split(' ')[0].toUpperCase() + (lastName ? ` ${lastName.toUpperCase()}` : ''),
      ];

      // Add all valid mappings
      nameVariations.forEach(variation => {
        if (variation && variation.length > 2) {
          nameMap.set(variation, emp.id);
          // Also try without special characters
          const cleanVariation = variation.replace(/[^\w\s]/g, '');
          if (cleanVariation !== variation) {
            nameMap.set(cleanVariation, emp.id);
          }
        }
      });

      // Map by employee ID
      if (emp.employeeId) {
        nameMap.set(emp.employeeId.toString(), emp.id);
        nameMap.set(emp.employeeId.toString().toUpperCase(), emp.id);
      }

      // Debug log for this employee
      console.log(`Mapped: ${fullName} → ${emp.id}, variations: ${nameVariations.length}`);
    });

    console.log('Total name mappings created:', nameMap.size);
    
    // Log some sample mappings for debugging
    const sampleMappings = Array.from(nameMap.entries()).slice(0, 5);
    console.log('Sample mappings:', sampleMappings);
    
    return nameMap;
  };

  // Enhanced employee name detection
  const findEmployeeName = (row, nameMap) => {
    let employeeId = null;
    let employeeName = null;
    
    // Strategy 1: Check all string values for potential names
    for (const [key, value] of Object.entries(row)) {
      if (typeof value !== 'string') continue;
      
      const stringValue = value.trim();
      if (!stringValue || stringValue.length < 2) continue;
      
      // Skip obvious non-name columns
      if (key.toLowerCase().includes('time') || 
          key.toLowerCase().includes('date') || 
          key.toLowerCase().includes('action') ||
          key.toLowerCase().includes('type') ||
          key.toLowerCase().includes('sign') ||
          stringValue.match(/\d{4}[\/-]\d{1,2}[\/-]\d{1,2}[- ]\d{1,2}:\d{1,2}/)) {
        continue;
      }
      
      // Try exact match
      if (nameMap.has(stringValue.toUpperCase())) {
        employeeId = nameMap.get(stringValue.toUpperCase());
        employeeName = stringValue;
        console.log(`✅ Exact match found: "${stringValue}" → Employee ID: ${employeeId}`);
        return { employeeId, employeeName };
      }
      
      // Try partial matches (if the value contains a known name)
      const upperValue = stringValue.toUpperCase();
      for (const [nameVariation, id] of nameMap.entries()) {
        if (upperValue.includes(nameVariation) && nameVariation.length > 3) {
          employeeId = id;
          employeeName = stringValue;
          console.log(`✅ Partial match found: "${stringValue}" contains "${nameVariation}" → Employee ID: ${employeeId}`);
          return { employeeId, employeeName };
        }
      }
    }
    
    // Strategy 2: Look for columns that might contain names based on header names
    const nameLikeColumns = Object.keys(row).filter(key => 
      key.toLowerCase().includes('name') || 
      key.toLowerCase().includes('employee') ||
      key.toLowerCase().includes('staff') ||
      key.toLowerCase().includes('person')
    );
    
    for (const col of nameLikeColumns) {
      const value = row[col];
      if (typeof value === 'string' && value.trim()) {
        const upperValue = value.toUpperCase().trim();
        if (nameMap.has(upperValue)) {
          employeeId = nameMap.get(upperValue);
          employeeName = value;
          console.log(`✅ Name column match: "${value}" → Employee ID: ${employeeId}`);
          return { employeeId, employeeName };
        }
      }
    }
    
    console.log('❌ No employee match found for row:', row);
    return { employeeId: null, employeeName: null };
  };

  // Parse timestamp from biometric format
  const parseTimestamp = (timestamp) => {
    if (!timestamp) return { date: null, time: null };
    
    // Handle Excel serial numbers
    if (typeof timestamp === 'number') {
      const date = new Date((timestamp - (25567 + 2)) * 86400 * 1000);
      return {
        date: date.toISOString().split('T')[0],
        time: date.toTimeString().split(' ')[0].substring(0, 5)
      };
    }
    
    const ts = timestamp.toString().trim();
    
    // Handle "2025/05/01-11:57:37" format
    if (ts.includes('/') && ts.includes('-')) {
      const [datePart, timePart] = ts.split('-');
      if (datePart && timePart) {
        // Convert "2025/05/01" to "2025-05-01"
        const [year, month, day] = datePart.split('/');
        const normalizedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        return {
          date: normalizedDate,
          time: timePart.substring(0, 5) // Take only HH:mm
        };
      }
    }
    
    // Handle other date formats
    if (ts.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return { date: ts, time: null };
    }
    
    return { date: null, time: null };
  };

  // Calculate hours between check-in and check-out
  const calculateHours = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return 0;
    
    try {
      const [inHour, inMinute] = checkIn.split(':').map(Number);
      const [outHour, outMinute] = checkOut.split(':').map(Number);
      
      const totalInMinutes = inHour * 60 + inMinute;
      const totalOutMinutes = outHour * 60 + outMinute;
      
      const diffMinutes = totalOutMinutes - totalInMinutes;
      return (diffMinutes / 60).toFixed(2);
    } catch (e) {
      console.error('Error calculating hours:', e);
      return 0;
    }
  };

  // Determine shift based on check-in time
  const determineShift = (checkInTime) => {
    if (!checkInTime) return 'Day';
    const [hours] = checkInTime.split(':').map(Number);
    return hours >= 18 || hours < 6 ? 'Night' : 'Day';
  };

  // Process biometric data and match employees by name
  const processBiometricData = async (rawData) => {
    // Debug the file structure first
    debugExcelStructure(rawData);
    
    // Fetch employees and create name mapping
    const employees = await fetchEmployees();
    const nameMap = createNameMapping(employees);
    
    const individualRecords = [];
    const unmappedNames = new Set();
    const mappedNames = new Set();

    console.log('=== PROCESSING BIOMETRIC DATA ===');
    
    // Process each row to create individual biometric records
    rawData.forEach((row, index) => {
      console.log(`Processing row ${index + 1}:`, row);
      
      // Find employee name using enhanced detection
      const { employeeId, employeeName } = findEmployeeName(row, nameMap);

      if (!employeeId) {
        // Record unmapped name for reporting
        const potentialNames = Object.values(row).filter(val => 
          val && 
          typeof val === 'string' && 
          val.trim().length >= 3 && 
          !/\d/.test(val) &&
          !val.match(/\d{4}[\/-]\d{1,2}[\/-]\d{1,2}[- ]\d{1,2}:\d{1,2}/)
        );
        
        if (potentialNames.length > 0) {
          unmappedNames.add(potentialNames[0]);
        } else {
          unmappedNames.add(`Row ${index + 1}`);
        }
        return; // Skip this row if no employee found
      }

      mappedNames.add(employeeName);

      // Get timestamp from any column
      let timestamp = null;
      for (const [key, value] of Object.entries(row)) {
        if (value && value.toString().match(/\d{4}[\/-]\d{1,2}[\/-]\d{1,2}[- ]\d{1,2}:\d{1,2}/)) {
          timestamp = value;
          break;
        }
      }

      const { date, time } = parseTimestamp(timestamp);
      if (!date || !time) {
        console.warn('Skipping row - invalid timestamp for employee:', employeeName);
        return;
      }

      // Determine action type - Map SIGN ON to check-in, SIGN OFF to check-out
      const action = (row.SIGN || row.Action || row.Type || row.action || "").toUpperCase().trim();
      const isCheckIn = action.includes("SIGN ON") || action.includes("ON") || action === "IN" || action.includes("CHECK IN");
      const isCheckOut = action.includes("SIGN OFF") || action.includes("OFF") || action === "OUT" || action.includes("CHECK OUT");

      // If no clear action, infer from time (morning = check-in, evening = check-out)
      let finalAction = action;
      if (!isCheckIn && !isCheckOut) {
        const [hours] = time.split(':').map(Number);
        finalAction = hours < 12 ? "SIGN ON" : "SIGN OFF";
        console.log(`🕒 Inferred action: ${time} → ${finalAction}`);
      } else {
        finalAction = isCheckIn ? "SIGN ON" : "SIGN OFF";
      }

      // Only process if we can determine the action type
      individualRecords.push({
        employeeId: employeeId,
        employeeName: employeeName,
        timestamp: `${date}T${time}:00`,
        action: finalAction,
        date: date,
        time: time,
        originalData: row
      });
      
      console.log(`✅ Added record: ${employeeName} - ${date} ${time} - ${finalAction}`);
    });

    // Group records by employee and date
    const groupRecordsByEmployeeAndDate = (records) => {
      const grouped = {};
      
      records.forEach(record => {
        const key = `${record.employeeId}-${record.date}`;
        
        if (!grouped[key]) {
          grouped[key] = {
            employeeId: record.employeeId,
            employeeName: record.employeeName,
            date: record.date,
            checkIns: [],
            checkOuts: [],
            records: []
          };
        }
        
        // Add the record to appropriate array based on action
        if (record.action === 'SIGN ON') {
          grouped[key].checkIns.push(record.time);
        } else if (record.action === 'SIGN OFF') {
          grouped[key].checkOuts.push(record.time);
        }
        
        // Also store the full record
        grouped[key].records.push({
          time: record.time,
          action: record.action,
          timestamp: record.timestamp,
          original: record.originalData
        });
      });
      
      return grouped;
    };

    // Process grouped records to find check-in/check-out pairs
    const createAttendanceRecords = (groupedRecords) => {
      const attendanceRecords = [];
      
      Object.values(groupedRecords).forEach(group => {
        // Sort check-ins and check-outs
        group.checkIns.sort();
        group.checkOuts.sort();
        
        // Use earliest check-in and latest check-out
        const checkIn = group.checkIns.length > 0 ? group.checkIns[0] : null;
        const checkOut = group.checkOuts.length > 0 ? group.checkOuts[group.checkOuts.length - 1] : null;
        
        // Calculate hours worked if both times are present
        const hoursWorked = calculateHours(checkIn, checkOut);
        
        // Determine status based on presence of records
        let status = 'Present';
        if (!checkIn && !checkOut) {
          status = 'Absent';
        } else if (checkIn && !checkOut) {
          status = 'Half Day';
        } else if (!checkIn && checkOut) {
          status = 'Half Day';
        }
        
        // Determine shift
        const shift = determineShift(checkIn);
        
        // Create the combined attendance record
        attendanceRecords.push({
          employeeId: group.employeeId,
          employeeName: group.employeeName,
          date: group.date,
          checkIn: checkIn,
          checkOut: checkOut,
          hoursWorked: hoursWorked,
          shift: shift,
          status: status,
          biometric: true,
          recordCount: group.records.length,
          signOnCount: group.checkIns.length,
          signOffCount: group.checkOuts.length,
          individualEvents: group.records
        });
        
        console.log(`📊 Created attendance: ${group.employeeName} - ${checkIn} to ${checkOut} - ${hoursWorked} hrs`);
      });
      
      return attendanceRecords;
    };

    // Group the individual records
    const groupedRecords = groupRecordsByEmployeeAndDate(individualRecords);
    
    // Create combined attendance records
    const attendanceRecords = createAttendanceRecords(groupedRecords);

    // Report mapping results
    console.log('=== PROCESSING RESULTS ===');
    console.log('Successfully mapped names:', Array.from(mappedNames));
    console.log('Unmapped names:', Array.from(unmappedNames));
    console.log('Individual records:', individualRecords.length);
    console.log('Combined attendance records:', attendanceRecords.length);

    if (unmappedNames.size > 0) {
      setError(`Warning: ${unmappedNames.size} employees could not be matched. Check console for details.`);
    }

    if (attendanceRecords.length === 0) {
      throw new Error('No valid attendance records could be created. Check if employee names match between Excel file and database.');
    }

    return {
      individualRecords: individualRecords,
      attendanceRecords: attendanceRecords,
      mappedCount: mappedNames.size,
      unmappedCount: unmappedNames.size,
      unmappedNames: Array.from(unmappedNames)
    };
  };

  // Convert to BiometricRecordDTO format for your backend
  const convertToBiometricRecordDTO = (processedRecords) => {
    return processedRecords.individualRecords.map(record => ({
      employeeId: record.employeeId,
      timestamp: record.timestamp,
      action: record.action,
      employeeName: record.employeeName
    }));
  };

  // Import biometric data using your existing backend endpoint
  const importBiometricData = async (biometricDTOs) => {
    try {
      const token = getToken();
      
      const response = await fetch(`${API_BASE_URL}/api/attendance/import/biometric-file`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(biometricDTOs)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Server error: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      throw new Error(`Failed to import biometric data: ${error.message}`);
    }
  };

  // Alternative: Use the batch endpoint if the file endpoint doesn't work
  const importUsingBatchEndpoint = async (attendanceRecords) => {
    try {
      const token = getToken();
      
      const response = await fetch(`${API_BASE_URL}/api/attendance/batch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(attendanceRecords)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Server error: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      throw new Error(`Failed to save records: ${error.message}`);
    }
  };

  // Debug employee matching
  const debugEmployeeMatching = async () => {
    try {
      const employees = await fetchEmployees();
      console.log('=== EMPLOYEE DATABASE DEBUG ===');
      console.log('Total employees:', employees.length);
      employees.forEach(emp => {
        console.log(`ID: ${emp.id}, Name: "${emp.firstName} ${emp.lastName}", EmployeeID: ${emp.employeeId}`);
      });
      
      // Create name mapping and show it
      const nameMap = createNameMapping(employees);
      console.log('=== NAME MAPPING ===');
      console.log(Array.from(nameMap.entries()));
      
      alert(`Checked ${employees.length} employees. Created ${nameMap.size} name mappings. Check console for details.`);
    } catch (error) {
      console.error('Debug error:', error);
      alert('Debug failed: ' + error.message);
    }
  };

  // Main import function
  const handleBiometricImport = async (file) => {
    try {
      setImporting(true);
      setError(null);
      setImportResult(null);

      console.log('Starting biometric import for file:', file.name);
      
      // Read Excel file
      const rawData = await readExcelFile(file);
      console.log('Total rows from Excel:', rawData.length);
      
      if (rawData.length === 0) {
        throw new Error('Excel file is empty or contains no data.');
      }
      
      // Process biometric data and match employees by name
      const processingResult = await processBiometricData(rawData);
      const { individualRecords, attendanceRecords, mappedCount, unmappedCount, unmappedNames } = processingResult;
      
      // Check if we have any valid records
      if (!attendanceRecords || attendanceRecords.length === 0) {
        throw new Error('No valid biometric records found after processing. Check if employee names in Excel match those in the database.');
      }

      console.log('Processed attendance records:', attendanceRecords);

      // Try to import using your biometric file endpoint
      let saveResult;
      try {
        // Convert individual records for biometric endpoint
        const biometricDTOs = convertToBiometricRecordDTO(processingResult);
        
        saveResult = await importBiometricData(biometricDTOs);
        console.log('Biometric file endpoint success:', saveResult);
      } catch (endpointError) {
        console.log('Biometric file endpoint failed, trying batch endpoint...', endpointError);
        
        // Convert to attendance records format for batch endpoint
        const batchRecords = attendanceRecords.map(record => ({
          employee: { id: record.employeeId },
          employeeName: record.employeeName,
          date: record.date,
          checkIn: record.checkIn,
          checkOut: record.checkOut,
          minimumHour: record.hoursWorked,
          status: record.status,
          shift: record.shift,
          workType: 'Regular',
          biometric: true,
          notes: `Biometric import: ${record.signOnCount} sign-ons, ${record.signOffCount} sign-offs`
        }));

        saveResult = await importUsingBatchEndpoint(batchRecords);
        console.log('Batch endpoint success:', saveResult);
      }
      
      // Set success result
      const result = {
        success: true,
        message: `Successfully processed ${individualRecords.length} biometric events into ${attendanceRecords.length} attendance records`,
        summary: {
          totalEvents: individualRecords.length,
          attendanceRecords: attendanceRecords.length,
          mappedEmployees: mappedCount,
          unmappedEmployees: unmappedCount,
          savedCount: saveResult?.length || saveResult?.count || attendanceRecords.length,
          unmappedNames: unmappedNames
        },
        data: saveResult
      };
      
      setImportResult(result);
      
      // Refresh the page to show new records after a delay
      setTimeout(() => {
        window.location.reload();
      }, 3000);
      
      return result;
      
    } catch (error) {
      console.error('Import error:', error);
      const errorMessage = `Failed to import biometric data: ${error.message}`;
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setImporting(false);
    }
  };

  // Handle file input change
  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Check if it's an Excel file
    const validTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls)$/)) {
      setError('Please select a valid Excel file (.xlsx or .xls)');
      return;
    }

    try {
      await handleBiometricImport(file);
    } catch (error) {
      // Error is already set in handleBiometricImport
      console.error('Import failed:', error);
    }
  };

  // Render loading state
  const renderLoading = () => (
    <div className="loading-section">
      <div className="spinner"></div>
      <p>Importing biometric attendance data...</p>
      <p>Mapping SIGN ON → Check In, SIGN OFF → Check Out</p>
    </div>
  );

  // Render error state
  const renderError = () => (
    <div className="error-section">
      <h3>Import Failed</h3>
      <p>{error}</p>
      <p style={{ fontSize: '14px', color: '#666', marginTop: '10px' }}>
        Check the browser console for detailed debugging information.
      </p>
      <button onClick={() => setError(null)} className="dismiss-btn">
        Dismiss
      </button>
    </div>
  );

  // Render success result
  const renderResult = () => (
    <div className="success-section">
      <h3>Import Successful! ✅</h3>
      <p>{importResult.message}</p>
      <div className="summary">
        <h4>Import Summary:</h4>
        <ul>
          <li>Total Biometric Events: {importResult.summary.totalEvents}</li>
          <li>Attendance Records Created: {importResult.summary.attendanceRecords}</li>
          <li>Employees Matched: {importResult.summary.mappedEmployees}</li>
          <li>Employees Not Matched: {importResult.summary.unmappedEmployees}</li>
          <li>Records Saved: {importResult.summary.savedCount}</li>
        </ul>
        {importResult.summary.unmappedNames && importResult.summary.unmappedNames.length > 0 && (
          <div className="unmapped-names">
            <h5>Unmapped Names (check console for details):</h5>
            <ul>
              {importResult.summary.unmappedNames.slice(0, 10).map((name, index) => (
                <li key={index}>{name}</li>
              ))}
              {importResult.summary.unmappedNames.length > 10 && (
                <li>... and {importResult.summary.unmappedNames.length - 10} more</li>
              )}
            </ul>
          </div>
        )}
      </div>
      <p className="refresh-notice">Page will refresh automatically to show new records...</p>
      <button onClick={() => setImportResult(null)} className="import-another-btn">
        Import Another File
      </button>
    </div>
  );

  // Render file input
  const renderFileInput = () => (
    <div className="file-input-section">
      <h3>📊 Import Biometric Attendance Data</h3>
      <p>Select your biometric Excel file to import attendance records</p>
      <p className="file-info">
        <strong>Mapping:</strong> SIGN ON → Check In, SIGN OFF → Check Out
      </p>
      
      {/* Debug Tools */}
      <div style={{ marginBottom: '20px', padding: '10px', background: '#f0f8ff', borderRadius: '8px' }}>
        <h4 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>Debug Tools</h4>
        <button 
          onClick={debugEmployeeMatching}
          style={{ background: '#6c757d', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
        >
          Debug Employee Matching
        </button>
        <p style={{ fontSize: '12px', margin: '5px 0 0 0', color: '#666' }}>
          Check if employee names match between database and Excel file
        </p>
      </div>
      
      <label className="file-upload-label">
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileChange}
          disabled={importing}
        />
        Choose Excel File
      </label>
      
      <div className="file-requirements">
        <p><strong>Supported File Format:</strong></p>
        <ul>
          <li>Excel files (.xlsx, .xls)</li>
          <li>Employee names in any column</li>
          <li>Timestamps in various formats</li>
          <li>SIGN ON / SIGN OFF actions</li>
          <li><strong>Mapping:</strong> SIGN ON → Check In, SIGN OFF → Check Out</li>
        </ul>
      </div>
    </div>
  );

  return (
    <div className="biometric-attendance-feed">
      <div className="import-container">
        <h2>Biometric Attendance Import</h2>
        <p className="mapping-info">
          <strong>Automatic Mapping:</strong> SIGN ON → Check In | SIGN OFF → Check Out
        </p>
        
        {importing && renderLoading()}
        {error && !importing && renderError()}
        {importResult && !importing && renderResult()}
        {!importing && !error && !importResult && renderFileInput()}
      </div>

      <style jsx>{`
        .biometric-attendance-feed {
          max-width: 600px;
          margin: 20px auto;
          padding: 20px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        
        .import-container {
          border: 2px dashed #ddd;
          border-radius: 12px;
          padding: 30px;
          background: #fafafa;
          text-align: center;
        }
        
        .mapping-info {
          background: #e3f2fd;
          padding: 10px;
          border-radius: 6px;
          margin: 10px 0;
          color: #1565c0;
        }
        
        .loading-section {
          text-align: center;
          padding: 20px;
        }
        
        .spinner {
          border: 4px solid #f3f3f3;
          border-top: 4px solid #3498db;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 2s linear infinite;
          margin: 0 auto 20px;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .error-section {
          background: #ffe6e6;
          border: 1px solid #ffcccc;
          border-radius: 8px;
          padding: 20px;
          margin: 15px 0;
          text-align: left;
        }
        
        .success-section {
          background: #e6ffe6;
          border: 1px solid #ccffcc;
          border-radius: 8px;
          padding: 20px;
          margin: 15px 0;
          text-align: left;
        }
        
        .file-upload-label {
          display: inline-block;
          background: #3498db;
          color: white;
          padding: 12px 24px;
          border-radius: 6px;
          cursor: pointer;
          margin: 15px 0;
          transition: background 0.3s;
          font-weight: bold;
        }
        
        .file-upload-label:hover {
          background: #2980b9;
        }
        
        .file-upload-label input[type="file"] {
          display: none;
        }
        
        .file-info {
          color: #666;
          font-size: 0.9em;
          margin: 10px 0;
          background: #f0f8ff;
          padding: 8px;
          border-radius: 4px;
        }
        
        .file-requirements {
          background: #f0f0f0;
          padding: 15px;
          border-radius: 6px;
          margin-top: 15px;
          text-align: left;
        }
        
        .file-requirements ul {
          margin: 10px 0;
          padding-left: 20px;
        }
        
        .summary {
          text-align: left;
          margin: 15px 0;
        }
        
        .summary ul {
          margin: 10px 0;
          padding-left: 20px;
        }
        
        .unmapped-names {
          background: #fff3cd;
          padding: 10px;
          border-radius: 4px;
          margin-top: 10px;
        }
        
        .unmapped-names ul {
          margin: 5px 0;
          padding-left: 20px;
        }
        
        .refresh-notice {
          font-style: italic;
          color: #666;
          margin: 10px 0;
        }
        
        button {
          background: #3498db;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 6px;
          cursor: pointer;
          margin-top: 15px;
          font-size: 14px;
          transition: background 0.3s;
        }
        
        button:hover {
          background: #2980b9;
        }
        
        button:disabled {
          background: #bdc3c7;
          cursor: not-allowed;
        }
        
        .dismiss-btn {
          background: #e74c3c;
        }
        
        .dismiss-btn:hover {
          background: #c0392b;
        }
        
        .import-another-btn {
          background: #27ae60;
        }
        
        .import-another-btn:hover {
          background: #229954;
        }
      `}</style>
    </div>
  );
};

export default BiometricAttendanceFeed;