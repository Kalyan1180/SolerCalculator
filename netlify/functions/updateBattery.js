const { jsonResponse, requireAdmin } = require('./_firebaseAdmin');

function validId(value) {
  const id = String(value || '').trim();
  return /^[A-Za-z0-9_-]{1,128}$/.test(id) ? id : null;
}

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
  if (event.httpMethod !== 'PUT') return jsonResponse(405, { error: 'Method not allowed' }, { Allow: 'PUT' });
  const authorization = await requireAdmin(event);
  if (!authorization.authorized) return authorization.response;

  try {
    const payload = JSON.parse(event.body || '{}');
    const id = validId(payload.id);
    const data = payload.updateData;
    if (!id || !data || typeof data !== 'object' || Array.isArray(data)) {
      return jsonResponse(400, { error: 'A valid battery ID and update data are required' });
    }

    const name = String(data.name || '').trim();
    if (!name || name.length > 120) return jsonResponse(400, { error: 'Battery name is required and must be under 120 characters' });
    const capacity = positiveNumber(data.capacity, 'Capacity');
    const energy = positiveNumber(data.energy, 'Energy');
    const price = nonNegativeNumber(data.price, 'Price');

    const batteryRef = authorization.db.collection('batteries').doc(id);
    const snapshot = await batteryRef.get();
    if (!snapshot.exists) return jsonResponse(404, { error: 'Battery not found' });
    await batteryRef.update({ name, capacity, energy, price, updatedAt: new Date().toISOString() });
    return jsonResponse(200, { message: 'Battery updated successfully' });
  } catch (error) {
    console.error('Error updating battery:', error);
    if (error instanceof SyntaxError) return jsonResponse(400, { error: 'Invalid JSON request body' });
    if (/must|cannot/i.test(error.message)) return jsonResponse(400, { error: error.message });
    return jsonResponse(500, { error: 'Failed to update battery' });
  }
};
