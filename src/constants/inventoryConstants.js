// src/constants/inventoryConstants.js
// Canonical inventory and demand-planning constants.

export const INVENTORY_TYPES = Object.freeze({
  INVERTER: 'inverter',
  BATTERY: 'battery',
  PANEL: 'panel',
  WIRING: 'wiring',
  MOUNTING: 'mounting',
  OTHER: 'other'
});

export const INVENTORY_TYPE_LABELS = Object.freeze({
  inverter: 'Inverter',
  battery: 'Battery',
  panel: 'Solar Panel',
  wiring: 'Wiring & Cables',
  mounting: 'Mounting Hardware',
  other: 'Other'
});

export const UNIT_TYPES = Object.freeze({
  PIECE: 'piece',
  KIT: 'kit',
  SET: 'set',
  METER: 'meter'
});

export const STOCK_STATUS = Object.freeze({
  IN_STOCK: 'in_stock',
  LOW_STOCK: 'low_stock',
  OUT_OF_STOCK: 'out_of_stock',
  DISCONTINUED: 'discontinued'
});

export const RESTOCK_PRIORITY = Object.freeze({
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low'
});

export const DEFAULT_REORDER_POINT = 5;
export const DEFAULT_TARGET_STOCK = 10;
export const DEFAULT_LEAD_TIME_DAYS = 7;

// Kept for compatibility with older records and imports.
export const LOW_STOCK_THRESHOLD = DEFAULT_REORDER_POINT;

export const DEMAND_PROJECT_STATUSES = Object.freeze({
  COMMITTED: ['approved', 'installation_scheduled', 'in_progress'],
  QUOTATION: ['quote_pending', 'quote_sent'],
  EXCLUDED: ['quote_rejected', 'completed', 'cancelled']
});
