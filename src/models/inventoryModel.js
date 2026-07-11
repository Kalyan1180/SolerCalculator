// src/models/inventoryModel.js
import { db } from '@/firebase';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  Timestamp
} from 'firebase/firestore';
import { LOW_STOCK_THRESHOLD } from '@/constants/inventoryConstants';

const INVENTORY_COLLECTION = 'inventory';

function finiteNumber(value, field, minimum = 0) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < minimum) {
    throw new Error(`${field} must be a number greater than or equal to ${minimum}.`);
  }
  return number;
}

function cleanText(value, field, required = false, maxLength = 500) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (required && !text) throw new Error(`${field} is required.`);
  if (text.length > maxLength) throw new Error(`${field} is too long.`);
  return text;
}

function calculateProfit(costPrice, sellingPrice) {
  const profit = sellingPrice - costPrice;
  const profitMargin = costPrice > 0 ? (profit / costPrice) * 100 : 0;
  return {
    profit,
    profitMargin: Number(profitMargin.toFixed(2))
  };
}

function getStockStatus(quantity) {
  if (quantity === 0) return 'out_of_stock';
  if (quantity <= LOW_STOCK_THRESHOLD) return 'low_stock';
  return 'in_stock';
}

function createItemId() {
  const randomPart = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID().replace(/-/g, '').slice(0, 10)
    : Math.random().toString(36).slice(2, 12);
  return `INV-${Date.now()}-${randomPart}`;
}

export async function createInventoryItem(itemData) {
  try {
    const itemId = createItemId();
    const costPrice = finiteNumber(itemData.costPrice, 'Cost price');
    const sellingPrice = finiteNumber(itemData.sellingPrice, 'Selling price');
    const quantity = Math.round(finiteNumber(itemData.quantity, 'Quantity'));
    const profitData = calculateProfit(costPrice, sellingPrice);
    const now = Timestamp.now();

    const newItem = {
      itemId,
      type: cleanText(itemData.type, 'Item type', true, 50),
      name: cleanText(itemData.name, 'Item name', true, 150),
      description: cleanText(itemData.description, 'Description', false, 1000),
      specs: itemData.specs && typeof itemData.specs === 'object' ? itemData.specs : {},
      costPrice,
      sellingPrice,
      ...profitData,
      quantity,
      unit: cleanText(itemData.unit || 'piece', 'Unit', true, 30),
      supplier: cleanText(itemData.supplier, 'Supplier', false, 150),
      status: getStockStatus(quantity),
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
    const snapshot = await getDocs(collection(db, INVENTORY_COLLECTION));
    const items = snapshot.docs
      .map((document) => ({ id: document.id, ...document.data() }))
      .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
    return { success: true, items };
  } catch (error) {
    console.error('Error fetching inventory:', error);
    return { success: false, error: error.message };
  }
}

export async function getInventoryItem(itemId) {
  try {
    if (!itemId) return { success: false, error: 'Item ID is required.' };
    const snapshot = await getDoc(doc(db, INVENTORY_COLLECTION, itemId));
    return snapshot.exists()
      ? { success: true, item: { id: snapshot.id, ...snapshot.data() } }
      : { success: false, error: 'Item not found.' };
  } catch (error) {
    console.error('Error fetching inventory item:', error);
    return { success: false, error: error.message };
  }
}

export async function updateInventoryItem(itemId, requestedUpdates) {
  try {
    const itemRef = doc(db, INVENTORY_COLLECTION, itemId);
    const itemSnapshot = await getDoc(itemRef);
    if (!itemSnapshot.exists()) throw new Error('Item not found.');

    const current = itemSnapshot.data();
    const updates = {};
    const has = (key) => Object.prototype.hasOwnProperty.call(requestedUpdates || {}, key);

    if (has('type')) updates.type = cleanText(requestedUpdates.type, 'Item type', true, 50);
    if (has('name')) updates.name = cleanText(requestedUpdates.name, 'Item name', true, 150);
    if (has('description')) updates.description = cleanText(requestedUpdates.description, 'Description', false, 1000);
    if (has('supplier')) updates.supplier = cleanText(requestedUpdates.supplier, 'Supplier', false, 150);
    if (has('unit')) updates.unit = cleanText(requestedUpdates.unit, 'Unit', true, 30);
    if (has('specs')) updates.specs = requestedUpdates.specs && typeof requestedUpdates.specs === 'object' ? requestedUpdates.specs : {};

    const costPrice = has('costPrice')
      ? finiteNumber(requestedUpdates.costPrice, 'Cost price')
      : finiteNumber(current.costPrice, 'Cost price');
    const sellingPrice = has('sellingPrice')
      ? finiteNumber(requestedUpdates.sellingPrice, 'Selling price')
      : finiteNumber(current.sellingPrice, 'Selling price');

    if (has('costPrice') || has('sellingPrice')) {
      updates.costPrice = costPrice;
      updates.sellingPrice = sellingPrice;
      Object.assign(updates, calculateProfit(costPrice, sellingPrice));
    }

    if (has('quantity')) {
      const quantity = Math.round(finiteNumber(requestedUpdates.quantity, 'Quantity'));
      updates.quantity = quantity;
      updates.status = getStockStatus(quantity);
    }

    if (!Object.keys(updates).length) throw new Error('No inventory changes were supplied.');
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
    if (!itemId) throw new Error('Item ID is required.');
    await deleteDoc(doc(db, INVENTORY_COLLECTION, itemId));
    return { success: true };
  } catch (error) {
    console.error('Error deleting inventory item:', error);
    return { success: false, error: error.message };
  }
}

export async function getInventoryByType(type) {
  try {
    const normalizedType = cleanText(type, 'Item type', true, 50);
    const snapshot = await getDocs(
      query(collection(db, INVENTORY_COLLECTION), where('type', '==', normalizedType))
    );
    const items = snapshot.docs.map((document) => ({ id: document.id, ...document.data() }));
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

    const totals = result.items.reduce((accumulator, item) => {
      const cost = Number(item.costPrice) || 0;
      const selling = Number(item.sellingPrice) || 0;
      const quantity = Number(item.quantity) || 0;
      accumulator.totalCost += cost * quantity;
      accumulator.totalValue += selling * quantity;
      accumulator.totalUnits += quantity;
      return accumulator;
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
