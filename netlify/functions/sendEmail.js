const nodemailer = require('nodemailer');
const { jsonResponse, requireAdmin } = require('./_firebaseAdmin');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REQUIRED_EMAIL_VARIABLES = ['EMAIL_HOST', 'EMAIL_USER', 'EMAIL_PASSWORD'];

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

function configurationError(message) {
  const error = new Error(message);
  error.code = 'EMAIL_CONFIG_MISSING';
  return error;
}

function getTransporter() {
  const missingVariables = REQUIRED_EMAIL_VARIABLES.filter(name => !String(process.env[name] || '').trim());
  if (missingVariables.length) {
    throw configurationError(`Missing Netlify environment variables: ${missingVariables.join(', ')}`);
  }

  const host = process.env.EMAIL_HOST.trim();
  const user = process.env.EMAIL_USER.trim();
  let pass = process.env.EMAIL_PASSWORD;
  const port = Number(process.env.EMAIL_PORT || 587);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw configurationError('EMAIL_PORT must be a valid TCP port number');
  }

  // Google displays app passwords in groups separated by spaces. Removing those
  // spaces prevents an otherwise valid Gmail app password from being rejected.
  if (host.toLowerCase().includes('gmail.com')) pass = pass.replace(/\s+/g, '');

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    connectionTimeout: 15000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
    tls: { minVersion: 'TLSv1.2' }
  });
}

function publicEmailError(error) {
  if (error?.code === 'EMAIL_CONFIG_MISSING') {
    return {
      status: 503,
      message: `${error.message}. Add the values in Netlify Site configuration > Environment variables, then redeploy.`
    };
  }

  if (error?.code === 'EAUTH' || error?.responseCode === 535) {
    return {
      status: 502,
      message: 'The email provider rejected the login. For Gmail, use a Google App Password in EMAIL_PASSWORD instead of the normal account password.'
    };
  }

  if (error?.code === 'EENVELOPE' || error?.responseCode === 550 || error?.responseCode === 553) {
    return {
      status: 400,
      message: 'The email provider rejected the sender or recipient address. Check EMAIL_FROM, EMAIL_USER and the customer email.'
    };
  }

  if (['ECONNECTION', 'ETIMEDOUT', 'ESOCKET', 'EDNS', 'ECONNREFUSED'].includes(error?.code)) {
    return {
      status: 502,
      message: 'Unable to connect to the email provider. Check EMAIL_HOST and EMAIL_PORT in Netlify.'
    };
  }

  return {
    status: 500,
    message: 'The email provider returned an unexpected error. Check the sendEmail function log in Netlify.'
  };
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
      from: String(process.env.EMAIL_FROM || process.env.EMAIL_USER).trim(),
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
    if (error instanceof SyntaxError) return jsonResponse(400, { error: 'Invalid JSON request body' });

    console.error('Error sending email:', {
      code: error?.code,
      command: error?.command,
      responseCode: error?.responseCode,
      message: error?.message
    });

    const publicError = publicEmailError(error);
    return jsonResponse(publicError.status, { success: false, error: publicError.message });
  }
};
