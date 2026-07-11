// src/utils/smsService.js
import { authorizedFetch } from '@/utils/apiClient';

async function sendSms(payload) {
  try {
    const result = await authorizedFetch('/.netlify/functions/sendSMS', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    return { success: true, data: result };
  } catch (error) {
    console.error('Error sending SMS:', error);
    return { success: false, error: error.message };
  }
}

export function sendProjectStatusSMS(phoneNumber, project, status) {
  const message = `Hi ${project.customerName}, your solar project #${String(project.projectId).slice(0, 12)} status is now ${status}.`;
  return sendSms({
    to: phoneNumber,
    message,
    projectId: project.projectId,
    type: 'project-status'
  });
}

export function sendPaymentReminderSMS(phoneNumber, project, milestone = 'advance') {
  const amount = milestone === 'advance' ? project.advanceAmount : project.balanceAmount;
  const message = `Hi ${project.customerName}, ${milestone} payment of INR ${Number(amount) || 0} is due for your solar project.`;
  return sendSms({
    to: phoneNumber,
    message,
    projectId: project.projectId,
    type: 'payment-reminder',
    milestone
  });
}

export function sendCompletionSMS(phoneNumber, project) {
  const message = `Hi ${project.customerName}, your solar installation is complete. Thank you for choosing ANT Solar.`;
  return sendSms({
    to: phoneNumber,
    message,
    projectId: project.projectId,
    type: 'project-completion'
  });
}
