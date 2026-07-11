// src/utils/pdfGenerator.js
// Small dependency-free PDF generator for quotations and invoices.

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const LEFT_MARGIN = 50;
const TOP_POSITION = 790;
const LINE_HEIGHT = 14;
const LINES_PER_PAGE = 48;

function ascii(value) {
  return String(value ?? '')
    .replace(/₹/g, 'INR ')
    .replace(/[–—]/g, '-')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapePdfText(value) {
  return ascii(value)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function money(value) {
  const number = Number(value);
  const safeValue = Number.isFinite(number) ? number : 0;
  return `INR ${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(safeValue)}`;
}

function wrapLine(value, maxCharacters = 82) {
  const text = ascii(value);
  if (!text) return [''];

  const words = text.split(' ');
  const lines = [];
  let line = '';

  words.forEach((word) => {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length <= maxCharacters) {
      line = candidate;
    } else {
      if (line) lines.push(line);
      line = word.length > maxCharacters ? word.slice(0, maxCharacters) : word;
    }
  });

  if (line) lines.push(line);
  return lines;
}

function expandLines(lines) {
  return lines.flatMap((line) => wrapLine(line));
}

function buildPdf(lines) {
  const expandedLines = expandLines(lines);
  const pages = [];
  for (let index = 0; index < expandedLines.length; index += LINES_PER_PAGE) {
    pages.push(expandedLines.slice(index, index + LINES_PER_PAGE));
  }
  if (!pages.length) pages.push(['']);

  const objectCount = 3 + pages.length * 2;
  const fontObjectId = objectCount;
  const objects = new Array(objectCount + 1);
  const pageReferences = [];

  pages.forEach((pageLines, pageIndex) => {
    const pageObjectId = 3 + pageIndex * 2;
    const contentObjectId = pageObjectId + 1;
    pageReferences.push(`${pageObjectId} 0 R`);

    const commands = [
      'BT',
      '/F1 10 Tf',
      `${LEFT_MARGIN} ${TOP_POSITION} Td`,
      `${LINE_HEIGHT} TL`,
      ...pageLines.map((line) => `(${escapePdfText(line)}) Tj T*`),
      'ET'
    ].join('\n');

    objects[pageObjectId] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] ` +
      `/Resources << /Font << /F1 ${fontObjectId} 0 R >> >> /Contents ${contentObjectId} 0 R >>`;
    objects[contentObjectId] = `<< /Length ${commands.length} >>\nstream\n${commands}\nendstream`;
  });

  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[2] = `<< /Type /Pages /Kids [${pageReferences.join(' ')}] /Count ${pages.length} >>`;
  objects[fontObjectId] = '<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>';

  let pdf = '%PDF-1.4\n';
  const offsets = new Array(objectCount + 1).fill(0);

  for (let objectId = 1; objectId <= objectCount; objectId += 1) {
    offsets[objectId] = pdf.length;
    pdf += `${objectId} 0 obj\n${objects[objectId]}\nendobj\n`;
  }

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objectCount + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let objectId = 1; objectId <= objectCount; objectId += 1) {
    pdf += `${String(offsets[objectId]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objectCount + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return pdf;
}

function downloadPdf(filename, lines) {
  const blob = new Blob([buildPdf(lines)], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function projectId(project) {
  return ascii(project?.projectId || project?.id || 'PROJECT');
}

function customerLines(project) {
  return [
    'CUSTOMER DETAILS',
    `Name: ${project?.customerName || 'N/A'}`,
    `Email: ${project?.customerEmail || 'N/A'}`,
    `Phone: ${project?.customerPhone || 'N/A'}`,
    `Address: ${project?.address || 'N/A'}`
  ];
}

function specificationLines(project) {
  return [
    'SOLAR SPECIFICATIONS',
    `Solar panels: ${Number(project?.panelCount) || 0}`,
    `Inverter: ${project?.inverter?.name || 'N/A'}`,
    `Battery: ${project?.battery?.selectedBattery?.name || 'N/A'}`,
    `Battery quantity: ${Number(project?.battery?.quantity) || 0}`
  ];
}

export async function downloadQuotationPDF(project) {
  try {
    if (!project) throw new Error('Project data is required.');

    const materialCost = Number(project.materialCost) || 0;
    const laborCost = Number(project.laborCost) || 0;
    const quotedPrice = Number(project.finalPrice || project.quotedPrice) || 0;
    const issueDate = new Date();
    const validUntil = new Date(issueDate.getTime() + 7 * 24 * 60 * 60 * 1000);

    const lines = [
      'ANT SOLAR',
      'Professional Solar Solutions',
      '',
      'QUOTATION',
      `Quotation number: ${projectId(project)}`,
      `Date: ${issueDate.toLocaleDateString('en-IN')}`,
      `Valid until: ${validUntil.toLocaleDateString('en-IN')}`,
      '',
      ...customerLines(project),
      '',
      ...specificationLines(project),
      '',
      'COST BREAKDOWN',
      `Material cost: ${money(materialCost)}`,
      `Installation and labor: ${money(laborCost)}`,
      `Total internal cost: ${money(materialCost + laborCost)}`,
      `Markup / margin: ${money(quotedPrice - materialCost - laborCost)}`,
      `QUOTED PRICE: ${money(quotedPrice)}`,
      '',
      'TERMS AND CONDITIONS',
      'This quotation is valid for 7 days. A 50 percent advance payment is required to confirm the order. Installation dates are confirmed after site verification and receipt of advance payment.'
    ];

    if (project.adminNotes) {
      lines.push('', 'NOTES', project.adminNotes);
    }

    downloadPdf(`Quotation_${projectId(project)}.pdf`, lines);
    return { success: true };
  } catch (error) {
    console.error('Error generating quotation PDF:', error);
    return { success: false, error: error.message };
  }
}

export async function downloadInvoicePDF(project) {
  try {
    if (!project) throw new Error('Project data is required.');

    const total = Number(project.finalPrice || project.quotedPrice) || 0;
    const advanceAmount = Number(project.advanceAmount) || 0;
    const balanceAmount = Number(project.balanceAmount) || 0;
    const advancePaid = ['advance_paid', 'balance_paid'].includes(project.paymentStatus) ? advanceAmount : 0;
    const balancePaid = project.paymentStatus === 'balance_paid' ? balanceAmount : 0;
    const paid = advancePaid + balancePaid;
    const due = Math.max(0, total - paid);

    const lines = [
      'ANT SOLAR',
      'Professional Solar Solutions',
      '',
      'INVOICE',
      `Invoice number: INV-${projectId(project)}`,
      `Date: ${new Date().toLocaleDateString('en-IN')}`,
      '',
      ...customerLines(project),
      '',
      ...specificationLines(project),
      '',
      'INVOICE SUMMARY',
      `Material cost: ${money(project.materialCost)}`,
      `Installation and labor: ${money(project.laborCost)}`,
      `Invoice total: ${money(total)}`,
      `Amount paid: ${money(paid)}`,
      `BALANCE DUE: ${money(due)}`,
      `Payment status: ${project.paymentStatus || 'not_started'}`,
      `Payment method: ${project.paymentMethod || 'N/A'}`,
      '',
      'Thank you for choosing ANT Solar.'
    ];

    downloadPdf(`Invoice_${projectId(project)}.pdf`, lines);
    return { success: true };
  } catch (error) {
    console.error('Error generating invoice PDF:', error);
    return { success: false, error: error.message };
  }
}
