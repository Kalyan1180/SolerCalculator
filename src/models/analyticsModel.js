// src/models/analyticsModel.js
// Analytics and reporting model

import { db } from '@/firebase';
import { collection, getDocs, Timestamp } from 'firebase/firestore';
import { PROJECT_STATUS } from '@/constants/businessConstants';

const PROJECTS_COLLECTION = 'projects';
const INVENTORY_COLLECTION = 'inventory';

/**
 * Get comprehensive analytics dashboard data
 */
export async function getAnalyticsDashboard() {
  try {
    const projectsSnapshot = await getDocs(collection(db, PROJECTS_COLLECTION));
    const inventorySnapshot = await getDocs(collection(db, INVENTORY_COLLECTION));
    
    const projects = [];
    const inventory = [];
    
    projectsSnapshot.forEach(doc => {
      projects.push(doc.data());
    });
    
    inventorySnapshot.forEach(doc => {
      inventory.push(doc.data());
    });
    
    // Calculate metrics
    const metrics = {
      // Project metrics
      totalProjects: projects.length,
      completedProjects: projects.filter(p => p.status === PROJECT_STATUS.COMPLETED).length,
      approvedProjects: projects.filter(p => p.status === PROJECT_STATUS.APPROVED).length,
      inProgressProjects: projects.filter(p => p.status === PROJECT_STATUS.IN_PROGRESS).length,
      pendingQuotes: projects.filter(p => p.status === PROJECT_STATUS.QUOTE_PENDING).length,
      
      // Revenue metrics
      totalRevenue: projects.reduce((sum, p) => sum + (p.quotedPrice || 0), 0),
      completedRevenue: projects
        .filter(p => p.status === PROJECT_STATUS.COMPLETED)
        .reduce((sum, p) => sum + (p.quotedPrice || 0), 0),
      
      // Cost metrics
      totalCost: projects.reduce((sum, p) => sum + (p.materialCost || 0) + (p.laborCost || 0), 0),
      completedCost: projects
        .filter(p => p.status === PROJECT_STATUS.COMPLETED)
        .reduce((sum, p) => sum + (p.materialCost || 0) + (p.laborCost || 0), 0),
      
      // Profit metrics
      totalProfit: 0,
      completedProfit: 0,
      profitMargin: 0,
      
      // Inventory metrics
      totalInventoryValue: inventory.reduce((sum, i) => sum + (i.sellingPrice * i.quantity), 0),
      totalInventoryCost: inventory.reduce((sum, i) => sum + (i.costPrice * i.quantity), 0),
      lowStockItems: inventory.filter(i => i.status === 'low_stock').length,
      outOfStockItems: inventory.filter(i => i.status === 'out_of_stock').length,
      
      // Payment metrics
      advanceReceived: projects
        .filter(p => p.paymentStatus === 'advance_paid')
        .reduce((sum, p) => sum + (p.advanceAmount || 0), 0),
      balancePending: projects
        .filter(p => p.status !== PROJECT_STATUS.COMPLETED)
        .reduce((sum, p) => sum + (p.balanceAmount || 0), 0),
      
      // Completion rate
      completionRate: projects.length > 0 
        ? ((projects.filter(p => p.status === PROJECT_STATUS.COMPLETED).length / projects.length) * 100).toFixed(2)
        : 0
    };
    
    // Calculate totals
    metrics.totalProfit = metrics.totalRevenue - metrics.totalCost;
    metrics.completedProfit = metrics.completedRevenue - metrics.completedCost;
    metrics.profitMargin = metrics.totalCost > 0
      ? ((metrics.totalProfit / metrics.totalCost) * 100).toFixed(2)
      : 0;
    
    return {
      success: true,
      metrics,
      projects,
      inventory
    };
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get projects by status for trend analysis
 */
export async function getProjectsByStatus() {
  try {
    const projectsSnapshot = await getDocs(collection(db, PROJECTS_COLLECTION));
    const statusBreakdown = {};
    
    projectsSnapshot.forEach(doc => {
      const project = doc.data();
      const status = project.status;
      if (!statusBreakdown[status]) {
        statusBreakdown[status] = 0;
      }
      statusBreakdown[status]++;
    });
    
    return { success: true, statusBreakdown };
  } catch (error) {
    console.error('Error getting projects by status:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get top performing projects (by profit)
 */
export async function getTopProjects(limit = 10) {
  try {
    const projectsSnapshot = await getDocs(collection(db, PROJECTS_COLLECTION));
    const projects = [];
    
    projectsSnapshot.forEach(doc => {
      const data = doc.data();
      projects.push({
        ...data,
        profit: (data.quotedPrice || 0) - (data.materialCost || 0) - (data.laborCost || 0)
      });
    });
    
    // Sort by profit (descending)
    projects.sort((a, b) => b.profit - a.profit);
    
    return { success: true, projects: projects.slice(0, limit) };
  } catch (error) {
    console.error('Error getting top projects:', error);
    return { success: false, error: error.message };
  }
}
