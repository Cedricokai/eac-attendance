import { useState, useEffect } from 'react';
import { attendanceService } from '../services/attendanceService';

export const useAttendance = () => {
  const [presentEmployees, setPresentEmployees] = useState([]);
  const [absentEmployees, setAbsentEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  const refreshAttendance = async () => {
    setLoading(true);
    try {
      const presentRes = await attendanceService.getPresentEmployees();
      const absentRes = await attendanceService.getAbsentEmployees();
      setPresentEmployees(presentRes.data);
      setAbsentEmployees(absentRes.data);
    } catch (error) {
      console.error('Error fetching attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAttendance();
  }, []);

  return { presentEmployees, absentEmployees, loading, refreshAttendance };
};