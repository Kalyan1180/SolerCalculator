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
import { LOW_STOCK_THRESHOLD, STOCK_STATUS } from '@/constants/inventoryConstants';

const INVENTORY_COLLECTION = 'inventory';

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

function stockStatus(quantity) {
  if (quantity <= 0) return STOCK_STATUS.OUT_OF_STOCK;
  if (quantity <= LOW_STOCK_THRESHOLD) return STOCK_STATUS.LOW_STOCK;
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

export async function createInventoryItem(itemData) {
  try {
    if (!itemData?.type?.trim()) return { success: false, error: 'Item type is required' };
    if (!itemData?.name?.trim()) return { success: false, error: 'Item name is required' };

    const costPrice = nonNegativeNumber(itemData.costPrice, 'Cost price');
    const sellingPrice = nonNegativeNumber(itemData.sellingPrice, 'Selling price');
    const quantity = nonNegativeNumber(itemData.quantity, 'Quantity');
    if (!Number.isInteger(quantity)) return { success: false, error: 'Quantity must be a whole number' };

    const itemId = createItemId();
    const now = Timestamp.now();
    const pricing = calculatePricing(costPrice, sellingPrice);
    const newItem = {
      itemId,
      type: itemData.type.trim(),
      name: itemData.name.trim(),
      description: itemData.description?.trim() || '',
      specs: itemData.specs && typeof itemData.specs === 'object' ? itemData.specs : {},
      costPrice,
      sellingPrice,
      ...pricing,
      quantity,
      unit: itemData.unit?.trim() || 'piece',
      supplier: itemData.supplier?.trim() || '',
      status: stockStatus(quantity),
      createdAt: now,
      updatedAt: now
    };

    await setDoc(doc(db, INVENTORY_COLLECTION, itemId), newItem);
    return { success: true, itemId, item: newItem };
  } catch (error) {
    console.error('Error creating inventory item:', error);
    return { success: false, error: error.message };
  }
}

export async function getAllInventoryItems() {
  try {
    const querySnapshot = await getDocs(collection(db, INVENTORY_COLLECTION));
    const items = querySnapshot.docs.map(itemDoc => ({ id: itemDoc.id, ...itemDoc.data() }));
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
    return { success: true, item: { id: itemSnap.id, ...itemSnap.data() } };
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

    const allowedFields = new Set([
      'type', 'name', 'description', 'specs', 'costPrice', 'sellingPrice',
      'quantity', 'unit', 'supplier', 'status'
    ]);
    const updates = {};
    Object.entries(requestedUpdates || {}).forEach(([key, value]) => {
      if (allowedFields.has(key)) updates[key] = value;
    });
    if (!Object.keys(updates).length) return { success: false, error: 'No supported fields were provided' };

    if (Object.prototype.hasOwnProperty.call(updates, 'name')) {
      updates.name = String(updates.name || '').trim();
      if (!updates.name) return { success: false, error: 'Item name is required' };
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'type')) {
      updates.type = String(updates.type || '').trim();
      if (!updates.type) return { success: false, error: 'Item type is required' };
    }
    ['description', 'unit', 'supplier'].forEach(field => {
      if (Object.prototype.hasOwnProperty.call(updates, field)) updates[field] = String(updates[field] || '').trim();
    });

    const current = itemSnap.data();
    const costPrice = Object.prototype.hasOwnProperty.call(updates, 'costPrice')
      ? nonNegativeNumber(updates.costPrice, 'Cost price')
      : nonNegativeNumber(current.costPrice, 'Cost price');
    const sellingPrice = Object.prototype.hasOwnProperty.call(updates, 'sellingPrice')
      ? nonNegativeNumber(updates.sellingPrice, 'Selling price')
      : nonNegativeNumber(current.sellingPrice, 'Selling price');

    if (Object.prototype.hasOwnProperty.call(updates, 'costPrice') || Object.prototype.hasOwnProperty.call(updates, 'sellingPrice')) {
      updates.costPrice = costPrice;
      updates.sellingPrice = sellingPrice;
      Object.assign(updates, calculatePricing(costPrice, sellingPrice));
    }

    if (Object.prototype.hasOwnProperty.call(updates, 'quantity')) {
      const quantity = nonNegativeNumber(updates.quantity, 'Quantity');
      if (!Number.isInteger(quantity)) return { success: false, error: 'Quantity must be a whole number' };
      updates.quantity = quantity;
      updates.status = stockStatus(quantity);
    }

    updates.updatedAt = Timestamp.now();
    await updateDoc(itemRef, updates);
    return { success: true };
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
    if (!type) return { success: false, error: 'Inventory type is required' };
    const inventoryQuery = query(
      collection(db, INVENTORY_COLLECTION),
      where('type', '==', String(type))
    );
    const querySnapshot = await getDocs(inventoryQuery);
    const items = querySnapshot.docs.map(itemDoc => ({ id: itemDoc.id, ...itemDoc.data() }));
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
      const quantity = Number(item.quantity) || 0;
      summary.totalCost += (Number(item.costPrice) || 0) * quantity;
      summary.totalValue += (Number(item.sellingPrice) || 0) * quantity;
      summary.totalUnits += quantity;
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
