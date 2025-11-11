# Quick Integration Guide

## Step 1: Update App.jsx with New Routes

Add these routes to your `App.jsx` file within the Routes section:

```javascript
// Product Request Workflow Routes
<Route path="/product-request-form" element={<ProductRequestForm />} />
<Route path="/procurement-review" element={<ProcurementManagerReview />} />
<Route path="/store-approval" element={<StoreOfficerApproval />} />
<Route path="/product-request/:id" element={<ProductRequestDetail />} />
<Route path="/product-requests-history" element={<ProductRequestsHistory />} />
<Route path="/cost-centers" element={<CostCenterManagement />} />
<Route path="/inventory-reports" element={<InventoryReports />} />
```

### Full Import Block to Add:

```javascript
import ProductRequestForm from './pages/Eac-inventory/ProductRequestForm';
import ProcurementManagerReview from './pages/Eac-inventory/ProcurementManagerReview';
import StoreOfficerApproval from './pages/Eac-inventory/StoreOfficerApproval';
// import ProductRequestDetail from './pages/Eac-inventory/ProductRequestDetail'; // To be created
// import ProductRequestsHistory from './pages/Eac-inventory/ProductRequestsHistory'; // To be created
// import CostCenterManagement from './pages/Eac-inventory/CostCenterManagement'; // To be created
// import InventoryReports from './pages/Eac-inventory/InventoryReports'; // To be created
```

---

## Step 2: Update Inventory Sidebar Navigation

Update `src/pages/Eac-inventory/SidebarWithBurgerMenu.jsx` to include:

```javascript
{
  label: 'Request Product',
  icon: ShoppingCartIcon,
  onClick: () => navigate('/product-request-form')
},
{
  label: 'Procurement Review',
  icon: CheckCircleIcon,
  onClick: () => navigate('/procurement-review'),
  requiredRole: 'PROCUREMENT_MANAGER'
},
{
  label: 'Store Approval',
  icon: TruckIcon,
  onClick: () => navigate('/store-approval'),
  requiredRole: 'STORE_OFFICER'
},
{
  label: 'My Requests',
  icon: HistoryIcon,
  onClick: () => navigate('/product-requests-history')
},
{
  label: 'Cost Centers',
  icon: BuildingOfficeIcon,
  onClick: () => navigate('/cost-centers'),
  requiredRole: 'ADMIN'
},
{
  label: 'Reports',
  icon: DocumentChartBarIcon,
  onClick: () => navigate('/inventory-reports')
}
```

---

## Step 3: Database Setup

### Run These SQL Commands:

```sql
-- Create Cost Centers Table
CREATE TABLE cost_centers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL UNIQUE,
  code VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  type ENUM('PROJECT', 'DEPARTMENT', 'LOCATION') DEFAULT 'PROJECT',
  status ENUM('ACTIVE', 'INACTIVE', 'ON_HOLD') DEFAULT 'ACTIVE',
  manager_id INT,
  budget DECIMAL(15, 2) DEFAULT 0.00,
  spent_amount DECIMAL(15, 2) DEFAULT 0.00,
  start_date DATETIME,
  end_date DATETIME,
  created_by INT,
  created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  modified_by INT,
  modified_date DATETIME ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (manager_id) REFERENCES employees(id),
  FOREIGN KEY (created_by) REFERENCES employees(id),
  FOREIGN KEY (modified_by) REFERENCES employees(id),
  INDEX idx_code (code),
  INDEX idx_status (status),
  INDEX idx_type (type)
);

-- Create Product Requests Table
CREATE TABLE product_requests (
  id INT PRIMARY KEY AUTO_INCREMENT,
  request_number VARCHAR(50) NOT NULL UNIQUE,
  employee_id INT NOT NULL,
  product_id INT NOT NULL,
  cost_center_id INT NOT NULL,
  quantity_requested INT NOT NULL,
  quantity_approved INT,
  quantity_issued INT DEFAULT 0,
  unit_cost DECIMAL(10, 2) NOT NULL,
  total_cost DECIMAL(15, 2),
  purpose VARCHAR(255),
  comments TEXT,
  status ENUM('PENDING', 'APPROVED_BY_PROCUREMENT', 'REJECTED_BY_PROCUREMENT', 
              'APPROVED_BY_STORE', 'REJECTED_BY_STORE', 'ISSUED', 'CANCELLED') DEFAULT 'PENDING',
  procurement_manager_id INT,
  procurement_comments TEXT,
  procurement_date DATETIME,
  store_officer_id INT,
  store_comments TEXT,
  store_date DATETIME,
  issued_date DATETIME,
  created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  modified_date DATETIME ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id),
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (cost_center_id) REFERENCES cost_centers(id),
  FOREIGN KEY (procurement_manager_id) REFERENCES employees(id),
  FOREIGN KEY (store_officer_id) REFERENCES employees(id),
  INDEX idx_status (status),
  INDEX idx_employee (employee_id),
  INDEX idx_product (product_id),
  INDEX idx_cost_center (cost_center_id),
  INDEX idx_created_date (created_date)
);

-- Create Request Status History Table
CREATE TABLE request_status_history (
  id INT PRIMARY KEY AUTO_INCREMENT,
  product_request_id INT NOT NULL,
  old_status VARCHAR(50),
  new_status VARCHAR(50) NOT NULL,
  changed_by INT,
  changed_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  change_notes TEXT,
  FOREIGN KEY (product_request_id) REFERENCES product_requests(id),
  FOREIGN KEY (changed_by) REFERENCES employees(id),
  INDEX idx_request (product_request_id),
  INDEX idx_changed_date (changed_date)
);

-- Update Products Table
ALTER TABLE products ADD COLUMN (
  unit_cost DECIMAL(10, 2),
  cost_center_id INT,
  FOREIGN KEY (cost_center_id) REFERENCES cost_centers(id)
);

-- Add total_value as generated column (MySQL 5.7.6+)
ALTER TABLE products ADD COLUMN total_value DECIMAL(15, 2) GENERATED ALWAYS AS (unit_cost * stock) STORED;
```

---

## Step 4: Test the Workflow

### Test Scenario:

1. **Employee Creates Request:**
   - Navigate to `/product-request-form`
   - Select a product with unit cost
   - Select a cost center
   - Enter quantity and purpose
   - Submit

2. **Procurement Manager Reviews:**
   - Navigate to `/procurement-review`
   - View pending requests
   - Approve with adjusted quantity or reject with reason
   - Request status changes

3. **Store Officer Issues:**
   - Navigate to `/store-approval`
   - View approved requests
   - Check stock availability
   - Issue product (creates order)
   - Request status becomes "ISSUED"

---

## Step 5: Frontend Testing Checklist

- [ ] Form validation works correctly
- [ ] Product dropdown displays all products with stock
- [ ] Cost center dropdown displays active centers
- [ ] Unit cost displays correctly
- [ ] Total cost calculates correctly
- [ ] Stock availability warning appears
- [ ] Search and filter functions work
- [ ] Status badges display with correct colors
- [ ] Modals open/close properly
- [ ] API calls work (mock or real endpoints)
- [ ] Success messages display
- [ ] Error messages display
- [ ] Redirect after submission works
- [ ] Role-based access works (if implemented)

---

## Step 6: Backend Checklist

- [ ] Database tables created successfully
- [ ] JPA entities created for all tables
- [ ] Repositories created and tested
- [ ] Service layer implemented
- [ ] REST endpoints created
- [ ] Request validation added
- [ ] Error handling implemented
- [ ] Automatic inventory deduction implemented
- [ ] Status history logging implemented
- [ ] Cost calculations implemented
- [ ] Report queries implemented

---

## API Testing with Postman/Insomnia

### Create Product Request:
```
POST /api/product-requests
Header: Authorization: Bearer {token}
Body: {
  "product_id": 1,
  "cost_center_id": 1,
  "quantity_requested": 10,
  "unit_cost": 25.00,
  "purpose": "Repairs",
  "comments": "Urgent repair needed"
}
```

### Approve by Procurement:
```
PUT /api/product-requests/1/approve-procurement
Body: {
  "quantity_approved": 10,
  "comments": "Approved for immediate use"
}
```

### Issue Product:
```
PUT /api/product-requests/1/issue
Body: {
  "quantity_issued": 10,
  "batch_number": "BATCH-001",
  "serial_numbers": "SN001\nSN002\nSN003",
  "comments": "Issued to employee"
}
```

---

## Components Still to Create

1. **ProductRequestDetail.jsx** - View full request details with history
2. **ProductRequestsHistory.jsx** - Employee's past requests with status
3. **CostCenterManagement.jsx** - CRUD operations for cost centers
4. **InventoryReports.jsx** - Comprehensive reports and analytics
5. **ProductRequestStatusTimeline.jsx** - Visual timeline of status changes

---

## Environment Variables (if needed)

Add to `.env`:
```
VITE_API_BASE_URL=http://localhost:8080
VITE_ENABLE_PRODUCT_REQUESTS=true
VITE_PROCUREMENT_MANAGER_ROLE=PROCUREMENT_MANAGER
VITE_STORE_OFFICER_ROLE=STORE_OFFICER
```

---

## Common Issues & Solutions

### Issue: API endpoints return 404
**Solution:** Ensure backend is running and endpoints are correctly implemented

### Issue: Stock deduction not working
**Solution:** Check that `issueProduct` API calculates and updates inventory automatically

### Issue: Form validation errors
**Solution:** Check browser console for validation logs and error messages

### Issue: Status not updating
**Solution:** Refresh the page or implement real-time WebSocket updates

### Issue: Cost calculations incorrect
**Solution:** Verify unit_cost is stored correctly in products table

---

## Next Steps

1. **Immediate:** Add routes to App.jsx
2. **Week 1:** Develop backend API endpoints
3. **Week 2:** Create database tables and migrations
4. **Week 3:** Integration testing
5. **Week 4:** User acceptance testing
6. **Week 5:** Production deployment

