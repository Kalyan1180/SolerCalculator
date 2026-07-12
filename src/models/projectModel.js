// src/models/projectModel.js
import { db } from '@/firebase';
import {
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  Timestamp,
  updateDoc,
  where
} from 'firebase/firestore';
import { PAYMENT_STATUS, PROJECT_STATUS } from '@/constants/businessConstants';
import { authenticatedJsonRequest } from '@/utils/authenticatedRequest';

const PROJECTS_COLLECTION = 'projects';
const PROJECT_OPERATIONS_COLLECTION = 'projectOperations';

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

function mergeProjectOperations(project, operations) {
  return {
    ...project,
    ...(operations || {}),
    id: project.id || operations?.id,
    projectId: project.projectId || operations?.projectId || project.id || operations?.id
  };
}

async function operationsMap() {
  const snapshot = await getDocs(collection(db, PROJECT_OPERATIONS_COLLECTION));
  return new Map(snapshot.docs.map(operationDoc => [operationDoc.id, {
    id: operationDoc.id,
    ...operationDoc.data()
  }]));
}

/**
 * Project creation is intentionally server-only. The protected createQuotation
 * function consumes a server-side recommendation and writes the customer-safe
 * project plus its staff-only operations record in one transaction.
 */
export async function createProject() {
  return {
    success: false,
    error: 'Direct project creation is disabled. Use the protected quotation workflow.'
  };
}

export async function getProject(projectId) {
  try {
    if (!projectId) return { success: false, error: 'Project ID is required' };
    const normalizedId = String(projectId);
    const [projectSnap, operationsSnap] = await Promise.all([
      getDoc(doc(db, PROJECTS_COLLECTION, normalizedId)),
      getDoc(doc(db, PROJECT_OPERATIONS_COLLECTION, normalizedId))
    ]);
    if (!projectSnap.exists()) return { success: false, error: 'Project not found' };

    const project = { id: projectSnap.id, ...projectSnap.data() };
    const operations = operationsSnap.exists()
      ? { id: operationsSnap.id, ...operationsSnap.data() }
      : null;
    return { success: true, project: mergeProjectOperations(project, operations) };
  } catch (error) {
    console.error('Error fetching project:', error);
    return { success: false, error: error.message };
  }
}

export async function getCustomerProjects() {
  try {
    const result = await authenticatedJsonRequest('/.netlify/functions/getMyProjects', {
      method: 'GET'
    });
    const projects = Array.isArray(result.projects) ? result.projects : [];
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

    const normalizedId = String(projectId);
    const projectRef = doc(db, PROJECTS_COLLECTION, normalizedId);
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
    if (String(adminNotes || '').trim()) {
      await setDoc(doc(db, PROJECT_OPERATIONS_COLLECTION, normalizedId), {
        projectId: normalizedId,
        adminNotes: String(adminNotes).trim(),
        updatedAt: now
      }, { merge: true });
    }
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

export async function updateProjectFields(projectId, requestedUpdates) {
  try {
    const normalizedId = String(projectId);
    const publicFields = new Set([
      'sitePhotos',
      'customerSignoff',
      'completionNotes',
      'finalPrice'
    ]);
    const operationalFields = new Set([
      'adminNotes',
      'technicalNotes',
      'techniciansAssigned'
    ]);
    const publicUpdates = {};
    const operationalUpdates = {};

    Object.entries(requestedUpdates || {}).forEach(([key, value]) => {
      if (publicFields.has(key)) publicUpdates[key] = value;
      if (operationalFields.has(key)) operationalUpdates[key] = value;
    });

    if (!Object.keys(publicUpdates).length && !Object.keys(operationalUpdates).length) {
      return { success: false, error: 'No supported project fields were provided' };
    }

    const now = Timestamp.now();
    const writes = [];
    if (Object.keys(publicUpdates).length) {
      publicUpdates.updatedAt = now;
      writes.push(updateDoc(doc(db, PROJECTS_COLLECTION, normalizedId), publicUpdates));
    }
    if (Object.keys(operationalUpdates).length) {
      operationalUpdates.projectId = normalizedId;
      operationalUpdates.updatedAt = now;
      writes.push(setDoc(
        doc(db, PROJECT_OPERATIONS_COLLECTION, normalizedId),
        operationalUpdates,
        { merge: true }
      ));
    }

    await Promise.all(writes);
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

    const [querySnapshot, operationRecords] = await Promise.all([
      getDocs(projectsQuery),
      operationsMap()
    ]);
    const projects = querySnapshot.docs.map(projectDoc => {
      const project = { id: projectDoc.id, ...projectDoc.data() };
      return mergeProjectOperations(project, operationRecords.get(projectDoc.id));
    });
    projects.sort((a, b) => timestampToMillis(b.createdAt) - timestampToMillis(a.createdAt));
    return { success: true, projects };
  } catch (error) {
    console.error('Error fetching projects:', error);
    return { success: false, error: error.message };
  }
}
