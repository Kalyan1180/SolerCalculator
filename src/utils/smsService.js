// src/utils/smsService.js
// SMS notifications using Twilio

/**
 * Send SMS notification for project status update
 */
export async function sendProjectStatusSMS(phoneNumber, project, status) {
  try {
    const message = `Hi ${project.customerName}, your solar project #${project.projectId.substring(0, 12)} status has been updated to: ${status}. Reply HELP for support.`;

    const smsData = {
      to: phoneNumber,
      message: message,
      projectId: project.projectId,
      type: 'project-status'
    };

    const response = await fetch('/.netlify/functions/sendSMS', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(smsData)
    });

    if (!response.ok) {
      throw new Error('Failed to send SMS');
    }

    const result = await response.json();
    console.log('SMS sent successfully:', result);
    return { success: true, data: result };
  } catch (error) {
    console.error('Error sending SMS:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send payment reminder SMS
 */
export async function sendPaymentReminderSMS(phoneNumber, project, milestone = 'advance') {
  try {
    const amount = milestone === 'advance' ? project.advanceAmount : project.balanceAmount;
    const message = `Hi ${project.customerName}, please send ${milestone} payment of ₹${amount} for your solar project. Contact us for payment details.`;

    const smsData = {
      to: phoneNumber,
      message: message,
      projectId: project.projectId,
      type: 'payment-reminder',
      milestone: milestone
    };

    const response = await fetch('/.netlify/functions/sendSMS', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(smsData)
    });

    if (!response.ok) {
      throw new Error('Failed to send SMS');
    }

    const result = await response.json();
    return { success: true, data: result };
  } catch (error) {
    console.error('Error sending payment reminder SMS:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send project completion SMS
 */
export async function sendCompletionSMS(phoneNumber, project) {
  try {
    const message = `Hi ${project.customerName}, your solar installation is complete! Thank you for choosing ANT Solar. Contact us for service support.`;

    const smsData = {
      to: phoneNumber,
      message: message,
      projectId: project.projectId,
      type: 'project-completion'
    };

    const response = await fetch('/.netlify/functions/sendSMS', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(smsData)
    });

    if (!response.ok) {
      throw new Error('Failed to send SMS');
    }

    const result = await response.json();
    return { success: true, data: result };
  } catch (error) {
    console.error('Error sending completion SMS:', error);
    return { success: false, error: error.message };
  }
}
