import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Card,
  CardBody,
  CardFooter,
  Typography,
  Button,
  Input,
  Textarea,
  Select,
  Option,
  Dialog,
  DialogHeader,
  DialogBody,
  DialogFooter,
  IconButton,
  Tooltip,
  Chip,
  Alert,
  Spinner,
  Radio
} from "@material-tailwind/react";
import {
  HomeIcon,
  PencilIcon,
  TrashIcon,
  CheckIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  ClockIcon,
  ArchiveBoxIcon,
  UserCircleIcon,
  CubeIcon
} from "@heroicons/react/24/outline";

const Products = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userEmail, setUserEmail] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [inputError, setInputError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const [selectionMode, setSelectionMode] = useState('multiple'); // 'single' or 'multiple'
  const navigate = useNavigate();

  const [updatedProduct, setUpdatedProduct] = useState({
    name: '',
    description: '',
    stock: '',
    userName: '',
    productType: '',
  });
  
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    stock: '',
    userName: '',
    productType: '',
    location: ''
  });

  useEffect(() => {
    const fetchProducts = async () => {
      const token = localStorage.getItem('jwtToken');
      try {
        const response = await fetch('http://localhost:8080/api/products', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        });
    
        if (!response.ok) {
          throw new Error(`Network response was not ok: ${response.status}`);
        }
    
        const data = await response.json();
        setProducts(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
  
    fetchProducts();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewProduct(prev => ({ ...prev, [name]: value }));
    setUpdatedProduct(prev => ({ ...prev, [name]: value }));
  };

  const handleApply = () => {
    if (selectedCategory === "projects") {
      navigate('/products');
    } else if (selectedCategory === "assets") {
      navigate('/assets');
    } else {
      setError('Please select a category');
    }
  };

  const toggleModal = () => setIsModalOpen(!isModalOpen);
  const toggleUpdateModal = () => setIsUpdateModalOpen(!isUpdateModalOpen);

  const toggleItemSelection = (productId) => {
    setSelectedItems(prevSelected => {
      if (selectionMode === 'single') {
        return prevSelected.includes(productId) ? [] : [productId];
      } else {
        return prevSelected.includes(productId)
          ? prevSelected.filter(id => id !== productId)
          : [...prevSelected, productId];
      }
    });
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
  
    if (!newProduct.name || !newProduct.description || !newProduct.stock || !newProduct.userName || !newProduct.productType) {
      setInputError('Please fill out all fields.');
      return;
    }
  
    try {
      const token = localStorage.getItem('jwtToken');
      const response = await fetch('http://localhost:8080/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(newProduct),
      });
  
      if (!response.ok) {
        const errorResponse = await response.text();
        throw new Error(`Network response was not ok: ${errorResponse}`);
      }
  
      const addedProduct = await response.json();
      setProducts(prev => [...prev, addedProduct]);
      setNewProduct({ name: '', description: '', stock: '', userName: '', productType: ''});
      setSuccessMessage('Product added successfully!');
      setInputError('');
      setTimeout(() => setSuccessMessage(''), 3000);
      toggleModal();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdateProduct = async (e) => {
    e.preventDefault();
  
    if (!updatedProduct.name || !updatedProduct.description || !updatedProduct.stock) {
      setInputError('Please fill out all fields.');
      return;
    }
  
    const token = localStorage.getItem('jwtToken');
  
    try {
      const response = await fetch(`http://localhost:8080/api/products/${currentProduct.id}?userEmail=${userEmail}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(updatedProduct),
      });
      
      if (!response.ok) {
        const errorResponse = await response.text();
        throw new Error(`Error: ${errorResponse}`);
      }
  
      const updatedProductData = await response.json();
      setProducts(prev =>
        prev.map(product => (product.id === updatedProductData.id ? updatedProductData : product))
      );
      setSuccessMessage('Product updated successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
      toggleUpdateModal();
    } catch (err) {
      setError(err.message);
    }
  };
  
  const deleteProduct = async (id) => {
    const token = localStorage.getItem('jwtToken');
    const confirmed = window.confirm("Are you sure you want to delete this product?");
    if (!confirmed) return;
  
    try {
      const response = await fetch(`http://localhost:8080/api/products/${id}?userEmail=${encodeURIComponent(userEmail)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorMessage = await response.text();
        throw new Error(errorMessage || 'Failed to delete product');
      }
  
      setProducts(prevProducts => prevProducts.filter(product => product.id !== id));
      setSuccessMessage('Product deleted successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(`Error deleting product: ${err.message}`);
    }
  };
  
  const handleEditProduct = (product) => {
    setCurrentProduct(product);
    setUpdatedProduct({
      name: product.name,
      code: product.code,
      description: product.description,
      stock: product.stock,
      userName: product.userName,
      productType: product.productType,
    });
    toggleUpdateModal();
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      
      return date.toLocaleString('en-US', {
        timeZone: 'UTC',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (error) {
      console.error('Date formatting error:', error);
      return 'Invalid Date';
    }
  };

  if (loading) return (
    <div className="flex justify-center items-center h-screen">
      <Spinner className="h-12 w-12" />
    </div>
  );

  if (error) return (
    <div className="flex justify-center items-center h-screen">
      <Alert color="red" className="max-w-md">
        <Typography variant="h5" color="white">
          Error: {error}
        </Typography>
      </Alert>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Enhanced Sidebar */}
      <div className="w-64 bg-gradient-to-b from-blue-800 to-blue-900 shadow-xl text-white transition-all duration-300">
        <div className="p-6 border-b border-blue-700 flex items-center gap-3">
          <CubeIcon className="h-7 w-7 text-blue-300" />
          <Typography variant="h5" className="font-bold">
            StockFlow
          </Typography>
        </div>
        <nav className="p-4">
          <ul className="space-y-1">
            <li>
              <Button
                variant="text"
                color="white"
                className="flex items-center gap-3 w-full justify-start hover:bg-blue-700/50 rounded-lg p-3 transition-colors"
                onClick={() => navigate('/InventoryDashboard')}
              >
                <HomeIcon className="h-5 w-5" />
                <span className="font-medium">Dashboard</span>
              </Button>
            </li>
            <li>
              <Button
                variant="text"
                color="white"
                className="flex items-center gap-3 w-full justify-start hover:bg-blue-700/50 rounded-lg p-3 transition-colors"
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
                className="flex items-center gap-3 w-full justify-start bg-blue-700/30 rounded-lg p-3 transition-colors"
              >
                <ArchiveBoxIcon className="h-5 w-5" />
                <span className="font-medium">Inventory</span>
              </Button>
            </li>
            <li>
              <Button
                variant="text"
                color="white"
                className="flex items-center gap-3 w-full justify-start hover:bg-blue-700/50 rounded-lg p-3 transition-colors"
                onClick={() => navigate('/Search')}
              >
                <MagnifyingGlassIcon className="h-5 w-5" />
                <span className="font-medium">Search</span>
              </Button>
            </li>
          </ul>
        </nav>
        <div className="absolute bottom-0 w-full p-4 border-t border-blue-700 bg-blue-800/30">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center">
              <UserCircleIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <Typography variant="small" className="font-semibold">Admin User</Typography>
              <Typography variant="small" className="text-blue-300">admin@stockflow.com</Typography>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 overflow-auto">
        <div className="flex justify-between items-center mb-8">
          <Typography variant="h3" color="blue-gray">Product Inventory</Typography>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <Radio
                name="selectionMode"
                label="Single Select"
                checked={selectionMode === 'single'}
                onChange={() => {
                  setSelectionMode('single');
                  setSelectedItems([]);
                }}
              />
              <Radio
                name="selectionMode"
                label="Multi Select"
                checked={selectionMode === 'multiple'}
                onChange={() => setSelectionMode('multiple')}
              />
            </div>
            <Button 
              variant="gradient" 
              className="flex items-center gap-2"
              onClick={toggleModal}
            >
              <PlusIcon className="h-5 w-5" />
              <span>Add Product</span>
            </Button>
          </div>
        </div>

        {/* Category Filter */}
        <div className="mb-6 flex items-center gap-4">
          <div className="w-64">
            <Typography variant="small" className="mb-2">
              Filter by Category
            </Typography>
            <Select 
              value={selectedCategory}
              onChange={(value) => setSelectedCategory(value)}
              label="Select Category"
            >
              <Option value="">All Categories</Option>
              <Option value="projects">Projects</Option>
              <Option value="assets">Assets</Option>
            </Select>
          </div>
          <Button 
            variant="filled" 
            className="mt-6"
            onClick={handleApply}
          >
            Apply Filter
          </Button>
        </div>

        {/* Products Table */}
        <Card className="overflow-hidden border border-gray-200 shadow-sm">
          <CardBody className="p-0">
            <table className="w-full min-w-max">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-4 border-b border-blue-gray-100 w-12">
                    <Typography variant="small" className="font-semibold">
                      Select
                    </Typography>
                  </th>
                  {["Name", "Code", "Description", "Brand", "Type", "Stock", "Entry Date", "Actions"].map((head) => (
                    <th key={head} className="p-4 border-b border-blue-gray-100">
                      <Typography variant="small" className="font-semibold">
                        {head}
                      </Typography>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {products.map((product, index) => (
                  <tr 
                    key={product.id} 
                    className={`${index % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-blue-gray-50/50 transition-colors`}
                  >
                    <td className="p-4 border-b border-blue-gray-50">
                      <Radio
                        name="product-selection"
                        checked={selectedItems.includes(product.id)}
                        onChange={() => toggleItemSelection(product.id)}
                        className="hover:cursor-pointer"
                      />
                    </td>
                    <td className="p-4 border-b border-blue-gray-50">
                      <Typography variant="small" className="font-medium">
                        {product.name}
                      </Typography>
                    </td>
                    <td className="p-4 border-b border-blue-gray-50">
                      <Chip 
                        value={product.code} 
                        color="blue" 
                        className="font-mono rounded-full" 
                      />
                    </td>
                    <td className="p-4 border-b border-blue-gray-50">
                      <Typography variant="small">
                        {product.description}
                      </Typography>
                    </td>
                    <td className="p-4 border-b border-blue-gray-50">
                      <Typography variant="small">
                        {product.userName}
                      </Typography>
                    </td>
                    <td className="p-4 border-b border-blue-gray-50">
                      <Chip 
                        value={product.productType} 
                        color="green" 
                        className="capitalize rounded-full" 
                      />
                    </td>
                    <td className="p-4 border-b border-blue-gray-50">
                      <Chip
                        value={`${product.stock} units`}
                        color={product.stock > 10 ? 'green' : product.stock > 0 ? 'amber' : 'red'}
                        className="rounded-full"
                      />
                    </td>
                    <td className="p-4 border-b border-blue-gray-50">
                      <Typography variant="small">
                        {formatDate(product.createdDate)}
                      </Typography>
                    </td>
                    <td className="p-4 border-b border-blue-gray-50">
                      <div className="flex gap-2">
                        <Tooltip content="Edit Product">
                          <IconButton 
                            variant="text" 
                            color="blue"
                            onClick={() => handleEditProduct(product)}
                          >
                            <PencilIcon className="h-4 w-4" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip content="Delete Product">
                          <IconButton 
                            variant="text" 
                            color="red"
                            onClick={() => deleteProduct(product.id)}
                          >
                            <TrashIcon className="h-4 w-4" />
                          </IconButton>
                        </Tooltip>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>

        {/* Footer */}
        <CardFooter className="mt-8 text-center">
          <Typography variant="small" color="gray">
            Inventory Management System © {new Date().getFullYear()}
          </Typography>
        </CardFooter>
      </div>

      {/* Add Product Modal */}
      <Dialog open={isModalOpen} handler={toggleModal} size="lg">
        <DialogHeader className="border-b border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <PlusIcon className="h-6 w-6 text-blue-500" />
            <Typography variant="h5" color="blue-gray">
              Add New Product
            </Typography>
          </div>
        </DialogHeader>
        <DialogBody className="p-6">
          <form className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input 
                label="Product Name" 
                name="name" 
                value={newProduct.name} 
                onChange={handleInputChange} 
                required
                className="bg-gray-50"
              />
              <Input 
                label="Brand" 
                name="userName" 
                value={newProduct.userName} 
                onChange={handleInputChange} 
                required
                className="bg-gray-50"
              />
              <Input 
                type="number" 
                label="Stock Quantity" 
                name="stock" 
                value={newProduct.stock} 
                onChange={handleInputChange} 
                required
                className="bg-gray-50"
              />
              <Input 
                label="Product Type" 
                name="productType" 
                value={newProduct.productType} 
                onChange={handleInputChange} 
                required
                className="bg-gray-50"
              />
            </div>
            <Textarea 
              label="Description" 
              name="description" 
              value={newProduct.description} 
              onChange={handleInputChange} 
              required 
              rows={4}
              className="bg-gray-50"
            />
          </form>
          {inputError && (
            <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-100">
              <Typography color="red" variant="small" className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {inputError}
              </Typography>
            </div>
          )}
        </DialogBody>
        <DialogFooter className="flex justify-between p-6 border-t border-gray-200">
          <Button
            variant="outlined"
            color="gray"
            onClick={toggleModal}
            className="mr-2"
          >
            Cancel
          </Button>
          <Button
            variant="gradient"
            color="green"
            onClick={handleAddProduct}
            className="flex items-center gap-2"
          >
            <PlusIcon className="h-4 w-4" />
            Add Product
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Update Product Modal */}
      <Dialog open={isUpdateModalOpen} handler={toggleUpdateModal} size="lg">
        <DialogHeader className="border-b border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <PencilIcon className="h-6 w-6 text-blue-500" />
            <Typography variant="h5" color="blue-gray">
              Update Product
            </Typography>
          </div>
        </DialogHeader>
        <DialogBody className="p-6">
          <form className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input 
                label="Product Name" 
                name="name" 
                value={updatedProduct.name} 
                onChange={handleInputChange} 
                required
                className="bg-gray-50"
              />
              <Input 
                label="Brand" 
                name="userName" 
                value={updatedProduct.userName} 
                onChange={handleInputChange} 
                required
                className="bg-gray-50"
              />
              <Input 
                type="number" 
                label="Stock Quantity" 
                name="stock" 
                value={updatedProduct.stock} 
                onChange={handleInputChange} 
                required
                className="bg-gray-50"
              />
              <Input 
                label="Product Type" 
                name="productType" 
                value={updatedProduct.productType} 
                onChange={handleInputChange} 
                required
                className="bg-gray-50"
              />
            </div>
            <Textarea 
              label="Description" 
              name="description" 
              value={updatedProduct.description} 
              onChange={handleInputChange} 
              required 
              rows={4}
              className="bg-gray-50"
            />
            <Input
              label="Your Email"
              type="email"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              required
              className="bg-gray-50"
              placeholder="Enter your email for audit trail"
            />
          </form>
          {inputError && (
            <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-100">
              <Typography color="red" variant="small" className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {inputError}
              </Typography>
            </div>
          )}
        </DialogBody>
        <DialogFooter className="flex justify-between p-6 border-t border-gray-200">
          <Button
            variant="outlined"
            color="gray"
            onClick={toggleUpdateModal}
            className="mr-2"
          >
            Cancel
          </Button>
          <Button
            variant="gradient"
            color="green"
            onClick={handleUpdateProduct}
            className="flex items-center gap-2"
          >
            <PencilIcon className="h-4 w-4" />
            Update Product
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Success Alert */}
      {successMessage && (
        <Alert 
          icon={<CheckIcon className="h-5 w-5" />}
          className="fixed bottom-4 right-4 w-auto"
          onClose={() => setSuccessMessage('')}
          color="green"
        >
          {successMessage}
        </Alert>
      )}
    </div>
  );
};

export default Products;