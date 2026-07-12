const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { getAdminServices, jsonResponse } = require('./_firebaseAdmin');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function text(value, maxLength) {
  return String(value || '').trim().slice(0, maxLength);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function mailTransport() {
  const host = text(process.env.EMAIL_HOST, 200);
  const user = text(process.env.EMAIL_USER, 200);
  let password = String(process.env.EMAIL_PASSWORD || '');
  const port = Number(process.env.EMAIL_PORT || 587);
  if (!host || !user || !password) throw new Error('Email service is not configured');
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Email port is invalid');
  if (host.toLowerCase().includes('gmail.com')) password = password.replace(/\s+/g, '');
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass: password },
    connectionTimeout: 15000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
    tls: { minVersion: 'TLSv1.2' }
  });
}

exports.handler = async event => {
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' }, { Allow: 'POST' });
  }

  try {
    const payload = JSON.parse(event.body || '{}');

    // Honeypot submissions are accepted without processing so bots do not learn
    // how the protection works.
    if (text(payload.botField, 200)) {
      return jsonResponse(202, { success: true, message: 'Your enquiry was received.' });
    }

    const enquiry = {
      enquiryId: `ENQ-${crypto.randomUUID()}`,
      name: text(payload.name, 100),
      email: text(payload.email, 160).toLowerCase(),
      phone: text(payload.phone, 30),
      message: text(payload.message, 2000),
      interest: text(payload.interest, 80) || 'general',
      source: text(payload.source, 100) || 'contact-page',
      status: 'new',
      userAgent: text(event.headers?.['user-agent'], 300),
      forwardedFor: text(event.headers?.['x-forwarded-for'], 200)
    };

    if (!enquiry.name) return jsonResponse(400, { error: 'Name is required' });
    if (!EMAIL_PATTERN.test(enquiry.email)) return jsonResponse(400, { error: 'A valid email is required' });
    if (enquiry.message.length < 10) return jsonResponse(400, { error: 'Please provide a little more detail about your requirement' });

    const { db, fieldValue } = getAdminServices();
    const enquiryRef = db.collection('enquiries').doc(enquiry.enquiryId);
    await enquiryRef.set({
      ...enquiry,
      createdAt: fieldValue.serverTimestamp(),
      updatedAt: fieldValue.serverTimestamp(),
      emailDelivery: 'pending'
    });

    let emailDelivery = 'sent';
    let deliveryError = '';
    try {
      const recipient = text(process.env.CONTACT_TO || process.env.EMAIL_USER, 200);
      const subject = `New solar enquiry from ${enquiry.name}`;
      const html = `
        <h2>New ANT Solar enquiry</h2>
        <p><strong>Enquiry ID:</strong> ${escapeHtml(enquiry.enquiryId)}</p>
        <p><strong>Name:</strong> ${escapeHtml(enquiry.name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(enquiry.email)}</p>
        <p><strong>Phone:</strong> ${escapeHtml(enquiry.phone || 'Not provided')}</p>
        <p><strong>Interest:</strong> ${escapeHtml(enquiry.interest)}</p>
        <p><strong>Message:</strong></p>
        <p style="white-space:pre-wrap">${escapeHtml(enquiry.message)}</p>
      `;
      const result = await mailTransport().sendMail({
        from: text(process.env.EMAIL_FROM || process.env.EMAIL_USER, 250),
        to: recipient,
        replyTo: enquiry.email,
        subject,
        html
      });
      await enquiryRef.set({
        emailDelivery: 'sent',
        emailMessageId: result.messageId || '',
        emailSentAt: fieldValue.serverTimestamp(),
        updatedAt: fieldValue.serverTimestamp()
      }, { merge: true });
    } catch (error) {
      emailDelivery = 'stored';
      deliveryError = text(error.message, 500);
      console.error('Enquiry email delivery failed:', error);
      await enquiryRef.set({
        emailDelivery: 'failed',
        emailError: deliveryError,
        updatedAt: fieldValue.serverTimestamp()
      }, { merge: true });
    }

    return jsonResponse(emailDelivery === 'sent' ? 200 : 202, {
      success: true,
      enquiryId: enquiry.enquiryId,
      message: 'Thank you. Your enquiry has been received and our team will contact you.',
      delivery: emailDelivery
    });
  } catch (error) {
    console.error('Enquiry submission failed:', error);
    if (error instanceof SyntaxError) return jsonResponse(400, { error: 'Invalid enquiry request' });
    return jsonResponse(500, { error: 'The enquiry could not be submitted. Please try again.' });
  }
};
