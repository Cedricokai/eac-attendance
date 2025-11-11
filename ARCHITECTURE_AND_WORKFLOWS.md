# System Architecture & Workflow Diagrams
## New Product Request & Cost Tracking System

---

## 1. COMPLETE DATA FLOW ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         INVENTORY MANAGEMENT SYSTEM                         │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│                           DATABASE SCHEMA                                    │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  PRODUCTS TABLE                        COST_CENTERS TABLE                   │
│  ├─ id (PK)                           ├─ id (PK)                            │
│  ├─ name                              ├─ name (UNIQUE)                      │
│  ├─ description                       ├─ description                        │
│  ├─ stock                             ├─ project_code                       │
│  ├─ unit_cost ◄─ NEW ──────┐         ├─ department                         │
│  ├─ total_value ◄─ NEW     │         ├─ budget                             │
│  ├─ cost_center_id ◄─ NEW ─┼─┐       ├─ status (ACTIVE/INACTIVE)           │
│  ├─ created_date            │ │       ├─ created_date                       │
│  └─ userName                │ │       ├─ created_by                        │
│                             │ │       └─ ...                               │
│  ┌─ LINKING ────────────────┘ │                                            │
│  │                            │      EMPLOYEES TABLE                       │
│  │                            │      ├─ id (PK)                            │
│  │                            │      ├─ firstName                          │
│  │                            │      ├─ email                              │
│  │                            │      └─ ...                                │
│  │                            │                                            │
│  └─── PRODUCT_REQUESTS ◄─────┼────── NEW TABLE                            │
│       TABLE                    │      ├─ id (PK)                            │
│       ├─ id (PK)              │      ├─ employee_id (FK) ──────────────┐   │
│       ├─ employee_id (FK)     │      ├─ product_id (FK) ───────────┐  │   │
│       ├─ product_id (FK) ─────┤      ├─ cost_center_id (FK) ───┐   │  │   │
│       ├─ cost_center_id (FK)──┤      ├─ quantity_requested      │   │  │   │
│       ├─ quantity_requested   │      ├─ quantity_approved       │   │  │   │
│       ├─ quantity_approved    │      ├─ quantity_issued         │   │  │   │
│       ├─ quantity_issued      │      ├─ unit_cost               │   │  │   │
│       ├─ unit_cost            │      ├─ total_cost              │   │  │   │
│       ├─ total_cost ◄─ NEW    │      ├─ status                  │   │  │   │
│       ├─ purpose              │      ├─ created_date            │   │  │   │
│       ├─ comments             │      ├─ approved_by_procurement_date │ │  │
│       ├─ status               │      ├─ approved_by_procurement_user  │ │  │
│       │                       │      ├─ approved_by_store_date   │ │  │   │
│       │ STATUSES:             │      ├─ approved_by_store_user   │ │  │   │
│       │ • PENDING             │      ├─ issued_date             │ │  │   │
│       │ • APPROVED_BY_PROCUREMENT    ├─ issued_by_user         │ │  │   │
│       │ • APPROVED_BY_STORE   │      ├─ rejection_reason        │ │  │   │
│       │ • ISSUED              │      └─ rejected_by_user        │ │  │   │
│       │ • REJECTED            │                                 │ │  │   │
│       │ • CANCELLED           │   PRODUCT_REQUEST_HISTORY ◄─ NEW TABLE    │
│       │                       │   ├─ id (PK)                   │ │  │   │
│       ├─ rejection_reason     │   ├─ product_request_id (FK)   │ │  │   │
│       ├─ created_date         │   ├─ old_status                │ │  │   │
│       ├─ updated_date         │   ├─ new_status                │ │  │   │
│       └─ ...                  │   ├─ changed_by                │ │  │   │
│                               │   ├─ changed_date              │ │  │   │
│                               │   └─ reason                    │ │  │   │
│                               │                                 │ │  │   │
│                               └─────────────────────────────────┘ └──┘   │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘

```

---

## 2. PRODUCT REQUEST WORKFLOW

```
┌────────────────────────────────────────────────────────────────────────────┐
│                   PRODUCT REQUEST APPROVAL WORKFLOW                        │
└────────────────────────────────────────────────────────────────────────────┘

                               EMPLOYEE INITIATES REQUEST
                                        │
                                        │ submits Product Request
                                        ▼
                    ┌─────────────────────────────────┐
                    │  Status: PENDING                │
                    │  - Product selected             │
                    │  - Quantity: 10                 │
                    │  - Purpose: Project A           │
                    │  - Unit Cost: $50               │
                    │  - Total Cost: $500             │
                    └─────────────────────────────────┘
                                        │
                    ┌───────────────────┴───────────────────┐
                    │                                       │
                    │ Procurement Manager reviews           │
                    ▼                                       │
                    ◆ APPROVAL DECISION POINT #1 ◆          │
                    │                                       │
        ┌───────────┴────────────────┐                      │
        │                            │                      │
    APPROVE              ┌───────────┴──────────────────┐   │
        │                │                              │   │
        │            MODIFY QUANTITY      ┌────────────┴───┴──────────┐
        │            (e.g., approve 8)    │                           │
        │                │                │ REJECT                    │
        │                │                │ (with reason)             │
        │                │                │                           │
        ▼                ▼                ▼                           ▼
    ┌─────────────┬──────────────┬──────────────────┬──────────────────────┐
    │   APPROVED  │  APPROVED    │   REJECTED       │  REJECTED            │
    │   BY        │  BY          │   (archived)     │  (archived)          │
    │ PROCUREMENT │ PROCUREMENT  │                  │                      │
    │ Qty: 10     │ Qty: 8       │  Reason given    │  Reason given        │
    └────┬────────┴──────┬───────┴──────────────────┴──────────────────────┘
         │               │                                   │
         │ ◄─────────────┘                                   │
         │                                                   │
         │ FORWARDED TO STORE                                │ NOTIFICATION
         │                                                   │ TO EMPLOYEE
         │                                                   │
         ▼                                                   │
    ┌──────────────────────────────┐                        │
    │  Status: APPROVED_BY_PROCUREMENT  │                    │
    │  Waiting for Store Officer        │                    │
    │  Qty Approved: 8                  │                    │
    └──────────────────────────────┘                        │
         │                                                   │
         │ Store Officer retrieves requests                  │
         ▼                                                   │
         ◆ APPROVAL DECISION POINT #2 ◆                     │
         │                                                   │
    ┌────┴─────────────────────────────────────┐            │
    │                                          │            │
CHECK STOCK AVAILABILITY                       │            │
    │                                          │            │
    ├─ Product in DB: CEMENT                  │            │
    ├─ Qty Available: 10 units                │            │
    ├─ Qty Requested: 8 units                 │            │
    ├─ Stock Status: ✓ SUFFICIENT             │            │
    │                                          │            │
    ▼                          ┌───────────────┘            │
    APPROVE & ISSUE            │                            │
         │                 INSUFFICIENT STOCK               │
         │                 (Alert to requester)             │
         │                 (Option: Partial issue)          │
         │                                                   │
         ▼                                                   │
    ┌──────────────────────────────┐                        │
    │  Status: ISSUED              │                        │
    │  - Issued to Employee        │                        │
    │  - Date: 2025-11-11          │                        │
    │  - Qty Issued: 8             │                        │
    │  - Total Cost: $400          │                        │
    │  - Issued By: Store_Officer  │                        │
    └──────────────────────────────┘                        │
         │                                                   │
         │ AUTOMATIC INVENTORY UPDATE                       │
         ├─ Product.stock: 10 - 8 = 2                       │
         ├─ Product.total_value: (2 * $50) = $100           │
         └─ NOTIFICATION to All Parties                     │
         │                                                   │
         ▼                                                   │
    ┌──────────────────────────────┐         ┌───────────┐  │
    │ OUTGOING RECORD CREATED      │         │ EMPLOYEE  │  │
    │ - Product: CEMENT            │─────────│ NOTIFIED  │  │
    │ - Qty: 8                     │         │ of Status │  │
    │ - Project: Project A         │         └───────────┘  │
    │ - Value: $400                │                        │
    └──────────────────────────────┘                        │
         │                                                   │
         └───────────────────────────────────────────────────┘
                            WORKFLOW COMPLETE
```

---

## 3. COST TRACKING FLOW

```
┌────────────────────────────────────────────────────────────────────────────┐
│                         COST CALCULATION FLOW                              │
└────────────────────────────────────────────────────────────────────────────┘

STEP 1: PRODUCT SETUP
    ┌─────────────────────────────────┐
    │ Product: CEMENT                 │
    │ ├─ Unit Cost: $50/bag           │
    │ ├─ Current Stock: 20 bags       │
    │ ├─ Total Value: 20 × $50 = $1,000│
    │ ├─ Cost Center: Project A       │
    │ └─ Last Updated: 2025-11-11     │
    └─────────────────────────────────┘

STEP 2: REQUEST CREATION
    ┌─────────────────────────────────┐
    │ Product Request #101            │
    │ ├─ Product: CEMENT ($50/unit)   │
    │ ├─ Qty Requested: 10            │
    │ ├─ Cost Center: Project A       │
    │ ├─ Unit Cost: $50 (snapshot)    │
    │ ├─ Total Cost: $500 (estimated) │
    │ └─ Status: PENDING              │
    └─────────────────────────────────┘

STEP 3: APPROVAL (PROCUREMENT MANAGER)
    ┌─────────────────────────────────┐
    │ Modified approval               │
    │ ├─ Qty Approved: 8 (not 10)     │
    │ ├─ Unit Cost: $50               │
    │ ├─ Total Cost: $400             │
    │ └─ Status: APPROVED_BY_PROCUREMENT│
    └─────────────────────────────────┘

STEP 4: ISSUANCE (STORE OFFICER)
    Stock Check:  20 available ≥ 8 requested ✓
    
    ┌─────────────────────────────────┐
    │ Issue Product:                  │
    │ ├─ Qty to Issue: 8              │
    │ ├─ Total Cost: 8 × $50 = $400   │
    │ └─ Mark as ISSUED               │
    └─────────────────────────────────┘

STEP 5: INVENTORY UPDATE
    Before:  Product.stock = 20 bags
    After:   Product.stock = 12 bags
             Product.total_value = 12 × $50 = $600

STEP 6: COST RECORDING
    ┌─────────────────────────────────┐
    │ ProductRequest Entry:           │
    │ ├─ employee: emp_123            │
    │ ├─ product: CEMENT              │
    │ ├─ quantity_issued: 8           │
    │ ├─ unit_cost: 50                │
    │ ├─ total_cost: 400  ◄─ RECORDED│
    │ ├─ cost_center: Project A       │
    │ ├─ status: ISSUED               │
    │ └─ issued_date: 2025-11-11      │
    └─────────────────────────────────┘

AGGREGATION FOR REPORTING
    ┌───────────────────────────────────────────┐
    │ Cost Center: Project A                    │
    │ ├─ Total Issued Requests: 3               │
    │ ├─ Total Cost: $1,200                     │
    │ │  ├─ Request #101: $400 (CEMENT)         │
    │ │  ├─ Request #102: $300 (REBAR)          │
    │ │  └─ Request #103: $500 (PAINT)          │
    │ ├─ Budget Allocated: $1,500               │
    │ ├─ Budget Remaining: $300                 │
    │ └─ Utilization: 80%                       │
    └───────────────────────────────────────────┘

    ┌───────────────────────────────────────────┐
    │ Employee: john_doe                        │
    │ ├─ Total Items Requested: 5               │
    │ ├─ Total Cost of Issued: $1,200           │
    │ │  ├─ Request #101: $400 (Project A)      │
    │ │  ├─ Request #102: $300 (Project B)      │
    │ │  ├─ Request #103: $500 (Project A)      │
    │ │  └─ Request #104: $0 (Pending)          │
    │ └─ Last Activity: 2025-11-11              │
    └───────────────────────────────────────────┘

    ┌───────────────────────────────────────────┐
    │ Monthly Cost Trend:                       │
    │ ├─ Oct 2025: $2,100                       │
    │ ├─ Nov 2025: $1,200 (so far)              │
    │ │  ├─ Week 1: $400                        │
    │ │  ├─ Week 2: $800                        │
    │ │  └─ Week 3: $0                          │
    │ └─ Trend: ↓ Decreasing                    │
    └───────────────────────────────────────────┘
```

---

## 4. COST CENTER HIERARCHY

```
┌────────────────────────────────────────────────────────────────────────────┐
│                    COST CENTER ORGANIZATION                               │
└────────────────────────────────────────────────────────────────────────────┘

ORGANIZATIONAL STRUCTURE:
    
    ┌────────────────────────────────────────────────┐
    │           EAC ELECTRICAL SOLUTION              │
    │         Total Operating Budget 2025             │
    └────────────────────────────────────────────────┘
                              │
                ┌─────────────┼─────────────┐
                │             │             │
                ▼             ▼             ▼
         ┌──────────┐  ┌──────────┐  ┌──────────────┐
         │ PROJECT A│  │ PROJECT B│  │SITE SERVICES │
         │ $5,000   │  │ $3,500   │  │ $2,000       │
         └──────────┘  └──────────┘  └──────────────┘
              │              │              │
         ┌────┴──┐      ┌────┴──┐      ┌───┴────┐
         │       │      │       │      │        │
         ▼       ▼      ▼       ▼      ▼        ▼
    ┌────────┐┌──────┐┌──────┐┌────┐┌──────┐┌──────┐
    │CEMENT  ││REBAR ││PAINT ││SAND││TOOLS ││PAINT │
    │$2000   ││$1500 ││$1500 ││$500││$1200 ││$800  │
    │Qty: 20││Qty:15││Qty:30││Qty:50││Qty:25││Qty:40│
    └────────┘└──────┘└──────┘└────┘└──────┘└──────┘
    Available Issued Available Available Issued Available
    
    Spent: $2000
    Remaining: $3000

    Spent: $500
    Remaining: $3000
    
    Spent: $1200
    Remaining: $800

COST CENTER DETAILS:

    ┌─────────────────────────────────────────┐
    │ Cost Center: PROJECT A                  │
    ├─────────────────────────────────────────┤
    │ Budget Allocated: $5,000                │
    │ Total Spent (Issued): $2,000            │
    │ Budget Remaining: $3,000                │
    │ Utilization %: 40%                      │
    │ Status: ACTIVE                          │
    │ Products Assigned: 2                    │
    │ Total Requests: 5                       │
    │ ├─ Pending: 1                           │
    │ ├─ Approved: 1                          │
    │ ├─ Issued: 3 ($2,000)                   │
    │ └─ Rejected: 0                          │
    │ Created By: admin@company.com           │
    │ Created Date: 2025-01-15                │
    └─────────────────────────────────────────┘

    ┌─────────────────────────────────────────┐
    │ Cost Center: PROJECT B                  │
    ├─────────────────────────────────────────┤
    │ Budget Allocated: $3,500                │
    │ Total Spent (Issued): $500              │
    │ Budget Remaining: $3,000                │
    │ Utilization %: 14%                      │
    │ Status: ACTIVE                          │
    │ Products Assigned: 2                    │
    │ Total Requests: 4                       │
    │ ├─ Pending: 0                           │
    │ ├─ Approved: 2 ($600)                   │
    │ ├─ Issued: 1 ($500)                     │
    │ └─ Rejected: 1                          │
    │ Created By: manager@company.com         │
    │ Created Date: 2025-02-01                │
    └─────────────────────────────────────────┘

```

---

## 5. ROLE-BASED ACCESS CONTROL

```
┌────────────────────────────────────────────────────────────────────────────┐
│                    ROLE-BASED SYSTEM ACCESS                               │
└────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                          EMPLOYEE (Regular User)                            │
├─────────────────────────────────────────────────────────────────────────────┤
│ Can Access:                           │ Cannot Access:                      │
│ ├─ Product Request (Create Own)       │ ├─ Procurement Review               │
│ ├─ My Request History                 │ ├─ Store Approval                   │
│ ├─ Product Inventory (Read Only)      │ ├─ Cost Center Management           │
│ └─ My Profile                         │ ├─ User Management                  │
│                                       │ └─ System Settings                  │
│ Actions:                              │                                    │
│ ├─ Submit new request                 │ Constraints:                        │
│ ├─ View status of own requests        │ ├─ Can only request products        │
│ ├─ Cancel own pending requests        │ ├─ Cannot modify approved requests  │
│ └─ Resubmit rejected requests         │ └─ Cannot exceed budget             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                   PROCUREMENT MANAGER (Level 1 Approval)                    │
├─────────────────────────────────────────────────────────────────────────────┤
│ Inherits: Employee Access                                                  │
│ Additional Access:                    │ Cannot Access:                      │
│ ├─ Procurement Review Dashboard       │ ├─ Store Approval                   │
│ ├─ All Pending Requests               │ ├─ Inventory Adjustments            │
│ ├─ Approve/Reject Requests            │ ├─ Delete Requests                  │
│ ├─ Modify Quantities                  │ └─ System Settings                  │
│ └─ Reports (Procurement Level)        │                                    │
│                                       │ Actions:                            │
│ Actions:                              │ ├─ Approve requests (set qty)       │
│ ├─ Review all pending                 │ ├─ Reject with reason               │
│ ├─ Approve & forward to store         │ ├─ Add comments                     │
│ ├─ Reject with reason                 │ └─ View cost implications           │
│ ├─ Request modifications from employee│                                    │
│ └─ Generate approval reports          │                                    │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                    STORE OFFICER (Level 2 Approval/Execution)              │
├─────────────────────────────────────────────────────────────────────────────┤
│ Inherits: Employee + Procurement Access                                     │
│ Additional Access:                    │ Cannot Access:                      │
│ ├─ Store Approval Dashboard           │ ├─ Procurement Review               │
│ ├─ Inventory Management               │ ├─ Create/Edit Products             │
│ ├─ Stock Verification                 │ ├─ Cost Center Management           │
│ ├─ Issue Products                     │ └─ Delete Requests                  │
│ ├─ Update Stock Levels                │                                    │
│ └─ Outgoing Record Management         │ Actions:                            │
│                                       │ ├─ Verify stock availability        │
│ Actions:                              │ ├─ Issue/Partially Issue            │
│ ├─ View approved-pending requests     │ ├─ Deduct from inventory (auto)     │
│ ├─ Check stock in real-time           │ ├─ Record issuance details          │
│ ├─ Approve & Issue                    │ └─ Update request status            │
│ ├─ Alert on low stock                 │                                    │
│ ├─ Create outgoing records            │                                    │
│ └─ Print/Export issuance reports      │                                    │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                    ADMIN / INVENTORY MANAGER                                │
├─────────────────────────────────────────────────────────────────────────────┤
│ Inherits: All Access                                                        │
│ Additional Access:                    │ Can Access:                         │
│ ├─ Cost Center Management             │ ├─ All dashboards                   │
│ ├─ User Management                    │ ├─ All reports                      │
│ ├─ System Configuration               │ ├─ All requests (all statuses)      │
│ ├─ Analytics & Reports                │ ├─ Audit logs                       │
│ ├─ Budget Management                  │ └─ System settings                  │
│ ├─ Backup/Export                      │                                    │
│ └─ Override Approvals (if needed)     │ Actions:                            │
│                                       │ ├─ Approve at any level             │
│ Actions:                              │ ├─ Reject/Cancel requests           │
│ ├─ Create/Edit Cost Centers           │ ├─ Adjust budgets                   │
│ ├─ Assign products to cost centers    │ ├─ Modify unit costs                │
│ ├─ View all analytics                 │ ├─ Generate all reports             │
│ ├─ Export data to Excel               │ ├─ Manage users & roles             │
│ ├─ Override workflow if needed        │ └─ System administration            │
│ └─ Archive old requests               │                                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. SYSTEM INTERACTION DIAGRAM

```
┌────────────────────────────────────────────────────────────────────────────┐
│              COMPLETE SYSTEM INTERACTION FLOW                              │
└────────────────────────────────────────────────────────────────────────────┘

FRONTEND LAYER:
    ┌──────────────────┐  ┌──────────────────────┐  ┌─────────────────────┐
    │  EMPLOYEE VIEWS  │  │  PROCUREMENT MANAGER │  │   STORE OFFICER     │
    ├──────────────────┤  ├──────────────────────┤  ├─────────────────────┤
    │• Req Prod Page   │  │• Review Dashboard    │  │• Approval Dashboard │
    │• My Requests     │  │• Pending Requests    │  │• Approved Requests  │
    │• Inventory View  │  │• Approve/Reject Btn  │  │• Stock Check        │
    │• Profile         │  │• Modify Qty          │  │• Issue Product Btn  │
    │• Notifications   │  │• Reports             │  │• Outgoing Records   │
    └──────────────────┘  └──────────────────────┘  └─────────────────────┘
                │                    │                        │
                │                    │                        │
    ┌───────────┼────────────────────┼────────────────────────┼────────────┐
    │           │                    │                        │            │
    │           ▼                    ▼                        ▼            │
    │  ┌─────────────────────────────────────────────────────────┐        │
    │  │          API GATEWAY / MIDDLEWARE LAYER                │        │
    │  ├─────────────────────────────────────────────────────────┤        │
    │  │ • Authentication & Authorization (JWT)                 │        │
    │  │ • Request Validation                                   │        │
    │  │ • Role-Based Access Control                            │        │
    │  │ • Request/Response Logging                             │        │
    │  │ • Error Handling & Notifications                       │        │
    │  └─────────────────────────────────────────────────────────┘        │
    │           │                    │                        │            │
    │           ▼                    ▼                        ▼            │
    │  ┌─────────────────────────────────────────────────────────┐        │
    │  │              REST API LAYER (Backend)                  │        │
    │  ├─────────────────────────────────────────────────────────┤        │
    │  │                                                         │        │
    │  │  ProductRequest Controller                             │        │
    │  │  ├─ POST /api/product-requests (create)               │        │
    │  │  ├─ GET /api/product-requests (list)                  │        │
    │  │  ├─ PUT /api/product-requests/{id} (update)           │        │
    │  │  ├─ PUT /.../approve-procurement                      │        │
    │  │  ├─ PUT /.../reject-procurement                       │        │
    │  │  ├─ PUT /.../issue                                    │        │
    │  │  └─ DELETE /api/product-requests/{id}                │        │
    │  │                                                         │        │
    │  │  Product Controller                                    │        │
    │  │  ├─ GET /api/products (with filters)                  │        │
    │  │  ├─ POST/PUT/DELETE /api/products                     │        │
    │  │  └─ GET /api/products/inventory-value                 │        │
    │  │                                                         │        │
    │  │  CostCenter Controller                                 │        │
    │  │  ├─ GET/POST/PUT/DELETE /api/cost-centers             │        │
    │  │  └─ GET /api/cost-centers/{id}/summary                │        │
    │  │                                                         │        │
    │  │  Analytics Controller                                  │        │
    │  │  ├─ GET /api/cost-analysis/...                        │        │
    │  │  ├─ GET /api/product-requests/summary/...             │        │
    │  │  └─ GET /api/cost-analysis/monthly-trend              │        │
    │  │                                                         │        │
    │  └─────────────────────────────────────────────────────────┘        │
    │           │                    │                        │            │
    │           └────────────────────┼────────────────────────┘            │
    │                                │                                     │
    │                    ┌───────────┴──────────┐                          │
    │                    │                      │                          │
    │                    ▼                      ▼                          │
    │         ┌──────────────────┐   ┌──────────────────┐                 │
    │         │  SERVICE LAYER   │   │ BUSINESS LOGIC   │                 │
    │         ├──────────────────┤   ├──────────────────┤                 │
    │         │ • ProductRequest │   │ • Validations    │                 │
    │         │   Service        │   │ • Cost Calc      │                 │
    │         │ • Product Service│   │ • Status Updates │                 │
    │         │ • CostCenter Svc │   │ • Notifications  │                 │
    │         │ • Analytics Svc  │   │ • Audit Logging  │                 │
    │         └──────────────────┘   └──────────────────┘                 │
    │                    │                      │                          │
    │                    └───────────┬──────────┘                          │
    │                                │                                     │
    │                    ┌───────────┴──────────┐                          │
    │                    │                      │                          │
    │                    ▼                      ▼                          │
    │         ┌──────────────────┐   ┌──────────────────┐                 │
    │         │  DATA ACCESS     │   │  TRANSACTIONS    │                 │
    │         │  LAYER (DAL)     │   │  & LOCKING       │                 │
    │         ├──────────────────┤   ├──────────────────┤                 │
    │         │ • Repositories   │   │ • DB Transactions│                 │
    │         │ • ORM (JPA)      │   │ • Optimistic     │                 │
    │         │ • Queries        │   │   Locking        │                 │
    │         │ • Caching        │   │ • Pessimistic    │                 │
    │         │                  │   │   Locking        │                 │
    │         └──────────────────┘   └──────────────────┘                 │
    │                    │                      │                          │
    │                    └───────────┬──────────┘                          │
    │                                │                                     │
    └────────────────────────────────┼─────────────────────────────────────┘
                                     │
                                     ▼
                        ┌────────────────────────┐
                        │   DATABASE LAYER       │
                        ├────────────────────────┤
                        │ MySQL Database         │
                        │ ├─ products            │
                        │ ├─ product_requests    │
                        │ ├─ cost_centers        │
                        │ ├─ employees           │
                        │ ├─ product_request_    │
                        │ │  history             │
                        │ └─ outgoing            │
                        └────────────────────────┘
```

---

## 7. REQUEST STATUS STATE MACHINE

```
┌────────────────────────────────────────────────────────────────────────────┐
│               PRODUCT REQUEST STATE MACHINE DIAGRAM                        │
└────────────────────────────────────────────────────────────────────────────┘

                          ┌─────────────────────┐
                          │   REQUEST CREATED   │
                          │ employee submits req│
                          └──────────┬──────────┘
                                     │
                                     ▼
                        ┌────────────────────────────┐
                        │       PENDING              │
                        │  Status: PENDING           │
                        │  Waiting for Procurement   │
                        │  Manager Review            │
                        └────────────┬───────────────┘
                                     │
                    ┌────────────────┼────────────────┐
                    │                │                │
                    │ Approve        │ Reject        │ Timeout
                    │ (Proc Mgr)     │ (Proc Mgr)    │ (Auto-cancel)
                    │                │                │
                    ▼                ▼                ▼
         ┌────────────────────┐ ┌─────────┐  ┌──────────────┐
         │  APPROVED_BY_      │ │REJECTED │  │  CANCELLED   │
         │  PROCUREMENT       │ │(Archived)  │  (Archived)  │
         │                    │ └─────────┘  └──────────────┘
         │ Status: Waiting    │      ▲              ▲
         │ for Store Officer  │      │              │
         └────────┬───────────┘      │     Employee
                  │                  │     can cancel
                  │         Rejection  anytime before
                  │         reason      approval
                  │         logged
                  │
       Store Officer Review
       Step              │
                  ▼
         ┌──────────────────────┐
         │  Stock Check         │
         │ ├─ Available? YES/NO  │
         │ ├─ Sufficient qty?    │
         │ └─ Ready to Issue?    │
         └──────────┬───────────┘
                    │
        ┌───────────┼───────────┐
        │           │           │
    Sufficient   Insufficient  Alert
    Stock        Stock
        │           │
        ▼           ▼
    ┌─────────┐ ┌──────────────┐
    │  ISSUE  │ │ Partial Issue│
    │ Product │ │ or Reject    │
    │         │ │ (Ask Manager)│
    │         │ └──────────────┘
    │         │      │
    │         │      │
    └────┬────┴──────┘
         │
         │ Inventory Deducted
         │ Cost Recorded
         │ Audit Trail Created
         ▼
    ┌──────────────────────┐
    │     ISSUED           │
    │  (Final State)       │
    │                      │
    │  Status: ISSUED      │
    │  ├─ Qty Issued: 8    │
    │  ├─ Date: 2025-11-11 │
    │  ├─ Total Cost: $400 │
    │  ├─ Issued By: user  │
    │  └─ Outgoing Created │
    │                      │
    │  Archived after 90   │
    │  days to history     │
    └──────────────────────┘

Annotations:
├─ Dotted line = Optional path
├─ Bold line = Primary path
├─ (Archived) = Moved to history table after resolution
└─ Color indicates: Yellow=Pending, Blue=Approved, Red=Rejected, Green=Issued
```

---

## 8. TECHNICAL INTEGRATION CHECKLIST

```
┌────────────────────────────────────────────────────────────────────────────┐
│              TECHNICAL IMPLEMENTATION ROADMAP                              │
└────────────────────────────────────────────────────────────────────────────┘

PHASE 1: DATABASE & MODELS
    Database Migrations:
    ☐ Create cost_centers table
    ☐ Create product_requests table
    ☐ Create product_request_history table
    ☐ Add cost_center_id to products
    ☐ Add unit_cost to products
    ☐ Add generated column total_value to products
    ☐ Create indexes on frequently queried columns
    ☐ Create foreign keys with cascade options

    Backend Models:
    ☐ CostCenter entity with relationships
    ☐ ProductRequest entity with audit fields
    ☐ ProductRequestHistory entity
    ☐ Update Product entity
    ☐ Update Employee relationships
    ☐ Create DTOs for API transfer
    ☐ Add validation annotations
    ☐ Add serialization annotations

PHASE 2: BACKEND SERVICES
    Controllers:
    ☐ ProductRequestController
    ☐ CostCenterController
    ☐ CostAnalyticsController
    ☐ Update ProductController

    Services:
    ☐ ProductRequestService
    ☐ CostCenterService
    ☐ CostAnalyticsService
    ☐ NotificationService (use existing)
    ☐ AuditService

    Repositories:
    ☐ ProductRequestRepository (with custom queries)
    ☐ CostCenterRepository
    ☐ ProductRequestHistoryRepository

    Business Logic:
    ☐ Approval workflow logic
    ☐ Cost calculation logic
    ☐ Inventory update logic
    ☐ Status transition validation
    ☐ Budget checking logic

    Error Handling:
    ☐ Custom exceptions
    ☐ Global exception handler
    ☐ Validation error messages

PHASE 3: FRONTEND COMPONENTS
    Pages:
    ☐ ProductRequest.jsx
    ☐ ProcurementReview.jsx
    ☐ StoreApproval.jsx
    ☐ InventoryReports.jsx
    ☐ CostCenterManagement.jsx

    Shared Components:
    ☐ RequestStatusTimeline.jsx
    ☐ StatusBadge.jsx
    ☐ CostSummaryCard.jsx
    ☐ BudgetProgressBar.jsx
    ☐ ApprovalDialog.jsx

    Hooks:
    ☐ useProductRequest()
    ☐ useCostCenter()
    ☐ useCostAnalytics()

    Utils:
    ☐ costCalculations.js
    ☐ requestStatuses.js
    ☐ reportFormatters.js
    ☐ validations.js

PHASE 4: INTEGRATION & TESTING
    API Integration:
    ☐ Test all CRUD endpoints
    ☐ Test approval workflow
    ☐ Test inventory deduction
    ☐ Test cost calculations
    ☐ Test reporting queries
    ☐ Test pagination
    ☐ Test filtering
    ☐ Test sorting

    End-to-End Tests:
    ☐ Create request → Approve → Issue → Stock updated
    ☐ Rejection workflow
    ☐ Partial issuance
    ☐ Budget overflow alerts
    ☐ Cost center summary accuracy
    ☐ Report data accuracy

    Security Tests:
    ☐ Role-based access (each role can only access permitted)
    ☐ Users cannot approve own requests
    ☐ Users cannot modify approved requests
    ☐ Audit trail complete

PHASE 5: DEPLOYMENT & MONITORING
    Pre-deployment:
    ☐ Database backup
    ☐ Migration script ready
    ☐ Rollback plan documented
    ☐ Performance testing
    ☐ Load testing

    Deployment:
    ☐ Deploy backend
    ☐ Run database migrations
    ☐ Deploy frontend
    ☐ Clear browser cache
    ☐ Monitor logs

    Post-deployment:
    ☐ Verify all endpoints working
    ☐ Check database integrity
    ☐ Monitor error rates
    ☐ User acceptance testing
    ☐ Performance monitoring

```

This comprehensive documentation provides everything needed to understand and implement the new features step-by-step!

