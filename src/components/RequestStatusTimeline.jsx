import React from 'react';
import {
  Typography,
  Card,
  CardBody,
  Chip
} from "@material-tailwind/react";
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  DocumentCheckIcon,
  TruckIcon
} from "@heroicons/react/24/outline";
import { REQUEST_STATUS, STATUS_LABELS, STATUS_COLORS } from '../../config/dataModels';

/**
 * RequestStatusTimeline Component
 * Displays the workflow progress of a product request
 */
const RequestStatusTimeline = ({ request }) => {
  if (!request) return null;

  // Define the workflow steps
  const workflowSteps = [
    {
      id: 'submitted',
      label: 'Submitted',
      status: REQUEST_STATUS.PENDING,
      icon: DocumentCheckIcon,
      description: 'Request submitted by employee',
      timestamp: request.created_date
    },
    {
      id: 'procurement',
      label: 'Procurement Review',
      status: [REQUEST_STATUS.APPROVED_BY_PROCUREMENT, REQUEST_STATUS.REJECTED_BY_PROCUREMENT],
      icon: CheckCircleIcon,
      description: 'Reviewed by Procurement Manager',
      timestamp: request.procurement_date,
      comments: request.procurement_comments
    },
    {
      id: 'store',
      label: 'Store Approval',
      status: [REQUEST_STATUS.APPROVED_BY_STORE, REQUEST_STATUS.REJECTED_BY_STORE],
      icon: DocumentCheckIcon,
      description: 'Approved by Store Officer',
      timestamp: request.store_date,
      comments: request.store_comments
    },
    {
      id: 'issued',
      label: 'Issued',
      status: REQUEST_STATUS.ISSUED,
      icon: TruckIcon,
      description: 'Product issued to employee',
      timestamp: request.issued_date
    }
  ];

  // Determine which steps are completed and which are current
  const isCompleted = (stepStatuses) => {
    if (typeof stepStatuses === 'string') {
      return request.status === stepStatuses;
    }
    return stepStatuses.includes(request.status);
  };

  const isRejected = () => {
    return request.status === REQUEST_STATUS.REJECTED_BY_PROCUREMENT ||
           request.status === REQUEST_STATUS.REJECTED_BY_STORE;
  };

  const isCancelled = () => {
    return request.status === REQUEST_STATUS.CANCELLED;
  };

  return (
    <Card className="w-full">
      <CardBody className="p-6">
        <Typography variant="h6" color="blue-gray" className="mb-6">
          Request Workflow Progress
        </Typography>

        <div className="relative">
          {/* Timeline */}
          <div className="space-y-6">
            {workflowSteps.map((step, index) => {
              const StepIcon = step.icon;
              const isStepCompleted = isCompleted(step.status);
              const isCurrentStep = !isStepCompleted && !isCancelled() && !isRejected();
              const isAfterCurrent = index > workflowSteps.findIndex(s => isCurrentStep);

              return (
                <div key={step.id} className="flex items-start gap-4">
                  {/* Timeline line and icon */}
                  <div className="flex flex-col items-center">
                    {/* Icon */}
                    <div
                      className={`rounded-full p-3 ${
                        isRejected() && isAfterCurrent
                          ? 'bg-gray-100'
                          : isStepCompleted
                          ? 'bg-green-100'
                          : isCurrentStep
                          ? 'bg-blue-100'
                          : 'bg-gray-100'
                      }`}
                    >
                      <StepIcon
                        className={`h-6 w-6 ${
                          isRejected() && isAfterCurrent
                            ? 'text-gray-400'
                            : isStepCompleted
                            ? 'text-green-600'
                            : isCurrentStep
                            ? 'text-blue-600'
                            : 'text-gray-400'
                        }`}
                      />
                    </div>

                    {/* Vertical line */}
                    {index < workflowSteps.length - 1 && (
                      <div
                        className={`w-1 h-12 mt-2 ${
                          isStepCompleted || (isCurrentStep && index === 0)
                            ? 'bg-green-400'
                            : 'bg-gray-300'
                        }`}
                      />
                    )}
                  </div>

                  {/* Step content */}
                  <div className="flex-1 pt-1">
                    <div className="flex items-center gap-2">
                      <Typography variant="h6" color="blue-gray">
                        {step.label}
                      </Typography>
                      {isStepCompleted && (
                        <CheckCircleIcon className="h-5 w-5 text-green-600" />
                      )}
                    </div>

                    <Typography variant="small" color="gray" className="mt-1">
                      {step.description}
                    </Typography>

                    {step.timestamp && (
                      <Typography variant="small" color="blue-gray" className="mt-2 font-semibold">
                        {new Date(step.timestamp).toLocaleString()}
                      </Typography>
                    )}

                    {step.comments && (
                      <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <Typography variant="small" className="font-semibold">
                          Comments:
                        </Typography>
                        <Typography variant="small" color="gray">
                          {step.comments}
                        </Typography>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Final Status */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <Typography variant="small" color="blue-gray" className="font-semibold">
                  Current Status
                </Typography>
                <Chip
                  value={STATUS_LABELS[request.status] || request.status}
                  color={STATUS_COLORS[request.status] || 'gray'}
                  size="lg"
                />
              </div>

              {isRejected() && (
                <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-200 flex items-start gap-3">
                  <XCircleIcon className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <Typography variant="small" className="font-semibold text-red-700">
                      Request Rejected
                    </Typography>
                    <Typography variant="small" color="red" className="mt-1">
                      This request was rejected in the approval process.
                      You may submit a new request if needed.
                    </Typography>
                  </div>
                </div>
              )}

              {request.status === REQUEST_STATUS.ISSUED && (
                <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200 flex items-start gap-3">
                  <CheckCircleIcon className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <Typography variant="small" className="font-semibold text-green-700">
                      Product Issued Successfully
                    </Typography>
                    <Typography variant="small" color="green" className="mt-1">
                      The product has been issued and is ready for pickup or delivery.
                    </Typography>
                  </div>
                </div>
              )}

              {request.status === REQUEST_STATUS.PENDING && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200 flex items-start gap-3">
                  <ClockIcon className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <Typography variant="small" className="font-semibold text-blue-700">
                      Awaiting Review
                    </Typography>
                    <Typography variant="small" color="blue" className="mt-1">
                      Your request is awaiting review by the Procurement Manager.
                    </Typography>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  );
};

/**
 * RequestStatusBadge Component
 * Compact status display for lists
 */
export const RequestStatusBadge = ({ status, size = 'md' }) => {
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2'
  };

  return (
    <Chip
      value={STATUS_LABELS[status] || status}
      color={STATUS_COLORS[status] || 'gray'}
      size={size}
      className={sizeClasses[size]}
    />
  );
};

/**
 * StatusProgressIndicator Component
 * Compact progress indicator showing approval steps
 */
export const StatusProgressIndicator = ({ status }) => {
  const steps = [
    { key: REQUEST_STATUS.PENDING, label: 'Pending' },
    { key: REQUEST_STATUS.APPROVED_BY_PROCUREMENT, label: 'Procurement' },
    { key: REQUEST_STATUS.APPROVED_BY_STORE, label: 'Store' },
    { key: REQUEST_STATUS.ISSUED, label: 'Issued' }
  ];

  const currentIndex = steps.findIndex(
    step => step.key === status || 
    (status === REQUEST_STATUS.REJECTED_BY_PROCUREMENT && step.key === REQUEST_STATUS.APPROVED_BY_PROCUREMENT) ||
    (status === REQUEST_STATUS.REJECTED_BY_STORE && step.key === REQUEST_STATUS.APPROVED_BY_STORE)
  );

  return (
    <div className="flex items-center justify-between gap-2">
      {steps.map((step, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;
        const isRejected = (
          (status === REQUEST_STATUS.REJECTED_BY_PROCUREMENT && step.key === REQUEST_STATUS.APPROVED_BY_PROCUREMENT) ||
          (status === REQUEST_STATUS.REJECTED_BY_STORE && step.key === REQUEST_STATUS.APPROVED_BY_STORE)
        );

        return (
          <div key={step.key} className="flex items-center gap-2">
            <div
              className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${
                isRejected
                  ? 'bg-red-100 text-red-600'
                  : isCompleted
                  ? 'bg-green-100 text-green-600'
                  : isCurrent
                  ? 'bg-blue-100 text-blue-600'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {isRejected ? '✕' : isCompleted ? '✓' : index + 1}
            </div>
            <Typography variant="small" className="hidden md:inline">
              {step.label}
            </Typography>

            {index < steps.length - 1 && (
              <div className={`h-1 w-8 ${isCompleted ? 'bg-green-400' : 'bg-gray-300'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default RequestStatusTimeline;
