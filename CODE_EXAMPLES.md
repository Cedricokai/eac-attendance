# CODE EXAMPLES & QUICK START
## Step-by-Step Implementation Code Snippets

---

## STEP 1: Update Products with Unit Cost

### 1.1 Backend Entity Update
**File:** `Product.java` (Backend)

```java
package com.eac.inventory.entity;

import javax.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "products")
public class Product {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false)
    private String name;
    
    private String description;
    private String code;
    
    @Column(nullable = false)
    private Integer stock;
    
    private String userName;
    private String productType;
    
    // NEW FIELDS FOR COST TRACKING
    @Column(name = "unit_cost", nullable = false, precision = 10, scale = 2)
    private BigDecimal unitCost = BigDecimal.ZERO;
    
    @Column(name = "total_value", insertable = false, updatable = false, 
            precision = 15, scale = 2)
    private BigDecimal totalValue;
    
    // NEW: Link to Cost Center
    @ManyToOne
    @JoinColumn(name = "cost_center_id")
    private CostCenter costCenter;
    
    // Existing fields
    private LocalDateTime createdDate;
    private LocalDateTime updatedDate;
    
    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    
    // ... other getters/setters ...
    
    public BigDecimal getUnitCost() { return unitCost; }
    public void setUnitCost(BigDecimal unitCost) { this.unitCost = unitCost; }
    
    public BigDecimal getTotalValue() { return totalValue; }
    
    public CostCenter getCostCenter() { return costCenter; }
    public void setCostCenter(CostCenter costCenter) { this.costCenter = costCenter; }
    
    @PrePersist
    protected void onCreate() {
        createdDate = LocalDateTime.now();
        updatedDate = LocalDateTime.now();
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedDate = LocalDateTime.now();
    }
}
```

### 1.2 Frontend Component Update
**File:** `src/pages/Eac-inventory/products.jsx`

```jsx
// Add to existing Products component - key changes shown

const [newProduct, setNewProduct] = useState({
  name: '',
  description: '',
  stock: '',
  userName: '',
  productType: '',
  location: '',
  unitCost: '', // NEW FIELD
  costCenterId: '' // NEW FIELD
});

const [updatedProduct, setUpdatedProduct] = useState({
  name: '',
  description: '',
  stock: '',
  userName: '',
  productType: '',
  unitCost: '', // NEW FIELD
  costCenterId: '' // NEW FIELD
});

// In the Add Product Modal - add this field
<Input 
  type="number"
  step="0.01"
  label="Unit Cost (GHS)" 
  name="unitCost" 
  value={newProduct.unitCost} 
  onChange={handleInputChange}
  required
  className="bg-gray-50"
/>

// In the table header - add this column
<th className="p-4 border-b border-blue-gray-100">
  <Typography variant="small" className="font-semibold">
    Unit Cost
  </Typography>
</th>

// In the table body - add this cell
<td className="p-4 border-b border-blue-gray-50">
  <Typography variant="small" className="font-medium">
    GHS {parseFloat(product.unitCost || 0).toFixed(2)}
  </Typography>
</td>

// Add another column for total value
<th className="p-4 border-b border-blue-gray-100">
  <Typography variant="small" className="font-semibold">
    Total Value
  </Typography>
</th>

<td className="p-4 border-b border-blue-gray-50">
  <Chip
    value={`GHS ${(product.stock * product.unitCost).toFixed(2)}`}
    color="blue"
    className="rounded-full"
  />
</td>
```

---

## STEP 2: Create Cost Centers

### 2.1 Backend Entity
**File:** `CostCenter.java`

```java
package com.eac.inventory.entity;

import javax.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "cost_centers", 
       uniqueConstraints = {
           @UniqueConstraint(columnNames = "name"),
           @UniqueConstraint(columnNames = "project_code")
       })
public class CostCenter {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false, unique = true)
    private String name;
    
    private String description;
    
    @Column(unique = true)
    private String projectCode;
    
    private String department;
    
    @Column(precision = 15, scale = 2)
    private BigDecimal budget;
    
    @Enumerated(EnumType.STRING)
    private Status status = Status.ACTIVE;
    
    private LocalDateTime createdDate;
    private LocalDateTime updatedDate;
    private String createdBy;
    
    @OneToMany(mappedBy = "costCenter")
    private java.util.List<Product> products;
    
    @OneToMany(mappedBy = "costCenter")
    private java.util.List<ProductRequest> productRequests;
    
    public enum Status {
        ACTIVE, INACTIVE
    }
    
    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    
    public String getProjectCode() { return projectCode; }
    public void setProjectCode(String projectCode) { this.projectCode = projectCode; }
    
    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }
    
    public BigDecimal getBudget() { return budget; }
    public void setBudget(BigDecimal budget) { this.budget = budget; }
    
    public Status getStatus() { return status; }
    public void setStatus(Status status) { this.status = status; }
    
    public LocalDateTime getCreatedDate() { return createdDate; }
    public LocalDateTime getUpdatedDate() { return updatedDate; }
    public String getCreatedBy() { return createdBy; }
    
    @PrePersist
    protected void onCreate() {
        createdDate = LocalDateTime.now();
        updatedDate = LocalDateTime.now();
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedDate = LocalDateTime.now();
    }
}
```

### 2.2 Backend Repository
**File:** `CostCenterRepository.java`

```java
package com.eac.inventory.repository;

import com.eac.inventory.entity.CostCenter;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface CostCenterRepository extends JpaRepository<CostCenter, Long> {
    
    Optional<CostCenter> findByName(String name);
    Optional<CostCenter> findByProjectCode(String projectCode);
    
    List<CostCenter> findByStatus(CostCenter.Status status);
    
    @Query("SELECT cc FROM CostCenter cc WHERE cc.status = 'ACTIVE'")
    List<CostCenter> findAllActive();
    
    @Query("SELECT cc FROM CostCenter cc WHERE cc.department = ?1 AND cc.status = 'ACTIVE'")
    List<CostCenter> findByDepartment(String department);
}
```

### 2.3 Backend Service
**File:** `CostCenterService.java`

```java
package com.eac.inventory.service;

import com.eac.inventory.entity.CostCenter;
import com.eac.inventory.repository.CostCenterRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class CostCenterService {
    
    @Autowired
    private CostCenterRepository costCenterRepository;
    
    public CostCenter createCostCenter(CostCenter costCenter) {
        if (costCenterRepository.findByName(costCenter.getName()).isPresent()) {
            throw new RuntimeException("Cost center with name already exists");
        }
        return costCenterRepository.save(costCenter);
    }
    
    public CostCenter updateCostCenter(Long id, CostCenter updates) {
        CostCenter costCenter = costCenterRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Cost center not found"));
        
        if (updates.getName() != null) costCenter.setName(updates.getName());
        if (updates.getDescription() != null) costCenter.setDescription(updates.getDescription());
        if (updates.getBudget() != null) costCenter.setBudget(updates.getBudget());
        if (updates.getStatus() != null) costCenter.setStatus(updates.getStatus());
        
        return costCenterRepository.save(costCenter);
    }
    
    public List<CostCenter> getAllActiveCostCenters() {
        return costCenterRepository.findAllActive();
    }
    
    public Optional<CostCenter> getCostCenterById(Long id) {
        return costCenterRepository.findById(id);
    }
    
    public void deleteCostCenter(Long id) {
        costCenterRepository.deleteById(id);
    }
}
```

### 2.4 Backend Controller
**File:** `CostCenterController.java`

```java
package com.eac.inventory.controller;

import com.eac.inventory.entity.CostCenter;
import com.eac.inventory.service.CostCenterService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/cost-centers")
@CrossOrigin(origins = "*")
public class CostCenterController {
    
    @Autowired
    private CostCenterService costCenterService;
    
    @GetMapping
    public ResponseEntity<List<CostCenter>> getAllCostCenters() {
        return ResponseEntity.ok(costCenterService.getAllActiveCostCenters());
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<CostCenter> getCostCenter(@PathVariable Long id) {
        return costCenterService.getCostCenterById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }
    
    @PostMapping
    public ResponseEntity<CostCenter> createCostCenter(@RequestBody CostCenter costCenter) {
        try {
            CostCenter created = costCenterService.createCostCenter(costCenter);
            return ResponseEntity.ok(created);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }
    
    @PutMapping("/{id}")
    public ResponseEntity<CostCenter> updateCostCenter(
            @PathVariable Long id,
            @RequestBody CostCenter updates) {
        try {
            CostCenter updated = costCenterService.updateCostCenter(id, updates);
            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCostCenter(@PathVariable Long id) {
        costCenterService.deleteCostCenter(id);
        return ResponseEntity.noContent().build();
    }
}
```

---

## STEP 3 & 4: Product Request Model & Employee Request Page

### 3.1 Backend Entity - ProductRequest
**File:** `ProductRequest.java`

```java
package com.eac.inventory.entity;

import javax.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "product_requests")
public class ProductRequest {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cost_center_id")
    private CostCenter costCenter;
    
    @Column(nullable = false)
    private Integer quantityRequested;
    
    private Integer quantityApproved;
    
    private Integer quantityIssued = 0;
    
    private String purpose;
    private String comments;
    
    @Column(precision = 10, scale = 2)
    private BigDecimal unitCost;
    
    @Column(precision = 15, scale = 2)
    private BigDecimal totalCost;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RequestStatus status = RequestStatus.PENDING;
    
    private String rejectionReason;
    
    // Audit fields
    private LocalDateTime createdDate;
    private LocalDateTime updatedDate;
    private LocalDateTime requestedByDate;
    private LocalDateTime approvedByProcurementDate;
    private String approvedByProcurementUser;
    private LocalDateTime approvedByStoreDate;
    private String approvedByStoreUser;
    private LocalDateTime rejectedDate;
    private String rejectedByUser;
    private LocalDateTime issuedDate;
    private String issuedByUser;
    
    public enum RequestStatus {
        PENDING,
        APPROVED_BY_PROCUREMENT,
        APPROVED_BY_STORE,
        REJECTED,
        ISSUED,
        CANCELLED
    }
    
    // Business methods
    public BigDecimal calculateTotalCost() {
        if (quantityApproved != null && unitCost != null) {
            return unitCost.multiply(new BigDecimal(quantityApproved));
        }
        return BigDecimal.ZERO;
    }
    
    public void approveProcurement(Integer approvedQty, String user) {
        this.quantityApproved = approvedQty;
        this.totalCost = calculateTotalCost();
        this.status = RequestStatus.APPROVED_BY_PROCUREMENT;
        this.approvedByProcurementUser = user;
        this.approvedByProcurementDate = LocalDateTime.now();
    }
    
    public void rejectProcurement(String reason, String user) {
        this.status = RequestStatus.REJECTED;
        this.rejectionReason = reason;
        this.rejectedByUser = user;
        this.rejectedDate = LocalDateTime.now();
    }
    
    public void issue(Integer issuedQty, String user) {
        this.quantityIssued = issuedQty;
        this.status = RequestStatus.ISSUED;
        this.issuedByUser = user;
        this.issuedDate = LocalDateTime.now();
        this.totalCost = unitCost.multiply(new BigDecimal(issuedQty));
    }
    
    // Getters and Setters (abbreviated - include all fields)
    public Long getId() { return id; }
    public Employee getEmployee() { return employee; }
    public void setEmployee(Employee employee) { this.employee = employee; }
    public Product getProduct() { return product; }
    public void setProduct(Product product) { this.product = product; }
    public Integer getQuantityRequested() { return quantityRequested; }
    public void setQuantityRequested(Integer quantityRequested) { this.quantityRequested = quantityRequested; }
    public Integer getQuantityApproved() { return quantityApproved; }
    public void setQuantityApproved(Integer quantityApproved) { this.quantityApproved = quantityApproved; }
    public Integer getQuantityIssued() { return quantityIssued; }
    public void setQuantityIssued(Integer quantityIssued) { this.quantityIssued = quantityIssued; }
    public String getPurpose() { return purpose; }
    public void setPurpose(String purpose) { this.purpose = purpose; }
    public String getComments() { return comments; }
    public void setComments(String comments) { this.comments = comments; }
    public BigDecimal getUnitCost() { return unitCost; }
    public void setUnitCost(BigDecimal unitCost) { this.unitCost = unitCost; }
    public BigDecimal getTotalCost() { return totalCost; }
    public void setTotalCost(BigDecimal totalCost) { this.totalCost = totalCost; }
    public RequestStatus getStatus() { return status; }
    public void setStatus(RequestStatus status) { this.status = status; }
    public CostCenter getCostCenter() { return costCenter; }
    public void setCostCenter(CostCenter costCenter) { this.costCenter = costCenter; }
    
    @PrePersist
    protected void onCreate() {
        createdDate = LocalDateTime.now();
        updatedDate = LocalDateTime.now();
        requestedByDate = LocalDateTime.now();
        if (unitCost == null) unitCost = BigDecimal.ZERO;
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedDate = LocalDateTime.now();
    }
}
```

### 4.1 Frontend - ProductRequest Component
**File:** `src/pages/Eac-inventory/ProductRequest.jsx`

```jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardBody,
  CardHeader,
  Typography,
  Button,
  Input,
  Select,
  Option,
  Textarea,
  Dialog,
  DialogHeader,
  DialogBody,
  DialogFooter,
  Chip,
  Spinner,
  Alert
} from "@material-tailwind/react";
import { PlusIcon, CheckIcon } from "@heroicons/react/24/outline";

const ProductRequest = () => {
  const [products, setProducts] = useState([]);
  const [costCenters, setCostCenters] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    productId: '',
    quantityRequested: '',
    purpose: '',
    comments: '',
    costCenterId: ''
  });

  useEffect(() => {
    const fetchInitialData = async () => {
      const token = localStorage.getItem('jwtToken');
      try {
        const [productsRes, costCentersRes, myRequestsRes] = await Promise.all([
          fetch('http://localhost:8080/api/products', {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch('http://localhost:8080/api/cost-centers', {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch('http://localhost:8080/api/product-requests/my-requests', {
            headers: { 'Authorization': `Bearer ${token}` }
          })
        ]);

        if (productsRes.ok) setProducts(await productsRes.json());
        if (costCentersRes.ok) setCostCenters(await costCentersRes.json());
        if (myRequestsRes.ok) setMyRequests(await myRequestsRes.json());
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.productId || !formData.quantityRequested) {
      setError('Product and Quantity are required');
      return;
    }

    const token = localStorage.getItem('jwtToken');
    const userId = JSON.parse(atob(token.split('.')[1])).sub;

    try {
      const response = await fetch('http://localhost:8080/api/product-requests', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          employeeId: userId,
          productId: formData.productId,
          quantityRequested: parseInt(formData.quantityRequested),
          purpose: formData.purpose,
          comments: formData.comments,
          costCenterId: formData.costCenterId || null
        })
      });

      if (response.ok) {
        const newRequest = await response.json();
        setMyRequests(prev => [newRequest, ...prev]);
        setSuccessMessage('Request submitted successfully!');
        setFormData({ productId: '', quantityRequested: '', purpose: '', comments: '', costCenterId: '' });
        setIsModalOpen(false);
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        throw new Error('Failed to submit request');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'PENDING': 'yellow',
      'APPROVED_BY_PROCUREMENT': 'blue',
      'APPROVED_BY_STORE': 'indigo',
      'ISSUED': 'green',
      'REJECTED': 'red',
      'CANCELLED': 'gray'
    };
    return colors[status] || 'gray';
  };

  const selectedProduct = products.find(p => p.id === parseInt(formData.productId));

  if (loading) return <div className="flex justify-center items-center h-screen"><Spinner /></div>;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <Typography variant="h3" color="blue-gray">Product Request</Typography>
        <Button
          color="blue"
          className="flex items-center gap-2"
          onClick={() => setIsModalOpen(true)}
        >
          <PlusIcon className="h-5 w-5" />
          New Request
        </Button>
      </div>

      {error && (
        <Alert color="red" className="mb-4">{error}</Alert>
      )}
      {successMessage && (
        <Alert color="green" icon={<CheckIcon />} className="mb-4">{successMessage}</Alert>
      )}

      {/* Request Form Modal */}
      <Dialog open={isModalOpen} handler={() => setIsModalOpen(false)} size="lg">
        <DialogHeader>Request Product</DialogHeader>
        <DialogBody>
          <form className="space-y-4">
            <div>
              <Typography variant="small" className="font-semibold mb-2">Product *</Typography>
              <Select
                label="Select product"
                name="productId"
                value={formData.productId}
                onChange={(value) => setFormData(prev => ({ ...prev, productId: value }))}
              >
                {products.map(product => (
                  <Option key={product.id} value={product.id.toString()}>
                    {product.name} (Available: {product.stock})
                  </Option>
                ))}
              </Select>
            </div>

            {selectedProduct && (
              <Card className="bg-blue-50 p-4">
                <Typography variant="small">
                  <strong>Unit Cost:</strong> GHS {selectedProduct.unitCost?.toFixed(2) || '0.00'}
                </Typography>
                <Typography variant="small">
                  <strong>Stock Available:</strong> {selectedProduct.stock} units
                </Typography>
              </Card>
            )}

            <div>
              <Typography variant="small" className="font-semibold mb-2">Quantity Requested *</Typography>
              <Input
                type="number"
                name="quantityRequested"
                value={formData.quantityRequested}
                onChange={handleInputChange}
                max={selectedProduct?.stock || 1000}
                label="Enter quantity"
              />
            </div>

            <div>
              <Typography variant="small" className="font-semibold mb-2">Cost Center</Typography>
              <Select
                label="Select cost center (optional)"
                name="costCenterId"
                value={formData.costCenterId}
                onChange={(value) => setFormData(prev => ({ ...prev, costCenterId: value }))}
              >
                {costCenters.map(cc => (
                  <Option key={cc.id} value={cc.id.toString()}>
                    {cc.name}
                  </Option>
                ))}
              </Select>
            </div>

            <div>
              <Typography variant="small" className="font-semibold mb-2">Purpose</Typography>
              <Input
                name="purpose"
                value={formData.purpose}
                onChange={handleInputChange}
                placeholder="What is this for?"
              />
            </div>

            <div>
              <Typography variant="small" className="font-semibold mb-2">Comments</Typography>
              <Textarea
                name="comments"
                value={formData.comments}
                onChange={handleInputChange}
                placeholder="Additional comments..."
                rows={3}
              />
            </div>

            {selectedProduct && formData.quantityRequested && (
              <Card className="bg-green-50 p-4">
                <Typography variant="small" className="font-semibold">
                  Estimated Cost: GHS {(selectedProduct.unitCost * formData.quantityRequested).toFixed(2)}
                </Typography>
              </Card>
            )}
          </form>
        </DialogBody>
        <DialogFooter>
          <Button variant="text" onClick={() => setIsModalOpen(false)} className="mr-2">
            Cancel
          </Button>
          <Button color="blue" onClick={handleSubmit}>
            Submit Request
          </Button>
        </DialogFooter>
      </Dialog>

      {/* My Requests Table */}
      <Card>
        <CardHeader className="p-4 bg-gray-50 border-b">
          <Typography variant="h6">My Product Requests</Typography>
        </CardHeader>
        <CardBody className="p-0 overflow-x-auto">
          <table className="w-full min-w-max">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-4 text-left"><Typography variant="small" className="font-semibold">Product</Typography></th>
                <th className="p-4 text-left"><Typography variant="small" className="font-semibold">Quantity</Typography></th>
                <th className="p-4 text-left"><Typography variant="small" className="font-semibold">Purpose</Typography></th>
                <th className="p-4 text-left"><Typography variant="small" className="font-semibold">Total Cost</Typography></th>
                <th className="p-4 text-left"><Typography variant="small" className="font-semibold">Status</Typography></th>
                <th className="p-4 text-left"><Typography variant="small" className="font-semibold">Date</Typography></th>
              </tr>
            </thead>
            <tbody>
              {myRequests.map((request) => (
                <tr key={request.id} className="border-b hover:bg-gray-50">
                  <td className="p-4">{request.product?.name}</td>
                  <td className="p-4">{request.quantityRequested}</td>
                  <td className="p-4">{request.purpose || '-'}</td>
                  <td className="p-4">GHS {request.totalCost?.toFixed(2) || '0.00'}</td>
                  <td className="p-4">
                    <Chip
                      value={request.status.replace(/_/g, ' ')}
                      color={getStatusColor(request.status)}
                      className="rounded-full"
                    />
                  </td>
                  <td className="p-4">{new Date(request.createdDate).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </div>
  );
};

export default ProductRequest;
```

---

## UTILITIES: Cost Calculation Functions

### 5.1 Utility File
**File:** `src/utils/costCalculations.js`

```javascript
/**
 * Cost calculation utilities for inventory management
 */

/**
 * Calculate total cost of a product request
 * @param {number} quantity - Quantity of items
 * @param {number} unitCost - Cost per unit
 * @returns {string} - Formatted total cost
 */
export const calculateTotalCost = (quantity, unitCost) => {
  if (!quantity || !unitCost) return '0.00';
  return (quantity * unitCost).toFixed(2);
};

/**
 * Calculate inventory value
 * @param {number} stock - Number of items in stock
 * @param {number} unitCost - Cost per unit
 * @returns {string} - Formatted total value
 */
export const calculateInventoryValue = (stock, unitCost) => {
  if (!stock || !unitCost) return '0.00';
  return (stock * unitCost).toFixed(2);
};

/**
 * Calculate total cost for a cost center from requests
 * @param {Array} requests - Array of product requests
 * @returns {string} - Formatted total cost
 */
export const calculateCostCenterCost = (requests) => {
  if (!requests || requests.length === 0) return '0.00';
  
  const total = requests
    .filter(r => r.status === 'ISSUED')
    .reduce((sum, r) => sum + (r.quantityIssued * r.unitCost || 0), 0);
  
  return total.toFixed(2);
};

/**
 * Calculate budget utilization percentage
 * @param {number} spent - Amount spent
 * @param {number} budget - Total budget allocated
 * @returns {number} - Percentage (0-100)
 */
export const calculateBudgetUtilization = (spent, budget) => {
  if (!budget) return 0;
  return Math.min(100, Math.round((spent / budget) * 100));
};

/**
 * Format currency value
 * @param {number} value - Value to format
 * @param {string} currency - Currency code (default: GHS)
 * @returns {string} - Formatted currency string
 */
export const formatCurrency = (value, currency = 'GHS') => {
  const formatted = parseFloat(value || 0).toFixed(2);
  return `${currency} ${formatted}`;
};

/**
 * Calculate daily/monthly cost trend
 * @param {Array} requests - Array of product requests
 * @param {string} period - 'daily' or 'monthly'
 * @returns {Array} - Array of {period, cost}
 */
export const calculateCostTrend = (requests, period = 'monthly') => {
  const costs = {};

  requests
    .filter(r => r.status === 'ISSUED' && r.issuedDate)
    .forEach(r => {
      const date = new Date(r.issuedDate);
      let key;
      
      if (period === 'daily') {
        key = date.toLocaleDateString();
      } else {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }
      
      costs[key] = (costs[key] || 0) + (r.quantityIssued * r.unitCost);
    });

  return Object.entries(costs)
    .map(([period, cost]) => ({ period, cost: parseFloat(cost).toFixed(2) }))
    .sort((a, b) => a.period.localeCompare(b.period));
};

/**
 * Validate quantity against available stock
 * @param {number} requested - Quantity requested
 * @param {number} available - Available stock
 * @returns {object} - { isValid: boolean, message: string }
 */
export const validateQuantity = (requested, available) => {
  if (requested <= 0) {
    return { isValid: false, message: 'Quantity must be greater than 0' };
  }
  if (requested > available) {
    return { isValid: false, message: `Cannot request more than ${available} available` };
  }
  return { isValid: true, message: 'Valid quantity' };
};

/**
 * Get cost status indicator
 * @param {number} spent - Amount spent
 * @param {number} budget - Budget allocated
 * @returns {object} - { color: string, status: string }
 */
export const getCostStatus = (spent, budget) => {
  const percentage = calculateBudgetUtilization(spent, budget);
  
  if (percentage >= 100) {
    return { color: 'red', status: 'Over Budget', percentage };
  }
  if (percentage >= 80) {
    return { color: 'amber', status: 'High', percentage };
  }
  if (percentage >= 50) {
    return { color: 'blue', status: 'Moderate', percentage };
  }
  return { color: 'green', status: 'Low', percentage };
};
```

---

## Request Status Constants

### 6.1 Status Configuration
**File:** `src/config/requestStatuses.js`

```javascript
/**
 * Request status definitions with UI properties
 */

export const REQUEST_STATUSES = {
  PENDING: {
    label: 'Pending',
    color: 'yellow',
    bgColor: 'bg-yellow-50',
    textColor: 'text-yellow-700',
    borderColor: 'border-yellow-200',
    description: 'Waiting for Procurement Manager review',
    stage: 1,
    canCancel: true,
    canEdit: true
  },
  
  APPROVED_BY_PROCUREMENT: {
    label: 'Approved by Procurement',
    color: 'blue',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200',
    description: 'Forwarded to Store Officer for final approval',
    stage: 2,
    canCancel: false,
    canEdit: false
  },
  
  APPROVED_BY_STORE: {
    label: 'Approved by Store',
    color: 'indigo',
    bgColor: 'bg-indigo-50',
    textColor: 'text-indigo-700',
    borderColor: 'border-indigo-200',
    description: 'Ready for issuance',
    stage: 3,
    canCancel: false,
    canEdit: false
  },
  
  ISSUED: {
    label: 'Issued',
    color: 'green',
    bgColor: 'bg-green-50',
    textColor: 'text-green-700',
    borderColor: 'border-green-200',
    description: 'Product has been issued to employee',
    stage: 4,
    canCancel: false,
    canEdit: false,
    isFinal: true
  },
  
  REJECTED: {
    label: 'Rejected',
    color: 'red',
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
    borderColor: 'border-red-200',
    description: 'Request was rejected',
    stage: 0,
    canCancel: false,
    canEdit: false,
    isFinal: true
  },
  
  CANCELLED: {
    label: 'Cancelled',
    color: 'gray',
    bgColor: 'bg-gray-50',
    textColor: 'text-gray-700',
    borderColor: 'border-gray-200',
    description: 'Request was cancelled',
    stage: 0,
    canCancel: false,
    canEdit: false,
    isFinal: true
  }
};

/**
 * Get status object by key
 */
export const getStatusInfo = (statusKey) => {
  return REQUEST_STATUSES[statusKey] || REQUEST_STATUSES.PENDING;
};

/**
 * Get all active statuses (not final)
 */
export const getActiveStatuses = () => {
  return Object.entries(REQUEST_STATUSES)
    .filter(([_, info]) => !info.isFinal)
    .map(([key, _]) => key);
};

/**
 * Check if status is final
 */
export const isStatusFinal = (status) => {
  return REQUEST_STATUSES[status]?.isFinal || false;
};
```

---

## DATABASE MIGRATION SCRIPT

### 7.1 SQL Migration
**File:** `migrations/001_create_inventory_features.sql`

```sql
-- Create Cost Centers Table
CREATE TABLE IF NOT EXISTS cost_centers (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    project_code VARCHAR(50) UNIQUE,
    department VARCHAR(100),
    budget DECIMAL(15, 2),
    status ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE',
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    INDEX idx_status (status),
    INDEX idx_name (name),
    INDEX idx_department (department)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add columns to Products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS unit_cost DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_center_id BIGINT;
ALTER TABLE products ADD FOREIGN KEY IF NOT EXISTS fk_product_cost_center (cost_center_id) 
    REFERENCES cost_centers(id) ON DELETE SET NULL;

-- Create Product Requests Table
CREATE TABLE IF NOT EXISTS product_requests (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    employee_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    cost_center_id BIGINT,
    quantity_requested INT NOT NULL,
    quantity_approved INT,
    quantity_issued INT DEFAULT 0,
    purpose VARCHAR(255),
    comments TEXT,
    unit_cost DECIMAL(10, 2),
    total_cost DECIMAL(15, 2),
    status ENUM('PENDING', 'APPROVED_BY_PROCUREMENT', 'APPROVED_BY_STORE', 'REJECTED', 'ISSUED', 'CANCELLED') 
        DEFAULT 'PENDING',
    rejection_reason TEXT,
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    requested_by_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approved_by_procurement_date TIMESTAMP,
    approved_by_procurement_user VARCHAR(100),
    approved_by_store_date TIMESTAMP,
    approved_by_store_user VARCHAR(100),
    rejected_date TIMESTAMP,
    rejected_by_user VARCHAR(100),
    issued_date TIMESTAMP,
    issued_by_user VARCHAR(100),
    FOREIGN KEY (employee_id) REFERENCES employees(id),
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (cost_center_id) REFERENCES cost_centers(id),
    INDEX idx_status (status),
    INDEX idx_employee (employee_id),
    INDEX idx_product (product_id),
    INDEX idx_created_date (created_date),
    INDEX idx_cost_center (cost_center_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create Product Request History Table
CREATE TABLE IF NOT EXISTS product_request_history (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    product_request_id BIGINT NOT NULL,
    old_status VARCHAR(50),
    new_status VARCHAR(50),
    changed_by VARCHAR(100),
    changed_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reason TEXT,
    FOREIGN KEY (product_request_id) REFERENCES product_requests(id) ON DELETE CASCADE,
    INDEX idx_product_request (product_request_id),
    INDEX idx_changed_date (changed_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create generated column for total_value in products
ALTER TABLE products ADD COLUMN IF NOT EXISTS total_value DECIMAL(15, 2) 
    GENERATED ALWAYS AS (unit_cost * stock) STORED;

-- Insert default cost centers (optional)
INSERT INTO cost_centers (name, project_code, department, budget, status, created_by)
VALUES 
    ('Project A', 'PA-2025', 'Construction', 50000.00, 'ACTIVE', 'admin'),
    ('Project B', 'PB-2025', 'Construction', 35000.00, 'ACTIVE', 'admin'),
    ('Site Services', 'SS-2025', 'Operations', 20000.00, 'ACTIVE', 'admin')
ON DUPLICATE KEY UPDATE name = name;
```

---

This comprehensive code guide provides ready-to-use templates for each major step! Each section builds upon the previous one.

