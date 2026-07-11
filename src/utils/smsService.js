// src/utils/smsService.js
import { authenticatedJsonRequest } from '@/utils/authenticatedRequest';

function projectId(project) {
  if (!project?.projectId) throw new Error('Project data is missing');
  return String(project.projectId);
}

async function sendSMS(phoneNumber, project, message, type) {
  const result = await authenticatedJsonRequest('/.netlify/functions/sendSMS', {
    method: 'POST',
    body: JSON.stringify({
      to: phoneNumber,
      message,
      projectId: projectId(project),
      type
    })
  });
  return { success: true, data: result };
}

export async function sendProjectStatusSMS(phoneNumber, project, status) {
  try {
    const message = `Hi ${project.customerName || 'Customer'}, your solar project #${projectId(project).slice(0, 12)} status is now ${status}. Contact ANT Solar for support.`;
    return await sendSMS(phoneNumber, project, message, 'project-status');
  } catch (error) {
    console.error('Error sending project status SMS:', error);
    return { success: false, error: error.message };
  }
}

export async function sendPaymentReminderSMS(phoneNumber, project, milestone = 'advance') {
  try {
    const normalizedMilestone = milestone === 'balance' ? 'balance' : 'advance';
    const amount = normalizedMilestone === 'advance' ? project.advanceAmount : project.balanceAmount;
    const formattedAmount = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Number(amount) || 0);
    const message = `Hi ${project.customerName || 'Customer'}, your ${normalizedMilestone} payment of Rs. ${formattedAmount} is due for project #${projectId(project).slice(0, 12)}. Contact ANT Solar for payment details.`;
    return await sendSMS(phoneNumber, project, message, 'payment-reminder');
  } catch (error) {
    console.error('Error sending payment reminder SMS:', error);
    return { success: false, error: error.message };
  }
}

export async function sendCompletionSMS(phoneNumber, project) {
  try {
    const message = `Hi ${project.customerName || 'Customer'}, your solar installation for project #${projectId(project).slice(0, 12)} is complete. Thank you for choosing ANT Solar.`;
    return await sendSMS(phoneNumber, project, message, 'project-completion');
  } catch (error) {
    console.error('Error sending completion SMS:', error);
    return { success: false, error: error.message };
  }
}
