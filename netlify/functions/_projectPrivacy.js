function numberValue(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function text(value, maxLength = 500) {
  return String(value || '').trim().slice(0, maxLength);
}

function publicEquipment(item, type) {
  if (!item || typeof item !== 'object') return null;
  const specs = item.specs && typeof item.specs === 'object' ? item.specs : {};
  if (type === 'panel') {
    return {
      type,
      name: text(item.name, 150) || 'Solar panel',
      wattage: numberValue(item.wattage ?? specs.wattage),
      technology: text(item.technology ?? specs.technology, 100)
    };
  }
  if (type === 'inverter') {
    return {
      type,
      name: text(item.name, 150) || 'Solar inverter',
      peakLoad: numberValue(item.peakLoad ?? specs.peakLoad),
      batteryVoltage: numberValue(item.batteryVoltage ?? item.batterySupported ?? specs.batterySupported)
    };
  }
  if (type === 'battery') {
    return {
      type,
      name: text(item.name, 150) || 'Solar battery',
      capacity: numberValue(item.capacity ?? specs.capacity),
      energy: numberValue(item.energy ?? specs.energy),
      voltage: numberValue(item.voltage ?? specs.voltage) || 12
    };
  }
  return { type, name: text(item.name, 150) || 'Equipment' };
}

function publicBattery(value) {
  if (!value || typeof value !== 'object') return { selectedBattery: null, quantity: 0 };
  return {
    selectedBattery: publicEquipment(value.selectedBattery, 'battery'),
    quantity: Math.max(0, Math.ceil(numberValue(value.quantity)))
  };
}

function sanitizePaymentHistory(history) {
  if (!Array.isArray(history)) return [];
  return history.slice(-100).map(entry => ({
    paymentId: text(entry?.paymentId, 200),
    status: text(entry?.status, 50),
    amount: Math.max(0, numberValue(entry?.amount)),
    method: text(entry?.method, 50),
    reference: text(entry?.reference, 120),
    receivedAt: entry?.receivedAt || null,
    recordedAt: entry?.recordedAt || null
  }));
}

function sanitizeStatusHistory(history) {
  if (!Array.isArray(history)) return [];
  return history.slice(-100).map(entry => ({
    from: text(entry?.from, 50),
    to: text(entry?.to, 50),
    message: text(entry?.message, 1000),
    changedAt: entry?.changedAt || null
  }));
}

function sanitizeCustomerProject(project, id = '') {
  const publicPanel = publicEquipment(project.panel, 'panel');
  const publicInverter = publicEquipment(project.inverter, 'inverter');
  const quotedPrice = Math.max(0, numberValue(project.quotedPrice));
  const amountPaid = Math.max(0, numberValue(project.amountPaid));
  return {
    id: id || text(project.id, 200),
    projectId: text(project.projectId || id, 200),
    customerId: text(project.customerId, 200),
    customerName: text(project.customerName, 100),
    customerEmail: text(project.customerEmail, 160),
    customerPhone: text(project.customerPhone, 30),
    address: text(project.address, 500),
    status: text(project.status, 50),
    statusHistory: sanitizeStatusHistory(project.statusHistory),
    panelCount: Math.max(0, Math.ceil(numberValue(project.panelCount))),
    panel: publicPanel,
    inverter: publicInverter,
    battery: publicBattery(project.battery),
    quotedPrice,
    finalPrice: project.finalPrice == null ? null : Math.max(0, numberValue(project.finalPrice)),
    advancePercentage: Math.max(0, numberValue(project.advancePercentage)),
    advanceAmount: project.advanceAmount == null ? null : Math.max(0, numberValue(project.advanceAmount)),
    balanceAmount: project.balanceAmount == null ? null : Math.max(0, numberValue(project.balanceAmount)),
    amountPaid,
    amountDue: project.amountDue == null ? Math.max(0, quotedPrice - amountPaid) : Math.max(0, numberValue(project.amountDue)),
    paymentStatus: text(project.paymentStatus, 50),
    paymentHistory: sanitizePaymentHistory(project.paymentHistory),
    createdAt: project.createdAt || null,
    updatedAt: project.updatedAt || null,
    quoteSentDate: project.quoteSentDate || null,
    approvalDate: project.approvalDate || null,
    installationScheduledDate: project.installationScheduledDate || null,
    installationStartDate: project.installationStartDate || null,
    completionDate: project.completionDate || null,
    customerNotes: text(project.customerNotes, 1000),
    sitePhotos: Array.isArray(project.sitePhotos) ? project.sitePhotos.slice(0, 20).map(value => text(value, 1000)) : [],
    customerSignoff: Boolean(project.customerSignoff),
    completionNotes: text(project.completionNotes, 2000)
  };
}

function mergeProjectOperations(project, operations) {
  return {
    ...project,
    ...(operations || {}),
    id: project.id || operations?.id,
    projectId: project.projectId || operations?.projectId || project.id || operations?.id
  };
}

module.exports = {
  mergeProjectOperations,
  publicBattery,
  publicEquipment,
  sanitizeCustomerProject
};
