// netlify/functions/sendSMS.js
// SMS service using Twilio

const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

const client = new twilio(accountSid, authToken);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { to, message, projectId, type } = JSON.parse(event.body);

    if (!to || !message) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields: to, message' })
      };
    }

    // Validate phone number format
    if (!to.startsWith('+')) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Phone number must include country code (e.g., +91...)' })
      };
    }

    const result = await client.messages.create({
      body: message,
      from: fromNumber,
      to: to
    });

    console.log('SMS sent:', result.sid);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'SMS sent successfully',
        messageId: result.sid,
        projectId: projectId,
        type: type
      })
    };
  } catch (error) {
    console.error('Error sending SMS:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};
