// netlify/functions/updateInverter.js
const admin = require('firebase-admin');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
          "type": process.env.FB_TYPE,
          "project_id": process.env.FB_PROJECT_ID,
          "private_key_id": process.env.FB_PRIVATE_KEY_ID,
          "private_key": process.env.FB_PRIVATE_KEY.replace(/\\n/g, "\n"),
          "client_email": process.env.FB_CLIENT_EMAIL,
          "client_id": process.env.FB_CLIENT_ID,
          "auth_uri": process.env.FB_AUTH_URI,
          "token_uri": process.env.FB_TOKEN_URI,
          "auth_provider_x509_cert_url": process.env.FB_AUTH_PROVIDER_X509_CERT_URL,
          "client_x509_cert_url": process.env.FB_CLIENT_X509_CERT_URL,
        }),
        // You don't need a databaseURL for Firestore unless you have a specific requirement.
      });
}

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'PUT') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }
  try {
    const data = JSON.parse(event.body);
    const { id, updateData } = data;
    if (!id || !updateData) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing inverter id or updateData' }) };
    }
    const db = admin.firestore();
    await db.collection('inverters').doc(id).update({
      ...updateData,
      peakLoad: Number(updateData.peakLoad),
      maxPanels: Number(updateData.maxPanels),
      batterySupported: Number(updateData.batterySupported),
      cost: Number(updateData.cost)
    });
    return { statusCode: 200, body: JSON.stringify({ message: 'Inverter updated successfully' }) };
  } catch (error) {
    console.error('Error updating inverter:', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to update inverter' }) };
  }
};
