// BiometricAttendanceFeed.jsx
import React, { useState, useEffect } from 'react';
import { read, utils, writeFile } from 'xlsx';

const BiometricAttendanceFeed = ({ onImportComplete, onError, employees }) => {
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [error, setError] = useState(null);
  const [processedData, setProcessedData] = useState(null);
  const [loadingEmployees, setLoadingEmployees] = useState(true);

  // API functions...
  const getToken = () => localStorage.getItem('jwtToken');
  const getApiBaseUrl = () => { /* same as before */ };

  // File reading function
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

  // Employee matching logic
  const createNameMapping = () => {
    const nameMap = new Map();
    employees.forEach(emp => {
      if (!emp.id) return;
      const firstName = emp.firstName?.trim() || '';
      const lastName = emp.lastName?.trim() || '';
      const fullName = `${firstName} ${lastName}`.trim();
      
      nameMap.set(emp.id.toString(), { 
        id: emp.id,
        employeeId: emp.employeeId,
        name: fullName 
      });
      
      if (emp.employeeId) {
        nameMap.set(emp.employeeId.toString(), { 
          id: emp.id,
          employeeId: emp.employeeId,
          name: fullName 
        });
      }
    });
    return nameMap;
  };

  // Data processing
  const processBiometricData = async (rawData) => {
    const nameMap = createNameMapping();
    const individualRecords = [];
    const unmappedRows = new Set();
    const mappedEmployees = new Set();

    rawData.forEach((row, index) => {
      // Find employee by database ID
      let employeeData = null;
      for (const [key, value] of Object.entries(row)) {
        if (value && /^\d+$/.test(value.toString().trim())) {
          const stringValue = value.toString().trim();
          if (nameMap.has(stringValue)) {
            employeeData = nameMap.get(stringValue);
            break;
          }
        }
      }

      if (!employeeData) {
        unmappedRows.add(`Row ${index + 2}`);
        return;
      }

      mappedEmployees.add(employeeData.id);

      // Extract timestamp
      let timestamp = null;
      for (const [key, value] of Object.entries(row)) {
        if (value && value.toString().match(/\d{4}[\/-]\d{1,2}[\/-]\d{1,2}[- ]\d{1,2}:\d{1,2}/)) {
          timestamp = value;
          break;
        }
      }

      // Parse timestamp
      const { date, time } = parseTimestamp(timestamp);
      if (!date || !time) return;

      // Determine action
      const action = (row.SIGN || row.Action || row.Type || row.action || "").toUpperCase().trim();
      let finalAction = action;
      if (!action.includes("SIGN ON") && !action.includes("SIGN OFF")) {
        const [hours] = time.split(':').map(Number);
        finalAction = hours < 12 ? "SIGN ON" : "SIGN OFF";
      }

      individualRecords.push({
        employeeId: employeeData.id,
        employeeName: employeeData.name,
        employeeCode: employeeData.employeeId,
        timestamp: `${date}T${time}:00`,
        action: finalAction,
        date: date,
        time: time,
        originalData: row
      });
    });

    // Group records
    const groupedRecords = groupRecordsByEmployeeAndDate(individualRecords);
    const attendanceRecords = createAttendanceRecords(groupedRecords);

    return {
      individualRecords: individualRecords,
      attendanceRecords: attendanceRecords,
      totalEvents: individualRecords.length,
      mappedCount: mappedEmployees.size,
      unmappedCount: unmappedRows.size,
      unmappedRows: Array.from(unmappedRows)
    };
  };

  // Main import handler
  const handleBiometricImport = async (file) => {
    try {
      setImporting(true);
      setError(null);
      setImportResult(null);
      setProcessedData(null);

      const rawData = await readExcelFile(file);
      if (rawData.length === 0) {
        throw new Error('Excel file is empty or contains no data.');
      }
      
      const processingResult = await processBiometricData(rawData);
      setProcessedData(processingResult);
      
      // Convert to biometric DTO
      const biometricDTOs = convertToBiometricRecordDTO(processingResult);
      
      // Send to backend
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
      
      const finalResult = {
        success: true,
        message: `Successfully processed ${processingResult.individualRecords.length} biometric events`,
        summary: {
          totalEvents: processingResult.individualRecords.length,
          attendanceRecords: processingResult.attendanceRecords.length,
          mappedEmployees: processingResult.mappedCount,
          unmappedRows: processingResult.unmappedCount,
          savedCount: result?.length || result?.count || processingResult.attendanceRecords.length
        },
        data: processingResult
      };
      
      setImportResult(finalResult);
      
      // Callback to parent
      if (onImportComplete) {
        onImportComplete(finalResult, biometricDTOs);
      }
      
      return finalResult;
      
    } catch (error) {
      console.error('Import error:', error);
      const errorMessage = `Failed to import biometric data: ${error.message}`;
      setError(errorMessage);
      if (onError) onError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setImporting(false);
    }
  };

  // Render UI
  return (
    <div className="biometric-attendance-feed">
      {/* Import UI here - similar to your existing UI but simplified */}
      <div className="import-container">
        <h2>Biometric Attendance Import</h2>
        <p>Upload Excel file with biometric data</p>
        
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={(e) => {
            const file = e.target.files[0];
            if (file) handleBiometricImport(file);
          }}
          disabled={importing}
        />
        
        {importing && <div>Importing...</div>}
        {error && <div className="error">{error}</div>}
        {importResult && <div className="success">{importResult.message}</div>}
      </div>
    </div>
  );
};

export default BiometricAttendanceFeed;