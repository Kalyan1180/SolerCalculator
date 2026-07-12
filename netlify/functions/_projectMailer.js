const nodemailer = require('nodemailer');
const { attachmentForNotification } = require('./_projectDocuments');

const REQUIRED_EMAIL_VARIABLES = ['EMAIL_HOST', 'EMAIL_USER', 'EMAIL_PASSWORD'];
const STATUS_LABELS = Object.freeze({
  quote_pending: 'Quotation preparation',
  quote_sent: 'Quotation sent',
  quote_rejected: 'Quotation not accepted',
  approved: 'Project approved',
  installation_scheduled: 'Installation scheduled',
  in_progress: 'Installation in progress',
  completed: 'Installation completed',
  cancelled: 'Project cancelled'
});

const NEXT_STEPS = Object.freeze({
  quote_pending: 'Our team is preparing and reviewing your quotation.',
  quote_sent: 'Please review the attached quotation and contact us if you need clarification or revisions.',
  quote_rejected: 'Please contact us if you would like us to prepare a revised solution.',
  approved: 'Please review the attached invoice and arrange the agreed payment so procurement and scheduling can proceed.',
  installation_scheduled: 'Please ensure the installation area is accessible on the scheduled date.',
  in_progress: 'Our installation team is working on your solar system. We will update you when commissioning is complete.',
  completed: 'Please review the completed installation and contact us for service or warranty support when required.',
  cancelled: 'Please contact ANT Solar if this cancellation was unexpected or you would like to restart the project.'
});

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function numberValue(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function money(value) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(numberValue(value));
}

function dateValue(value) {
  if (!value) return 'To be confirmed';
  const date = typeof value.toDate === 'function' ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return 'To be confirmed';
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'long' }).format(date);
}

function configurationError(message) {
  const error = new Error(message);
  error.code = 'EMAIL_CONFIG_MISSING';
  return error;
}

function transporter() {
  const missing = REQUIRED_EMAIL_VARIABLES.filter(name => !String(process.env[name] || '').trim());
  if (missing.length) throw configurationError(`Missing Netlify environment variables: ${missing.join(', ')}`);

  const host = process.env.EMAIL_HOST.trim();
  const port = Number(process.env.EMAIL_PORT || 587);
  let pass = process.env.EMAIL_PASSWORD;
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw configurationError('EMAIL_PORT is invalid');
  if (host.toLowerCase().includes('gmail.com')) pass = pass.replace(/\s+/g, '');

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user: process.env.EMAIL_USER.trim(), pass },
    connectionTimeout: 15000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
    tls: { minVersion: 'TLSv1.2' }
  });
}

function equipmentRows(project) {
  const panelCategory = project.panel?.panelType || project.panel?.specs?.panelType;
  const rows = [
    ['Solar panels', `${numberValue(project.panelCount)} × ${project.panel?.name || 'Solar panel'}`],
    ...(panelCategory ? [['Panel category', String(panelCategory).replace(/_/g, ' ')]] : []),
    ['Inverter', project.inverter?.name || 'To be confirmed'],
    ['Battery', project.battery?.selectedBattery
      ? `${numberValue(project.battery.quantity)} × ${project.battery.selectedBattery.name}`
      : 'Not required']
  ];
  return rows.map(([label, value]) => `<tr><td style="padding:7px 12px;color:#475569">${escapeHtml(label)}</td><td style="padding:7px 12px;font-weight:600">${escapeHtml(value)}</td></tr>`).join('');
}

function commercialRows(project) {
  const advancePercentage = numberValue(project.advancePercentage);
  return [
    ['Quoted price', `Rs. ${money(project.quotedPrice)}`],
    [`Advance${advancePercentage ? ` (${money(advancePercentage)}%)` : ''}`, `Rs. ${money(project.advanceAmount)}`],
    ['Balance', `Rs. ${money(project.balanceAmount)}`],
    ['Amount received', `Rs. ${money(project.amountPaid)}`],
    ['Amount remaining', `Rs. ${money(Math.max(0, numberValue(project.quotedPrice) - numberValue(project.amountPaid)))}`]
  ].map(([label, value]) => `<tr><td style="padding:7px 12px;color:#475569">${escapeHtml(label)}</td><td style="padding:7px 12px;font-weight:600">${escapeHtml(value)}</td></tr>`).join('');
}

function layout({
  title,
  customerName,
  intro,
  project,
  body = '',
  nextStep = '',
  includeSystemSummary = false,
  includeCommercialSummary = false
}) {
  const systemSection = includeSystemSummary
    ? `<h3 style="margin:24px 0 8px">System summary</h3><table style="width:100%;border-collapse:collapse;background:#f8fafc">${equipmentRows(project)}</table>`
    : '';
  const commercialSection = includeCommercialSummary
    ? `<h3 style="margin:24px 0 8px">Commercial summary</h3><table style="width:100%;border-collapse:collapse;background:#f8fafc">${commercialRows(project)}</table>`
    : '';

  return `<!doctype html><html><body style="margin:0;background:#f1f5f9;font-family:Arial,sans-serif;color:#0f172a">
    <div style="max-width:680px;margin:0 auto;padding:24px">
      <div style="background:#0f4c81;color:#fff;padding:22px 26px;border-radius:14px 14px 0 0">
        <div style="font-size:13px;opacity:.85">ANT Solar</div><h1 style="margin:6px 0 0;font-size:24px">${escapeHtml(title)}</h1>
      </div>
      <div style="background:#fff;padding:26px;border-radius:0 0 14px 14px">
        <p>Dear ${escapeHtml(customerName || 'Customer')},</p><p>${escapeHtml(intro)}</p>
        <p><strong>Project ID:</strong> ${escapeHtml(project.projectId)}</p>
        ${body}
        ${systemSection}
        ${commercialSection}
        ${nextStep ? `<div style="margin-top:22px;padding:15px;border-left:4px solid #16a34a;background:#f0fdf4"><strong>Next step</strong><br>${escapeHtml(nextStep)}</div>` : ''}
        <p style="margin-top:24px">For any clarification, reply to this email or contact ANT Solar.</p>
        <p>Best regards,<br><strong>ANT Solar Team</strong></p>
      </div>
    </div></body></html>`;
}

function statusEmail(notification) {
  const { project, previousStatus, newStatus, note } = notification.payload;
  const newLabel = STATUS_LABELS[newStatus] || newStatus;
  const previousLabel = STATUS_LABELS[previousStatus] || previousStatus || 'Not set';
  const schedule = newStatus === 'installation_scheduled'
    ? `<p><strong>Scheduled installation date:</strong> ${escapeHtml(dateValue(project.installationScheduledDate))}</p>`
    : '';
  const noteBlock = note ? `<p><strong>Update from our team:</strong> ${escapeHtml(note)}</p>` : '';
  const isQuotation = newStatus === 'quote_sent';
  const isApproval = newStatus === 'approved';
  const isCompletion = newStatus === 'completed';
  const attachmentNote = isQuotation
    ? '<p><strong>Your quotation PDF is attached to this email.</strong></p>'
    : isApproval
      ? '<p><strong>Your invoice PDF is attached to this email.</strong></p>'
      : '';

  return {
    subject: `Solar project update: ${newLabel} — ${String(project.projectId).slice(0, 16)}`,
    html: layout({
      title: 'Your solar project has been updated',
      customerName: project.customerName,
      intro: `Your project status changed from ${previousLabel} to ${newLabel}.`,
      project,
      body: `<p><strong>Current status:</strong> ${escapeHtml(newLabel)}</p>${schedule}${noteBlock}${attachmentNote}`,
      nextStep: NEXT_STEPS[newStatus] || 'Our team will contact you with the next update.',
      includeSystemSummary: isQuotation || isApproval || isCompletion,
      includeCommercialSummary: isQuotation || isApproval
    })
  };
}

function projectChangedEmail(notification) {
  const { project, changes } = notification.payload;
  const rows = (changes || []).map(change => `<li><strong>${escapeHtml(change.label)}:</strong> ${escapeHtml(change.value)}</li>`).join('');
  const commercialLabels = new Set(['Quoted price', 'Advance']);
  const systemLabels = new Set(['Solar panels', 'Panel model', 'Inverter', 'Battery', 'Battery quantity']);
  const includeCommercialSummary = (changes || []).some(change => commercialLabels.has(change.label));
  const includeSystemSummary = (changes || []).some(change => systemLabels.has(change.label));
  return {
    subject: `Solar project details revised — ${String(project.projectId).slice(0, 16)}`,
    html: layout({
      title: 'Your solar project details were revised',
      customerName: project.customerName,
      intro: 'We updated the customer-visible details listed below.',
      project,
      body: rows ? `<h3>What changed</h3><ul>${rows}</ul>` : '',
      nextStep: 'Please review the revised details. Contact us if you need clarification.',
      includeSystemSummary,
      includeCommercialSummary
    })
  };
}

function paymentEmail(notification) {
  const { project, payment } = notification.payload;
  return {
    subject: `Payment receipt — ${String(project.projectId).slice(0, 16)}`,
    html: layout({
      title: 'Payment received',
      customerName: project.customerName,
      intro: `We received your payment of Rs. ${money(payment.amount)}. Your PDF receipt is attached.`,
      project,
      body: `<p><strong>Payment method:</strong> ${escapeHtml(payment.method || 'Not specified')}</p>
        ${payment.reference ? `<p><strong>Reference:</strong> ${escapeHtml(payment.reference)}</p>` : ''}
        <p><strong>Payment date:</strong> ${escapeHtml(dateValue(payment.receivedAt || payment.recordedAt))}</p>`,
      nextStep: numberValue(project.amountPaid) >= numberValue(project.quotedPrice)
        ? 'Your payment is complete. Our team will continue with the remaining project activities.'
        : `The remaining amount is Rs. ${money(Math.max(0, numberValue(project.quotedPrice) - numberValue(project.amountPaid)))}.`,
      includeCommercialSummary: true
    })
  };
}

function surveyEmail(notification) {
  const { project, survey, action, note } = notification.payload;
  const scheduled = action === 'scheduled';
  return {
    subject: `${scheduled ? 'Site survey scheduled' : 'Site survey completed'} — ${String(project.projectId).slice(0, 16)}`,
    html: layout({
      title: scheduled ? 'Your site survey is scheduled' : 'Your site survey is complete',
      customerName: project.customerName,
      intro: scheduled
        ? 'Our technical team has scheduled the site survey required before quotation approval.'
        : 'The required site survey has been completed and our team can now finalize the approval workflow.',
      project,
      body: `
        <p><strong>Survey status:</strong> ${scheduled ? 'Scheduled' : 'Completed'}</p>
        <p><strong>${scheduled ? 'Scheduled date' : 'Completed date'}:</strong> ${escapeHtml(dateValue(scheduled ? survey.scheduledDate : survey.completedDate))}</p>
        ${survey.surveyor ? `<p><strong>Surveyor:</strong> ${escapeHtml(survey.surveyor)}</p>` : ''}
        ${note ? `<p><strong>Message from our team:</strong> ${escapeHtml(note)}</p>` : ''}
      `,
      nextStep: scheduled
        ? 'Please ensure access to the roof, meter and electrical distribution area on the scheduled date.'
        : 'Our team will review the findings and proceed with the quotation approval process.',
      includeSystemSummary: false,
      includeCommercialSummary: false
    })
  };
}

function contentFor(notification) {
  if (notification.type === 'status_changed') return statusEmail(notification);
  if (notification.type === 'project_changed') return projectChangedEmail(notification);
  if (notification.type === 'payment_received') return paymentEmail(notification);
  if (notification.type === 'site_survey_scheduled' || notification.type === 'site_survey_completed') return surveyEmail(notification);
  throw new Error(`Unsupported project notification type: ${notification.type}`);
}

async function sendProjectNotification(notification) {
  const recipient = String(notification.to || notification.payload?.project?.customerEmail || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
    const error = new Error('The customer email address is invalid or missing.');
    error.code = 'INVALID_RECIPIENT';
    throw error;
  }
  const content = contentFor(notification);
  const attachment = await attachmentForNotification(notification);
  const result = await transporter().sendMail({
    from: String(process.env.EMAIL_FROM || process.env.EMAIL_USER).trim(),
    to: recipient,
    subject: content.subject,
    html: content.html,
    attachments: attachment ? [attachment] : []
  });
  return {
    messageId: result.messageId,
    recipient,
    subject: content.subject,
    attachmentName: attachment?.filename || ''
  };
}

module.exports = {
  NEXT_STEPS,
  STATUS_LABELS,
  contentFor,
  sendProjectNotification
};
