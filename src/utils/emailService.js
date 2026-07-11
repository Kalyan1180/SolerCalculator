// src/utils/emailService.js
import { authorizedFetch } from '@/utils/apiClient';

async function sendEmail(template, project, data) {
  if (!project?.customerEmail) {
    return { success: false, error: 'Customer email is missing.' };
  }

  try {
    const result = await authorizedFetch('/.netlify/functions/sendEmail', {
      method: 'POST',
      body: JSON.stringify({
        to: project.customerEmail,
        template,
        data
      })
    });
    return { success: true, data: result };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: error.message };
  }
}

export function sendProjectUpdateEmail(project, statusMessage) {
  return sendEmail('project-update', project, {
    customerName: project.customerName,
    projectId: project.projectId,
    status: project.status,
    statusMessage,
    quotedPrice: project.finalPrice || project.quotedPrice,
    advanceAmount: project.advanceAmount,
    balanceAmount: project.balanceAmount,
    paymentStatus: project.paymentStatus
  });
}

export function sendPaymentReminderEmail(project, milestone = 'advance') {
  const isAdvance = milestone === 'advance';
  return sendEmail('payment-reminder', project, {
    customerName: project.customerName,
    projectId: project.projectId,
    milestone: isAdvance ? 'Advance (50%)' : 'Balance (50%)',
    amount: isAdvance ? project.advanceAmount : project.balanceAmount,
    dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN')
  });
}

export function sendCompletionEmail(project) {
  return sendEmail('project-completion', project, {
    customerName: project.customerName,
    projectId: project.projectId,
    completionDate: new Date().toLocaleDateString('en-IN'),
    panelCount: project.panelCount,
    inverter: project.inverter?.name || 'N/A',
    battery: project.battery?.selectedBattery?.name || 'N/A'
  });
}
