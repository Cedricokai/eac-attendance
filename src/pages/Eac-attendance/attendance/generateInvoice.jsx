import React, { useState, useEffect } from 'react';
import { read, utils, writeFile } from 'xlsx';

const BiometricAttendanceFeed = () => {
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [error, setError] = useState(null);
  const [processedData, setProcessedData] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);

  const getToken = () => {
    return localStorage.getItem('jwtToken');
  };

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

  // Fetch employees on component mount
  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoadingEmployees(true);
      const token = getToken();
      const response = await fetch('http://localhost:8080/api/employee', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch employees');
      const employeesData = await response.json();
      setEmployees(employeesData);
      setLoadingEmployees(false);
    } catch (error) {
      console.error('Error fetching employees:', error);
      setLoadingEmployees(false);
    }
  };

  const exportTableToExcel = () => {
    if (!processedData || !processedData.attendanceRecords || processedData.attendanceRecords.length === 0) {
      setError("No processed data to export. Please import biometric data first.");
      return;
    }

    try {
      const exportData = processedData.attendanceRecords.map(record => {
        const employee = employees.find(emp => emp.id === record.employeeId);
        
        return {
          'Employee ID': employee?.employeeId || record.employeeId,
          'Employee Name': record.employeeName,
          'Date': record.date,
          'Check In Time': record.checkIn || '--:--',
          'Check Out Time': record.checkOut || '--:--',
          'Sign On Count': record.signOnCount || 0,
          'Sign Off Count': record.signOffCount || 0,
          'Total Hours Worked': record.hoursWorked,
          'Shift': record.shift,
          'Status': record.status,
          'Biometric Record': 'Yes',
          'Individual Events': record.individualEvents?.length || 0,
          'Job Position': employee?.jobPosition || 'N/A',
          'Category': employee?.category || 'N/A',
          'Work Type': employee?.workType || 'N/A',
          'Hourly Rate': employee?.minimumRate || 'N/A',
          'Standard Hours': employee?.standardHours || 8,
          'Overtime Hours': (parseFloat(record.hoursWorked) > (employee?.standardHours || 8)) 
            ? (parseFloat(record.hoursWorked) - (employee?.standardHours || 8)).toFixed(2)
            : 0
        };
      });

      const individualEventsData = [];
      processedData.attendanceRecords.forEach(record => {
        record.individualEvents?.forEach(event => {
          const employee = employees.find(emp => emp.id === record.employeeId);
          individualEventsData.push({
            'Employee ID': employee?.employeeId || record.employeeId,
            'Employee Name': record.employeeName,
            'Date': record.date,
            'Time': event.time,
            'Action': event.action,
            'Original Timestamp': event.timestamp,
            'Status': record.status
          });
        });
      });

      const workbook = utils.book_new();
      
      const attendanceSheet = utils.json_to_sheet(exportData);
      utils.book_append_sheet(workbook, attendanceSheet, 'Attendance Summary');
      
      if (individualEventsData.length > 0) {
        const eventsSheet = utils.json_to_sheet(individualEventsData);
        utils.book_append_sheet(workbook, eventsSheet, 'Individual Events');
      }

      const summaryData = [
        ['Biometric Attendance Export Summary'],
        [''],
        ['Total Employees:', processedData.mappedCount],
        ['Total Attendance Records:', processedData.attendanceRecords.length],
        ['Total Individual Events:', processedData.totalEvents],
        ['Export Date:', new Date().toLocaleDateString()],
        [''],
        ['Statistics:'],
        ['Average Hours Worked:', 
          (exportData.reduce((sum, record) => sum + parseFloat(record['Total Hours Worked'] || 0), 0) / exportData.length).toFixed(2)
        ],
        ['Day Shift Count:', exportData.filter(r => r.Shift === 'Day').length],
        ['Night Shift Count:', exportData.filter(r => r.Shift === 'Night').length],
        ['Present Count:', exportData.filter(r => r.Status === 'Present').length],
        ['Half Day Count:', exportData.filter(r => r.Status === 'Half Day').length]
      ];
      
      const summarySheet = utils.aoa_to_sheet(summaryData);
      utils.book_append_sheet(workbook, summarySheet, 'Summary');

      const columnWidths = [
        { wch: 15 }, { wch: 20 }, { wch: 12 }, { wch: 15 }, { wch: 15 },
        { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 10 }, { wch: 12 },
        { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 12 },
        { wch: 12 }, { wch: 15 }
      ];
      
      attendanceSheet['!cols'] = columnWidths;

      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `biometric_attendance_export_${dateStr}.xlsx`;

      writeFile(workbook, filename);

      setImportResult({
        ...importResult,
        exportSuccess: true,
        exportMessage: `Successfully exported ${exportData.length} attendance records to Excel`
      });

    } catch (error) {
      console.error('Export error:', error);
      setError(`Failed to export data: ${error.message}`);
    }
  };

  const exportToCSV = () => {
    if (!processedData || !processedData.attendanceRecords || processedData.attendanceRecords.length === 0) {
      setError("No processed data to export. Please import biometric data first.");
      return;
    }

    try {
      const csvData = processedData.attendanceRecords.map(record => {
        const employee = employees.find(emp => emp.id === record.employeeId);
        
        return [
          record.employeeName,
          record.date,
          record.checkIn || '--:--',
          record.checkOut || '--:--',
          record.hoursWorked,
          record.shift,
          record.status,
          employee?.employeeId || record.employeeId,
          employee?.jobPosition || 'N/A',
          record.signOnCount || 0,
          record.signOffCount || 0
        ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(',');
      });

      const headers = [
        'Employee Name',
        'Date',
        'Check In',
        'Check Out',
        'Hours Worked',
        'Shift',
        'Status',
        'Employee ID',
        'Job Position',
        'Sign On Count',
        'Sign Off Count'
      ].map(header => `"${header}"`).join(',');

      const csvContent = [headers, ...csvData].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `biometric_attendance_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setImportResult({
        ...importResult,
        exportSuccess: true,
        exportMessage: `Successfully exported ${csvData.length} records to CSV`
      });

    } catch (error) {
      console.error('CSV export error:', error);
      setError(`Failed to export CSV: ${error.message}`);
    }
  };

  const generateExcelTemplate = () => {
    try {
      // Use actual employee data for template
      const employeesSample = employees.slice(0, 3).map(employee => ({
        id: employee.employeeId,
        name: `${employee.firstName} ${employee.lastName}`
      }));

      // If no employees, use sample data
      if (employeesSample.length === 0) {
        employeesSample.push(
          { id: 'EMP001', name: 'John Doe' },
          { id: 'EMP002', name: 'Jane Smith' },
          { id: 'EMP003', name: 'Robert Johnson' }
        );
      }

      const templateData = employeesSample.map(employee => [
        {
          'Employee ID': employee.id,
          'Employee Name': employee.name,
          'Timestamp': '2024-12-31-08:00:00',
          'Action': 'SIGN ON',
          'Date': '2024-12-31',
          'Time': '08:00:00'
        },
        {
          'Employee ID': employee.id,
          'Employee Name': employee.name,
          'Timestamp': '2024-12-31-17:00:00',
          'Action': 'SIGN OFF',
          'Date': '2024-12-31',
          'Time': '17:00:00'
        }
      ]).flat();

      const workbook = utils.book_new();
      const worksheet = utils.json_to_sheet(templateData);

      const colWidths = [
        { wch: 15 }, // Employee ID
        { wch: 20 }, // Employee Name
        { wch: 25 }, // Timestamp
        { wch: 15 }, // Action
        { wch: 15 }, // Date
        { wch: 15 }  // Time
      ];
      worksheet['!cols'] = colWidths;

      utils.book_append_sheet(workbook, worksheet, 'Biometric Template');

      // Create employee reference sheet
      const employeeReference = employees.map(emp => ({
        'Employee ID': emp.employeeId,
        'Employee Name': `${emp.firstName} ${emp.lastName}`,
        'Job Position': emp.jobPosition || 'N/A',
        'Category': emp.category || 'N/A'
      }));

      const referenceSheet = utils.json_to_sheet(employeeReference);
      utils.book_append_sheet(workbook, referenceSheet, 'Employee Reference');

      const instructions = [
        ['=== BIOMETRIC ATTENDANCE TEMPLATE ==='],
        [''],
        ['IMPORTANT: Use Employee IDs from the "Employee Reference" sheet'],
        [''],
        ['1. Employee ID: Use exact Employee ID from reference sheet (column A)'],
        ['2. Employee Name: Full name for reference only'],
        ['3. Timestamp format: YYYY-MM-DD-HH:MM:SS or YYYY/MM/DD-HH:MM:SS'],
        ['4. Action: "SIGN ON" for check-in, "SIGN OFF" for check-out'],
        ['5. Date: YYYY-MM-DD'],
        ['6. Time: HH:MM:SS (24-hour format)'],
        [''],
        ['=== AVAILABLE EMPLOYEES ==='],
        ['Check "Employee Reference" sheet for all employees and their IDs'],
        [''],
        ['=== SAMPLE DATA ==='],
        ['See first few rows for sample format'],
        [''],
        ['=== TIPS ==='],
        ['• Copy Employee IDs from reference sheet for accurate matching'],
        ['• One record per row'],
        ['• Sort by employee and timestamp'],
        ['• Remove empty rows'],
        ['• Save as .xlsx or .xls']
      ];

      const instructionSheet = utils.aoa_to_sheet(instructions);
      instructionSheet['!cols'] = [{ wch: 80 }];
      
      const headerCell = instructionSheet['A1'];
      if (headerCell) {
        headerCell.s = {
          font: { bold: true, color: { rgb: "FF0000" } },
          fill: { fgColor: { rgb: "FFFF00" } }
        };
      }

      utils.book_append_sheet(workbook, instructionSheet, 'Instructions');

      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `biometric_attendance_template_${timestamp}.xlsx`;

      writeFile(workbook, filename);

      generateCSVTemplate();

    } catch (error) {
      console.error('Error generating template:', error);
      alert('Failed to generate template. Please check console for details.');
    }
  };

  const generateCSVTemplate = () => {
    // Use actual employee data for CSV template
    const sampleEmployees = employees.slice(0, 3);
    let csvContent = 'Employee ID,Employee Name,Timestamp,Action,Date,Time\n';
    
    if (sampleEmployees.length > 0) {
      sampleEmployees.forEach(employee => {
        csvContent += `${employee.employeeId},"${employee.firstName} ${employee.lastName}",2024-12-31-08:00:00,SIGN ON,2024-12-31,08:00:00\n`;
        csvContent += `${employee.employeeId},"${employee.firstName} ${employee.lastName}",2024-12-31-17:00:00,SIGN OFF,2024-12-31,17:00:00\n`;
      });
    } else {
      csvContent += 'EMP001,"John Doe",2024-12-31-08:00:00,SIGN ON,2024-12-31,08:00:00\n';
      csvContent += 'EMP001,"John Doe",2024-12-31-17:00:00,SIGN OFF,2024-12-31,17:00:00\n';
      csvContent += 'EMP002,"Jane Smith",2024-12-31-08:15:00,SIGN ON,2024-12-31,08:15:00\n';
      csvContent += 'EMP002,"Jane Smith",2024-12-31-16:45:00,SIGN OFF,2024-12-31,16:45:00\n';
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `biometric_attendance_template_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

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

  const createNameMapping = () => {
    const nameMap = new Map();
    
    console.log('=== CREATING NAME MAPPING ===');
    console.log('Total employees:', employees.length);
    
    employees.forEach(emp => {
      if (!emp.id || !emp.firstName) return;

      const firstName = emp.firstName.trim();
      const lastName = emp.lastName?.trim() || '';
      const fullName = `${firstName} ${lastName}`.trim();
      
      const nameVariations = [
        fullName.toUpperCase(),
        fullName.toLowerCase(),
        `${lastName} ${firstName}`.toUpperCase().trim(),
        `${firstName}${lastName}`.toUpperCase(),
        `${lastName}${firstName}`.toUpperCase(),
        firstName.toUpperCase(),
        firstName.toLowerCase(),
        `${firstName} ${lastName.charAt(0)}`.toUpperCase(),
        `${lastName.charAt(0)} ${firstName}`.toUpperCase(),
        firstName.split(' ')[0].toUpperCase() + (lastName ? ` ${lastName.toUpperCase()}` : ''),
      ];

      nameVariations.forEach(variation => {
        if (variation && variation.length > 2) {
          nameMap.set(variation, { 
            id: emp.id,
            employeeId: emp.employeeId,
            name: fullName 
          });
          const cleanVariation = variation.replace(/[^\w\s]/g, '');
          if (cleanVariation !== variation) {
            nameMap.set(cleanVariation, { 
              id: emp.id,
              employeeId: emp.employeeId,
              name: fullName 
            });
          }
        }
      });

      if (emp.employeeId) {
        nameMap.set(emp.employeeId.toString(), { 
          id: emp.id,
          employeeId: emp.employeeId,
          name: fullName 
        });
        nameMap.set(emp.employeeId.toString().toUpperCase(), { 
          id: emp.id,
          employeeId: emp.employeeId,
          name: fullName 
        });
      }

      console.log(`Mapped: ${fullName} (ID: ${emp.employeeId}) → ${emp.id}`);
    });

    console.log('Total name mappings created:', nameMap.size);
    return nameMap;
  };

  const findEmployeeByID = (row, nameMap) => {
    for (const [key, value] of Object.entries(row)) {
      if (typeof value !== 'string') continue;
      
      const stringValue = value.trim();
      if (!stringValue) continue;
      
      if (nameMap.has(stringValue.toUpperCase())) {
        const employeeData = nameMap.get(stringValue.toUpperCase());
        console.log(`✅ Employee ID match found: "${stringValue}" → Employee: ${employeeData.name}`);
        return employeeData;
      }
      
      if (key.toLowerCase().includes('employeeid') || 
          key.toLowerCase().includes('emp_id') || 
          key.toLowerCase().includes('staffid') ||
          key.toLowerCase().includes('id')) {
        const upperValue = stringValue.toUpperCase();
        if (nameMap.has(upperValue)) {
          const employeeData = nameMap.get(upperValue);
          console.log(`✅ Employee ID column match: "${stringValue}" → Employee: ${employeeData.name}`);
          return employeeData;
        }
      }
    }
    
    return null;
  };

  const findEmployeeByName = (row, nameMap) => {
    for (const [key, value] of Object.entries(row)) {
      if (typeof value !== 'string') continue;
      
      const stringValue = value.trim();
      if (!stringValue || stringValue.length < 2) continue;
      
      if (key.toLowerCase().includes('time') || 
          key.toLowerCase().includes('date') || 
          key.toLowerCase().includes('action') ||
          key.toLowerCase().includes('type') ||
          key.toLowerCase().includes('sign') ||
          stringValue.match(/\d{4}[\/-]\d{1,2}[\/-]\d{1,2}[- ]\d{1,2}:\d{1,2}/)) {
        continue;
      }
      
      if (nameMap.has(stringValue.toUpperCase())) {
        const employeeData = nameMap.get(stringValue.toUpperCase());
        console.log(`✅ Name match found: "${stringValue}" → Employee: ${employeeData.name}`);
        return employeeData;
      }
      
      const upperValue = stringValue.toUpperCase();
      for (const [nameVariation, employeeData] of nameMap.entries()) {
        if (upperValue.includes(nameVariation) && nameVariation.length > 3) {
          console.log(`✅ Partial name match: "${stringValue}" contains "${nameVariation}" → Employee: ${employeeData.name}`);
          return employeeData;
        }
      }
    }
    
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
          const employeeData = nameMap.get(upperValue);
          console.log(`✅ Name column match: "${value}" → Employee: ${employeeData.name}`);
          return employeeData;
        }
      }
    }
    
    console.log('❌ No employee match found for row:', row);
    return null;
  };

  const parseTimestamp = (timestamp) => {
    if (!timestamp) return { date: null, time: null };
    
    if (typeof timestamp === 'number') {
      const date = new Date((timestamp - (25567 + 2)) * 86400 * 1000);
      return {
        date: date.toISOString().split('T')[0],
        time: date.toTimeString().split(' ')[0].substring(0, 5)
      };
    }
    
    const ts = timestamp.toString().trim();
    
    if (ts.includes('/') && ts.includes('-')) {
      const [datePart, timePart] = ts.split('-');
      if (datePart && timePart) {
        const [year, month, day] = datePart.split('/');
        const normalizedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        return {
          date: normalizedDate,
          time: timePart.substring(0, 5)
        };
      }
    }
    
    if (ts.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return { date: ts, time: null };
    }
    
    return { date: null, time: null };
  };

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

  const determineShift = (checkInTime) => {
    if (!checkInTime) return 'Day';
    const [hours] = checkInTime.split(':').map(Number);
    return hours >= 18 || hours < 6 ? 'Night' : 'Day';
  };

  const processBiometricData = async (rawData) => {
    console.log('=== PROCESSING BIOMETRIC DATA ===');
    console.log('Total employees available:', employees.length);
    
    const nameMap = createNameMapping();
    
    const individualRecords = [];
    const unmappedNames = new Set();
    const mappedNames = new Set();

    rawData.forEach((row, index) => {
      console.log(`Processing row ${index + 1}:`, row);
      
      let employeeData = findEmployeeByID(row, nameMap);
      
      if (!employeeData) {
        employeeData = findEmployeeByName(row, nameMap);
      }

      if (!employeeData) {
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
        return;
      }

      mappedNames.add(employeeData.name);

      let timestamp = null;
      for (const [key, value] of Object.entries(row)) {
        if (value && value.toString().match(/\d{4}[\/-]\d{1,2}[\/-]\d{1,2}[- ]\d{1,2}:\d{1,2}/)) {
          timestamp = value;
          break;
        }
      }

      const { date, time } = parseTimestamp(timestamp);
      if (!date || !time) {
        console.warn('Skipping row - invalid timestamp for employee:', employeeData.name);
        return;
      }

      const action = (row.SIGN || row.Action || row.Type || row.action || "").toUpperCase().trim();
      const isCheckIn = action.includes("SIGN ON") || action.includes("ON") || action === "IN" || action.includes("CHECK IN");
      const isCheckOut = action.includes("SIGN OFF") || action.includes("OFF") || action === "OUT" || action.includes("CHECK OUT");

      let finalAction = action;
      if (!isCheckIn && !isCheckOut) {
        const [hours] = time.split(':').map(Number);
        finalAction = hours < 12 ? "SIGN ON" : "SIGN OFF";
        console.log(`🕒 Inferred action: ${time} → ${finalAction}`);
      } else {
        finalAction = isCheckIn ? "SIGN ON" : "SIGN OFF";
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
      
      console.log(`✅ Added record: ${employeeData.name} (ID: ${employeeData.employeeId}) - ${date} ${time} - ${finalAction}`);
    });

    const groupRecordsByEmployeeAndDate = (records) => {
      const grouped = {};
      
      records.forEach(record => {
        const key = `${record.employeeId}-${record.date}`;
        
        if (!grouped[key]) {
          grouped[key] = {
            employeeId: record.employeeId,
            employeeName: record.employeeName,
            employeeCode: record.employeeCode,
            date: record.date,
            checkIns: [],
            checkOuts: [],
            records: []
          };
        }
        
        if (record.action === 'SIGN ON') {
          grouped[key].checkIns.push(record.time);
        } else if (record.action === 'SIGN OFF') {
          grouped[key].checkOuts.push(record.time);
        }
        
        grouped[key].records.push({
          time: record.time,
          action: record.action,
          timestamp: record.timestamp,
          original: record.originalData
        });
      });
      
      return grouped;
    };

    const createAttendanceRecords = (groupedRecords) => {
      const attendanceRecords = [];
      
      Object.values(groupedRecords).forEach(group => {
        group.checkIns.sort();
        group.checkOuts.sort();
        
        const checkIn = group.checkIns.length > 0 ? group.checkIns[0] : null;
        const checkOut = group.checkOuts.length > 0 ? group.checkOuts[group.checkOuts.length - 1] : null;
        
        const hoursWorked = calculateHours(checkIn, checkOut);
        
        let status = 'Present';
        if (!checkIn && !checkOut) {
          status = 'Absent';
        } else if (checkIn && !checkOut) {
          status = 'Half Day';
        } else if (!checkIn && checkOut) {
          status = 'Half Day';
        }
        
        const shift = determineShift(checkIn);
        
        attendanceRecords.push({
          employeeId: group.employeeId,
          employeeName: group.employeeName,
          employeeCode: group.employeeCode,
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
        
        console.log(`📊 Created attendance: ${group.employeeName} (${group.employeeCode}) - ${checkIn} to ${checkOut} - ${hoursWorked} hrs`);
      });
      
      return attendanceRecords;
    };

    const groupedRecords = groupRecordsByEmployeeAndDate(individualRecords);
    const attendanceRecords = createAttendanceRecords(groupedRecords);

    console.log('=== PROCESSING RESULTS ===');
    console.log('Successfully mapped names:', Array.from(mappedNames));
    console.log('Unmapped names:', Array.from(unmappedNames));
    console.log('Individual records:', individualRecords.length);
    console.log('Combined attendance records:', attendanceRecords.length);

    if (unmappedNames.size > 0) {
      setError(`Warning: ${unmappedNames.size} employees could not be matched. Check console for details.`);
    }

    if (attendanceRecords.length === 0) {
      throw new Error('No valid attendance records could be created. Check if employee names/IDs match between Excel file and database.');
    }

    return {
      individualRecords: individualRecords,
      attendanceRecords: attendanceRecords,
      totalEvents: individualRecords.length,
      mappedCount: mappedNames.size,
      unmappedCount: unmappedNames.size,
      unmappedNames: Array.from(unmappedNames)
    };
  };

  const convertToBiometricRecordDTO = (processedRecords) => {
    return processedRecords.individualRecords.map(record => ({
      employeeId: record.employeeId,
      timestamp: record.timestamp,
      action: record.action,
      employeeName: record.employeeName
    }));
  };

  const importBiometricData = async (biometricDTOs) => {
    try {
      const token = getToken();
      
      const response = await fetch(`http://localhost:8080/api/attendance/import/biometric-file`, {
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

  const importUsingBatchEndpoint = async (attendanceRecords) => {
    try {
      const token = getToken();
      
      const response = await fetch(`http://localhost:8080/api/attendance/batch`, {
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

  const debugEmployeeMatching = async () => {
    try {
      console.log('=== EMPLOYEE DATABASE DEBUG ===');
      console.log('Total employees:', employees.length);
      
      console.log('=== EMPLOYEE LIST WITH IDs ===');
      employees.forEach(emp => {
        console.log(`EmployeeID: ${emp.employeeId}, Name: "${emp.firstName} ${emp.lastName}"`);
      });
      
      const nameMap = createNameMapping();
      console.log('=== NAME MAPPING ===');
      console.log(Array.from(nameMap.entries()));
      
      alert(`Found ${employees.length} employees. Created ${nameMap.size} name mappings. Check console for details.`);
    } catch (error) {
      console.error('Debug error:', error);
      alert('Debug failed: ' + error.message);
    }
  };

  const handleBiometricImport = async (file) => {
    try {
      setImporting(true);
      setError(null);
      setImportResult(null);
      setProcessedData(null);

      console.log('Starting biometric import for file:', file.name);
      
      const rawData = await readExcelFile(file);
      console.log('Total rows from Excel:', rawData.length);
      
      if (rawData.length === 0) {
        throw new Error('Excel file is empty or contains no data.');
      }
      
      const processingResult = await processBiometricData(rawData);
      
      setProcessedData(processingResult);
      
      const { attendanceRecords, mappedCount, unmappedCount, unmappedNames } = processingResult;
      
      if (!attendanceRecords || attendanceRecords.length === 0) {
        throw new Error('No valid biometric records found after processing. Check if employee names/IDs in Excel match those in the database.');
      }

      console.log('Processed attendance records:', attendanceRecords);

      let saveResult;
      try {
        const biometricDTOs = convertToBiometricRecordDTO(processingResult);
        
        saveResult = await importBiometricData(biometricDTOs);
        console.log('Biometric file endpoint success:', saveResult);
      } catch (endpointError) {
        console.log('Biometric file endpoint failed, trying batch endpoint...', endpointError);
        
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
      
      const result = {
        success: true,
        message: `Successfully processed ${processingResult.individualRecords.length} biometric events into ${attendanceRecords.length} attendance records`,
        summary: {
          totalEvents: processingResult.individualRecords.length,
          attendanceRecords: attendanceRecords.length,
          mappedEmployees: mappedCount,
          unmappedEmployees: unmappedCount,
          savedCount: saveResult?.length || saveResult?.count || attendanceRecords.length,
          unmappedNames: unmappedNames
        },
        data: processingResult
      };
      
      setImportResult(result);
      
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

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

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
      console.error('Import failed:', error);
    }
  };

  const renderLoading = () => (
    <div className="loading-section">
      <div className="spinner"></div>
      <p>Importing biometric attendance data...</p>
      <p>Mapping SIGN ON → Check In, SIGN OFF → Check Out</p>
    </div>
  );

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

  const renderExportButtons = () => {
    if (!processedData || !processedData.attendanceRecords || processedData.attendanceRecords.length === 0) {
      return null;
    }

    return (
      <div className="export-buttons">
        <h4>Export Options:</h4>
        <div className="button-group">
          <button onClick={exportTableToExcel} className="export-btn excel">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            Export to Excel
          </button>
          <button onClick={exportToCSV} className="export-btn csv">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
            Export to CSV
          </button>
        </div>
      </div>
    );
  };

  const renderSuccessSection = () => {
    return (
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
          
          {renderExportButtons()}
          
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
        <button onClick={() => {
          setImportResult(null);
          setProcessedData(null);
        }} className="import-another-btn">
          Import Another File
        </button>
      </div>
    );
  };

  const renderFileInput = () => (
    <div className="file-input-section">
      <h3>📊 Import Biometric Attendance Data</h3>
      <p>Select your biometric Excel file to import attendance records</p>
      <p className="file-info">
        <strong>Mapping:</strong> SIGN ON → Check In | SIGN OFF → Check Out
      </p>
      
      <div style={{ marginBottom: '20px', padding: '15px', background: '#f0f9ff', border: '2px dashed #3498db', borderRadius: '8px' }}>
        <h4 style={{ margin: '0 0 10px 0', fontSize: '16px', color: '#2c3e50' }}>📋 Get Excel Template with Employee IDs</h4>
        <p style={{ fontSize: '14px', marginBottom: '15px', color: '#555' }}>
          Download a pre-formatted Excel template with Employee IDs for accurate matching.
        </p>
        {loadingEmployees ? (
          <p style={{ fontSize: '14px', color: '#666', marginBottom: '15px' }}>
            Loading employee data...
          </p>
        ) : (
          <>
            <p style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}>
              Found {employees.length} employees in the system
            </p>
            <button 
              onClick={generateExcelTemplate}
              style={{ 
                background: '#27ae60', 
                color: 'white', 
                padding: '10px 20px', 
                border: 'none', 
                borderRadius: '6px', 
                cursor: 'pointer', 
                fontSize: '14px',
                fontWeight: 'bold',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'background 0.3s'
              }}
              onMouseEnter={(e) => e.target.style.background = '#219653'}
              onMouseLeave={(e) => e.target.style.background = '#27ae60'}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              Download Template with Employee IDs
            </button>
          </>
        )}
        <p style={{ fontSize: '12px', marginTop: '10px', color: '#666' }}>
          Includes Employee IDs for 100% accurate matching
        </p>
      </div>
      
      <div style={{ marginBottom: '20px', padding: '10px', background: '#f0f8ff', borderRadius: '8px' }}>
        <h4 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>Employee Information</h4>
        {loadingEmployees ? (
          <p style={{ fontSize: '12px', color: '#666' }}>Loading employee data...</p>
        ) : (
          <>
            <p style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>
              Total Employees: {employees.length}
            </p>
            <button 
              onClick={debugEmployeeMatching}
              style={{ background: '#6c757d', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
            >
              Show Employee IDs
            </button>
            <p style={{ fontSize: '12px', margin: '5px 0 0 0', color: '#666' }}>
              Check console for complete employee list with IDs
            </p>
          </>
        )}
      </div>
      
      <label className="file-upload-label">
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileChange}
          disabled={importing || loadingEmployees}
        />
        {loadingEmployees ? 'Loading employees...' : 'Choose Excel File'}
      </label>
      
      <div className="file-requirements">
        <p><strong>Supported File Format:</strong></p>
        <ul>
          <li>Excel files (.xlsx, .xls) or use template above</li>
          <li>Include Employee ID column for 100% accurate matching</li>
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
        {importResult && !importing && renderSuccessSection()}
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
        
        .export-buttons {
          margin: 20px 0;
          padding: 15px;
          background: #f8f9fa;
          border-radius: 8px;
          border: 1px solid #dee2e6;
        }
        
        .export-buttons h4 {
          margin: 0 0 15px 0;
          color: #495057;
          font-size: 16px;
        }
        
        .button-group {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          justify-content: center;
        }
        
        .export-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        
        .export-btn.excel {
          background: #217346;
          color: white;
        }
        
        .export-btn.excel:hover {
          background: #1b5e38;
        }
        
        .export-btn.csv {
          background: #6c757d;
          color: white;
        }
        
        .export-btn.csv:hover {
          background: #5a6268;
        }
        
        .export-btn svg {
          flex-shrink: 0;
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