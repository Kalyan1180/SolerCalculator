// netlify/functions/sendEmail.js
// Email service using SendGrid or Node Mailer

const nodemailer = require('nodemailer');

// Configure email service
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: process.env.EMAIL_PORT || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

const emailTemplates = {
  'project-update': (data) => ({
    subject: `Update on your Solar Project #${data.projectId.substring(0, 12)}`,
    html: `
      <h2>Project Update</h2>
      <p>Dear ${data.customerName},</p>
      <p>${data.statusMessage}</p>
      <p><strong>Project ID:</strong> ${data.projectId}</p>
      <p><strong>Status:</strong> ${data.status}</p>
      <p><strong>Quoted Price:</strong> ₹${data.quotedPrice}</p>
      <p><strong>Advance Amount:</strong> ₹${data.advanceAmount || 0}</p>
      <p><strong>Balance Amount:</strong> ₹${data.balanceAmount || 0}</p>
      <p>Thank you for choosing ANT Solar!</p>
      <p>Best Regards,<br>ANT Solar Team</p>
    `
  }),
  'payment-reminder': (data) => ({
    subject: `Payment Reminder: ${data.milestone} Payment Due`,
    html: `
      <h2>Payment Reminder</h2>
      <p>Dear ${data.customerName},</p>
      <p>This is a friendly reminder that your <strong>${data.milestone}</strong> payment of <strong>₹${data.amount}</strong> is due for your solar project.</p>
      <p><strong>Project ID:</strong> ${data.projectId}</p>
      <p><strong>Due Date:</strong> ${data.dueDate}</p>
      <p>Please contact us for payment details.</p>
      <p>Thank you,<br>ANT Solar Team</p>
    `
  }),
  'project-completion': (data) => ({
    subject: `Your Solar Project is Complete! #${data.projectId.substring(0, 12)}`,
    html: `
      <h2>Project Completion</h2>
      <p>Dear ${data.customerName},</p>
      <p>Great news! Your solar installation is complete and ready for use.</p>
      <p><strong>Project Details:</strong></p>
      <ul>
        <li>Completion Date: ${data.completionDate}</li>
        <li>Solar Panels: ${data.panelCount}</li>
        <li>Inverter: ${data.inverter}</li>
        <li>Battery: ${data.battery}</li>
      </ul>
      <p>For any service support or maintenance, please don't hesitate to contact us.</p>
      <p>Thank you for choosing ANT Solar!</p>
      <p>Best Regards,<br>ANT Solar Team</p>
    `
  })
};

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { to, template, data } = JSON.parse(event.body);

    if (!to || !template || !data) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields: to, template, data' })
      };
    }

    const emailTemplate = emailTemplates[template];
    if (!emailTemplate) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: `Unknown template: ${template}` })
      };
    }

    const emailContent = emailTemplate(data);

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@antsolar.com',
      to: to,
      subject: emailContent.subject,
      html: emailContent.html
    };

    const result = await transporter.sendMail(mailOptions);

    console.log('Email sent:', result.response);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Email sent successfully',
        messageId: result.messageId
      })
    };
  } catch (error) {
    console.error('Error sending email:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};
