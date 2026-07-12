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
  Timestamp,
  arrayUnion
} from 'firebase/firestore';
import { PAYMENT_STATUS, PROJECT_STATUS } from '@/constants/businessConstants';

const PROJECTS_COLLECTION = 'projects';

const STATUS_TRANSITIONS = {
  [PROJECT_STATUS.QUOTE_PENDING]: [PROJECT_STATUS.QUOTE_SENT, PROJECT_STATUS.CANCELLED],
  [PROJECT_STATUS.QUOTE_SENT]: [PROJECT_STATUS.APPROVED, PROJECT_STATUS.QUOTE_REJECTED, PROJECT_STATUS.CANCELLED],
  [PROJECT_STATUS.QUOTE_REJECTED]: [],
  [PROJECT_STATUS.APPROVED]: [PROJECT_STATUS.INSTALLATION_SCHEDULED, PROJECT_STATUS.CANCELLED],
  [PROJECT_STATUS.INSTALLATION_SCHEDULED]: [PROJECT_STATUS.IN_PROGRESS, PROJECT_STATUS.CANCELLED],
  [PROJECT_STATUS.IN_PROGRESS]: [PROJECT_STATUS.COMPLETED, PROJECT_STATUS.CANCELLED],
  [PROJECT_STATUS.COMPLETED]: [],
  [PROJECT_STATUS.CANCELLED]: []
};

function numberOrZero(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function timestampToMillis(value) {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.toDate === 'function') return value.toDate().getTime();
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function cleanText(value, maxLength = 200) {
  return String(value || '').trim().slice(0, maxLength);
}

function createProjectId() {
  const randomPart = Math.random().toString(36).slice(2, 11);
  return `PRJ-${Date.now()}-${randomPart}`;
}

function sanitizeBomLine(line) {
  if (!line || typeof line !== 'object') return null;
  const itemId = cleanText(line.itemId || line.inventoryId || line.id, 200);
  const requiredQuantity = Math.max(0, Math.ceil(numberOrZero(line.requiredQuantity ?? line.quantity)));
  if (!itemId || requiredQuantity <= 0) return null;
  return {
    itemId,
    sku: cleanText(line.sku, 80),
    type: cleanText(line.type, 40).toLowerCase() || 'other',
    name: cleanText(line.name, 150) || 'Inventory item',
    unit: cleanText(line.unit, 40) || 'piece',
    requiredQuantity,
    unitCost: Math.max(0, numberOrZero(line.unitCost ?? line.costPrice)),
    sellingPrice: Math.max(0, numberOrZero(line.sellingPrice)),
    availableQuantity: Math.max(0, Math.floor(numberOrZero(line.availableQuantity))),
    shortfall: Math.max(0, Math.ceil(numberOrZero(line.shortfall))),
    stockStatus: cleanText(line.stockStatus || line.status, 40),
    legacySourceId: cleanText(line.legacySourceId, 200)
  };
}

function sanitizeInventoryAssessment(value, billOfMaterials) {
  const lines = Array.isArray(billOfMaterials) ? billOfMaterials : [];
  const totalShortfall = lines.reduce((sum, line) => sum + numberOrZero(line.shortfall), 0);
  return {
    status: cleanText(value?.status, 40) || (totalShortfall > 0 ? 'shortfall' : 'ready'),
    totalShortfall,
    shortItemCount: lines.filter(line => numberOrZero(line.shortfall) > 0).length,
    requiredItemCount: lines.length,
    assessedAt: cleanText(value?.assessedAt, 80) || new Date().toISOString()
  };
}

function validateProjectInput(projectData, calculatorResults) {
  if (!projectData?.name?.trim()) return 'Customer name is required';
  if (!projectData?.email?.trim()) return 'Customer email is required';
  if (!projectData?.phone?.trim()) return 'Customer phone is required';
  if (!projectData?.address?.trim()) return 'Customer address is required';
  if (numberOrZero(calculatorResults?.panelCount) <= 0) return 'Panel count must be greater than zero';
  if (!calculatorResults?.inverter) return 'A valid inverter is required';

  const quotedPrice = numberOrZero(
    projectData.suggestedPrice || calculatorResults.special || calculatorResults.costWith
  );
  if (quotedPrice <= 0) return 'Quoted price must be greater than zero';

  return null;
}

/**
 * Create a project using the canonical schema consumed by all dashboards.
 */
export async function createProject(customerId, projectData, calculatorResults) {
  try {
    const validationError = validateProjectInput(projectData, calculatorResults);
    if (validationError) return { success: false, error: validationError };

    const projectId = createProjectId();
    const totalCostWithoutMarkup = numberOrZero(calculatorResults.costWithout);
    const materialCost = numberOrZero(calculatorResults.materialCost) || totalCostWithoutMarkup;
    const laborCost = numberOrZero(calculatorResults.laborCost);
    const quotedPrice = numberOrZero(
      projectData.suggestedPrice || calculatorResults.special || calculatorResults.costWith
    );
    const billOfMaterials = Array.isArray(calculatorResults.billOfMaterials)
      ? calculatorResults.billOfMaterials.map(sanitizeBomLine).filter(Boolean)
      : [];
    const inventoryAssessment = sanitizeInventoryAssessment(
      calculatorResults.inventoryAssessment,
      billOfMaterials
    );

    const newProject = {
      projectId,
      customerId: customerId || null,
      customerName: projectData.name.trim(),
      customerEmail: projectData.email.trim(),
      customerPhone: projectData.phone.trim(),
      address: projectData.address.trim(),

      status: PROJECT_STATUS.QUOTE_PENDING,
      panelCount: numberOrZero(calculatorResults.panelCount),
      panel: calculatorResults.panel || null,
      inverter: calculatorResults.inverter,
      battery: calculatorResults.battery || null,
      billOfMaterials,
      inventoryAssessment,

      materialCost,
      laborCost,
      totalCostWithoutMarkup,
      totalCostWithMarkup: numberOrZero(calculatorResults.costWith),
      quotedPrice,
      finalPrice: null,

      advancePercentage: 50,
      advanceAmount: null,
      balanceAmount: null,
      paymentStatus: PAYMENT_STATUS.NOT_STARTED,
      paymentHistory: [],

      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      quoteSentDate: null,
      approvalDate: null,
      installationScheduledDate: null,
      installationStartDate: null,
      completionDate: null,

      adminNotes: '',
      customerNotes: projectData.additionalNotes?.trim() || '',
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
    if (!projectId) return { success: false, error: 'Project ID is required' };
    const projectSnap = await getDoc(doc(db, PROJECTS_COLLECTION, String(projectId)));
    if (!projectSnap.exists()) return { success: false, error: 'Project not found' };
    return { success: true, project: { id: projectSnap.id, ...projectSnap.data() } };
  } catch (error) {
    console.error('Error fetching project:', error);
    return { success: false, error: error.message };
  }
}

export async function getCustomerProjects(customerId) {
  try {
    if (!customerId) return { success: false, error: 'Customer ID is required' };
    const projectsQuery = query(
      collection(db, PROJECTS_COLLECTION),
      where('customerId', '==', customerId)
    );
    const querySnapshot = await getDocs(projectsQuery);
    const projects = querySnapshot.docs.map(projectDoc => ({
      id: projectDoc.id,
      ...projectDoc.data()
    }));
    projects.sort((a, b) => timestampToMillis(b.createdAt) - timestampToMillis(a.createdAt));
    return { success: true, projects };
  } catch (error) {
    console.error('Error fetching customer projects:', error);
    return { success: false, error: error.message };
  }
}

export async function updateProjectStatus(projectId, newStatus, adminNotes = '') {
  try {
    if (!Object.values(PROJECT_STATUS).includes(newStatus)) {
      return { success: false, error: 'Invalid project status' };
    }

    const projectRef = doc(db, PROJECTS_COLLECTION, String(projectId));
    const projectSnap = await getDoc(projectRef);
    if (!projectSnap.exists()) return { success: false, error: 'Project not found' };

    const projectData = projectSnap.data();
    const allowedTransitions = STATUS_TRANSITIONS[projectData.status] || [];
    if (!allowedTransitions.includes(newStatus)) {
      return {
        success: false,
        error: `Cannot change project from ${projectData.status} to ${newStatus}`
      };
    }

    const now = Timestamp.now();
    const updates = {
      status: newStatus,
      updatedAt: now
    };
    if (adminNotes.trim()) updates.adminNotes = adminNotes.trim();

    if (newStatus === PROJECT_STATUS.QUOTE_SENT) {
      updates.quoteSentDate = now;
    } else if (newStatus === PROJECT_STATUS.APPROVED) {
      const quotedPrice = numberOrZero(projectData.quotedPrice);
      const advancePercentage = numberOrZero(projectData.advancePercentage) || 50;
      updates.approvalDate = now;
      updates.finalPrice = quotedPrice;
      updates.advanceAmount = (quotedPrice * advancePercentage) / 100;
      updates.balanceAmount = quotedPrice - updates.advanceAmount;
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

export async function updatePaymentStatus(projectId, paymentStatus, paymentNote = '', paymentMethod = '') {
  try {
    if (![PAYMENT_STATUS.ADVANCE_PAID, PAYMENT_STATUS.BALANCE_PAID].includes(paymentStatus)) {
      return { success: false, error: 'Invalid payment status' };
    }

    const projectRef = doc(db, PROJECTS_COLLECTION, String(projectId));
    const projectSnap = await getDoc(projectRef);
    if (!projectSnap.exists()) return { success: false, error: 'Project not found' };

    const project = projectSnap.data();
    if (!project.approvalDate || project.advanceAmount == null || project.balanceAmount == null) {
      return { success: false, error: 'Approve the quotation before recording payment' };
    }
    if (paymentStatus === PAYMENT_STATUS.BALANCE_PAID && project.paymentStatus !== PAYMENT_STATUS.ADVANCE_PAID) {
      return { success: false, error: 'Record the advance payment before the balance payment' };
    }

    const amount = paymentStatus === PAYMENT_STATUS.ADVANCE_PAID
      ? numberOrZero(project.advanceAmount)
      : numberOrZero(project.balanceAmount);

    await updateDoc(projectRef, {
      paymentStatus,
      updatedAt: Timestamp.now(),
      paymentHistory: arrayUnion({
        status: paymentStatus,
        amount,
        method: paymentMethod || 'unspecified',
        note: paymentNote || '',
        recordedAt: Timestamp.now()
      })
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating payment status:', error);
    return { success: false, error: error.message };
  }
}

export async function updateProjectFields(projectId, updates) {
  try {
    const allowedFields = new Set([
      'adminNotes',
      'technicalNotes',
      'sitePhotos',
      'techniciansAssigned',
      'customerSignoff',
      'completionNotes',
      'finalPrice'
    ]);
    const safeUpdates = {};
    Object.entries(updates || {}).forEach(([key, value]) => {
      if (allowedFields.has(key)) safeUpdates[key] = value;
    });
    if (!Object.keys(safeUpdates).length) {
      return { success: false, error: 'No supported project fields were provided' };
    }

    safeUpdates.updatedAt = Timestamp.now();
    await updateDoc(doc(db, PROJECTS_COLLECTION, String(projectId)), safeUpdates);
    return { success: true };
  } catch (error) {
    console.error('Error updating project fields:', error);
    return { success: false, error: error.message };
  }
}

export async function getAllProjects(filters = {}) {
  try {
    let projectsQuery = collection(db, PROJECTS_COLLECTION);
    if (filters.status) {
      projectsQuery = query(projectsQuery, where('status', '==', filters.status));
    }

    const querySnapshot = await getDocs(projectsQuery);
    const projects = querySnapshot.docs.map(projectDoc => ({
      id: projectDoc.id,
      ...projectDoc.data()
    }));
    projects.sort((a, b) => timestampToMillis(b.createdAt) - timestampToMillis(a.createdAt));
    return { success: true, projects };
  } catch (error) {
    console.error('Error fetching projects:', error);
    return { success: false, error: error.message };
  }
}
