# Backend API Endpoints Implementation Guide

## Overview
This document provides complete backend implementation guide for the Product Management System with approval workflows, cost tracking, and reporting.

---

## Step 11: Backend API Endpoints

### 1. ProductRequest Controller

```java
package com.eac.inventory.controller;

import com.eac.inventory.dto.*;
import com.eac.inventory.service.ProductRequestService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/product-requests")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ProductRequestController {

    private final ProductRequestService productRequestService;

    /**
     * Get all product requests
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'HR', 'PROCUREMENT_MANAGER', 'STORE_OFFICER')")
    public ResponseEntity<Page<ProductRequestDTO>> getAllRequests(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(productRequestService.getAllRequests(page, size));
    }

    /**
     * Get product request by ID
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR', 'PROCUREMENT_MANAGER', 'STORE_OFFICER', 'EMPLOYEE')")
    public ResponseEntity<ProductRequestDTO> getRequestById(@PathVariable Long id) {
        return ResponseEntity.ok(productRequestService.getRequestById(id));
    }

    /**
     * Get requests by status
     */
    @GetMapping("/filter/status")
    @PreAuthorize("hasAnyRole('ADMIN', 'PROCUREMENT_MANAGER', 'STORE_OFFICER')")
    public ResponseEntity<Page<ProductRequestDTO>> getRequestsByStatus(
            @RequestParam String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(productRequestService.getRequestsByStatus(status, page, size));
    }

    /**
     * Get requests by employee
     */
    @GetMapping("/employee/{employeeId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'EMPLOYEE')")
    public ResponseEntity<Page<ProductRequestDTO>> getRequestsByEmployee(
            @PathVariable Long employeeId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(productRequestService.getRequestsByEmployee(employeeId, page, size));
    }

    /**
     * Get requests by cost center
     */
    @GetMapping("/cost-center/{costCenterId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'PROCUREMENT_MANAGER')")
    public ResponseEntity<Page<ProductRequestDTO>> getRequestsByCostCenter(
            @PathVariable Long costCenterId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(productRequestService.getRequestsByCostCenter(costCenterId, page, size));
    }

    /**
     * Get pending requests for procurement manager
     */
    @GetMapping("/procurement/pending")
    @PreAuthorize("hasRole('PROCUREMENT_MANAGER')")
    public ResponseEntity<Page<ProductRequestDTO>> getProcurementPendingRequests(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(productRequestService.getPendingRequests(page, size));
    }

    /**
     * Get approved requests for store officer
     */
    @GetMapping("/store/approved")
    @PreAuthorize("hasRole('STORE_OFFICER')")
    public ResponseEntity<Page<ProductRequestDTO>> getStoreApprovedRequests(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(productRequestService.getApprovedByProcurementRequests(page, size));
    }

    /**
     * Create product request
     */
    @PostMapping
    @PreAuthorize("hasRole('EMPLOYEE')")
    public ResponseEntity<ProductRequestDTO> createProductRequest(
            @RequestBody CreateProductRequestDTO requestDTO) {
        ProductRequestDTO created = productRequestService.createProductRequest(requestDTO);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    /**
     * Approve by procurement manager
     */
    @PutMapping("/{id}/approve-procurement")
    @PreAuthorize("hasRole('PROCUREMENT_MANAGER')")
    public ResponseEntity<ProductRequestDTO> approveBYProcurement(
            @PathVariable Long id,
            @RequestBody ApproveProcurementDTO approvalDTO) {
        return ResponseEntity.ok(productRequestService.approveBYProcurement(id, approvalDTO));
    }

    /**
     * Reject by procurement manager
     */
    @PutMapping("/{id}/reject-procurement")
    @PreAuthorize("hasRole('PROCUREMENT_MANAGER')")
    public ResponseEntity<ProductRequestDTO> rejectByProcurement(
            @PathVariable Long id,
            @RequestBody RejectRequestDTO rejectionDTO) {
        return ResponseEntity.ok(productRequestService.rejectByProcurement(id, rejectionDTO));
    }

    /**
     * Approve by store officer
     */
    @PutMapping("/{id}/approve-store")
    @PreAuthorize("hasRole('STORE_OFFICER')")
    public ResponseEntity<ProductRequestDTO> approveByStore(
            @PathVariable Long id,
            @RequestBody ApproveStoreDTO approvalDTO) {
        return ResponseEntity.ok(productRequestService.approveByStore(id, approvalDTO));
    }

    /**
     * Reject by store officer
     */
    @PutMapping("/{id}/reject-store")
    @PreAuthorize("hasRole('STORE_OFFICER')")
    public ResponseEntity<ProductRequestDTO> rejectByStore(
            @PathVariable Long id,
            @RequestBody RejectRequestDTO rejectionDTO) {
        return ResponseEntity.ok(productRequestService.rejectByStore(id, rejectionDTO));
    }

    /**
     * Issue product to employee
     */
    @PutMapping("/{id}/issue")
    @PreAuthorize("hasRole('STORE_OFFICER')")
    public ResponseEntity<ProductRequestDTO> issueProduct(
            @PathVariable Long id,
            @RequestBody IssueProductDTO issueDTO) {
        return ResponseEntity.ok(productRequestService.issueProduct(id, issueDTO));
    }

    /**
     * Cancel request
     */
    @PutMapping("/{id}/cancel")
    @PreAuthorize("hasRole('EMPLOYEE')")
    public ResponseEntity<ProductRequestDTO> cancelRequest(@PathVariable Long id) {
        return ResponseEntity.ok(productRequestService.cancelRequest(id));
    }

    /**
     * Get status history
     */
    @GetMapping("/{id}/history")
    @PreAuthorize("hasAnyRole('ADMIN', 'PROCUREMENT_MANAGER', 'STORE_OFFICER')")
    public ResponseEntity<List<RequestStatusHistoryDTO>> getStatusHistory(@PathVariable Long id) {
        return ResponseEntity.ok(productRequestService.getStatusHistory(id));
    }
}
```

---

### 2. CostCenter Controller

```java
package com.eac.inventory.controller;

import com.eac.inventory.dto.*;
import com.eac.inventory.service.CostCenterService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/cost-centers")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class CostCenterController {

    private final CostCenterService costCenterService;

    /**
     * Get all cost centers
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'PROCUREMENT_MANAGER')")
    public ResponseEntity<Page<CostCenterDTO>> getAllCostCenters(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String status) {
        return ResponseEntity.ok(costCenterService.getAllCostCenters(page, size, status));
    }

    /**
     * Get cost center by ID
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'PROCUREMENT_MANAGER')")
    public ResponseEntity<CostCenterDTO> getCostCenterById(@PathVariable Long id) {
        return ResponseEntity.ok(costCenterService.getCostCenterById(id));
    }

    /**
     * Get active cost centers
     */
    @GetMapping("/filter/active")
    public ResponseEntity<List<CostCenterDTO>> getActiveCostCenters() {
        return ResponseEntity.ok(costCenterService.getActiveCostCenters());
    }

    /**
     * Create cost center
     */
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<CostCenterDTO> createCostCenter(@RequestBody CreateCostCenterDTO costCenterDTO) {
        CostCenterDTO created = costCenterService.createCostCenter(costCenterDTO);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    /**
     * Update cost center
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<CostCenterDTO> updateCostCenter(
            @PathVariable Long id,
            @RequestBody UpdateCostCenterDTO costCenterDTO) {
        return ResponseEntity.ok(costCenterService.updateCostCenter(id, costCenterDTO));
    }

    /**
     * Delete cost center
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteCostCenter(@PathVariable Long id) {
        costCenterService.deleteCostCenter(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Get cost center statistics
     */
    @GetMapping("/{id}/stats")
    @PreAuthorize("hasAnyRole('ADMIN', 'PROCUREMENT_MANAGER')")
    public ResponseEntity<CostCenterStatsDTO> getCostCenterStats(@PathVariable Long id) {
        return ResponseEntity.ok(costCenterService.getCostCenterStats(id));
    }
}
```

---

### 3. Reports Controller

```java
package com.eac.inventory.controller;

import com.eac.inventory.dto.*;
import com.eac.inventory.service.ReportsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ReportsController {

    private final ReportsService reportsService;

    /**
     * Get requests by status
     */
    @GetMapping("/requests/by-status")
    @PreAuthorize("hasAnyRole('ADMIN', 'PROCUREMENT_MANAGER')")
    public ResponseEntity<RequestsByStatusDTO> getRequestsByStatus() {
        return ResponseEntity.ok(reportsService.getRequestsByStatus());
    }

    /**
     * Get product usage by employee
     */
    @GetMapping("/usage/employee")
    @PreAuthorize("hasAnyRole('ADMIN', 'PROCUREMENT_MANAGER')")
    public ResponseEntity<List<ProductUsageByEmployeeDTO>> getProductUsageByEmployee(
            @RequestParam String start,
            @RequestParam String end) {
        return ResponseEntity.ok(reportsService.getProductUsageByEmployee(
                LocalDate.parse(start),
                LocalDate.parse(end)
        ));
    }

    /**
     * Get cost summary by project
     */
    @GetMapping("/cost/by-project")
    @PreAuthorize("hasAnyRole('ADMIN', 'PROCUREMENT_MANAGER')")
    public ResponseEntity<List<CostSummaryByProjectDTO>> getCostSummaryByProject(
            @RequestParam String start,
            @RequestParam String end) {
        return ResponseEntity.ok(reportsService.getCostSummaryByProject(
                LocalDate.parse(start),
                LocalDate.parse(end)
        ));
    }

    /**
     * Get monthly cost analysis
     */
    @GetMapping("/cost/monthly")
    @PreAuthorize("hasAnyRole('ADMIN', 'PROCUREMENT_MANAGER')")
    public ResponseEntity<List<MonthlyCostAnalysisDTO>> getMonthlyCostAnalysis(
            @RequestParam int year,
            @RequestParam int month) {
        return ResponseEntity.ok(reportsService.getMonthlyCostAnalysis(year, month));
    }

    /**
     * Get quarterly cost analysis
     */
    @GetMapping("/cost/quarterly")
    @PreAuthorize("hasAnyRole('ADMIN', 'PROCUREMENT_MANAGER')")
    public ResponseEntity<List<QuarterlyCostAnalysisDTO>> getQuarterlyCostAnalysis(
            @RequestParam int year,
            @RequestParam int quarter) {
        return ResponseEntity.ok(reportsService.getQuarterlyCostAnalysis(year, quarter));
    }

    /**
     * Get cost center expenses
     */
    @GetMapping("/cost-center/{costCenterId}/expenses")
    @PreAuthorize("hasAnyRole('ADMIN', 'PROCUREMENT_MANAGER')")
    public ResponseEntity<CostCenterExpensesDTO> getCostCenterExpenses(@PathVariable Long costCenterId) {
        return ResponseEntity.ok(reportsService.getCostCenterExpenses(costCenterId));
    }

    /**
     * Get inventory summary
     */
    @GetMapping("/inventory/summary")
    @PreAuthorize("hasAnyRole('ADMIN', 'PROCUREMENT_MANAGER')")
    public ResponseEntity<InventorySummaryDTO> getInventorySummary() {
        return ResponseEntity.ok(reportsService.getInventorySummary());
    }

    /**
     * Get inventory by project
     */
    @GetMapping("/inventory/by-project/{costCenterId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'PROCUREMENT_MANAGER')")
    public ResponseEntity<List<InventoryByProjectDTO>> getInventoryByProject(@PathVariable Long costCenterId) {
        return ResponseEntity.ok(reportsService.getInventoryByProject(costCenterId));
    }
}
```

---

### 4. Service Implementation (ProductRequestService)

```java
package com.eac.inventory.service;

import com.eac.inventory.dto.*;
import com.eac.inventory.entity.*;
import com.eac.inventory.exception.ResourceNotFoundException;
import com.eac.inventory.exception.InvalidOperationException;
import com.eac.inventory.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class ProductRequestService {

    private final ProductRequestRepository productRequestRepository;
    private final ProductRepository productRepository;
    private final CostCenterRepository costCenterRepository;
    private final EmployeeRepository employeeRepository;
    private final RequestStatusHistoryRepository statusHistoryRepository;

    /**
     * Create product request
     */
    public ProductRequestDTO createProductRequest(CreateProductRequestDTO requestDTO) {
        // Validate product exists
        Product product = productRepository.findById(requestDTO.getProduct_id())
                .orElseThrow(() -> new ResourceNotFoundException("Product not found"));

        // Validate cost center exists
        CostCenter costCenter = costCenterRepository.findById(requestDTO.getCost_center_id())
                .orElseThrow(() -> new ResourceNotFoundException("Cost center not found"));

        // Validate employee exists
        Employee employee = employeeRepository.findById(requestDTO.getEmployee_id())
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found"));

        // Create request
        ProductRequest request = new ProductRequest();
        request.setRequestNumber(generateRequestNumber());
        request.setEmployee(employee);
        request.setProduct(product);
        request.setCostCenter(costCenter);
        request.setQuantityRequested(requestDTO.getQuantity_requested());
        request.setUnitCost(product.getUnitCost());
        request.setTotalCost(calculateTotalCost(requestDTO.getQuantity_requested(), product.getUnitCost()));
        request.setPurpose(requestDTO.getPurpose());
        request.setComments(requestDTO.getComments());
        request.setStatus(RequestStatus.PENDING);
        request.setCreatedDate(LocalDateTime.now());

        ProductRequest saved = productRequestRepository.save(request);
        
        // Record status history
        recordStatusHistory(saved, null, RequestStatus.PENDING, "Request created");

        return mapToDTO(saved);
    }

    /**
     * Approve by procurement manager
     */
    public ProductRequestDTO approveBYProcurement(Long id, ApproveProcurementDTO approvalDTO) {
        ProductRequest request = getProductRequest(id);

        if (request.getStatus() != RequestStatus.PENDING) {
            throw new InvalidOperationException("Request is not in pending status");
        }

        request.setStatus(RequestStatus.APPROVED_BY_PROCUREMENT);
        request.setQuantityApproved(approvalDTO.getQuantity_approved());
        request.setProcurementManagerId(getCurrentUserId()); // Get from security context
        request.setProcurementComments(approvalDTO.getComments());
        request.setProcurementDate(LocalDateTime.now());
        request.setModifiedDate(LocalDateTime.now());

        ProductRequest saved = productRequestRepository.save(request);
        recordStatusHistory(saved, RequestStatus.PENDING, RequestStatus.APPROVED_BY_PROCUREMENT, 
                "Approved by procurement manager: " + approvalDTO.getComments());

        return mapToDTO(saved);
    }

    /**
     * Reject by procurement manager
     */
    public ProductRequestDTO rejectByProcurement(Long id, RejectRequestDTO rejectionDTO) {
        ProductRequest request = getProductRequest(id);

        if (request.getStatus() != RequestStatus.PENDING) {
            throw new InvalidOperationException("Request is not in pending status");
        }

        request.setStatus(RequestStatus.REJECTED_BY_PROCUREMENT);
        request.setProcurementManagerId(getCurrentUserId());
        request.setProcurementComments(rejectionDTO.getComments());
        request.setProcurementDate(LocalDateTime.now());
        request.setModifiedDate(LocalDateTime.now());

        ProductRequest saved = productRequestRepository.save(request);
        recordStatusHistory(saved, RequestStatus.PENDING, RequestStatus.REJECTED_BY_PROCUREMENT,
                "Rejected by procurement manager: " + rejectionDTO.getComments());

        return mapToDTO(saved);
    }

    /**
     * Issue product to employee
     */
    public ProductRequestDTO issueProduct(Long id, IssueProductDTO issueDTO) {
        ProductRequest request = getProductRequest(id);

        if (request.getStatus() != RequestStatus.APPROVED_BY_STORE) {
            throw new InvalidOperationException("Request is not approved by store");
        }

        // Verify stock availability
        Product product = request.getProduct();
        if (product.getStock() < issueDTO.getQuantity_issued()) {
            throw new InvalidOperationException("Insufficient stock available");
        }

        // Deduct from inventory
        product.setStock(product.getStock() - issueDTO.getQuantity_issued());
        productRepository.save(product);

        // Update request
        request.setStatus(RequestStatus.ISSUED);
        request.setQuantityIssued(issueDTO.getQuantity_issued());
        request.setStoreOfficerId(getCurrentUserId());
        request.setStoreComments(issueDTO.getComments());
        request.setIssuedDate(LocalDateTime.now());
        request.setModifiedDate(LocalDateTime.now());

        ProductRequest saved = productRequestRepository.save(request);
        recordStatusHistory(saved, RequestStatus.APPROVED_BY_STORE, RequestStatus.ISSUED,
                "Product issued: " + issueDTO.getQuantity_issued() + " units");

        return mapToDTO(saved);
    }

    /**
     * Get all requests by status
     */
    public Page<ProductRequestDTO> getRequestsByStatus(String status, int page, int size) {
        RequestStatus requestStatus = RequestStatus.valueOf(status.toUpperCase());
        return productRequestRepository.findByStatus(requestStatus, PageRequest.of(page, size))
                .map(this::mapToDTO);
    }

    /**
     * Get requests by employee
     */
    public Page<ProductRequestDTO> getRequestsByEmployee(Long employeeId, int page, int size) {
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found"));
        return productRequestRepository.findByEmployee(employee, PageRequest.of(page, size))
                .map(this::mapToDTO);
    }

    /**
     * Get pending requests for procurement
     */
    public Page<ProductRequestDTO> getPendingRequests(int page, int size) {
        return productRequestRepository.findByStatus(RequestStatus.PENDING, PageRequest.of(page, size))
                .map(this::mapToDTO);
    }

    /**
     * Get status history
     */
    public List<RequestStatusHistoryDTO> getStatusHistory(Long requestId) {
        ProductRequest request = getProductRequest(requestId);
        return statusHistoryRepository.findByProductRequest(request).stream()
                .map(this::mapHistoryToDTO)
                .collect(Collectors.toList());
    }

    // Helper methods
    private ProductRequest getProductRequest(Long id) {
        return productRequestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product request not found"));
    }

    private String generateRequestNumber() {
        return "REQ-" + System.currentTimeMillis();
    }

    private BigDecimal calculateTotalCost(int quantity, BigDecimal unitCost) {
        return unitCost.multiply(new BigDecimal(quantity));
    }

    private void recordStatusHistory(ProductRequest request, RequestStatus oldStatus, 
                                     RequestStatus newStatus, String notes) {
        RequestStatusHistory history = new RequestStatusHistory();
        history.setProductRequest(request);
        history.setOldStatus(oldStatus);
        history.setNewStatus(newStatus);
        history.setChangedBy(getCurrentUserId());
        history.setChangedDate(LocalDateTime.now());
        history.setChangeNotes(notes);
        statusHistoryRepository.save(history);
    }

    private Long getCurrentUserId() {
        // Get from SecurityContext
        return 1L; // Placeholder
    }

    private ProductRequestDTO mapToDTO(ProductRequest request) {
        return ProductRequestDTO.builder()
                .id(request.getId())
                .request_number(request.getRequestNumber())
                .employee_id(request.getEmployee().getId())
                .product_id(request.getProduct().getId())
                .product_name(request.getProduct().getName())
                .cost_center_id(request.getCostCenter().getId())
                .quantity_requested(request.getQuantityRequested())
                .quantity_approved(request.getQuantityApproved())
                .quantity_issued(request.getQuantityIssued())
                .unit_cost(request.getUnitCost())
                .total_cost(request.getTotalCost())
                .purpose(request.getPurpose())
                .comments(request.getComments())
                .status(request.getStatus().toString())
                .created_date(request.getCreatedDate())
                .modified_date(request.getModifiedDate())
                .build();
    }

    private RequestStatusHistoryDTO mapHistoryToDTO(RequestStatusHistory history) {
        return RequestStatusHistoryDTO.builder()
                .id(history.getId())
                .old_status(history.getOldStatus() != null ? history.getOldStatus().toString() : null)
                .new_status(history.getNewStatus().toString())
                .changed_date(history.getChangedDate())
                .change_notes(history.getChangeNotes())
                .build();
    }
}
```

---

## Key Implementation Notes

### 1. **Workflow Validation**
- Ensure status transitions are valid
- Prevent bypassing approval stages
- Validate stock before issuance

### 2. **Database Transactions**
- Use @Transactional for data consistency
- Rollback on any error
- Maintain audit trails

### 3. **Security**
- Implement role-based access control
- Verify employee ownership of requests
- Log all modifications

### 4. **Calculations**
- Calculate total_cost = quantity × unit_cost
- Update cost_center.spent_amount on issuance
- Calculate inventory total_value

### 5. **Error Handling**
- Custom exceptions for business logic errors
- Proper HTTP status codes
- Meaningful error messages

---

## Database Enums

```java
public enum RequestStatus {
    PENDING,
    APPROVED_BY_PROCUREMENT,
    REJECTED_BY_PROCUREMENT,
    APPROVED_BY_STORE,
    REJECTED_BY_STORE,
    ISSUED,
    CANCELLED
}

public enum CostCenterType {
    PROJECT,
    DEPARTMENT,
    LOCATION
}

public enum CostCenterStatus {
    ACTIVE,
    INACTIVE,
    ON_HOLD
}
```

---

## DTOs Required

```java
// Create Request
@Data
public class CreateProductRequestDTO {
    private Long employee_id;
    private Long product_id;
    private Long cost_center_id;
    private int quantity_requested;
    private String purpose;
    private String comments;
}

// Approval Request
@Data
public class ApproveProcurementDTO {
    private int quantity_approved;
    private String comments;
}

// Issue Product
@Data
public class IssueProductDTO {
    private int quantity_issued;
    private String batch_number;
    private String serial_numbers;
    private String comments;
}

// Rejection
@Data
public class RejectRequestDTO {
    private String comments;
}

// Response DTO
@Data
@Builder
public class ProductRequestDTO {
    private Long id;
    private String request_number;
    private Long employee_id;
    private Long product_id;
    private String product_name;
    private Long cost_center_id;
    private int quantity_requested;
    private Integer quantity_approved;
    private int quantity_issued;
    private BigDecimal unit_cost;
    private BigDecimal total_cost;
    private String purpose;
    private String comments;
    private String status;
    private LocalDateTime created_date;
    private LocalDateTime modified_date;
}
```

---

This completes the backend specification. Now implement in Spring Boot with proper error handling, validation, and security.
