export const formatCurrency = (amount) => {
  return `₵${Number(amount).toFixed(2)}`;
};

export const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

export const getStatusColor = (status) => {
  const colors = {
    ACTIVE: 'green',
    SUSPENDED: 'yellow',
    EXPIRED: 'red',
  };
  return colors[status] || 'gray';
};