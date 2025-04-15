// netlify/functions/updateProject.js

const admin = require("firebase-admin");

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    }),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  });
}

const db = admin.firestore();

exports.handler = async (event, context) => {
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

    // Search for the document where 'projectId' field matches
    const snapshot = await db.collection("projects")
      .where("projectId", "==", projectId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: `Project with projectId ${projectId} not found.` }),
      };
    }

    const docRef = snapshot.docs[0].ref;

    await docRef.update(updateData);

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
