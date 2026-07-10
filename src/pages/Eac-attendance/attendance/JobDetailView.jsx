// src/pages/Eac-attendance/attendance/JobDetailView.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import JobsManagement from './JobsManagement';

function JobDetailView() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [jobData, setJobData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const getApiBaseUrl = () => {
    const hostname = window.location.hostname;
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return "http://localhost:8080";
    }
    if (hostname.startsWith("192.168.")) {
      return import.meta.env.VITE_API_BASE_URL_LOCAL || "http://192.168.1.100:8080";
    }
    return import.meta.env.VITE_API_BASE_URL_PUBLIC || "http://100.114.178.13:8080";
  };

  const API_BASE_URL = getApiBaseUrl();

  const getAuthToken = () => {
    return localStorage.getItem('jwtToken') || localStorage.getItem('authToken');
  };

  useEffect(() => {
    const fetchJob = async () => {
      try {
        setLoading(true);
        const token = getAuthToken();
        const response = await fetch(`${API_BASE_URL}/api/jobs/${jobId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Job not found');
          }
          throw new Error(`Failed to fetch job: ${response.status}`);
        }

        const data = await response.json();
        setJobData(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching job:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (jobId) {
      fetchJob();
    }
  }, [jobId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-lg">Loading job details...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center h-screen">
        <div className="text-red-600 text-lg mb-4">⚠️ {error}</div>
        <button
          onClick={() => navigate('/JobsManagement')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Go to Jobs Management
        </button>
      </div>
    );
  }

  // Pass the job data to JobsManagement component to auto-open
  return <JobsManagement initialJobId={parseInt(jobId)} initialJobData={jobData} />;
}

export default JobDetailView;