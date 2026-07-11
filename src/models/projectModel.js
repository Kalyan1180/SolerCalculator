// src/models/projectModel.js
import { db } from '@/firebase';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  query,
  where,
  getDocs,
  Timestamp
} from 'firebase/firestore';
import { PROJECT_STATUS, PAYMENT_STATUS } from '@/constants/businessConstants';
import { COST_CONFIG } from '@/constants/calculationConstants';

const PROJECTS_COLLECTION = 'projects';
const VALID_STATUSES = new Set(Object.values(PROJECT_STATUS));
const VALID_PAYMENT_STATUSES = new Set(Object.values(PAYMENT_STATUS));

const ALLOWED_TRANSITIONS = {
  [PROJECT_STATUS.QUOTE_PENDING]: [PROJECT_STATUS.QUOTE_SENT, PROJECT_STATUS.CANCELLED],
  [PROJECT_STATUS.QUOTE_SENT]: [PROJECT_STATUS.APPROVED, PROJECT_STATUS.QUOTE_REJECTED, PROJECT_STATUS.CANCELLED],
  [PROJECT_STATUS.QUOTE_REJECTED]: [PROJECT_STATUS.QUOTE_PENDING, PROJECT_STATUS.CANCELLED],
  [PROJECT_STATUS.APPROVED]: [PROJECT_STATUS.INSTALLATION_SCHEDULED, PROJECT_STATUS.CANCELLED],
  [PROJECT_STATUS.INSTALLATION_SCHEDULED]: [PROJECT_STATUS.IN_PROGRESS, PROJECT_STATUS.CANCELLED],
  [PROJECT_STATUS.IN_PROGRESS]: [PROJECT_STATUS.COMPLETED, PROJECT_STATUS.CANCELLED],
  [PROJECT_STATUS.COMPLETED]: [],
  [PROJECT_STATUS.CANCELLED]: []
};

function asFiniteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function timestampToMillis(value) {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function createProjectId() {
  const randomPart = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID().replace(/-/g, '').slice(0, 10)
    : Math.random().toString(36).slice(2, 12);
  return `PRJ-${Date.now()}-${randomPart}`;
}

function calculateMaterialCost(panelCount, inverter, battery) {
  const panelCost = panelCount * COST_CONFIG.PANEL_COST_PER_PIECE;
  const inverterCost = asFiniteNumber(inverter?.cost);
  const batteryCost = asFiniteNumber(battery?.quantity) * asFiniteNumber(battery?.selectedBattery?.price);
  return panelCost + inverterCost + batteryCost;
}

/** Create a project from calculator results. Prefer the authenticated addProject API for customer submissions. */
export async function createProject(customerId, projectData, calculatorResults) {
  try {
    if (!customerId) throw new Error('Customer ID is required.');

    const panelCount = Math.max(1, Math.round(asFiniteNumber(calculatorResults.panelCount, 0)));
    const materialCost = calculateMaterialCost(panelCount, calculatorResults.inverter, calculatorResults.battery);
    const costWithoutMarkup = asFiniteNumber(calculatorResults.costWithout, materialCost);
    const laborCost = Math.max(0, costWithoutMarkup - materialCost);
    const quotedPrice = Math.max(0, asFiniteNumber(calculatorResults.special));
    const projectId = createProjectId();
    const now = Timestamp.now();

    const newProject = {
      projectId,
      customerId,
      customerName: String(projectData.name || '').trim(),
      customerEmail: String(projectData.email || '').trim().toLowerCase(),
      customerPhone: String(projectData.phone || '').trim(),
      address: String(projectData.address || '').trim(),
      status: PROJECT_STATUS.QUOTE_PENDING,
      panelCount,
      panelUnitCost: COST_CONFIG.PANEL_COST_PER_PIECE,
      inverter: calculatorResults.inverter || null,
      battery: calculatorResults.battery || null,
      materialCost,
      laborCost,
      totalCostWithMarkup: asFiniteNumber(calculatorResults.costWith, quotedPrice),
      quotedPrice,
      finalPrice: null,
      advancePercentage: 50,
      advanceAmount: null,
      balanceAmount: null,
      paymentStatus: PAYMENT_STATUS.NOT_STARTED,
      paymentMethod: null,
      createdAt: now,
      updatedAt: now,
      createdBy: customerId,
      quoteSentDate: null,
      approvalDate: null,
      installationScheduledDate: null,
      installationStartDate: null,
      completionDate: null,
      adminNotes: '',
      customerNotes: String(projectData.additionalNotes || '').trim(),
      technicalNotes: '',
      sitePhotos: [],
      techniciansAssigned: [],
      customerSignoff: false,
      completionNotes: ''
    };

    await setDoc(doc(db, PROJECTS_COLLECTION, projectId), newProject);
    return { success: true, projectId, project: newProject };
  } catch (error) {
    console.error('Error creating project:', error);
    return { success: false, error: error.message };
  }
}

export async function getProject(projectId) {
  try {
    if (!projectId) return { success: false, error: 'Project ID is required.' };
    const projectSnap = await getDoc(doc(db, PROJECTS_COLLECTION, projectId));
    return projectSnap.exists()
      ? { success: true, project: { id: projectSnap.id, ...projectSnap.data() } }
      : { success: false, error: 'Project not found.' };
  } catch (error) {
    console.error('Error fetching project:', error);
    return { success: false, error: error.message };
  }
}

export async function getCustomerProjects(customerId) {
  try {
    if (!customerId) return { success: false, error: 'Customer ID is required.' };
    const snapshot = await getDocs(
      query(collection(db, PROJECTS_COLLECTION), where('customerId', '==', customerId))
    );
    const projects = snapshot.docs
      .map((document) => ({ id: document.id, ...document.data() }))
      .sort((a, b) => timestampToMillis(b.createdAt) - timestampToMillis(a.createdAt));
    return { success: true, projects };
  } catch (error) {
    console.error('Error fetching customer projects:', error);
    return { success: false, error: error.message };
  }
}

export async function updateProjectStatus(projectId, newStatus, adminNotes) {
  try {
    if (!VALID_STATUSES.has(newStatus)) {
      throw new Error('Invalid project status.');
    }

    const projectRef = doc(db, PROJECTS_COLLECTION, projectId);
    const projectSnap = await getDoc(projectRef);
    if (!projectSnap.exists()) throw new Error('Project not found.');

    const project = projectSnap.data();
    const allowed = ALLOWED_TRANSITIONS[project.status] || [];
    if (project.status !== newStatus && !allowed.includes(newStatus)) {
      throw new Error(`Cannot change project status from ${project.status} to ${newStatus}.`);
    }

    const now = Timestamp.now();
    const updates = { status: newStatus, updatedAt: now };
    if (typeof adminNotes === 'string') updates.adminNotes = adminNotes.trim().slice(0, 2000);

    if (newStatus === PROJECT_STATUS.QUOTE_SENT) {
      updates.quoteSentDate = now;
    } else if (newStatus === PROJECT_STATUS.APPROVED) {
      const finalPrice = Math.max(0, asFiniteNumber(project.finalPrice, asFiniteNumber(project.quotedPrice)));
      const percentage = Math.min(100, Math.max(0, asFiniteNumber(project.advancePercentage, 50)));
      updates.approvalDate = now;
      updates.finalPrice = finalPrice;
      updates.advanceAmount = (finalPrice * percentage) / 100;
      updates.balanceAmount = finalPrice - updates.advanceAmount;
    } else if (newStatus === PROJECT_STATUS.INSTALLATION_SCHEDULED) {
      updates.installationScheduledDate = now;
    } else if (newStatus === PROJECT_STATUS.IN_PROGRESS) {
      updates.installationStartDate = now;
    } else if (newStatus === PROJECT_STATUS.COMPLETED) {
      updates.completionDate = now;
    }

    await updateDoc(projectRef, updates);
    return { success: true };
  } catch (error) {
    console.error('Error updating project status:', error);
    return { success: false, error: error.message };
  }
}

export async function updatePaymentStatus(projectId, paymentStatus, paymentDetails = {}) {
  try {
    if (!VALID_PAYMENT_STATUSES.has(paymentStatus)) {
      throw new Error('Invalid payment status.');
    }

    const projectRef = doc(db, PROJECTS_COLLECTION, projectId);
    const projectSnap = await getDoc(projectRef);
    if (!projectSnap.exists()) throw new Error('Project not found.');

    const project = projectSnap.data();
    if (paymentStatus === PAYMENT_STATUS.BALANCE_PAID && project.paymentStatus !== PAYMENT_STATUS.ADVANCE_PAID) {
      throw new Error('Record the advance payment before the balance payment.');
    }

    const details = typeof paymentDetails === 'string'
      ? { note: paymentDetails }
      : paymentDetails || {};
    const now = Timestamp.now();
    const updates = {
      paymentStatus,
      updatedAt: now
    };

    if (details.note !== undefined) updates.adminNotes = String(details.note).trim().slice(0, 2000);
    if (details.method) updates.paymentMethod = String(details.method).trim().slice(0, 50);
    if (paymentStatus === PAYMENT_STATUS.ADVANCE_PAID) updates.advancePaidAt = now;
    if (paymentStatus === PAYMENT_STATUS.BALANCE_PAID) updates.balancePaidAt = now;

    await updateDoc(projectRef, updates);
    return { success: true };
  } catch (error) {
    console.error('Error updating payment status:', error);
    return { success: false, error: error.message };
  }
}

export async function updateProjectDetails(projectId, changes) {
  try {
    const allowedFields = new Set([
      'adminNotes',
      'customerNotes',
      'technicalNotes',
      'completionNotes',
      'sitePhotos',
      'techniciansAssigned',
      'customerSignoff',
      'finalPrice'
    ]);
    const updates = {};

    Object.entries(changes || {}).forEach(([key, value]) => {
      if (!allowedFields.has(key)) return;
      if (['sitePhotos', 'techniciansAssigned'].includes(key)) {
        updates[key] = Array.isArray(value) ? value.slice(0, 100) : [];
      } else if (key === 'customerSignoff') {
        updates[key] = Boolean(value);
      } else if (key === 'finalPrice') {
        const price = asFiniteNumber(value, -1);
        if (price < 0) throw new Error('Final price must be a positive number.');
        updates[key] = price;
      } else {
        updates[key] = String(value || '').trim().slice(0, 2000);
      }
    });

    if (!Object.keys(updates).length) throw new Error('No supported project fields were supplied.');
    updates.updatedAt = Timestamp.now();
    await updateDoc(doc(db, PROJECTS_COLLECTION, projectId), updates);
    return { success: true };
  } catch (error) {
    console.error('Error updating project details:', error);
    return { success: false, error: error.message };
  }
}

export async function getAllProjects(filters = {}) {
  try {
    let projectQuery = collection(db, PROJECTS_COLLECTION);
    if (filters.status) {
      if (!VALID_STATUSES.has(filters.status)) throw new Error('Invalid project status filter.');
      projectQuery = query(projectQuery, where('status', '==', filters.status));
    }

    const snapshot = await getDocs(projectQuery);
    const projects = snapshot.docs
      .map((document) => ({ id: document.id, ...document.data() }))
      .sort((a, b) => timestampToMillis(b.createdAt) - timestampToMillis(a.createdAt));
    return { success: true, projects };
  } catch (error) {
    console.error('Error fetching projects:', error);
    return { success: false, error: error.message };
  }
}
