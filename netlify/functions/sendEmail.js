const nodemailer = require('nodemailer');
const { jsonResponse, requireAdmin } = require('./_firebaseAdmin');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatMoney(value) {
  const number = Number(value);
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Number.isFinite(number) ? number : 0);
}

function shortProjectId(value) {
  return String(value || 'project').slice(0, 12);
}

const emailTemplates = {
  'project-update': data => ({
    subject: `Update on your Solar Project #${shortProjectId(data.projectId)}`,
    html: `
      <h2>Project Update</h2>
      <p>Dear ${escapeHtml(data.customerName)},</p>
      <p>${escapeHtml(data.statusMessage)}</p>
      <p><strong>Project ID:</strong> ${escapeHtml(data.projectId)}</p>
      <p><strong>Status:</strong> ${escapeHtml(data.status)}</p>
      <p><strong>Quoted Price:</strong> Rs. ${formatMoney(data.quotedPrice)}</p>
      <p><strong>Advance Amount:</strong> Rs. ${formatMoney(data.advanceAmount)}</p>
      <p><strong>Balance Amount:</strong> Rs. ${formatMoney(data.balanceAmount)}</p>
      <p>Thank you for choosing ANT Solar.</p>
      <p>Best regards,<br>ANT Solar Team</p>
    `
  }),
  'payment-reminder': data => ({
    subject: `Payment Reminder: ${String(data.milestone || 'Project')} Payment Due`,
    html: `
      <h2>Payment Reminder</h2>
      <p>Dear ${escapeHtml(data.customerName)},</p>
      <p>Your ${escapeHtml(data.milestone)} payment of <strong>Rs. ${formatMoney(data.amount)}</strong> is due.</p>
      <p><strong>Project ID:</strong> ${escapeHtml(data.projectId)}</p>
      <p><strong>Due Date:</strong> ${escapeHtml(data.dueDate)}</p>
      <p>Please contact us for payment details.</p>
      <p>Thank you,<br>ANT Solar Team</p>
    `
  }),
  'project-completion': data => ({
    subject: `Your Solar Project is Complete! #${shortProjectId(data.projectId)}`,
    html: `
      <h2>Project Completion</h2>
      <p>Dear ${escapeHtml(data.customerName)},</p>
      <p>Your solar installation is complete and ready for use.</p>
      <ul>
        <li>Completion Date: ${escapeHtml(data.completionDate)}</li>
        <li>Solar Panels: ${escapeHtml(data.panelCount)}</li>
        <li>Inverter: ${escapeHtml(data.inverter)}</li>
        <li>Battery: ${escapeHtml(data.battery || 'Not required')}</li>
      </ul>
      <p>For service or maintenance support, please contact ANT Solar.</p>
      <p>Best regards,<br>ANT Solar Team</p>
    `
  })
};

function getTransporter() {
  const host = process.env.EMAIL_HOST;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASSWORD;
  if (!host || !user || !pass) throw new Error('Email service is not configured');
  const port = Number(process.env.EMAIL_PORT || 587);
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass }
  });
}

exports.handler = async event => {
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' }, { Allow: 'POST' });
  }

  const authorization = await requireAdmin(event);
  if (!authorization.authorized) return authorization.response;

  try {
    const payload = JSON.parse(event.body || '{}');
    const to = String(payload.to || '').trim();
    const template = String(payload.template || '').trim();
    const data = payload.data;

    if (!EMAIL_PATTERN.test(to)) return jsonResponse(400, { error: 'A valid recipient email is required' });
    if (!emailTemplates[template]) return jsonResponse(400, { error: 'Unsupported email template' });
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return jsonResponse(400, { error: 'Email template data is required' });
    }

    const content = emailTemplates[template](data);
    const result = await getTransporter().sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to,
      subject: content.subject,
      html: content.html
    });

    return jsonResponse(200, {
      success: true,
      message: 'Email sent successfully',
      messageId: result.messageId
    });
  } catch (error) {
    console.error('Error sending email:', error);
    if (error instanceof SyntaxError) return jsonResponse(400, { error: 'Invalid JSON request body' });
    return jsonResponse(500, { success: false, error: 'Unable to send email' });
  }
};
