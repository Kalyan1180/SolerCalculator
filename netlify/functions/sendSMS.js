// Admin-only SMS delivery through Twilio's REST API (no runtime SDK required).
const {
  HttpError,
  json,
  parseJsonBody,
  requireUser,
  toPublicError
} = require('../lib/firebaseAdmin');

exports.handler = async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed.' }, { Allow: 'POST' });
  }

  try {
    await requireUser(event, { roles: ['admin'] });
    const request = parseJsonBody(event, 20000);
    const to = typeof request.to === 'string' ? request.to.trim() : '';
    const message = typeof request.message === 'string' ? request.message.trim() : '';

    if (!/^\+[1-9]\d{7,14}$/.test(to)) {
      throw new HttpError(400, 'Phone number must use E.164 format, for example +919876543210.');
    }
    if (!message || message.length > 1500) {
      throw new HttpError(400, 'SMS message must contain between 1 and 1500 characters.');
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;
    if (!accountSid || !authToken || !fromNumber) {
      throw new HttpError(503, 'SMS delivery is not configured.');
    }

    const body = new URLSearchParams({
      To: to,
      From: fromNumber,
      Body: message
    });
    const authorization = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${authorization}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body
      }
    );

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error('SMS provider error:', result);
      throw new HttpError(502, 'The SMS provider rejected the request.');
    }

    return json(200, {
      success: true,
      message: 'SMS sent successfully.',
      messageId: result.sid || null,
      projectId: request.projectId || null,
      type: request.type || null
    });
  } catch (error) {
    return toPublicError(error);
  }
};
