const twilio = require('twilio');
const { jsonResponse, requirePermission } = require('./_firebaseAdmin');

const E164_PATTERN = /^\+[1-9]\d{7,14}$/;
const ALLOWED_TYPES = new Set(['project-status', 'payment-reminder', 'project-completion']);

function getClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;
  if (!accountSid || !authToken || !fromNumber) throw new Error('SMS service is not configured');
  if (!E164_PATTERN.test(fromNumber)) throw new Error('Twilio sender number is invalid');
  return { client: twilio(accountSid, authToken), fromNumber };
}

exports.handler = async event => {
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' }, { Allow: 'POST' });
  }

  const authorization = await requirePermission(event, 'notifications.send');
  if (!authorization.authorized) return authorization.response;

  try {
    const payload = JSON.parse(event.body || '{}');
    const to = String(payload.to || '').replace(/[\s()-]/g, '');
    const message = String(payload.message || '').trim();
    const type = String(payload.type || '').trim();

    if (!E164_PATTERN.test(to)) {
      return jsonResponse(400, { error: 'Phone number must use E.164 format, for example +919876543210' });
    }
    if (!message || message.length > 500) {
      return jsonResponse(400, { error: 'SMS message must contain between 1 and 500 characters' });
    }
    if (!ALLOWED_TYPES.has(type)) return jsonResponse(400, { error: 'Unsupported SMS type' });

    const { client, fromNumber } = getClient();
    const result = await client.messages.create({ body: message, from: fromNumber, to });

    return jsonResponse(200, {
      success: true,
      message: 'SMS sent successfully',
      messageId: result.sid,
      projectId: payload.projectId || null,
      type
    });
  } catch (error) {
    console.error('Error sending SMS:', error);
    if (error instanceof SyntaxError) return jsonResponse(400, { error: 'Invalid JSON request body' });
    return jsonResponse(500, { success: false, error: 'Unable to send SMS' });
  }
};
