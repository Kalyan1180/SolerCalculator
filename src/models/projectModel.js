// src/models/projectModel.js
// Project data model with Firestore integration

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
import { PROJECT_STATUS } from '@/constants/businessConstants';

const PROJECTS_COLLECTION = 'projects';

/**
 * Create a new project from solar calculator results
 */
export async function createProject(customerId, projectData, calculatorResults) {
  try {
    const projectId = `PRJ-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const newProject = {
      projectId,
      customerId,
      customerName: projectData.name,
      customerEmail: projectData.email,
      customerPhone: projectData.phone,
      address: projectData.address,
      
      // Status
      status: PROJECT_STATUS.QUOTE_PENDING,
      
      // Solar specifications
      panelCount: calculatorResults.panelCount,
      inverter: calculatorResults.inverter,
      battery: calculatorResults.battery,
      
      // Cost breakdown
      materialCost: calculatorResults.costWithout || 0,
      laborCost: (calculatorResults.costWithout * 0.15) || 0, // Estimate 15% labor
      totalCostWithMarkup: calculatorResults.costWith || 0,
      quotedPrice: calculatorResults.special || 0,
      finalPrice: null, // Updated after approval
      
      // Payment tracking
      advancePercentage: 50, // 50% advance
      advanceAmount: null,
      balanceAmount: null,
      paymentStatus: 'not_started',
      
      // Timeline
      createdAt: Timestamp.now(),
      quoteSentDate: null,
      approvalDate: null,
      installationStartDate: null,
      completionDate: null,
      
      // Notes
      adminNotes: '',
      customerNotes: projectData.additionalNotes || '',
      technicalNotes: '',
      
      // Completion
      sitePhotos: [],
      techniciansAssigned: [],
      customerSignoff: false,
      completionNotes: ''
    };
    
    const projectRef = doc(db, PROJECTS_COLLECTION, projectId);
    await setDoc(projectRef, newProject);
    
    console.log('Project created:', projectId);
    return { success: true, projectId, project: newProject };
  } catch (error) {
    console.error('Error creating project:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get project by ID
 */
export async function getProject(projectId) {
  try {
    const projectRef = doc(db, PROJECTS_COLLECTION, projectId);
    const projectSnap = await getDoc(projectRef);
    
    if (projectSnap.exists()) {
      return { success: true, project: projectSnap.data() };
    } else {
      return { success: false, error: 'Project not found' };
    }
  } catch (error) {
    console.error('Error fetching project:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all projects for a customer
 */
export async function getCustomerProjects(customerId) {
  try {
    const q = query(collection(db, PROJECTS_COLLECTION), where('customerId', '==', customerId));
    const querySnapshot = await getDocs(q);
    const projects = [];
    
    querySnapshot.forEach(doc => {
      projects.push({ id: doc.id, ...doc.data() });
    });
    
    return { success: true, projects };
  } catch (error) {
    console.error('Error fetching customer projects:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update project status
 */
export async function updateProjectStatus(projectId, newStatus, adminNotes = '') {
  try {
    const projectRef = doc(db, PROJECTS_COLLECTION, projectId);
    const updates = {
      status: newStatus,
      adminNotes
    };
    
    // Add timestamp based on status
    if (newStatus === PROJECT_STATUS.QUOTE_SENT) {
      updates.quoteSentDate = Timestamp.now();
    } else if (newStatus === PROJECT_STATUS.APPROVED) {
      updates.approvalDate = Timestamp.now();
      // Calculate advance and balance amounts
      const project = await getDoc(projectRef);
      const projectData = project.data();
      updates.advanceAmount = (projectData.quotedPrice * projectData.advancePercentage) / 100;
      updates.balanceAmount = projectData.quotedPrice - updates.advanceAmount;
    } else if (newStatus === PROJECT_STATUS.INSTALLATION_SCHEDULED) {
      updates.installationStartDate = Timestamp.now();
    } else if (newStatus === PROJECT_STATUS.COMPLETED) {
      updates.completionDate = Timestamp.now();
    }
    
    await updateDoc(projectRef, updates);
    console.log('Project status updated:', projectId, newStatus);
    return { success: true };
  } catch (error) {
    console.error('Error updating project status:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update payment status
 */
export async function updatePaymentStatus(projectId, paymentStatus, paymentNote = '') {
  try {
    const projectRef = doc(db, PROJECTS_COLLECTION, projectId);
    await updateDoc(projectRef, {
      paymentStatus,
      adminNotes: paymentNote
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating payment status:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all projects with filters
 */
export async function getAllProjects(filters = {}) {
  try {
    let q = collection(db, PROJECTS_COLLECTION);
    
    if (filters.status) {
      q = query(q, where('status', '==', filters.status));
    }
    
    const querySnapshot = await getDocs(q);
    const projects = [];
    
    querySnapshot.forEach(doc => {
      projects.push({ id: doc.id, ...doc.data() });
    });
    
    // Sort by creation date (newest first)
    projects.sort((a, b) => b.createdAt - a.createdAt);
    
    return { success: true, projects };
  } catch (error) {
    console.error('Error fetching projects:', error);
    return { success: false, error: error.message };
  }
}
