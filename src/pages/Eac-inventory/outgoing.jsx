import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Typography,
  Spinner,
  Button,
  Chip // Make sure Chip is imported
} from "@material-tailwind/react";
import {
  HomeIcon,
  ClockIcon,
  UserGroupIcon,
  TruckIcon,
  UserCircleIcon
} from "@heroicons/react/24/solid";

const Outgoing = () => {
    const [outgoingProducts, setOutgoingProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchOutgoingProducts = async () => {
            const token = localStorage.getItem('jwtToken');
            try {
                const response = await fetch('http://localhost:8080/api/outgoing', {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    }
                });
                if (!response.ok) throw new Error(`Network error: ${response.status}`);
                const data = await response.json();
                setOutgoingProducts(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchOutgoingProducts();
    }, []);

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) return (
        <div className="flex justify-center items-center h-screen">
            <Spinner className="h-12 w-12" />
        </div>
    );

    if (error) return (
        <div className="flex justify-center items-center h-screen">
            <Card className="p-6">
                <Typography variant="h5" color="red">
                    Error: {error}
                </Typography>
            </Card>
        </div>
    );

    return (
        <div className="flex min-h-screen bg-gray-50">
            {/* Sidebar */}
            <div className="w-64 bg-gradient-to-b from-blue-800 to-blue-900 shadow-xl text-white">
                <div className="p-6 border-b border-blue-700 flex items-center gap-3">
                    <TruckIcon className="h-7 w-7 text-blue-300" />
                    <Typography variant="h5" className="font-bold">StockFlow</Typography>
                </div>
                <nav className="p-4">
                    <ul className="space-y-1">
                        <li>
                            <Button
                                variant="text"
                                color="white"
                                className="flex items-center gap-3 w-full justify-start hover:bg-blue-700/50 rounded-lg p-3"
                                onClick={() => navigate('/MasterPage')}
                            >
                                <HomeIcon className="h-5 w-5" />
                                <span className="font-medium">Dashboard</span>
                            </Button>
                        </li>
                        <li>
                            <Button
                                variant="text"
                                color="white"
                                className="flex items-center gap-3 w-full justify-start hover:bg-blue-700/50 rounded-lg p-3"
                                onClick={() => navigate('/History')}
                            >
                                <ClockIcon className="h-5 w-5" />
                                <span className="font-medium">History</span>
                            </Button>
                        </li>
                        <li>
                            <Button
                                variant="text"
                                color="white"
                                className="flex items-center gap-3 w-full justify-start hover:bg-blue-700/50 rounded-lg p-3"
                                onClick={() => navigate('/Userpage')}
                            >
                                <UserGroupIcon className="h-5 w-5" />
                                <span className="font-medium">Users</span>
                            </Button>
                        </li>
                    </ul>
                </nav>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-6 overflow-auto">
                <Typography variant="h3" color="blue-gray" className="mb-8">Outgoing Products</Typography>
                <Card className="overflow-hidden border border-gray-200 shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full table-auto">
    <thead>
      <tr className="bg-gray-100">
        <th className="w-[15%] p-4 text-left border-b border-blue-gray-100">
          <Typography variant="small" className="font-semibold">Name</Typography>
        </th>
        <th className="w-[10%] p-4 text-left border-b border-blue-gray-100">
          <Typography variant="small" className="font-semibold">Code</Typography>
        </th>
        <th className="w-[20%] p-4 text-left border-b border-blue-gray-100">
          <Typography variant="small" className="font-semibold">Description</Typography>
        </th>
        <th className="w-[10%] p-4 text-left border-b border-blue-gray-100">
          <Typography variant="small" className="font-semibold">Stock</Typography>
        </th>
        <th className="w-[15%] p-4 text-left border-b border-blue-gray-100">
          <Typography variant="small" className="font-semibold">Moved By</Typography>
        </th>
        <th className="w-[15%] p-4 text-left border-b border-blue-gray-100">
          <Typography variant="small" className="font-semibold">Requested By</Typography>
        </th>
        <th className="w-[10%] p-4 text-left border-b border-blue-gray-100">
          <Typography variant="small" className="font-semibold">Location</Typography>
        </th>
        <th className="w-[15%] p-4 text-left border-b border-blue-gray-100">
          <Typography variant="small" className="font-semibold">Movement Date</Typography>
        </th>
      </tr>
    </thead>
    <tbody>
      {outgoingProducts.map((product) => (
        <tr key={product.id} className="hover:bg-blue-gray-50/50">
          <td className="p-4 border-b border-blue-gray-50">
            <Typography variant="small" className="font-medium truncate">
              {product.name}
            </Typography>
          </td>
          <td className="p-4 border-b border-blue-gray-50">
            <Typography variant="small" className="truncate">
              {product.code}
            </Typography>
          </td>
          <td className="p-4 border-b border-blue-gray-50">
            <Typography variant="small" className="truncate">
              {product.description}
            </Typography>
          </td>
          <td className="p-4 border-b border-blue-gray-50">
            <Chip 
              value={product.stock} 
              color={
                product.stock > 10 ? 'green' : 
                product.stock > 0 ? 'amber' : 'red'
              }
              className="w-fit"
            />
          </td>
          <td className="p-4 border-b border-blue-gray-50">
            <Typography variant="small" className="truncate">
              {product.userName}
            </Typography>
          </td>
          <td className="p-4 border-b border-blue-gray-50">
            <Typography variant="small" className="truncate">
              {product.requestedBy}
            </Typography>
          </td>
          <td className="p-4 border-b border-blue-gray-50">
            <Typography variant="small" className="truncate">
              {product.location}
            </Typography>
          </td>
          <td className="p-4 border-b border-blue-gray-50">
            <Typography variant="small">
              {formatDate(product.movementDate)}
            </Typography>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default Outgoing;