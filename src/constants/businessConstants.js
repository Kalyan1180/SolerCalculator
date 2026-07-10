// src/constants/businessConstants.js
// Business logic constants for solar installation company

export const PROJECT_STATUS = {
  QUOTE_PENDING: 'quote_pending',
  QUOTE_SENT: 'quote_sent',
  QUOTE_REJECTED: 'quote_rejected',
  APPROVED: 'approved',
  INSTALLATION_SCHEDULED: 'installation_scheduled',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

export const PROJECT_STATUS_LABELS = {
  quote_pending: 'Quote Pending',
  quote_sent: 'Quote Sent',
  quote_rejected: 'Quote Rejected',
  approved: 'Approved',
  installation_scheduled: 'Installation Scheduled',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled'
};

export const PROJECT_STATUS_COLORS = {
  quote_pending: '#FFC107',    // Amber
  quote_sent: '#2196F3',       // Blue
  quote_rejected: '#F44336',   // Red
  approved: '#4CAF50',         // Green
  installation_scheduled: '#FF9800', // Orange
  in_progress: '#673AB7',      // Purple
  completed: '#8BC34A',        // Light Green
  cancelled: '#9E9E9E'         // Grey
};

export const PAYMENT_STATUS = {
  NOT_STARTED: 'not_started',
  ADVANCE_PAID: 'advance_paid',
  BALANCE_PAID: 'balance_paid'
};

export const PAYMENT_STATUS_LABELS = {
  not_started: 'Not Started',
  advance_paid: 'Advance Paid',
  balance_paid: 'Balance Paid'
};

export const PAYMENT_MILESTONES = {
  ADVANCE: 'advance',       // Before installation (50% typically)
  BALANCE: 'balance'        // After completion (remaining)
};

export const ROLES = {
  ADMIN: 'admin',
  SALES_MANAGER: 'sales_manager',
  INSTALLATION_TECH: 'installation_tech',
  SUPPORT_STAFF: 'support_staff',
  CUSTOMER: 'customer'
};

export const ROLE_LABELS = {
  admin: 'Administrator',
  sales_manager: 'Sales Manager',
  installation_tech: 'Installation Technician',
  support_staff: 'Support Staff',
  customer: 'Customer'
};
