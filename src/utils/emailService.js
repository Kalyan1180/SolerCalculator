// src/utils/emailService.js
import { authenticatedJsonRequest } from '@/utils/authenticatedRequest';

function requireProject(project) {
  if (!project?.projectId) throw new Error('Project data is missing');
  if (!project?.customerEmail) throw new Error('Customer email is missing');
}

function numberValue(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

async function sendTemplate(project, template, data) {
  requireProject(project);
  return authenticatedJsonRequest('/.netlify/functions/sendEmail', {
    method: 'POST',
    body: JSON.stringify({
      to: project.customerEmail,
      template,
      data
    })
  });
}

export async function sendProjectUpdateEmail(project, statusMessage) {
  try {
    const result = await sendTemplate(project, 'project-update', {
      customerName: project.customerName,
      projectId: project.projectId,
      status: project.status,
      statusMessage,
      quotedPrice: project.quotedPrice,
      advanceAmount: project.advanceAmount,
      balanceAmount: project.balanceAmount,
      paymentStatus: project.paymentStatus
    });
    return { success: true, data: result };
  } catch (error) {
    console.error('Error sending project update email:', error);
    return { success: false, error: error.message };
  }
}

export async function sendPaymentReminderEmail(project, milestone = 'advance') {
  try {
    const normalizedMilestone = milestone === 'balance' ? 'balance' : 'advance';
    const advancePercentage = numberValue(project.advancePercentage) || 50;
    const balancePercentage = Math.max(0, 100 - advancePercentage);
    const amount = normalizedMilestone === 'advance' ? project.advanceAmount : project.balanceAmount;
    const result = await sendTemplate(project, 'payment-reminder', {
      customerName: project.customerName,
      projectId: project.projectId,
      milestone: normalizedMilestone === 'advance'
        ? `Advance (${advancePercentage}%)`
        : `Balance (${balancePercentage}%)`,
      amount,
      dueDate: new Date(Date.now() + (2 * 24 * 60 * 60 * 1000)).toLocaleDateString('en-IN')
    });
    return { success: true, data: result };
  } catch (error) {
    console.error('Error sending payment reminder:', error);
    return { success: false, error: error.message };
  }
}

export async function sendCompletionEmail(project) {
  try {
    const result = await sendTemplate(project, 'project-completion', {
      customerName: project.customerName,
      projectId: project.projectId,
      completionDate: new Date().toLocaleDateString('en-IN'),
      panelCount: project.panelCount,
      inverter: project.inverter?.name || 'N/A',
      battery: project.battery?.selectedBattery?.name || 'Not required'
    });
    return { success: true, data: result };
  } catch (error) {
    console.error('Error sending completion email:', error);
    return { success: false, error: error.message };
  }
}
