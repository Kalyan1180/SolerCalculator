// Admin-only transactional email delivery using the Resend HTTP API.
const {
  HttpError,
  json,
  parseJsonBody,
  requireUser,
  toPublicError
} = require('../lib/firebaseAdmin');

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function currency(value) {
  const number = Number(value);
  return Number.isFinite(number)
    ? new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(number)
    : '0';
}

const templates = {
  'project-update': (data) => ({
    subject: `Update on your Solar Project #${String(data.projectId || '').slice(0, 12)}`,
    html: `
      <h2>Project Update</h2>
      <p>Dear ${escapeHtml(data.customerName)},</p>
      <p>${escapeHtml(data.statusMessage)}</p>
      <p><strong>Project ID:</strong> ${escapeHtml(data.projectId)}</p>
      <p><strong>Status:</strong> ${escapeHtml(data.status)}</p>
      <p><strong>Quoted Price:</strong> INR ${currency(data.quotedPrice)}</p>
      <p><strong>Advance Amount:</strong> INR ${currency(data.advanceAmount)}</p>
      <p><strong>Balance Amount:</strong> INR ${currency(data.balanceAmount)}</p>
      <p>Thank you for choosing ANT Solar.</p>
      <p>Best Regards,<br>ANT Solar Team</p>
    `
  }),
  'payment-reminder': (data) => ({
    subject: `Payment Reminder: ${String(data.milestone || 'Project')} Payment Due`,
    html: `
      <h2>Payment Reminder</h2>
      <p>Dear ${escapeHtml(data.customerName)},</p>
      <p>Your <strong>${escapeHtml(data.milestone)}</strong> payment of
      <strong>INR ${currency(data.amount)}</strong> is due for your solar project.</p>
      <p><strong>Project ID:</strong> ${escapeHtml(data.projectId)}</p>
      <p><strong>Due Date:</strong> ${escapeHtml(data.dueDate)}</p>
      <p>Please contact us for payment details.</p>
      <p>Thank you,<br>ANT Solar Team</p>
    `
  }),
  'project-completion': (data) => ({
    subject: `Your Solar Project is Complete! #${String(data.projectId || '').slice(0, 12)}`,
    html: `
      <h2>Project Completion</h2>
      <p>Dear ${escapeHtml(data.customerName)},</p>
      <p>Your solar installation is complete and ready for use.</p>
      <ul>
        <li>Completion Date: ${escapeHtml(data.completionDate)}</li>
        <li>Solar Panels: ${escapeHtml(data.panelCount)}</li>
        <li>Inverter: ${escapeHtml(data.inverter)}</li>
        <li>Battery: ${escapeHtml(data.battery)}</li>
      </ul>
      <p>For service support or maintenance, please contact the ANT Solar team.</p>
      <p>Thank you for choosing ANT Solar.</p>
    `
  })
};

exports.handler = async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed.' }, { Allow: 'POST' });
  }

  try {
    await requireUser(event, { roles: ['admin'] });
    const request = parseJsonBody(event, 50000);
    const to = typeof request.to === 'string' ? request.to.trim().toLowerCase() : '';
    const templateName = typeof request.template === 'string' ? request.template : '';
    const template = templates[templateName];

    if (!/^\S+@\S+\.\S+$/.test(to)) {
      throw new HttpError(400, 'A valid recipient email address is required.');
    }
    if (!template || !request.data || typeof request.data !== 'object') {
      throw new HttpError(400, 'A supported email template and data are required.');
    }

    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.EMAIL_FROM;
    if (!apiKey || !from) {
      throw new HttpError(503, 'Email delivery is not configured. Set RESEND_API_KEY and EMAIL_FROM.');
    }

    const content = template(request.data);
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: content.subject,
        html: content.html
      })
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error('Email provider error:', result);
      throw new HttpError(502, 'The email provider rejected the request.');
    }

    return json(200, {
      success: true,
      message: 'Email sent successfully.',
      messageId: result.id || null
    });
  } catch (error) {
    return toPublicError(error);
  }
};
