// src/models/analyticsModel.js
import { db } from '@/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { PAYMENT_STATUS, PROJECT_STATUS } from '@/constants/businessConstants';
import { LOW_STOCK_THRESHOLD, STOCK_STATUS } from '@/constants/inventoryConstants';

const PROJECTS_COLLECTION = 'projects';
const INVENTORY_COLLECTION = 'inventory';

function numberValue(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function projectCost(project) {
  const explicitTotal = numberValue(project.totalCostWithoutMarkup);
  if (explicitTotal > 0) return explicitTotal;
  return numberValue(project.materialCost) + numberValue(project.laborCost);
}

function projectRevenue(project) {
  return numberValue(project.finalPrice) || numberValue(project.quotedPrice);
}

function inventoryStatus(item) {
  if (item.status) return item.status;
  const quantity = numberValue(item.quantity);
  if (quantity <= 0) return STOCK_STATUS.OUT_OF_STOCK;
  if (quantity <= LOW_STOCK_THRESHOLD) return STOCK_STATUS.LOW_STOCK;
  return STOCK_STATUS.IN_STOCK;
}

function paidAmount(project) {
  if (project.paymentStatus === PAYMENT_STATUS.BALANCE_PAID) return projectRevenue(project);
  if (project.paymentStatus === PAYMENT_STATUS.ADVANCE_PAID) return numberValue(project.advanceAmount);
  return 0;
}

export async function getAnalyticsDashboard() {
  try {
    const [projectsSnapshot, inventorySnapshot] = await Promise.all([
      getDocs(collection(db, PROJECTS_COLLECTION)),
      getDocs(collection(db, INVENTORY_COLLECTION))
    ]);

    const allProjects = projectsSnapshot.docs.map(projectDoc => ({ id: projectDoc.id, ...projectDoc.data() }));
    const inventory = inventorySnapshot.docs.map(itemDoc => ({ id: itemDoc.id, ...itemDoc.data() }));
    const validStatuses = new Set(Object.values(PROJECT_STATUS));
    const projects = allProjects.filter(project => project.projectId && validStatuses.has(project.status));
    const completedProjects = projects.filter(project => project.status === PROJECT_STATUS.COMPLETED);

    const totalRevenue = projects.reduce((sum, project) => sum + projectRevenue(project), 0);
    const completedRevenue = completedProjects.reduce((sum, project) => sum + projectRevenue(project), 0);
    const totalCost = projects.reduce((sum, project) => sum + projectCost(project), 0);
    const completedCost = completedProjects.reduce((sum, project) => sum + projectCost(project), 0);
    const totalPaymentsReceived = projects.reduce((sum, project) => sum + paidAmount(project), 0);
    const advanceReceived = projects
      .filter(project => [PAYMENT_STATUS.ADVANCE_PAID, PAYMENT_STATUS.BALANCE_PAID].includes(project.paymentStatus))
      .reduce((sum, project) => sum + numberValue(project.advanceAmount), 0);
    const balanceReceived = projects
      .filter(project => project.paymentStatus === PAYMENT_STATUS.BALANCE_PAID)
      .reduce((sum, project) => sum + numberValue(project.balanceAmount), 0);
    const balancePending = projects
      .filter(project => project.approvalDate && project.paymentStatus !== PAYMENT_STATUS.BALANCE_PAID)
      .reduce((sum, project) => sum + numberValue(project.balanceAmount), 0);

    const totalInventoryValue = inventory.reduce((sum, item) => {
      return sum + numberValue(item.sellingPrice) * numberValue(item.quantity);
    }, 0);
    const totalInventoryCost = inventory.reduce((sum, item) => {
      return sum + numberValue(item.costPrice) * numberValue(item.quantity);
    }, 0);

    const totalProfit = totalRevenue - totalCost;
    const completedProfit = completedRevenue - completedCost;
    const metrics = {
      totalProjects: projects.length,
      legacyProjectCount: allProjects.length - projects.length,
      completedProjects: completedProjects.length,
      approvedProjects: projects.filter(project => project.status === PROJECT_STATUS.APPROVED).length,
      scheduledProjects: projects.filter(project => project.status === PROJECT_STATUS.INSTALLATION_SCHEDULED).length,
      inProgressProjects: projects.filter(project => project.status === PROJECT_STATUS.IN_PROGRESS).length,
      pendingQuotes: projects.filter(project => project.status === PROJECT_STATUS.QUOTE_PENDING).length,
      quoteSentProjects: projects.filter(project => project.status === PROJECT_STATUS.QUOTE_SENT).length,

      totalRevenue,
      completedRevenue,
      totalPaymentsReceived,
      totalCost,
      completedCost,
      totalProfit,
      completedProfit,
      profitMargin: totalCost > 0 ? Number(((totalProfit / totalCost) * 100).toFixed(2)) : 0,

      totalInventoryValue,
      totalInventoryCost,
      lowStockItems: inventory.filter(item => inventoryStatus(item) === STOCK_STATUS.LOW_STOCK).length,
      outOfStockItems: inventory.filter(item => inventoryStatus(item) === STOCK_STATUS.OUT_OF_STOCK).length,

      advanceReceived,
      balanceReceived,
      balancePending,
      completionRate: projects.length > 0
        ? Number(((completedProjects.length / projects.length) * 100).toFixed(2))
        : 0
    };

    return { success: true, metrics, projects, inventory };
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return { success: false, error: error.message };
  }
}

export async function getProjectsByStatus() {
  try {
    const projectsSnapshot = await getDocs(collection(db, PROJECTS_COLLECTION));
    const statusBreakdown = {};
    projectsSnapshot.forEach(projectDoc => {
      const status = projectDoc.data().status;
      if (!status) return;
      statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;
    });
    return { success: true, statusBreakdown };
  } catch (error) {
    console.error('Error getting projects by status:', error);
    return { success: false, error: error.message };
  }
}

export async function getTopProjects(limit = 10) {
  try {
    const safeLimit = Math.min(100, Math.max(1, Math.trunc(numberValue(limit) || 10)));
    const projectsSnapshot = await getDocs(collection(db, PROJECTS_COLLECTION));
    const validStatuses = new Set(Object.values(PROJECT_STATUS));
    const projects = projectsSnapshot.docs
      .map(projectDoc => ({ id: projectDoc.id, ...projectDoc.data() }))
      .filter(project => validStatuses.has(project.status))
      .map(project => ({
        ...project,
        profit: projectRevenue(project) - projectCost(project)
      }))
      .sort((a, b) => b.profit - a.profit)
      .slice(0, safeLimit);
    return { success: true, projects };
  } catch (error) {
    console.error('Error getting top projects:', error);
    return { success: false, error: error.message };
  }
}
