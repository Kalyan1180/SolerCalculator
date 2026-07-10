// src/utils/emailService.js
// Email notification service

/**
 * Send project status update email to customer
 */
export async function sendProjectUpdateEmail(project, statusMessage) {
  try {
    const emailData = {
      to: project.customerEmail,
      subject: `Update on your Solar Project #${project.projectId.substring(0, 12)}`,
      template: 'project-update',
      data: {
        customerName: project.customerName,
        projectId: project.projectId,
        status: project.status,
        statusMessage,
        quotedPrice: project.quotedPrice,
        advanceAmount: project.advanceAmount,
        balanceAmount: project.balanceAmount,
        paymentStatus: project.paymentStatus
      }
    };

    // Call backend email service (Netlify function)
    const response = await fetch('/.netlify/functions/sendEmail', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(emailData)
    });

    if (!response.ok) {
      throw new Error('Failed to send email');
    }

    console.log('Email sent successfully');
    return { success: true };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send payment reminder email
 */
export async function sendPaymentReminderEmail(project, milestone = 'advance') {
  try {
    const amount = milestone === 'advance' ? project.advanceAmount : project.balanceAmount;
    const emailData = {
      to: project.customerEmail,
      subject: `Payment Reminder: ${milestone === 'advance' ? 'Advance' : 'Balance'} Payment Due`,
      template: 'payment-reminder',
      data: {
        customerName: project.customerName,
        projectId: project.projectId,
        milestone: milestone === 'advance' ? 'Advance (50%)' : 'Balance (50%)',
        amount,
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN')
      }
    };

    const response = await fetch('/.netlify/functions/sendEmail', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(emailData)
    });

    if (!response.ok) {
      throw new Error('Failed to send email');
    }

    return { success: true };
  } catch (error) {
    console.error('Error sending payment reminder:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send project completion confirmation email
 */
export async function sendCompletionEmail(project) {
  try {
    const emailData = {
      to: project.customerEmail,
      subject: `Your Solar Project is Complete! #${project.projectId.substring(0, 12)}`,
      template: 'project-completion',
      data: {
        customerName: project.customerName,
        projectId: project.projectId,
        completionDate: new Date().toLocaleDateString('en-IN'),
        panelCount: project.panelCount,
        inverter: project.inverter?.name,
        battery: project.battery?.selectedBattery?.name
      }
    };

    const response = await fetch('/.netlify/functions/sendEmail', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(emailData)
    });

    if (!response.ok) {
      throw new Error('Failed to send email');
    }

    return { success: true };
  } catch (error) {
    console.error('Error sending completion email:', error);
    return { success: false, error: error.message };
  }
}
