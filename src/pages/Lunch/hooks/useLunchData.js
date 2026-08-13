import { useState, useEffect } from 'react';
import { lunchApi } from '../services/lunchApi';

export const useLunchData = (endpoint, params) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await lunchApi[endpoint](params);
        setData(res.data);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [endpoint, params]);

  return { data, loading, error, refetch: () => fetchData() };
};