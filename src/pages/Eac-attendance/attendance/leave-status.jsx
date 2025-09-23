import { useState, useEffect } from "react";

const LeaveStatus = () => {
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const getValidToken = () => {
    const token = localStorage.getItem('jwtToken');
    if (!token) throw new Error("No authentication token found");
    return token;
  };

  const fetchLeaveRequests = async () => {
    try {
      const token = getValidToken();
      const userResponse = await fetch("http://localhost:8080/auth/me", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      if (userResponse.ok) {
        const userData = await userResponse.json();
        const response = await fetch(`http://localhost:8080/api/leave/employee/${userData.username}`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        
        if (response.ok) {
          const data = await response.json();
          setLeaveRequests(data);
        }
      }
    } catch (error) {
      console.error("Error fetching leave requests:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Approved': return 'bg-green-100 text-green-800';
      case 'Rejected': return 'bg-red-100 text-red-800';
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getApprovalStage = (status) => {
    switch (status) {
      case 'Pending': return 1;
      case 'Supervisor Approved': return 2;
      case 'Planner Approved': return 3;
      case 'Approved': return 4;
      case 'Rejected': return 0;
      default: return 1;
    }
  };

  useEffect(() => {
    fetchLeaveRequests();
  }, []);

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Leave Request Status</h1>
      
      {leaveRequests.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-md">
          <p className="text-gray-600">No leave requests found</p>
        </div>
      ) : (
        <div className="space-y-6">
          {leaveRequests.map((request) => (
            <div key={request.id} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">{request.leaveType}</h3>
                  <p className="text-gray-600">
                    {new Date(request.startDate).toLocaleDateString()} - {new Date(request.endDate).toLocaleDateString()}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeClass(request.status)}`}>
                  {request.status}
                </span>
              </div>

              <div className="mb-4">
                <p className="text-gray-700">{request.reason}</p>
              </div>

              {/* Approval Progress */}
              <div className="mt-6">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Approval Progress</h4>
                <div className="flex items-center justify-between mb-2">
                  {['Submitted', 'Supervisor', 'Planner', 'HR'].map((stage, index) => (
                    <div key={stage} className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs ${
                        index < getApprovalStage(request.status) 
                          ? 'bg-green-500 text-white' 
                          : 'bg-gray-200 text-gray-600'
                      }`}>
                        {index < getApprovalStage(request.status) ? '✓' : index + 1}
                      </div>
                      <span className="text-xs mt-1 text-gray-600">{stage}</span>
                    </div>
                  ))}
                </div>
                <div className="bg-gray-200 h-2 rounded-full">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(getApprovalStage(request.status) / 4) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LeaveStatus;