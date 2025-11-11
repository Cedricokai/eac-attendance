# Database Schema for New Product Management Features

## Step 2: Cost Center Table & Model

### Purpose
Create a Cost Center (also called Project Center or Department Center) table to track projects, departments, or cost allocation centers for inventory and product requests.

---

## 1. COST CENTER TABLE

### SQL Schema:
```sql
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
```

### Fields Explanation:
- **id**: Unique identifier
- **name**: Cost center name (e.g., "Project A", "IT Department")
- **code**: Short code (e.g., "ProjA", "IT-001")
- **description**: Detailed description
- **type**: PROJECT, DEPARTMENT, or LOCATION
- **status**: ACTIVE, INACTIVE, or ON_HOLD
- **manager_id**: Employee ID of the cost center manager
- **budget**: Total allocated budget for this cost center
- **spent_amount**: Auto-calculated from issued product requests
- **start_date**: Project/department start date
- **end_date**: Project/department end date
- **created_by/modified_by**: Audit trail
- **created_date/modified_date**: Timestamps

---

## Step 3: Product Request Table

### SQL Schema:
```sql
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
```

### Fields Explanation:
- **request_number**: Unique request identifier (e.g., "REQ-2024-001")
- **employee_id**: Employee requesting the product
- **product_id**: Product being requested
- **cost_center_id**: Project/department this request is for
- **quantity_requested**: Initial quantity requested
- **quantity_approved**: Quantity approved by procurement manager
- **quantity_issued**: Actual quantity issued
- **unit_cost**: Unit cost at time of request (for historical tracking)
- **total_cost**: Calculated as quantity_issued × unit_cost
- **purpose**: Why the product is needed
- **comments**: Employee comments
- **status**: Workflow status (see status values below)
- **procurement_manager_id**: ID of procurement manager reviewing
- **procurement_comments**: Manager's review notes
- **procurement_date**: When procurement manager reviewed
- **store_officer_id**: ID of store officer approving/issuing
- **store_comments**: Store officer's notes
- **store_date**: When store officer reviewed
- **issued_date**: When product was actually issued

---

## Status Workflow

```
PENDING
  ↓
  ├─→ APPROVED_BY_PROCUREMENT
  │    ↓
  │    ├─→ APPROVED_BY_STORE
  │    │    ↓
  │    │    └─→ ISSUED
  │    │
  │    └─→ REJECTED_BY_STORE
  │
  ├─→ REJECTED_BY_PROCUREMENT
  │
  └─→ CANCELLED
```

---

## Step 7: Cost Tracking - Update Products Table

### Add columns to PRODUCTS table:
```sql
ALTER TABLE products ADD COLUMN (
  unit_cost DECIMAL(10, 2),
  cost_center_id INT,
  total_value DECIMAL(15, 2) GENERATED ALWAYS AS (unit_cost * stock) STORED,
  FOREIGN KEY (cost_center_id) REFERENCES cost_centers(id)
);
```

---

## Request Status Tracking Table (Optional but Recommended)

### For historical audit trail:
```sql
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
```

---

## Summary of Changes

| Table | Action | Columns Added |
|-------|--------|----------------|
| cost_centers | CREATE | All (new table) |
| product_requests | CREATE | All (new table) |
| products | ALTER | unit_cost, cost_center_id, total_value |
| request_status_history | CREATE | All (optional audit trail) |

---

## Data Relationships Diagram

```
EMPLOYEES (employees table)
    │
    ├─ Has many product_requests (as employee_id)
    ├─ Has many product_requests (as procurement_manager_id)
    ├─ Has many product_requests (as store_officer_id)
    ├─ Manages many cost_centers (as manager_id)
    └─ Has audit records (created_by, modified_by)
    
PRODUCTS (products table)
    │
    ├─ Belongs to cost_center (optional)
    └─ Has many product_requests

COST_CENTERS (new table)
    │
    ├─ Has many products
    ├─ Has many product_requests
    ├─ Has manager (employee)
    └─ Tracks budget and spent_amount

PRODUCT_REQUESTS (new table)
    │
    ├─ Belongs to employee
    ├─ Belongs to product
    ├─ Belongs to cost_center
    ├─ Belongs to procurement_manager
    ├─ Belongs to store_officer
    └─ Has many status_history records
```

---

## Next Steps for Backend Development

1. Create JPA Entity classes for each table
2. Create Spring Data JPA repositories
3. Create service classes with business logic
4. Implement REST API endpoints
5. Add validation and error handling
6. Implement cost calculation logic

