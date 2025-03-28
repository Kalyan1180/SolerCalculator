// netlify/functions/getData.js
const admin = require("firebase-admin");

// Initialize Firebase Admin SDK (ensure this happens only once)
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

exports.handler = async function (event, context) {
  try {
    const db = admin.firestore(); // Access Cloud Firestore

    // Fetch inverter data from the "inverters" collection
    const inverterSnapshot = await db.collection("inverters").get();
    const inverters = inverterSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));


    // Fetch battery data from the "batteries" collection
    const batterySnapshot = await db.collection("batteries").get();
    const batteries = batterySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    return {
      statusCode: 200,
      body: JSON.stringify({ inverters, batteries }),
    };
  } catch (error) {
    console.error("Error fetching data from Firestore:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal Server Error" }),
    };
  }
};
