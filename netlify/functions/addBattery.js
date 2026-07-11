const { jsonResponse, requirePermission } = require('./_firebaseAdmin');

function positiveNumber(value, field) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) throw new Error(`${field} must be greater than zero`);
  return number;
}

function nonNegativeNumber(value, field) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) throw new Error(`${field} cannot be negative`);
  return number;
}

exports.handler = async event => {
  if (event.httpMethod !== 'POST') return jsonResponse(405, { error: 'Method not allowed' }, { Allow: 'POST' });
  const authorization = await requirePermission(event, 'equipment.write');
  if (!authorization.authorized) return authorization.response;

  try {
    const data = JSON.parse(event.body || '{}');
    const name = String(data.name || '').trim();
    if (!name || name.length > 120) return jsonResponse(400, { error: 'Battery name is required and must be under 120 characters' });
    const capacity = positiveNumber(data.capacity, 'Capacity');
    const energy = positiveNumber(data.energy, 'Energy');
    const price = nonNegativeNumber(data.price, 'Price');

    const docRef = await authorization.db.collection('batteries').add({
      name,
      capacity,
      energy,
      price,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      updatedBy: authorization.user.uid
    });
    return jsonResponse(201, { message: 'Battery added successfully', id: docRef.id });
  } catch (error) {
    console.error('Error adding battery:', error);
    if (error instanceof SyntaxError) return jsonResponse(400, { error: 'Invalid JSON request body' });
    if (/must|cannot/i.test(error.message)) return jsonResponse(400, { error: error.message });
    return jsonResponse(500, { error: 'Failed to add battery' });
  }
};
