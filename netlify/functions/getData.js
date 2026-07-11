// Public catalogue data used by the solar calculator.
const { HttpError, getDb, json, toPublicError } = require('../lib/firebaseAdmin');

exports.handler = async function handler(event) {
  if (event.httpMethod !== 'GET') {
    return json(405, { error: 'Method not allowed.' }, { Allow: 'GET' });
  }

  try {
    const db = getDb();
    const [inverterSnapshot, batterySnapshot] = await Promise.all([
      db.collection('inverters').get(),
      db.collection('batteries').get()
    ]);

    const inverters = inverterSnapshot.docs.map((document) => ({
      id: document.id,
      ...document.data()
    }));
    const batteries = batterySnapshot.docs.map((document) => ({
      id: document.id,
      ...document.data()
    }));

    if (!inverters.length || !batteries.length) {
      throw new HttpError(503, 'Solar product data is not configured yet.');
    }

    return json(
      200,
      { inverters, batteries },
      { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' }
    );
  } catch (error) {
    return toPublicError(error);
  }
};
