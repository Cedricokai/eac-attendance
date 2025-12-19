// ProductHistory.jsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  TextField,
  InputAdornment,
  Grid,
  Card,
  CardContent,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  Button
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import RefreshIcon from '@mui/icons-material/Refresh';
import EventNoteIcon from '@mui/icons-material/EventNote';
import PersonIcon from '@mui/icons-material/Person';
import InventoryIcon from '@mui/icons-material/Inventory';
import ScheduleIcon from '@mui/icons-material/Schedule';
import { format } from 'date-fns';

const ProductHistory = () => {
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState('all');
  const [filterUser, setFilterUser] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [stats, setStats] = useState({
    totalActions: 0,
    todayActions: 0,
    uniqueUsers: 0
  });

  // Action type colors
  const actionColors = {
    ADD: 'success',
    EDIT: 'info',
    DELETE: 'error',
    TRANSFER: 'warning',
    ISSUE: 'secondary'
  };

  // Action type icons
  const actionIcons = {
    ADD: '➕',
    EDIT: '✏️',
    DELETE: '🗑️',
    TRANSFER: '🔄',
    ISSUE: '📤'
  };

    const getApiBaseUrl = () => {
  const hostname = window.location.hostname;
  const port = window.location.port;

  console.log("🖥️ Current hostname:", hostname);
  console.log("🔌 Current port:", port);

  // If frontend is opened via localhost → use localhost backend
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    console.log("🏠 Using LOCALHOST API URL");
    return "http://localhost:8080";
  }

  // LAN access
  if (hostname.startsWith("192.168.")) {
    console.log("🏠 Using LAN API URL");
    return import.meta.env.VITE_API_BASE_URL_LOCAL;
  }

  // Public / Tailscale / Cloudflare IP
  if (hostname === "100.114.178.13") {
    console.log("🌐 Using PUBLIC API URL");
    return import.meta.env.VITE_API_BASE_URL_PUBLIC;
  }

  // Default fallback
  console.log("🌍 Using PUBLIC API URL (fallback)");
  return import.meta.env.VITE_API_BASE_URL_PUBLIC;
};

  const API_BASE_URL = getApiBaseUrl();

  // Fetch product history
  const fetchHistory = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/product-history`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setHistoryData(data);
      
      // Calculate statistics
      calculateStats(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching product history:', err);
      setError('Failed to load product history. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics
  const calculateStats = (data) => {
    const today = new Date().toISOString().split('T')[0];
    const todayActions = data.filter(item => {
      const actionDate = new Date(item.actionDate).toISOString().split('T')[0];
      return actionDate === today;
    }).length;
    
    const uniqueUsers = [...new Set(data.map(item => item.userEmail))].length;
    
    setStats({
      totalActions: data.length,
      todayActions,
      uniqueUsers
    });
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // Filter history data
  const filteredData = historyData.filter(item => {
    const matchesSearch = 
      item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.userEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.productId?.toString().includes(searchTerm);
    
    const matchesAction = filterAction === 'all' || item.actionType === filterAction;
    const matchesUser = !filterUser || item.userEmail?.toLowerCase().includes(filterUser.toLowerCase());
    
    return matchesSearch && matchesAction && matchesUser;
  });

  // Handle pagination
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Format date
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return format(date, 'MMM dd, yyyy HH:mm:ss');
    } catch (error) {
      return 'Invalid date';
    }
  };

  // Get time ago
  const getTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    return `${Math.floor(diffInSeconds / 86400)} days ago`;
  };

  // Paginated data
  const paginatedData = filteredData.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  // Get unique action types for filter
  const uniqueActionTypes = [...new Set(historyData.map(item => item.actionType))];

  // Get unique users for filter
  const uniqueUsers = [...new Set(historyData.map(item => item.userEmail))];

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Product History Log
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Track all actions performed on inventory products
        </Typography>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <EventNoteIcon color="primary" sx={{ fontSize: 40, mr: 2 }} />
                <Box>
                  <Typography color="textSecondary" variant="body2">
                    Total Actions
                  </Typography>
                  <Typography variant="h4">
                    {stats.totalActions}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <ScheduleIcon color="success" sx={{ fontSize: 40, mr: 2 }} />
                <Box>
                  <Typography color="textSecondary" variant="body2">
                    Today's Actions
                  </Typography>
                  <Typography variant="h4">
                    {stats.todayActions}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <PersonIcon color="info" sx={{ fontSize: 40, mr: 2 }} />
                <Box>
                  <Typography color="textSecondary" variant="body2">
                    Active Users
                  </Typography>
                  <Typography variant="h4">
                    {stats.uniqueUsers}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters and Search */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              placeholder="Search history..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth>
              <InputLabel>Action Type</InputLabel>
              <Select
                value={filterAction}
                label="Action Type"
                onChange={(e) => setFilterAction(e.target.value)}
              >
                <MenuItem value="all">All Actions</MenuItem>
                {uniqueActionTypes.map((action) => (
                  <MenuItem key={action} value={action}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <span>{actionIcons[action] || '📝'}</span>
                      <span>{action}</span>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              fullWidth
              label="Filter by User"
              placeholder="Enter user email..."
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} sm={2}>
            <Box display="flex" gap={1}>
              <Tooltip title="Refresh">
                <IconButton onClick={fetchHistory}>
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Clear Filters">
                <Button
                  variant="outlined"
                  onClick={() => {
                    setSearchTerm('');
                    setFilterAction('all');
                    setFilterUser('');
                  }}
                >
                  Clear
                </Button>
              </Tooltip>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* History Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Action</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Product ID</TableCell>
              <TableCell>User</TableCell>
              <TableCell>Date & Time</TableCell>
              <TableCell>Time Ago</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  <InventoryIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary">
                    No history records found
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {searchTerm || filterAction !== 'all' || filterUser
                      ? 'Try adjusting your filters'
                      : 'Product actions will appear here'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((item) => (
                <TableRow key={item.id} hover>
                  <TableCell>
                    <Chip
                      label={item.actionType}
                      color={actionColors[item.actionType] || 'default'}
                      icon={<span>{actionIcons[item.actionType] || '📝'}</span>}
                      variant="outlined"
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {item.description}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={`ID: ${item.productId}`}
                      variant="outlined"
                      size="small"
                      onClick={() => {
                        // Navigate to product details if needed
                        console.log('View product:', item.productId);
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      <PersonIcon fontSize="small" color="action" />
                      <Typography variant="body2">
                        {item.userEmail}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {formatDate(item.actionDate)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {getTimeAgo(item.actionDate)}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      <TablePagination
        rowsPerPageOptions={[5, 10, 25, 50]}
        component="div"
        count={filteredData.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        sx={{ mt: 2 }}
      />

      {/* Summary */}
      <Paper sx={{ p: 2, mt: 3 }}>
        <Grid container justifyContent="space-between" alignItems="center">
          <Grid item>
            <Typography variant="body2" color="text.secondary">
              Showing {paginatedData.length} of {filteredData.length} records
              {filteredData.length !== historyData.length && ` (filtered from ${historyData.length} total)`}
            </Typography>
          </Grid>
          <Grid item>
            <Typography variant="body2" color="text.secondary">
              Last updated: {new Date().toLocaleTimeString()}
            </Typography>
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
};

export default ProductHistory;