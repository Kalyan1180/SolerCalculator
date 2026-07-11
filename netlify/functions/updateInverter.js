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
      return jsonResponse(400, { error: 'A valid inverter ID and update data are required' });
    }

    const name = String(data.name || '').trim();
    if (!name || name.length > 120) return jsonResponse(400, { error: 'Inverter name is required and must be under 120 characters' });
    const peakLoad = positiveNumber(data.peakLoad, 'Peak load');
    const maxPanels = positiveNumber(data.maxPanels, 'Maximum panels');
    const batterySupported = nonNegativeNumber(data.batterySupported, 'Battery voltage');
    const cost = nonNegativeNumber(data.cost, 'Cost');
    if (!Number.isInteger(maxPanels)) return jsonResponse(400, { error: 'Maximum panels must be a whole number' });
    if (!Number.isInteger(batterySupported) || (batterySupported !== 0 && batterySupported % 12 !== 0)) {
      return jsonResponse(400, { error: 'Battery voltage must be 0 or a multiple of 12' });
    }

    const inverterRef = authorization.db.collection('inverters').doc(id);
    const snapshot = await inverterRef.get();
    if (!snapshot.exists) return jsonResponse(404, { error: 'Inverter not found' });
    await inverterRef.update({ name, peakLoad, maxPanels, batterySupported, cost, updatedAt: new Date().toISOString() });
    return jsonResponse(200, { message: 'Inverter updated successfully' });
  } catch (error) {
    console.error('Error updating inverter:', error);
    if (error instanceof SyntaxError) return jsonResponse(400, { error: 'Invalid JSON request body' });
    if (/must|cannot/i.test(error.message)) return jsonResponse(400, { error: error.message });
    return jsonResponse(500, { error: 'Failed to update inverter' });
  }
};
