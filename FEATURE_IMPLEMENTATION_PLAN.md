# New Features Implementation Plan
## Product Request & Cost Tracking System

**Document Date:** November 11, 2025  
**Current System:** EAC Attendance + Inventory Management  
**Scope:** Add product request workflow, cost tracking, and reporting

---

## EXECUTIVE SUMMARY

The system currently supports:
- ✅ Add products to inventory
- ✅ Issue products out to employees (via Outgoing)
- ❌ **NO cost tracking for products**
- ❌ **NO workflow approval for product requests**

This document outlines a 12-step implementation plan to add:
1. **Product Request System** - Employee request → Procurement approval → Store issuance
2. **Cost Tracking** - Track financial value of inventory and requests
3. **Cost Centers** - Associate costs to projects/departments
4. **Reports & Analytics** - Comprehensive cost and usage reporting

---

## IMPLEMENTATION ROADMAP

### **PHASE 1: FOUNDATIONAL DATA MODELS (Steps 1-3)**
These steps establish the database structure needed for the entire system.

#### Step 1: Update Products Table with Unit Cost
**Priority:** CRITICAL - Must be done first
**Duration:** 1-2 hours
**Dependencies:** None

**What needs to be done:**

1. **Backend Database Migration**
   - Add column to `products` table:
     ```sql
     ALTER TABLE products ADD COLUMN unit_cost DECIMAL(10, 2) DEFAULT 0;
     ALTER TABLE products ADD COLUMN total_value DECIMAL(15, 2) GENERATED ALWAYS AS (unit_cost * stock) STORED;
     ```

2. **Backend Model Update**
   - Update `Product.java` (or equivalent) entity:
     ```java
     @Column(name = "unit_cost", nullable = false, precision = 10, scale = 2)
     private BigDecimal unitCost;
     
     @Column(name = "total_value", insertable = false, updatable = false, precision = 15, scale = 2)
     private BigDecimal totalValue;
     ```

3. **Backend API Update**
   - Modify `POST /api/products` to accept `unit_cost`
   - Modify `PUT /api/products/{id}` to update `unit_cost`
   - Add `GET /api/products/inventory-value` endpoint to calculate total inventory value

4. **Frontend Update - `src/pages/Eac-inventory/products.jsx`**
   - Add `unitCost` field to `newProduct` state
   - Add `unitCost` field to `updatedProduct` state
   - Add input field in Add/Update modals:
     ```jsx
     <Input 
       type="number"
       step="0.01"
       label="Unit Cost (GHS)"
       name="unitCost"
       value={newProduct.unitCost}
       onChange={handleInputChange}
       required
     />
     ```
   - Update table to display unit cost and total value
   - Add validation to ensure unit_cost is not negative

5. **Testing Points:**
   - ✓ Add product with unit cost
   - ✓ Update product unit cost
   - ✓ Total value calculates correctly
   - ✓ View total inventory value

---

#### Step 2: Create Cost Center Table & Model
**Priority:** CRITICAL - Required for cost allocation
**Duration:** 1-2 hours
**Dependencies:** Step 1 (good to complete first for context)

**What needs to be done:**

1. **Backend Database Schema**
   ```sql
   CREATE TABLE cost_centers (
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
     INDEX idx_name (name)
   );
   ```

2. **Backend Model**
   ```java
   @Entity
   @Table(name = "cost_centers")
   public class CostCenter {
       @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
       private Long id;
       
       @Column(nullable = false, unique = true)
       private String name;
       
       private String description;
       private String projectCode;
       private String department;
       private BigDecimal budget;
       
       @Enumerated(EnumType.STRING)
       private Status status = Status.ACTIVE;
       
       private LocalDateTime createdDate;
       private LocalDateTime updatedDate;
       private String createdBy;
       
       enum Status { ACTIVE, INACTIVE }
   }
   ```

3. **Backend API Endpoints**
   - `GET /api/cost-centers` - List all cost centers
   - `POST /api/cost-centers` - Create new cost center
   - `PUT /api/cost-centers/{id}` - Update cost center
   - `DELETE /api/cost-centers/{id}` - Delete cost center
   - `GET /api/cost-centers/{id}` - Get specific cost center

4. **Update Products Table**
   ```sql
   ALTER TABLE products ADD COLUMN cost_center_id BIGINT;
   ALTER TABLE products ADD FOREIGN KEY (cost_center_id) REFERENCES cost_centers(id);
   ```

5. **Testing Points:**
   - ✓ Create cost center
   - ✓ Retrieve cost centers
   - ✓ Update cost center
   - ✓ Delete cost center
   - ✓ List products by cost center

---

#### Step 3: Create Product Request Data Model
**Priority:** CRITICAL - Core to new workflow
**Duration:** 2 hours
**Dependencies:** Step 1, Step 2

**What needs to be done:**

1. **Backend Database Schema**
   ```sql
   CREATE TABLE product_requests (
     id BIGINT PRIMARY KEY AUTO_INCREMENT,
     employee_id BIGINT NOT NULL,
     product_id BIGINT NOT NULL,
     quantity_requested INT NOT NULL,
     quantity_approved INT,
     quantity_issued INT DEFAULT 0,
     purpose VARCHAR(255),
     comments TEXT,
     cost_center_id BIGINT,
     unit_cost DECIMAL(10, 2),
     total_cost DECIMAL(15, 2),
     status ENUM('PENDING', 'APPROVED_BY_PROCUREMENT', 'APPROVED_BY_STORE', 'REJECTED', 'ISSUED', 'CANCELLED') DEFAULT 'PENDING',
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
     INDEX idx_created_date (created_date)
   );
   ```

2. **Backend Model**
   ```java
   @Entity
   @Table(name = "product_requests")
   public class ProductRequest {
       @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
       private Long id;
       
       @ManyToOne @JoinColumn(name = "employee_id", nullable = false)
       private Employee employee;
       
       @ManyToOne @JoinColumn(name = "product_id", nullable = false)
       private Product product;
       
       @ManyToOne @JoinColumn(name = "cost_center_id")
       private CostCenter costCenter;
       
       private Integer quantityRequested;
       private Integer quantityApproved;
       private Integer quantityIssued = 0;
       private String purpose;
       private String comments;
       private BigDecimal unitCost;
       private BigDecimal totalCost;
       
       @Enumerated(EnumType.STRING)
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
       
       enum RequestStatus {
           PENDING, APPROVED_BY_PROCUREMENT, APPROVED_BY_STORE, REJECTED, ISSUED, CANCELLED
       }
       
       // Business logic methods
       public BigDecimal calculateTotalCost() {
           if (quantityApproved != null && unitCost != null) {
               return unitCost.multiply(new BigDecimal(quantityApproved));
           }
           return BigDecimal.ZERO;
       }
   }
   ```

3. **DTO for API Transfer**
   ```java
   public class ProductRequestDTO {
       private Long id;
       private Long employeeId;
       private String employeeName;
       private Long productId;
       private String productName;
       private Integer quantityRequested;
       private Integer quantityApproved;
       private Integer quantityIssued;
       private String purpose;
       private String comments;
       private Long costCenterId;
       private String costCenterName;
       private BigDecimal unitCost;
       private BigDecimal totalCost;
       private String status;
       private String rejectionReason;
       // Getters/Setters
   }
   ```

4. **Testing Points:**
   - ✓ Create product request
   - ✓ Retrieve product requests
   - ✓ Update product request status
   - ✓ Calculate total cost correctly
   - ✓ Track approval history

---

### **PHASE 2: USER-FACING COMPONENTS (Steps 4-6)**
These create the three main UIs for the approval workflow.

#### Step 4: Build Employee Product Request Page
**Priority:** HIGH - Users need this first
**Duration:** 2-3 hours
**Dependencies:** Steps 1-3

**File to Create:** `src/pages/Eac-inventory/ProductRequest.jsx`

**What needs to be done:**

1. **Create React Component**
   ```jsx
   // Main features:
   // - Product dropdown (fetched from inventory)
   // - Quantity input with validation
   // - Purpose field (linked to cost centers)
   // - Comments field
   // - Submit button
   // - List of employee's previous requests with status
   ```

2. **Component Structure:**
   - Request form section (top)
   - Previous requests table (bottom)
   - Status color coding (Pending=yellow, Approved=green, Rejected=red, Issued=blue)

3. **Form Validation:**
   - ✓ Product is required
   - ✓ Quantity > 0 and <= product stock
   - ✓ Purpose required if cost center selected
   - ✓ Show selected product details (unit cost, stock)

4. **API Integration:**
   ```js
   POST /api/product-requests
   {
     employeeId: number,
     productId: number,
     quantityRequested: number,
     purpose: string,
     comments: string,
     costCenterId: number (optional)
   }
   
   GET /api/product-requests/my-requests
   ```

5. **Route Addition:**
   - Add to `App.jsx`:
     ```jsx
     <Route path="/product-request" element={<ProductRequest />} />
     ```

6. **UI Components Needed:**
   - Request form with Material-Tailwind inputs
   - Request history table
   - Status badges
   - Loading states
   - Error/success messages

---

#### Step 5: Build Procurement Manager Review Page
**Priority:** HIGH - Critical for workflow
**Duration:** 2-3 hours
**Dependencies:** Steps 1-4

**File to Create:** `src/pages/Eac-inventory/ProcurementReview.jsx`

**What needs to be done:**

1. **Component Features:**
   - View all PENDING requests
   - Filter/search by employee, product, date
   - Inline approve/reject with comments
   - Option to modify approved quantity
   - Bulk actions (approve multiple)

2. **Workflow Actions:**
   - **Approve:** Update status to "APPROVED_BY_PROCUREMENT", capture user/timestamp
   - **Reject:** Update status to "REJECTED", capture rejection reason
   - **Modify Quantity:** Adjust quantityApproved (cannot exceed requested)

3. **API Endpoints:**
   ```js
   GET /api/product-requests?status=PENDING
   PUT /api/product-requests/{id}/approve-procurement
   {
     quantityApproved: number,
     approvedByUser: string
   }
   
   PUT /api/product-requests/{id}/reject-procurement
   {
     rejectionReason: string,
     rejectedByUser: string
   }
   ```

4. **Table Display:**
   - Employee Name
   - Product Name + Stock Available
   - Qty Requested
   - Purpose / Cost Center
   - Comments
   - Action Buttons (Approve/Reject)

5. **Route Addition:**
   ```jsx
   <Route path="/procurement-review" element={<ProcurementReview />} />
   ```

6. **Role Requirement:**
   - Only users with ROLE_PROCUREMENT_MANAGER can access
   - Add role check in component

---

#### Step 6: Build Store Officer Approval Page
**Priority:** HIGH - Final approval step
**Duration:** 2-3 hours
**Dependencies:** Steps 1-5

**File to Create:** `src/pages/Eac-inventory/StoreApproval.jsx`

**What needs to be done:**

1. **Component Features:**
   - View all "APPROVED_BY_PROCUREMENT" requests
   - Check actual stock availability in real-time
   - Approve and issue products
   - Automatic inventory deduction
   - Track issuance details

2. **Workflow Actions:**
   - **Verify Stock:** Check product.stock >= quantityApproved
   - **Issue:** 
     - Update ProductRequest status to "ISSUED"
     - Deduct from Product inventory
     - Create audit log
   - **Alert:** If stock insufficient, show warning
   - **Partial Issue:** Option to issue less than approved qty

3. **API Endpoints:**
   ```js
   GET /api/product-requests?status=APPROVED_BY_PROCUREMENT
   
   PUT /api/product-requests/{id}/issue
   {
     quantityIssued: number,
     issuedByUser: string
   }
   
   // This endpoint should:
   // 1. Update ProductRequest to ISSUED
   // 2. Deduct from Product.stock
   // 3. Create ProductIssuance record (optional)
   // 4. Return success/failure
   ```

4. **Stock Update Logic:**
   - When issuing product:
     ```
     newStock = products[productId].stock - quantityIssued
     UPDATE products SET stock = newStock WHERE id = productId
     ```

5. **Route Addition:**
   ```jsx
   <Route path="/store-approval" element={<StoreApproval />} />
   ```

6. **Role Requirement:**
   - Only ROLE_STORE_OFFICER can access
   - Add role check

---

### **PHASE 3: CALCULATIONS & TRACKING (Steps 7-8)**
These implement the business logic for costs and status workflows.

#### Step 7: Create Cost Tracking Logic
**Priority:** HIGH - Essential for reporting
**Duration:** 2-3 hours
**Dependencies:** Steps 1-6

**What needs to be done:**

1. **Create Utility File:** `src/utils/costCalculations.js`
   ```javascript
   // Functions to implement:
   
   export const calculateTotalCost = (quantity, unitCost) => {
       return (quantity * unitCost).toFixed(2);
   };
   
   export const calculateInventoryValue = (stock, unitCost) => {
       return (stock * unitCost).toFixed(2);
   };
   
   export const calculateProjectCost = (requests) => {
       // Sum all ISSUED requests for a cost center
       return requests
           .filter(r => r.status === 'ISSUED')
           .reduce((sum, r) => sum + (r.quantityIssued * r.unitCost), 0)
           .toFixed(2);
   };
   
   export const calculateEmployeeCost = (requests) => {
       // Sum all ISSUED requests for an employee
       return requests
           .filter(r => r.status === 'ISSUED')
           .reduce((sum, r) => sum + (r.quantityIssued * r.unitCost), 0)
           .toFixed(2);
   };
   
   export const getCostTrend = (requests, monthsBack = 3) => {
       // Generate monthly cost data for charts
   };
   ```

2. **Update Backend:**
   - When ProductRequest is ISSUED, automatically calculate total_cost:
     ```java
     public class ProductRequest {
         public void issue(Integer quantityIssued, String issuedByUser) {
             this.quantityIssued = quantityIssued;
             this.totalCost = this.unitCost.multiply(new BigDecimal(quantityIssued));
             this.status = RequestStatus.ISSUED;
             this.issuedByUser = issuedByUser;
             this.issuedDate = LocalDateTime.now();
         }
     }
     ```

3. **Create Service Layer Methods:**
   - `getTotalInventoryValue()` - Sum of all product total_values
   - `getCostCenterTotalCost(costCenterId)` - Sum of issued requests
   - `getEmployeeTotalCost(employeeId)` - Sum of issued requests
   - `getMonthlyCostTrend(costCenterId)` - Cost by month

4. **API Endpoints for Analytics:**
   ```js
   GET /api/cost-analysis/inventory-value
   GET /api/cost-analysis/cost-center/{id}/total
   GET /api/cost-analysis/employee/{id}/total
   GET /api/cost-analysis/monthly-trend?months=3
   ```

---

#### Step 8: Create Product Request Status Tracking
**Priority:** MEDIUM - Quality of life feature
**Duration:** 1-2 hours
**Dependencies:** Steps 1-6

**What needs to be done:**

1. **Create Status Tracking Component:** `src/components/RequestStatusTimeline.jsx`
   - Visual timeline showing: Pending → Procurement → Store → Issued
   - Show dates and users at each step
   - Display rejection reason if rejected

2. **Status Constants:** `src/config/requestStatuses.js`
   ```javascript
   export const REQUEST_STATUSES = {
       PENDING: { 
           label: 'Pending', 
           color: 'yellow', 
           stage: 1 
       },
       APPROVED_BY_PROCUREMENT: { 
           label: 'Approved by Procurement', 
           color: 'blue', 
           stage: 2 
       },
       APPROVED_BY_STORE: { 
           label: 'Approved by Store', 
           color: 'indigo', 
           stage: 3 
       },
       ISSUED: { 
           label: 'Issued', 
           color: 'green', 
           stage: 4 
       },
       REJECTED: { 
           label: 'Rejected', 
           color: 'red', 
           stage: 0 
       },
       CANCELLED: { 
           label: 'Cancelled', 
           color: 'gray', 
           stage: 0 
       }
   };
   ```

3. **Status History Audit:**
   - Create new table: `product_request_history`
   ```sql
   CREATE TABLE product_request_history (
       id BIGINT PRIMARY KEY AUTO_INCREMENT,
       product_request_id BIGINT NOT NULL,
       old_status ENUM(...),
       new_status ENUM(...),
       changed_by VARCHAR(100),
       changed_date TIMESTAMP,
       reason TEXT,
       FOREIGN KEY (product_request_id) REFERENCES product_requests(id)
   );
   ```

4. **Notification on Status Change:**
   - Use existing WebSocket/notification system to notify employees of status changes
   - Implement: Pending→Approved, Approved→Issued, Status→Rejected

---

### **PHASE 4: REPORTING & ANALYTICS (Steps 9-10)**
These provide business insights.

#### Step 9: Build Reports Dashboard
**Priority:** HIGH - Critical for business insights
**Duration:** 3-4 hours
**Dependencies:** Steps 1-8

**File to Create:** `src/pages/Eac-inventory/InventoryReports.jsx`

**Components/Tabs:**

1. **Tab 1: Requests by Status**
   - Pie chart: Distribution of all requests by status
   - Table: Detailed requests filtered by status
   - Filters: Date range, employee, product
   
   ```jsx
   // Query: GET /api/product-requests/summary/by-status
   ```

2. **Tab 2: Product Usage by Employee**
   - Table: Employee → Products requested → Quantity → Cost
   - Sorting: By quantity, by cost, by employee
   - Export to Excel
   
   ```jsx
   // Query: GET /api/product-requests/summary/by-employee
   ```

3. **Tab 3: Cost Summary per Project (Cost Center)**
   - Table: Cost Center → Total Cost → Item Count → Budget
   - Progress bar: Showing budget utilization
   - Variance: Budget vs Actual
   
   ```jsx
   // Query: GET /api/cost-analysis/cost-center-summary
   ```

4. **Tab 4: Monthly/Quarterly Cost Analysis**
   - Line chart: Cost trend over time
   - Bar chart: Cost by cost center per month
   - Filters: Date range, cost center
   
   ```jsx
   // Query: GET /api/cost-analysis/monthly-trend?startDate=&endDate=
   ```

**API Endpoints Needed:**
```js
GET /api/product-requests/summary/by-status
GET /api/product-requests/summary/by-employee
GET /api/cost-analysis/cost-center-summary
GET /api/cost-analysis/monthly-trend?startDate=&endDate=&costCenterId=
```

**Chart Libraries:** Use Recharts (already in dependencies)

---

#### Step 10: Add Cost Center Management Page
**Priority:** MEDIUM - Admin feature
**Duration:** 2-3 hours
**Dependencies:** Step 2

**File to Create:** `src/pages/Eac-inventory/CostCenterManagement.jsx`

**Features:**

1. **Create Cost Center:**
   - Form inputs: Name, Description, Project Code, Department, Budget
   - Validation: Unique name/code

2. **List Cost Centers:**
   - Table: Name, Code, Department, Budget, Status, Created By
   - Search/filter by name, department
   - Sort options

3. **Edit Cost Center:**
   - Modify budget, department, description
   - Toggle active/inactive

4. **Delete Cost Center:**
   - Soft delete (set to INACTIVE) to preserve history
   - Cannot delete if has associated products/requests

5. **View Cost Center Details:**
   - Total products assigned
   - Total cost of issued requests
   - Budget remaining
   - Cost center timeline

---

### **PHASE 5: BACKEND & INTEGRATION (Step 11)**
All backend API development.

#### Step 11: Create API Endpoints (Backend)
**Priority:** CRITICAL - Must be done in parallel
**Duration:** 8-10 hours
**Dependencies:** Steps 1-10 definitions

**Endpoints to Create:**

1. **Product Endpoints (Update existing)**
   ```
   GET    /api/products (add filtering by costCenter)
   POST   /api/products (add unitCost, costCenterId)
   PUT    /api/products/{id} (add unitCost, costCenterId)
   DELETE /api/products/{id}
   GET    /api/products/{id}
   GET    /api/products/inventory-value (new)
   PUT    /api/products/update-stock (existing, use for issuance)
   ```

2. **Cost Center Endpoints**
   ```
   GET    /api/cost-centers
   POST   /api/cost-centers
   PUT    /api/cost-centers/{id}
   DELETE /api/cost-centers/{id}
   GET    /api/cost-centers/{id}
   GET    /api/cost-centers/{id}/summary
   ```

3. **Product Request Endpoints**
   ```
   GET    /api/product-requests (paginated, filterable)
   GET    /api/product-requests/{id}
   POST   /api/product-requests (create by employee)
   GET    /api/product-requests/my-requests (employee's own)
   PUT    /api/product-requests/{id}/approve-procurement
   PUT    /api/product-requests/{id}/reject-procurement
   PUT    /api/product-requests/{id}/approve-store
   PUT    /api/product-requests/{id}/issue
   GET    /api/product-requests?status=PENDING (filter by status)
   ```

4. **Analytics Endpoints**
   ```
   GET    /api/cost-analysis/inventory-value
   GET    /api/cost-analysis/total-issued-cost
   GET    /api/cost-analysis/cost-center/{id}/total
   GET    /api/cost-analysis/employee/{id}/total
   GET    /api/cost-analysis/monthly-trend
   GET    /api/product-requests/summary/by-status
   GET    /api/product-requests/summary/by-employee
   GET    /api/cost-analysis/cost-center-summary
   ```

5. **Implementation Details:**
   - Add pagination (size=20, page=0)
   - Add filtering (status, employee, product, dateFrom, dateTo)
   - Add sorting (by date, cost, quantity)
   - Add role-based access control
   - Add audit logging
   - Add transaction management for inventory updates

---

### **PHASE 6: NAVIGATION & POLISH (Step 12)**
Connect everything together.

#### Step 12: Add Navigation & Update Sidebar
**Priority:** MEDIUM - Final integration
**Duration:** 1-2 hours
**Dependencies:** Steps 4-11

**What needs to be done:**

1. **Update App.jsx Routes:**
   ```jsx
   import ProductRequest from './pages/Eac-inventory/ProductRequest';
   import ProcurementReview from './pages/Eac-inventory/ProcurementReview';
   import StoreApproval from './pages/Eac-inventory/StoreApproval';
   import InventoryReports from './pages/Eac-inventory/InventoryReports';
   import CostCenterManagement from './pages/Eac-inventory/CostCenterManagement';
   
   // Add routes
   <Route path="/product-request" element={<ProductRequest />} />
   <Route path="/procurement-review" element={<ProcurementReview />} />
   <Route path="/store-approval" element={<StoreApproval />} />
   <Route path="/inventory-reports" element={<InventoryReports />} />
   <Route path="/cost-centers" element={<CostCenterManagement />} />
   ```

2. **Update Inventory Sidebar:**
   - `src/pages/Eac-inventory/SidebarWithBurgerMenu.jsx`
   - Add menu items:
     - Product Request (for employees)
     - Procurement Review (for managers)
     - Store Approval (for store officers)
     - Reports (for all)
     - Cost Centers (for admins)

3. **Update Inventory Dashboard:**
   - `src/pages/Eac-inventory/InventoryDashboard.jsx`
   - Add new feature cards linking to:
     - Product Request
     - My Approvals (if user is procurer/store officer)
     - Reports
     - Cost Centers (if admin)

4. **Create Quick Start Guide:**
   - Add inline help/tooltips
   - Create FEATURE_USAGE.md documentation

---

## IMPLEMENTATION ORDER - RECOMMENDED SEQUENCE

**Week 1:**
1. Step 1: Update Products with Unit Cost (1-2 hrs)
2. Step 2: Create Cost Centers (1-2 hrs)
3. Step 3: Create ProductRequest Model (2 hrs)
4. Step 11 (Part A): Backend Entity/Model creation (2 hrs)

**Week 2:**
5. Step 11 (Part B): Backend API implementation (4-5 hrs)
6. Step 4: Employee Request Page (2-3 hrs)
7. Step 5: Procurement Review Page (2-3 hrs)

**Week 3:**
8. Step 6: Store Approval Page (2-3 hrs)
9. Step 8: Status Tracking (1-2 hrs)
10. Step 7: Cost Calculations (2-3 hrs)

**Week 4:**
11. Step 9: Reports Dashboard (3-4 hrs)
12. Step 10: Cost Center Management (2-3 hrs)
13. Step 12: Navigation & Polish (1-2 hrs)

---

## KEY CONSIDERATIONS

### Security
- ✓ Role-based access (Employee, Procurement Manager, Store Officer, Admin)
- ✓ Audit all status changes with user/timestamp
- ✓ Cannot modify submitted requests
- ✓ Only authorized users can approve

### Data Integrity
- ✓ Transaction management for stock updates
- ✓ Prevent double issuance
- ✓ Validate quantities
- ✓ Maintain audit trail

### Performance
- ✓ Paginate long lists
- ✓ Cache cost center list
- ✓ Index status and date fields
- ✓ Lazy load request history

### User Experience
- ✓ Clear status indicators with colors
- ✓ Intuitive approval workflow
- ✓ Inline error messages
- ✓ Confirmation dialogs before critical actions
- ✓ Success notifications

---

## TESTING CHECKLIST

**Unit Tests:**
- [ ] Cost calculation functions
- [ ] Status transition logic
- [ ] Stock validation

**Integration Tests:**
- [ ] Create request → Approve → Issue → Stock deducted
- [ ] Rejection workflow
- [ ] Partial issuance
- [ ] Cost calculations are correct

**User Acceptance:**
- [ ] Employee can request product
- [ ] Procurement manager can review and approve
- [ ] Store officer can issue and stock updates
- [ ] Reports show correct data
- [ ] Cost center tracking works

---

## MIGRATION & DEPLOYMENT

**Database Migration Script:**
- Create migration file for all new tables
- Run in order: cost_centers → product_requests → product_request_history

**Data Migration:**
- Backfill existing products with $0 unit_cost (or import from system)
- Create default cost centers if needed

**Rollback Plan:**
- Keep backup of original database
- Transaction-based updates

---

## SUCCESS METRICS

After implementation:
- ✓ Zero untracked product costs
- ✓ Full visibility into product request workflow
- ✓ Audit trail for all inventory transactions
- ✓ Management reports on cost by project
- ✓ Reduced time for approval workflow (vs manual)

