const crypto = require('crypto');
const { getAdminServices, jsonResponse } = require('./_firebaseAdmin');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALLOWED_INTERESTS = new Set([
  'home-solar',
  'business-solar',
  'battery-backup',
  'site-survey',
  'service-support',
  'general'
]);

function text(value, maxLength) {
  return String(value || '').trim().slice(0, maxLength);
}

function hashAddress(value) {
  const normalized = text(value, 250).split(',')[0].trim();
  return normalized
    ? crypto.createHash('sha256').update(normalized).digest('hex')
    : '';
}

exports.handler = async event => {
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' }, { Allow: 'POST' });
  }

  try {
    const payload = JSON.parse(event.body || '{}');

    // Silently accept honeypot submissions so automated senders do not learn
    // which field triggered the anti-spam protection.
    if (text(payload.botField, 200)) {
      return jsonResponse(202, { success: true, message: 'Your enquiry was received.' });
    }

    const enquiryId = `ENQ-${crypto.randomUUID()}`;
    const interest = text(payload.interest, 80);
    const enquiry = {
      enquiryId,
      name: text(payload.name, 100),
      email: text(payload.email, 160).toLowerCase(),
      phone: text(payload.phone, 30),
      message: text(payload.message, 2000),
      interest: ALLOWED_INTERESTS.has(interest) ? interest : 'general',
      source: text(payload.source, 100) || 'contact-page',
      status: 'new',
      priority: 'normal',
      assignedTo: '',
      assignedToUid: '',
      internalNotes: [],
      activityHistory: [],
      lastActionAt: null,
      resolvedAt: null,
      ipHash: hashAddress(event.headers?.['x-forwarded-for']),
      userAgent: text(event.headers?.['user-agent'], 300)
    };

    if (!enquiry.name) return jsonResponse(400, { error: 'Name is required' });
    if (!EMAIL_PATTERN.test(enquiry.email)) return jsonResponse(400, { error: 'A valid email is required' });
    if (enquiry.message.length < 10) {
      return jsonResponse(400, { error: 'Please provide a little more detail about your requirement' });
    }

    const { db, fieldValue } = getAdminServices();
    const now = fieldValue.serverTimestamp();
    await db.collection('enquiries').doc(enquiryId).set({
      ...enquiry,
      createdAt: now,
      updatedAt: now,
      activityHistory: [{
        action: 'submitted',
        fromStatus: '',
        toStatus: 'new',
        note: '',
        actorUid: '',
        actorEmail: '',
        createdAt: new Date()
      }]
    });

    return jsonResponse(201, {
      success: true,
      enquiryId,
      message: 'Thank you. Your enquiry has been recorded and our team will review it.'
    });
  } catch (error) {
    console.error('Enquiry submission failed:', error);
    if (error instanceof SyntaxError) return jsonResponse(400, { error: 'Invalid enquiry request' });
    return jsonResponse(500, { error: 'The enquiry could not be submitted. Please try again.' });
  }
};
