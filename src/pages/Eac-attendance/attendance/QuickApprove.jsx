import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const QuickApprove = () => {
  const { leaveId } = useParams();
  const [status, setStatus] = useState('processing');
  const [message, setMessage] = useState('Approving your leave request...');
  const navigate = useNavigate();

  useEffect(() => {
    const approveLeave = async () => {
      try {
        // Call your bulk approve API
        const response = await axios.post(
          'http://localhost:8080/api/leave/bulk/approve',
          {
            leaveIds: [parseInt(leaveId)],
            feedback: 'Approved via email one-click'
          },
          {
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );

        if (response.data.success) {
          setStatus('success');
          setMessage('✅ Leave approved successfully!');
          
          // Auto close after 1.5 seconds
          setTimeout(() => {
            window.close();
          }, 1500);
        } else {
          throw new Error('Approval failed');
        }
      } catch (error) {
        console.error('Approval error:', error);
        setStatus('error');
        setMessage('❌ Approval failed. Please contact HR.');
        
        // Close after 3 seconds on error
        setTimeout(() => {
          window.close();
        }, 3000);
      }
    };

    approveLeave();
  }, [leaveId]);

  // Style for the auto-close window
  const styles = {
    container: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      fontFamily: 'Arial, sans-serif',
      padding: '20px',
      textAlign: 'center'
    },
    success: {
      color: '#5cb85c',
      fontSize: '24px',
      marginBottom: '10px'
    },
    error: {
      color: '#d9534f',
      fontSize: '24px',
      marginBottom: '10px'
    },
    processing: {
      color: '#f0ad4e',
      fontSize: '24px',
      marginBottom: '10px'
    },
    message: {
      fontSize: '16px',
      color: '#333',
      marginTop: '20px'
    },
    autoClose: {
      fontSize: '12px',
      color: '#999',
      marginTop: '30px'
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles[status]}>
        {status === 'processing' && '⏳'}
        {status === 'success' && '✅'}
        {status === 'error' && '❌'}
      </div>
      <div style={styles.message}>{message}</div>
      <div style={styles.autoClose}>
        This window will close automatically...
      </div>
    </div>
  );
};

export default QuickApprove;