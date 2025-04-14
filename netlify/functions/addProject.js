// netlify/functions/addProject.js

const admin = require("firebase-admin");

// Initialize Firebase Admin SDK only once.
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

const db = admin.firestore();

exports.handler = async (event, context) => {
  // Allow only POST requests.
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const data = JSON.parse(event.body);

    // Build the project object (set default values as required)
    const projectData = {
      name: data.name,                    // Customer name
      address: data.address,              // Customer address
      phone: data.phone,                  // Customer phone
      email: data.email,                  // Customer email (from login)
      projectId: data.projectId,          // Unique project id, e.g. timestamp or generated number
      cost: data.cost,                    // Suggested price
      advancePrice: data.advancePrice || 0, // Advance price, default 0
      requiredInverter: data.requiredInverter, // Inverter details (object)
      requiredBattery: data.requiredBattery,   // Battery details (object)
      percentCompletion: 0,               // Initial percentage completion
      systemIssues: data.systemIssues || "", // To be added later
      note: data.note || "",              // To be added later
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    // Store the project in the "projects" collection in Firestore.
    const docRef = await db.collection("projects").add(projectData);
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Project created successfully",
        projectDocId: docRef.id,
      }),
    };
  } catch (error) {
    console.error("Error adding project:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
