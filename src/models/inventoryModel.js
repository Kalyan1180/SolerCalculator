// src/models/inventoryModel.js
import { db } from '@/firebase';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  Timestamp,
  updateDoc,
  where
} from 'firebase/firestore';
import {
  DEFAULT_LEAD_TIME_DAYS,
  DEFAULT_REORDER_POINT,
  DEFAULT_TARGET_STOCK,
  INVENTORY_TYPES,
  STOCK_STATUS
} from '@/constants/inventoryConstants';

const INVENTORY_COLLECTION = 'inventory';
const SUPPORTED_TYPES = new Set(Object.values(INVENTORY_TYPES));
const CALCULATOR_TYPES = new Set([
  INVENTORY_TYPES.PANEL,
  INVENTORY_TYPES.INVERTER,
  INVENTORY_TYPES.BATTERY,
  INVENTORY_TYPES.WIRING,
  INVENTORY_TYPES.MOUNTING,
  INVENTORY_TYPES.OTHER
]);

function finiteNumber(value, fieldName) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error(`${fieldName} must be a valid number`);
  return number;
}

function nonNegativeNumber(value, fieldName) {
  const number = finiteNumber(value, fieldName);
  if (number < 0) throw new Error(`${fieldName} cannot be negative`);
  return number;
}

function nonNegativeInteger(value, fieldName) {
  const number = nonNegativeNumber(value, fieldName);
  if (!Number.isInteger(number)) throw new Error(`${fieldName} must be a whole number`);
  return number;
}

function positiveInteger(value, fieldName, fallback) {
  const normalized = value === '' || value == null ? fallback : nonNegativeInteger(value, fieldName);
  return Math.max(1, normalized);
}

function normalizeBoolean(value, fallback = false) {
  return typeof value === 'boolean' ? value : fallback;
}

function normalizeText(value, maxLength = 500) {
  return String(value || '').trim().slice(0, maxLength);
}

function normalizeType(value) {
  const type = normalizeText(value, 40).toLowerCase();
  if (!SUPPORTED_TYPES.has(type)) throw new Error('Select a supported inventory type');
  return type;
}

function stockStatus(quantity, reorderPoint, discontinued = false) {
  if (discontinued) return STOCK_STATUS.DISCONTINUED;
  if (quantity <= 0) return STOCK_STATUS.OUT_OF_STOCK;
  if (quantity <= reorderPoint) return STOCK_STATUS.LOW_STOCK;
  return STOCK_STATUS.IN_STOCK;
}

function calculatePricing(costPrice, sellingPrice) {
  const profit = sellingPrice - costPrice;
  return {
    profit,
    profitMargin: costPrice > 0 ? Number(((profit / costPrice) * 100).toFixed(2)) : 0
  };
}

function createItemId() {
  return `INV-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function generatedSku(type, itemId) {
  return `${type.slice(0, 3).toUpperCase()}-${itemId.slice(-8).toUpperCase()}`;
}

function normalizeSpecs(type, specs = {}) {
  const normalized = {};

  if (type === INVENTORY_TYPES.PANEL) {
    normalized.wattage = nonNegativeNumber(specs.wattage || 0, 'Panel wattage');
    normalized.technology = normalizeText(specs.technology, 80);
  }

  if (type === INVENTORY_TYPES.INVERTER) {
    normalized.peakLoad = nonNegativeNumber(specs.peakLoad || 0, 'Peak load');
    normalized.maxPanels = nonNegativeInteger(specs.maxPanels || 0, 'Maximum panels');
    normalized.batterySupported = nonNegativeNumber(specs.batterySupported || 0, 'Battery voltage');
  }

  if (type === INVENTORY_TYPES.BATTERY) {
    normalized.capacity = nonNegativeNumber(specs.capacity || 0, 'Battery capacity');
    normalized.energy = nonNegativeNumber(specs.energy || 0, 'Usable battery energy');
    normalized.voltage = nonNegativeNumber(specs.voltage || 12, 'Battery voltage') || 12;
  }

  if ([INVENTORY_TYPES.WIRING, INVENTORY_TYPES.MOUNTING, INVENTORY_TYPES.OTHER].includes(type)) {
    normalized.fixedQuantityPerSystem = nonNegativeNumber(
      specs.fixedQuantityPerSystem || 0,
      'Fixed system quantity'
    );
    normalized.perPanelQuantity = nonNegativeNumber(
      specs.perPanelQuantity || 0,
      'Quantity per panel'
    );
    normalized.autoInclude = normalizeBoolean(specs.autoInclude, false);
  }

  return normalized;
}

function calculatorEligible(type, activeForCalculator, specs) {
  if (!activeForCalculator || !CALCULATOR_TYPES.has(type)) return false;
  if (type === INVENTORY_TYPES.PANEL) return Number(specs.wattage) > 0;
  if (type === INVENTORY_TYPES.INVERTER) {
    return Number(specs.peakLoad) > 0 && Number(specs.maxPanels) > 0;
  }
  if (type === INVENTORY_TYPES.BATTERY) {
    return Number(specs.capacity) > 0 && Number(specs.energy) > 0;
  }
  return Boolean(specs.autoInclude)
    && (Number(specs.fixedQuantityPerSystem) > 0 || Number(specs.perPanelQuantity) > 0);
}

function normalizedItemShape(data, id = '') {
  const type = SUPPORTED_TYPES.has(String(data.type || '').toLowerCase())
    ? String(data.type).toLowerCase()
    : INVENTORY_TYPES.OTHER;
  const quantity = Number.isFinite(Number(data.quantity)) ? Math.max(0, Math.floor(Number(data.quantity))) : 0;
  const reorderPoint = Number.isFinite(Number(data.reorderPoint))
    ? Math.max(0, Math.floor(Number(data.reorderPoint)))
    : DEFAULT_REORDER_POINT;
  const targetStock = Number.isFinite(Number(data.targetStock))
    ? Math.max(reorderPoint, Math.floor(Number(data.targetStock)))
    : Math.max(DEFAULT_TARGET_STOCK, reorderPoint);
  const costPrice = Number.isFinite(Number(data.costPrice)) ? Math.max(0, Number(data.costPrice)) : 0;
  const sellingPrice = Number.isFinite(Number(data.sellingPrice)) ? Math.max(0, Number(data.sellingPrice)) : 0;
  const discontinued = Boolean(data.discontinued);
  const specs = data.specs && typeof data.specs === 'object' ? data.specs : {};
  const activeForCalculator = Boolean(data.activeForCalculator);

  return {
    id: id || data.itemId,
    ...data,
    itemId: data.itemId || id,
    type,
    sku: normalizeText(data.sku, 80) || generatedSku(type, data.itemId || id || 'ITEM'),
    quantity,
    reorderPoint,
    targetStock,
    leadTimeDays: Number.isFinite(Number(data.leadTimeDays))
      ? Math.max(1, Math.floor(Number(data.leadTimeDays)))
      : DEFAULT_LEAD_TIME_DAYS,
    costPrice,
    sellingPrice,
    ...calculatePricing(costPrice, sellingPrice),
    status: stockStatus(quantity, reorderPoint, discontinued),
    discontinued,
    activeForCalculator,
    calculatorEligible: calculatorEligible(type, activeForCalculator, specs),
    specs
  };
}

async function skuExists(sku, excludedId = '') {
  const skuQuery = query(collection(db, INVENTORY_COLLECTION), where('sku', '==', sku));
  const snapshot = await getDocs(skuQuery);
  return snapshot.docs.some(item => item.id !== excludedId);
}

function prepareItemData(itemData, current = null) {
  const type = normalizeType(itemData.type ?? current?.type);
  const name = normalizeText(itemData.name ?? current?.name, 150);
  if (!name) throw new Error('Item name is required');

  const costPrice = nonNegativeNumber(itemData.costPrice ?? current?.costPrice ?? 0, 'Cost price');
  const sellingPrice = nonNegativeNumber(itemData.sellingPrice ?? current?.sellingPrice ?? 0, 'Selling price');
  const quantity = nonNegativeInteger(itemData.quantity ?? current?.quantity ?? 0, 'Quantity');
  const reorderPoint = nonNegativeInteger(
    itemData.reorderPoint ?? current?.reorderPoint ?? DEFAULT_REORDER_POINT,
    'Reorder point'
  );
  const targetStock = positiveInteger(
    itemData.targetStock ?? current?.targetStock,
    'Target stock',
    Math.max(DEFAULT_TARGET_STOCK, reorderPoint)
  );
  if (targetStock < reorderPoint) throw new Error('Target stock cannot be lower than the reorder point');

  const leadTimeDays = positiveInteger(
    itemData.leadTimeDays ?? current?.leadTimeDays,
    'Lead time',
    DEFAULT_LEAD_TIME_DAYS
  );
  const discontinued = normalizeBoolean(itemData.discontinued, Boolean(current?.discontinued));
  const activeForCalculator = normalizeBoolean(
    itemData.activeForCalculator,
    Boolean(current?.activeForCalculator)
  );
  const specs = normalizeSpecs(type, itemData.specs ?? current?.specs ?? {});
  if (activeForCalculator && !calculatorEligible(type, true, specs)) {
    throw new Error('Complete the required technical specifications before enabling calculator use');
  }

  return {
    type,
    name,
    sku: normalizeText(itemData.sku ?? current?.sku, 80).toUpperCase(),
    description: normalizeText(itemData.description ?? current?.description, 500),
    specs,
    costPrice,
    sellingPrice,
    ...calculatePricing(costPrice, sellingPrice),
    quantity,
    reorderPoint,
    targetStock,
    leadTimeDays,
    unit: normalizeText(itemData.unit ?? current?.unit, 40) || 'piece',
    supplier: normalizeText(itemData.supplier ?? current?.supplier, 150),
    discontinued,
    activeForCalculator,
    status: stockStatus(quantity, reorderPoint, discontinued)
  };
}

export async function createInventoryItem(itemData) {
  try {
    const itemId = createItemId();
    const now = Timestamp.now();
    const prepared = prepareItemData(itemData || {});
    prepared.sku = prepared.sku || generatedSku(prepared.type, itemId);
    if (await skuExists(prepared.sku)) return { success: false, error: 'SKU already exists' };

    const newItem = {
      itemId,
      ...prepared,
      createdAt: now,
      updatedAt: now
    };

    await setDoc(doc(db, INVENTORY_COLLECTION, itemId), newItem);
    return { success: true, itemId, item: normalizedItemShape(newItem, itemId) };
  } catch (error) {
    console.error('Error creating inventory item:', error);
    return { success: false, error: error.message };
  }
}

export async function getAllInventoryItems() {
  try {
    const querySnapshot = await getDocs(collection(db, INVENTORY_COLLECTION));
    const items = querySnapshot.docs.map(itemDoc => normalizedItemShape(itemDoc.data(), itemDoc.id));
    items.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
    return { success: true, items };
  } catch (error) {
    console.error('Error fetching inventory:', error);
    return { success: false, error: error.message };
  }
}

export async function getInventoryItem(itemId) {
  try {
    if (!itemId) return { success: false, error: 'Item ID is required' };
    const itemSnap = await getDoc(doc(db, INVENTORY_COLLECTION, String(itemId)));
    if (!itemSnap.exists()) return { success: false, error: 'Item not found' };
    return { success: true, item: normalizedItemShape(itemSnap.data(), itemSnap.id) };
  } catch (error) {
    console.error('Error fetching inventory item:', error);
    return { success: false, error: error.message };
  }
}

export async function updateInventoryItem(itemId, requestedUpdates) {
  try {
    if (!itemId) return { success: false, error: 'Item ID is required' };
    const itemRef = doc(db, INVENTORY_COLLECTION, String(itemId));
    const itemSnap = await getDoc(itemRef);
    if (!itemSnap.exists()) return { success: false, error: 'Item not found' };

    const current = normalizedItemShape(itemSnap.data(), itemSnap.id);
    const prepared = prepareItemData(requestedUpdates || {}, current);
    prepared.sku = prepared.sku || generatedSku(prepared.type, itemId);
    if (await skuExists(prepared.sku, itemId)) return { success: false, error: 'SKU already exists' };

    await updateDoc(itemRef, {
      ...prepared,
      updatedAt: Timestamp.now()
    });
    return { success: true, item: normalizedItemShape({ ...current, ...prepared }, itemId) };
  } catch (error) {
    console.error('Error updating inventory item:', error);
    return { success: false, error: error.message };
  }
}

export async function deleteInventoryItem(itemId) {
  try {
    if (!itemId) return { success: false, error: 'Item ID is required' };
    const itemRef = doc(db, INVENTORY_COLLECTION, String(itemId));
    const itemSnap = await getDoc(itemRef);
    if (!itemSnap.exists()) return { success: false, error: 'Item not found' };
    await deleteDoc(itemRef);
    return { success: true };
  } catch (error) {
    console.error('Error deleting inventory item:', error);
    return { success: false, error: error.message };
  }
}

export async function getInventoryByType(type) {
  try {
    const normalizedType = normalizeType(type);
    const inventoryQuery = query(
      collection(db, INVENTORY_COLLECTION),
      where('type', '==', normalizedType)
    );
    const querySnapshot = await getDocs(inventoryQuery);
    const items = querySnapshot.docs.map(itemDoc => normalizedItemShape(itemDoc.data(), itemDoc.id));
    return { success: true, items };
  } catch (error) {
    console.error('Error fetching inventory by type:', error);
    return { success: false, error: error.message };
  }
}

export async function getInventoryValue() {
  try {
    const result = await getAllInventoryItems();
    if (!result.success) return result;
    const totals = result.items.reduce((summary, item) => {
      summary.totalCost += item.costPrice * item.quantity;
      summary.totalValue += item.sellingPrice * item.quantity;
      summary.totalUnits += item.quantity;
      return summary;
    }, { totalCost: 0, totalValue: 0, totalUnits: 0 });

    return {
      success: true,
      ...totals,
      totalProfit: totals.totalValue - totals.totalCost,
      totalItems: result.items.length
    };
  } catch (error) {
    console.error('Error calculating inventory value:', error);
    return { success: false, error: error.message };
  }
}
