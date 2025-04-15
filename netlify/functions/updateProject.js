// netlify/functions/updateProject.js

const admin = require("firebase-admin");

// Initialize the Firebase Admin SDK if not already initialized.
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // Ensure newlines in the private key are correctly handled
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    }),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  });
}

const db = admin.firestore();

exports.handler = async (event, context) => {
  // Only allow PUT requests.
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

    // Get a document reference for the specified project.
    const projectRef = db.collection("projects").doc(String(projectId));
    const docSnapshot = await projectRef.get();

    // If the project does not exist, return a 404 error.
    if (!docSnapshot.exists) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: `Project with id ${projectId} not found.` }),
      };
    }

    // Update the project document with the new data.
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
