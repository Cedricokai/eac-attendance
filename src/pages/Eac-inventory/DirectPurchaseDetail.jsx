import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  Card,
  CardBody,
  Typography,
  Button,
  Chip,
  Spinner,
  Alert,
  IconButton,
  Tooltip
} from "@material-tailwind/react";
import {
  ArrowLeftIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  CurrencyDollarIcon,
  ClockIcon
} from "@heroicons/react/24/outline";

const getApiBaseUrl = () => {
  const hostname = window.location.hostname;
  if (hostname === "localhost" || hostname === "127.0.0.1") return "http://localhost:8080";
  if (hostname.startsWith("192.168.")) return import.meta.env.VITE_API_BASE_URL_LOCAL;
  if (hostname === "100.114.178.13") return import.meta.env.VITE_API_BASE_URL_PUBLIC;
  return import.meta.env.VITE_API_BASE_URL_PUBLIC;
};
const API_BASE_URL = getApiBaseUrl();

const getHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('jwtToken')}`
});

const STATUS_CONFIG = {
  PENDING: { label: 'Pending', color: 'yellow', icon: <ClockIcon className="h-5 w-5" /> },
  ACCOUNTANT_APPROVED: { label: 'Approved by Accountant', color: 'indigo', icon: <CheckCircleIcon className="h-5 w-5" /> },
  REVIEWER_APPROVED: { label: 'Approved by Reviewer', color: 'green', icon: <CheckCircleIcon className="h-5 w-5" /> },
  REJECTED: { label: 'Rejected', color: 'red', icon: <XCircleIcon className="h-5 w-5" /> },
  PAID: { label: 'Paid', color: 'blue', icon: <CurrencyDollarIcon className="h-5 w-5" /> }
};

const DirectPurchaseDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRequest = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/direct-purchases/${id}`, {
        headers: getHeaders()
      });
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || `HTTP ${response.status}`);
      }
      const data = await response.json();
      setRequest(data);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load request details');
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequest();
  }, [id]);

  const handleAction = async (action) => {
    if (!request) return;
    let endpoint = '';
    let payload = { notes: '' };

    switch (action) {
      case 'approve':
        endpoint = `/api/direct-purchases/${request.id}/approve`;
        break;
      case 'reviewer':
        endpoint = `/api/direct-purchases/${request.id}/reviewer-approve`;
        break;
      case 'reject':
        endpoint = `/api/direct-purchases/${request.id}/reject`;
        break;
      case 'pay':
        endpoint = `/api/direct-purchases/${request.id}/pay`;
        break;
      default:
        return;
    }

    const notes = window.prompt('Enter notes (optional):');
    if (notes !== null) {
      payload.notes = notes;
    } else {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || 'Action failed');
      }
      toast.success('Action completed successfully');
      fetchRequest();
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner className="h-12 w-12" />
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="max-w-md p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          <h2 className="text-lg font-semibold">Error: {error || 'Request not found'}</h2>
          <Button
            onClick={() => navigate('/DirectPurchase')}
            className="mt-2"
            color="blue"
          >
            Back to List
          </Button>
        </div>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[request.status] || { label: request.status, color: 'gray', icon: null };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mb-6 flex items-center gap-4">
        <Tooltip content="Go Back">
          <IconButton
            variant="text"
            color="blue"
            onClick={() => navigate('/DirectPurchase')}
            className="rounded-full"
          >
            <ArrowLeftIcon className="h-6 w-6" />
          </IconButton>
        </Tooltip>
        <div>
          <Typography variant="h3" color="blue-gray">
            Direct Purchase Request
          </Typography>
          <Typography variant="small" color="gray">
            #{request.requestNumber || `DP-${request.id}`}
          </Typography>
        </div>
      </div>

      <Card className="mb-6">
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <Typography variant="small" color="gray">Request Date</Typography>
              <Typography variant="h6">
                {new Date(request.requestDate).toLocaleDateString()}
              </Typography>
            </div>
            <div>
              <Typography variant="small" color="gray">Requester (Procurement)</Typography>
              <Typography variant="h6">{request.requester}</Typography>
            </div>
            <div>
              <Typography variant="small" color="gray">Accountant (First Approver)</Typography>
              <Typography variant="h6">{request.accountant}</Typography>
            </div>
            <div>
              <Typography variant="small" color="gray">Status</Typography>
              <Chip
                value={statusConfig.label}
                color={statusConfig.color}
                size="sm"
                className="mt-1"
                icon={statusConfig.icon}
              />
            </div>
          </div>
          {request.notes && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <Typography variant="small" color="gray">Notes</Typography>
              <Typography variant="paragraph" className="whitespace-pre-wrap">
                {request.notes}
              </Typography>
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <div className="flex justify-between items-center mb-4">
            <Typography variant="h5">Items</Typography>
            <Typography variant="h6" className="text-green-600">
              Total: ₵{(request.totalAmount || 0).toFixed(2)}
            </Typography>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-max border border-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-3 text-left text-sm font-semibold text-gray-700 border">#</th>
                  <th className="p-3 text-left text-sm font-semibold text-gray-700 border">Description</th>
                  <th className="p-3 text-left text-sm font-semibold text-gray-700 border">Quantity</th>
                  <th className="p-3 text-left text-sm font-semibold text-gray-700 border">Unit Price (₵)</th>
                  <th className="p-3 text-left text-sm font-semibold text-gray-700 border">Total (₵)</th>
                </tr>
              </thead>
              <tbody>
                {request.items && request.items.length > 0 ? (
                  request.items.map((item, index) => (
                    <tr key={item.id || index} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="p-3 border text-sm">{index + 1}</td>
                      <td className="p-3 border text-sm">{item.description}</td>
                      <td className="p-3 border text-sm">{item.quantity}</td>
                      <td className="p-3 border text-sm">₵{(item.unitPrice || 0).toFixed(2)}</td>
                      <td className="p-3 border text-sm font-semibold">₵{(item.total || 0).toFixed(2)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="p-3 text-center text-gray-500">No items found</td>
                  </tr>
                )}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td colSpan="4" className="p-3 text-right font-bold">Grand Total</td>
                  <td className="p-3 font-bold text-green-600">
                    ₵{(request.totalAmount || 0).toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardBody>
      </Card>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button
          variant="outlined"
          color="blue"
          onClick={() => navigate('/DirectPurchase')}
        >
          Back to List
        </Button>

        {request.status === 'PENDING' && (
          <>
            <Button color="green" onClick={() => handleAction('approve')}>
              Approve (Accountant)
            </Button>
            <Button color="red" onClick={() => handleAction('reject')}>
              Reject
            </Button>
          </>
        )}

        {request.status === 'ACCOUNTANT_APPROVED' && (
          <Button color="indigo" onClick={() => handleAction('reviewer')}>
            Reviewer Approve
          </Button>
        )}

        {request.status === 'REVIEWER_APPROVED' && (
          <Button color="blue" onClick={() => handleAction('pay')}>
            Mark as Paid
          </Button>
        )}
      </div>
    </div>
  );
};

export default DirectPurchaseDetail;