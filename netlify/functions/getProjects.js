// netlify/functions/getProjects.js

const admin = require("firebase-admin");

// Initialize the Firebase Admin SDK if not already initialized.
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      "type": process.env.FB_TYPE,
      "project_id": process.env.FB_PROJECT_ID,
      "private_key_id": process.env.FB_PRIVATE_KEY_ID,
      // Replace escaped newline characters with actual newline characters
      "private_key": process.env.FB_PRIVATE_KEY.replace(/\\n/g, "\n"),
      "client_email": process.env.FB_CLIENT_EMAIL,
      "client_id": process.env.FB_CLIENT_ID,
      "auth_uri": process.env.FB_AUTH_URI,
      "token_uri": process.env.FB_TOKEN_URI,
      "auth_provider_x509_cert_url": process.env.FB_AUTH_PROVIDER_X509_CERT_URL,
      "client_x509_cert_url": process.env.FB_CLIENT_X509_CERT_URL,
    }),
    // Optionally specify databaseURL if needed.
  });
}

const db = admin.firestore();

exports.handler = async (event, context) => {
  // Allow only GET requests.
  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed. Only GET requests are accepted." }),
    };
  }

  try {
    const qs = event.queryStringParameters || {};

    // If projectId query parameter exists, try to fetch by doc ID first.
    if (qs.projectId) {
      const projectId = qs.projectId; // Using string comparison
      // Try direct document lookup:
      const docRef = db.collection("projects").doc(projectId);
      const projectSnap = await docRef.get();
      if (projectSnap.exists) {
        return {
          statusCode: 200,
          body: JSON.stringify({ project: { id: projectSnap.id, ...projectSnap.data() } }),
        };
      }

      // If direct lookup fails, query by field "projectId"
      const snapshot = await db
        .collection("projects")
        .where("projectId", "==", projectId)
        .get();

      if (snapshot.empty) {
        return {
          statusCode: 404,
          body: JSON.stringify({ error: "Project not found" }),
        };
      }

      let project = null;
      snapshot.forEach(doc => {
        project = { id: doc.id, ...doc.data() };
      });

      return {
        statusCode: 200,
        body: JSON.stringify({ project }),
      };
    } else {
      // No projectId provided: return all projects.
      const snapshot = await db.collection("projects").get();
      const projects = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      return {
        statusCode: 200,
        body: JSON.stringify({ projects }),
      };
    }
  } catch (error) {
    console.error("Error fetching projects:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
