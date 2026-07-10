// src/models/inventoryModel.js
// Inventory management model with Firestore integration

import { db } from '@/firebase';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  Timestamp
} from 'firebase/firestore';
import { LOW_STOCK_THRESHOLD } from '@/constants/inventoryConstants';

const INVENTORY_COLLECTION = 'inventory';

/**
 * Create new inventory item
 */
export async function createInventoryItem(itemData) {
  try {
    const itemId = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const newItem = {
      itemId,
      type: itemData.type,
      name: itemData.name,
      description: itemData.description || '',
      specs: itemData.specs || {},
      
      // Pricing
      costPrice: Number(itemData.costPrice),
      sellingPrice: Number(itemData.sellingPrice),
      profit: Number(itemData.sellingPrice) - Number(itemData.costPrice),
      profitMargin: (((Number(itemData.sellingPrice) - Number(itemData.costPrice)) / Number(itemData.costPrice)) * 100).toFixed(2),
      
      // Stock
      quantity: Number(itemData.quantity),
      unit: itemData.unit || 'piece',
      supplier: itemData.supplier || '',
      
      // Status
      status: itemData.quantity > LOW_STOCK_THRESHOLD ? 'in_stock' : 'low_stock',
      
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };
    
    const itemRef = doc(db, INVENTORY_COLLECTION, itemId);
    await setDoc(itemRef, newItem);
    
    console.log('Inventory item created:', itemId);
    return { success: true, itemId, item: newItem };
  } catch (error) {
    console.error('Error creating inventory item:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all inventory items
 */
export async function getAllInventoryItems() {
  try {
    const querySnapshot = await getDocs(collection(db, INVENTORY_COLLECTION));
    const items = [];
    
    querySnapshot.forEach(doc => {
      items.push({ id: doc.id, ...doc.data() });
    });
    
    return { success: true, items };
  } catch (error) {
    console.error('Error fetching inventory:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get inventory item by ID
 */
export async function getInventoryItem(itemId) {
  try {
    const itemRef = doc(db, INVENTORY_COLLECTION, itemId);
    const itemSnap = await getDoc(itemRef);
    
    if (itemSnap.exists()) {
      return { success: true, item: itemSnap.data() };
    } else {
      return { success: false, error: 'Item not found' };
    }
  } catch (error) {
    console.error('Error fetching inventory item:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update inventory item
 */
export async function updateInventoryItem(itemId, updates) {
  try {
    const itemRef = doc(db, INVENTORY_COLLECTION, itemId);
    
    // Recalculate profit if prices changed
    if (updates.costPrice || updates.sellingPrice) {
      const item = await getDoc(itemRef);
      const itemData = item.data();
      const cost = updates.costPrice || itemData.costPrice;
      const selling = updates.sellingPrice || itemData.sellingPrice;
      
      updates.profit = selling - cost;
      updates.profitMargin = ((((selling - cost) / cost) * 100).toFixed(2));
    }
    
    // Update stock status
    if (updates.quantity !== undefined) {
      updates.status = updates.quantity > LOW_STOCK_THRESHOLD ? 'in_stock' : 'low_stock';
      if (updates.quantity === 0) {
        updates.status = 'out_of_stock';
      }
    }
    
    updates.updatedAt = Timestamp.now();
    
    await updateDoc(itemRef, updates);
    console.log('Inventory item updated:', itemId);
    return { success: true };
  } catch (error) {
    console.error('Error updating inventory item:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete inventory item
 */
export async function deleteInventoryItem(itemId) {
  try {
    const itemRef = doc(db, INVENTORY_COLLECTION, itemId);
    await deleteDoc(itemRef);
    console.log('Inventory item deleted:', itemId);
    return { success: true };
  } catch (error) {
    console.error('Error deleting inventory item:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get inventory items by type
 */
export async function getInventoryByType(type) {
  try {
    const querySnapshot = await getDocs(collection(db, INVENTORY_COLLECTION));
    const items = [];
    
    querySnapshot.forEach(doc => {
      const data = doc.data();
      if (data.type === type) {
        items.push({ id: doc.id, ...data });
      }
    });
    
    return { success: true, items };
  } catch (error) {
    console.error('Error fetching inventory by type:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Calculate inventory value
 */
export async function getInventoryValue() {
  try {
    const result = await getAllInventoryItems();
    if (!result.success) return result;
    
    const totalCost = result.items.reduce((sum, item) => sum + (item.costPrice * item.quantity), 0);
    const totalValue = result.items.reduce((sum, item) => sum + (item.sellingPrice * item.quantity), 0);
    const totalProfit = totalValue - totalCost;
    
    return {
      success: true,
      totalCost,
      totalValue,
      totalProfit,
      totalItems: result.items.length,
      totalUnits: result.items.reduce((sum, item) => sum + item.quantity, 0)
    };
  } catch (error) {
    console.error('Error calculating inventory value:', error);
    return { success: false, error: error.message };
  }
}
