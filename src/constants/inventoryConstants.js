// src/constants/inventoryConstants.js
// Inventory management constants

export const INVENTORY_TYPES = {
  INVERTER: 'inverter',
  BATTERY: 'battery',
  PANEL: 'panel',
  WIRING: 'wiring',
  MOUNTING: 'mounting',
  OTHER: 'other'
};

export const INVENTORY_TYPE_LABELS = {
  inverter: 'Inverter',
  battery: 'Battery',
  panel: 'Solar Panel',
  wiring: 'Wiring & Cables',
  mounting: 'Mounting Hardware',
  other: 'Other'
};

export const UNIT_TYPES = {
  PIECE: 'piece',
  KIT: 'kit',
  SET: 'set',
  METER: 'meter'
};

export const STOCK_STATUS = {
  IN_STOCK: 'in_stock',
  LOW_STOCK: 'low_stock',
  OUT_OF_STOCK: 'out_of_stock',
  DISCONTINUED: 'discontinued'
};

export const LOW_STOCK_THRESHOLD = 5;
