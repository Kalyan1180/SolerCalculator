// src/utils/invoiceGenerator.js
// Generate quotations and invoices

/**
 * Generate quotation data for PDF
 */
export function generateQuotationData(project) {
  return {
    quotationNumber: project.projectId,
    date: new Date().toLocaleDateString('en-IN'),
    customer: {
      name: project.customerName,
      email: project.customerEmail,
      phone: project.customerPhone,
      address: project.address
    },
    items: [
      {
        description: `Solar Panels (${project.panelCount} pieces)`,
        quantity: project.panelCount,
        unitPrice: 15000,
        total: project.panelCount * 15000
      },
      {
        description: `${project.inverter?.name || 'Inverter'}`,
        quantity: 1,
        unitPrice: project.inverter?.cost || 0,
        total: project.inverter?.cost || 0
      },
      {
        description: `${project.battery?.selectedBattery?.name || 'Battery'} (${project.battery?.quantity || 0} units)`,
        quantity: project.battery?.quantity || 1,
        unitPrice: project.battery?.selectedBattery?.price || 0,
        total: (project.battery?.quantity || 1) * (project.battery?.selectedBattery?.price || 0)
      }
    ],
    subtotal: project.materialCost || 0,
    laborCost: project.laborCost || 0,
    total: project.quotedPrice || 0,
    terms: `This quotation is valid for 7 days.\nAdvance Payment: 50% upon order confirmation.\nBalance Payment: 50% upon completion.`,
    notes: project.adminNotes || 'Thank you for choosing ANT Solar!'
  };
}

/**
 * Generate invoice data for PDF
 */
export function generateInvoiceData(project) {
  return {
    invoiceNumber: `INV-${project.projectId}`,
    date: new Date().toLocaleDateString('en-IN'),
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN'),
    customer: {
      name: project.customerName,
      email: project.customerEmail,
      phone: project.customerPhone,
      address: project.address
    },
    items: [
      {
        description: `Solar Panel Installation (${project.panelCount} pieces)`,
        quantity: project.panelCount,
        unitPrice: 15000,
        total: project.panelCount * 15000
      },
      {
        description: `${project.inverter?.name || 'Inverter'}`,
        quantity: 1,
        unitPrice: project.inverter?.cost || 0,
        total: project.inverter?.cost || 0
      },
      {
        description: `Battery Bank - ${project.battery?.selectedBattery?.name || 'Battery'} (${project.battery?.quantity || 0} units)`,
        quantity: project.battery?.quantity || 1,
        unitPrice: project.battery?.selectedBattery?.price || 0,
        total: (project.battery?.quantity || 1) * (project.battery?.selectedBattery?.price || 0)
      },
      {
        description: 'Installation & Labor',
        quantity: 1,
        unitPrice: project.laborCost || 0,
        total: project.laborCost || 0
      }
    ],
    subtotal: project.materialCost + (project.laborCost || 0),
    tax: 0,
    total: project.quotedPrice || 0,
    paidAmount: project.advanceAmount || 0,
    dueAmount: project.balanceAmount || 0,
    bankDetails: `Bank: XYZ Bank\nAccount: 1234567890\nIFSC: XYZB0001234`,
    terms: 'Payment Terms: Due within 7 days of invoice date. Late payment may incur interest.',
    notes: 'Thank you for your business!'
  };
}

/**
 * Format currency for invoices
 */
export function formatCurrencyForInvoice(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2
  }).format(value);
}
