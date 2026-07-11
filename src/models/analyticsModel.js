// src/models/analyticsModel.js
import { db } from '@/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { PROJECT_STATUS, PAYMENT_STATUS } from '@/constants/businessConstants';

const PROJECTS_COLLECTION = 'projects';
const INVENTORY_COLLECTION = 'inventory';
const REVENUE_STATUSES = new Set([
  PROJECT_STATUS.APPROVED,
  PROJECT_STATUS.INSTALLATION_SCHEDULED,
  PROJECT_STATUS.IN_PROGRESS,
  PROJECT_STATUS.COMPLETED
]);

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function projectRevenue(project) {
  return Math.max(0, number(project.finalPrice || project.quotedPrice));
}

function projectCost(project) {
  return Math.max(0, number(project.materialCost)) + Math.max(0, number(project.laborCost));
}

function round(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round((number(value) + Number.EPSILON) * factor) / factor;
}

export async function getAnalyticsDashboard() {
  try {
    const [projectsSnapshot, inventorySnapshot] = await Promise.all([
      getDocs(collection(db, PROJECTS_COLLECTION)),
      getDocs(collection(db, INVENTORY_COLLECTION))
    ]);

    const projects = projectsSnapshot.docs.map((document) => ({ id: document.id, ...document.data() }));
    const inventory = inventorySnapshot.docs.map((document) => ({ id: document.id, ...document.data() }));
    const revenueProjects = projects.filter((project) => REVENUE_STATUSES.has(project.status));
    const completedProjects = projects.filter((project) => project.status === PROJECT_STATUS.COMPLETED);

    const totalRevenue = revenueProjects.reduce((sum, project) => sum + projectRevenue(project), 0);
    const completedRevenue = completedProjects.reduce((sum, project) => sum + projectRevenue(project), 0);
    const totalCost = revenueProjects.reduce((sum, project) => sum + projectCost(project), 0);
    const completedCost = completedProjects.reduce((sum, project) => sum + projectCost(project), 0);

    const advanceReceived = revenueProjects
      .filter((project) => [PAYMENT_STATUS.ADVANCE_PAID, PAYMENT_STATUS.BALANCE_PAID].includes(project.paymentStatus))
      .reduce((sum, project) => sum + number(project.advanceAmount), 0);
    const balanceReceived = revenueProjects
      .filter((project) => project.paymentStatus === PAYMENT_STATUS.BALANCE_PAID)
      .reduce((sum, project) => sum + number(project.balanceAmount), 0);
    const advancePending = revenueProjects
      .filter((project) => project.paymentStatus === PAYMENT_STATUS.NOT_STARTED)
      .reduce((sum, project) => sum + number(project.advanceAmount), 0);
    const balancePending = revenueProjects
      .filter((project) => project.paymentStatus !== PAYMENT_STATUS.BALANCE_PAID)
      .reduce((sum, project) => sum + number(project.balanceAmount), 0);

    const totalProfit = totalRevenue - totalCost;
    const completedProfit = completedRevenue - completedCost;

    const metrics = {
      totalProjects: projects.length,
      completedProjects: completedProjects.length,
      approvedProjects: projects.filter((project) => project.status === PROJECT_STATUS.APPROVED).length,
      scheduledProjects: projects.filter((project) => project.status === PROJECT_STATUS.INSTALLATION_SCHEDULED).length,
      inProgressProjects: projects.filter((project) => project.status === PROJECT_STATUS.IN_PROGRESS).length,
      pendingQuotes: projects.filter((project) => [PROJECT_STATUS.QUOTE_PENDING, PROJECT_STATUS.QUOTE_SENT].includes(project.status)).length,
      cancelledProjects: projects.filter((project) => project.status === PROJECT_STATUS.CANCELLED).length,
      totalRevenue: round(totalRevenue),
      completedRevenue: round(completedRevenue),
      totalCost: round(totalCost),
      completedCost: round(completedCost),
      totalProfit: round(totalProfit),
      completedProfit: round(completedProfit),
      profitMargin: totalRevenue > 0 ? round((totalProfit / totalRevenue) * 100) : 0,
      totalInventoryValue: round(inventory.reduce((sum, item) => sum + number(item.sellingPrice) * number(item.quantity), 0)),
      totalInventoryCost: round(inventory.reduce((sum, item) => sum + number(item.costPrice) * number(item.quantity), 0)),
      lowStockItems: inventory.filter((item) => item.status === 'low_stock').length,
      outOfStockItems: inventory.filter((item) => item.status === 'out_of_stock').length,
      advanceReceived: round(advanceReceived),
      balanceReceived: round(balanceReceived),
      totalPaymentsReceived: round(advanceReceived + balanceReceived),
      advancePending: round(advancePending),
      balancePending: round(balancePending),
      completionRate: projects.length > 0 ? round((completedProjects.length / projects.length) * 100) : 0
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

    projectsSnapshot.forEach((document) => {
      const status = document.data().status || 'unknown';
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
    const safeLimit = Math.min(100, Math.max(1, Math.round(number(limit) || 10)));
    const projectsSnapshot = await getDocs(collection(db, PROJECTS_COLLECTION));
    const projects = projectsSnapshot.docs
      .map((document) => {
        const data = document.data();
        return {
          id: document.id,
          ...data,
          profit: projectRevenue(data) - projectCost(data)
        };
      })
      .filter((project) => REVENUE_STATUSES.has(project.status))
      .sort((a, b) => b.profit - a.profit)
      .slice(0, safeLimit);

    return { success: true, projects };
  } catch (error) {
    console.error('Error getting top projects:', error);
    return { success: false, error: error.message };
  }
}
