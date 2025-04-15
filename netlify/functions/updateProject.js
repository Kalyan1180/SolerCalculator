// netlify/functions/updateProject.js

const admin = require("firebase-admin");

// Initialize Firebase Admin SDK if not already initialized
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
  // Allow only PUT requests
  if (event.httpMethod !== "PUT") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed. Use PUT." }),
    };
  }

  try {
    const data = JSON.parse(event.body);
    const { projectId, updateData } = data;

    if (!projectId || !updateData) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing projectId or updateData in request body." }),
      };
    }

    // Assume the document ID for the project is the projectId (as a string)
    const projectRef = db.collection("projects").doc(String(projectId));
    
    // Update the project document with updateData
    await projectRef.update(updateData);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Project updated successfully" }),
    };
  } catch (error) {
    console.error("Error updating project:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
