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
    if (!name || name.length > 120) return jsonResponse(400, { error: 'Inverter name is required and must be under 120 characters' });

    const peakLoad = positiveNumber(data.peakLoad, 'Peak load');
    const maxPanels = positiveNumber(data.maxPanels, 'Maximum panels');
    const batterySupported = nonNegativeNumber(data.batterySupported, 'Battery voltage');
    const cost = nonNegativeNumber(data.cost, 'Cost');
    if (!Number.isInteger(maxPanels)) return jsonResponse(400, { error: 'Maximum panels must be a whole number' });
    if (!Number.isInteger(batterySupported) || (batterySupported !== 0 && batterySupported % 12 !== 0)) {
      return jsonResponse(400, { error: 'Battery voltage must be 0 or a multiple of 12' });
    }

    const docRef = await authorization.db.collection('inverters').add({
      name,
      peakLoad,
      maxPanels,
      batterySupported,
      cost,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      updatedBy: authorization.user.uid
    });
    return jsonResponse(201, { message: 'Inverter added successfully', id: docRef.id });
  } catch (error) {
    console.error('Error adding inverter:', error);
    if (error instanceof SyntaxError) return jsonResponse(400, { error: 'Invalid JSON request body' });
    if (/must|cannot/i.test(error.message)) return jsonResponse(400, { error: error.message });
    return jsonResponse(500, { error: 'Failed to add inverter' });
  }
};
