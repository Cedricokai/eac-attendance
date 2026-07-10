import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

const QuickReject = () => {
  const { leaveId } = useParams();
  const [status, setStatus] = useState('processing');
  const [message, setMessage] = useState('Rejecting leave request...');

  useEffect(() => {
    const rejectLeave = async () => {
      try {
        const response = await axios.post(
          'http://localhost:8080/api/leave/bulk/reject',
          {
            leaveIds: [parseInt(leaveId)],
            feedback: 'Rejected via email'
          },
          {
            headers: { 'Content-Type': 'application/json' }
          }
        );

        setStatus('success');
        setMessage('✅ Leave rejected successfully');
        
        setTimeout(() => window.close(), 1500);
      } catch (error) {
        setStatus('error');
        setMessage('❌ Rejection failed');
        setTimeout(() => window.close(), 3000);
      }
    };

    rejectLeave();
  }, [leaveId]);

  const styles = {
    container: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      fontFamily: 'Arial, sans-serif',
      textAlign: 'center'
    },
    success: { color: '#5cb85c', fontSize: '24px' },
    error: { color: '#d9534f', fontSize: '24px' },
    message: { fontSize: '16px', marginTop: '20px' }
  };

  return (
    <div style={styles.container}>
      <div style={styles[status]}>
        {status === 'processing' ? '⏳' : status === 'success' ? '✅' : '❌'}
      </div>
      <div style={styles.message}>{message}</div>
    </div>
  );
};

export default QuickReject;