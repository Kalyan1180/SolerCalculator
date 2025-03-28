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
  try {
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: 'Method Not Allowed' }),
      };
    }
    
    const data = JSON.parse(event.body);
    
    // Basic validation
    if (!data.name || data.peakLoad == null || data.maxPanels == null || data.batterySupported == null || data.cost == null) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields' }),
      };
    }
    
    const db = admin.firestore();
    const docRef = await db.collection('inverters').add({
      name: data.name,
      peakLoad: Number(data.peakLoad),
      maxPanels: Number(data.maxPanels),
      batterySupported: Number(data.batterySupported),
      cost: Number(data.cost)
    });
    
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Inverter added successfully', id: docRef.id }),
    };
  } catch (error) {
    console.error('Error adding inverter:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to add inverter' }),
    };
  }
};
