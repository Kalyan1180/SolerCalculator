// src/utils/pdfGenerator.js
import jsPDF from 'jspdf';

const PAGE_MARGIN = 18;
const LINE_HEIGHT = 6;

function numberValue(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(numberValue(value));
}

function textValue(value, fallback = 'N/A') {
  if (value === null || value === undefined || value === '') return fallback;
  return String(value);
}

function safeFilePart(value) {
  return textValue(value, 'project').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80);
}

function addPageIfNeeded(doc, yPosition, requiredHeight = 20) {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (yPosition + requiredHeight <= pageHeight - PAGE_MARGIN) return yPosition;
  doc.addPage();
  return PAGE_MARGIN;
}

function drawHeader(doc, title) {
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPosition = PAGE_MARGIN;
  doc.setTextColor(0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('ANT SOLAR', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(90);
  doc.text('Professional Solar Solutions', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(0);
  doc.text(title, pageWidth / 2, yPosition, { align: 'center' });
  return yPosition + 10;
}

function drawLabelValue(doc, label, value, yPosition) {
  const pageWidth = doc.internal.pageSize.getWidth();
  yPosition = addPageIfNeeded(doc, yPosition, LINE_HEIGHT + 2);
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.text(label, PAGE_MARGIN, yPosition);
  doc.setFont('helvetica', 'normal');
  const availableWidth = pageWidth - (PAGE_MARGIN * 2) - 48;
  const lines = doc.splitTextToSize(textValue(value), availableWidth);
  doc.text(lines, PAGE_MARGIN + 48, yPosition);
  return yPosition + Math.max(1, lines.length) * LINE_HEIGHT;
}

function drawSectionTitle(doc, title, yPosition) {
  yPosition = addPageIfNeeded(doc, yPosition, 12);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(title, PAGE_MARGIN, yPosition);
  doc.setDrawColor(190);
  doc.line(PAGE_MARGIN, yPosition + 2, doc.internal.pageSize.getWidth() - PAGE_MARGIN, yPosition + 2);
  return yPosition + 8;
}

function drawTwoColumnTable(doc, rows, yPosition) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const tableWidth = pageWidth - (PAGE_MARGIN * 2);
  const amountWidth = 55;
  const descriptionWidth = tableWidth - amountWidth;
  const rowHeight = 8;

  rows.forEach((row, index) => {
    yPosition = addPageIfNeeded(doc, yPosition, rowHeight + 2);
    const isTotal = index === rows.length - 1;
    doc.setFillColor(isTotal ? 230 : (index % 2 === 0 ? 248 : 255));
    doc.rect(PAGE_MARGIN, yPosition - 5.5, tableWidth, rowHeight, 'F');
    doc.setDrawColor(220);
    doc.rect(PAGE_MARGIN, yPosition - 5.5, tableWidth, rowHeight);
    doc.line(PAGE_MARGIN + descriptionWidth, yPosition - 5.5, PAGE_MARGIN + descriptionWidth, yPosition + 2.5);
    doc.setFont('helvetica', isTotal ? 'bold' : 'normal');
    doc.setFontSize(9);
    doc.text(textValue(row[0]), PAGE_MARGIN + 2, yPosition);
    doc.text(textValue(row[1]), pageWidth - PAGE_MARGIN - 2, yPosition, { align: 'right' });
    yPosition += rowHeight;
  });

  return yPosition + 3;
}

function drawFourColumnTable(doc, rows, yPosition) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const tableWidth = pageWidth - (PAGE_MARGIN * 2);
  const widths = [86, 20, 31, tableWidth - 137];
  const headers = ['Description', 'Qty', 'Unit Price', 'Total'];
  const rowHeight = 9;

  const drawRow = (values, header = false) => {
    yPosition = addPageIfNeeded(doc, yPosition, rowHeight + 2);
    doc.setFillColor(header ? 225 : 250);
    doc.rect(PAGE_MARGIN, yPosition - 6, tableWidth, rowHeight, 'F');
    doc.setDrawColor(210);
    doc.rect(PAGE_MARGIN, yPosition - 6, tableWidth, rowHeight);

    let x = PAGE_MARGIN;
    values.forEach((value, index) => {
      if (index > 0) doc.line(x, yPosition - 6, x, yPosition + 3);
      doc.setFont('helvetica', header ? 'bold' : 'normal');
      doc.setFontSize(8.5);
      const align = index === 0 ? 'left' : 'right';
      const textX = align === 'left' ? x + 2 : x + widths[index] - 2;
      doc.text(textValue(value), textX, yPosition, { align });
      x += widths[index];
    });
    yPosition += rowHeight;
  };

  drawRow(headers, true);
  rows.forEach(row => drawRow(row));
  return yPosition + 3;
}

function addPageNumbers(doc) {
  const pageCount = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(130);
    doc.text(`Page ${page} of ${pageCount}`, pageWidth / 2, pageHeight - 8, { align: 'center' });
  }
}

export async function downloadQuotationPDF(project) {
  try {
    if (!project?.projectId) throw new Error('Project data is missing');
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    let yPosition = drawHeader(doc, 'QUOTATION');

    yPosition = drawLabelValue(doc, 'Quotation No.', project.projectId, yPosition);
    yPosition = drawLabelValue(doc, 'Date', new Date().toLocaleDateString('en-IN'), yPosition);
    yPosition = drawLabelValue(
      doc,
      'Valid Until',
      new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)).toLocaleDateString('en-IN'),
      yPosition
    );

    yPosition = drawSectionTitle(doc, 'CUSTOMER DETAILS', yPosition + 3);
    yPosition = drawLabelValue(doc, 'Name', project.customerName, yPosition);
    yPosition = drawLabelValue(doc, 'Email', project.customerEmail, yPosition);
    yPosition = drawLabelValue(doc, 'Phone', project.customerPhone, yPosition);
    yPosition = drawLabelValue(doc, 'Address', project.address, yPosition);

    yPosition = drawSectionTitle(doc, 'SYSTEM DETAILS', yPosition + 3);
    yPosition = drawLabelValue(doc, 'Solar Panels', `${numberValue(project.panelCount)} unit(s)`, yPosition);
    yPosition = drawLabelValue(doc, 'Inverter', project.inverter?.name, yPosition);
    yPosition = drawLabelValue(
      doc,
      'Battery',
      project.battery?.selectedBattery
        ? `${project.battery.selectedBattery.name} - ${numberValue(project.battery.quantity)} unit(s)`
        : 'Not required',
      yPosition
    );

    yPosition = drawSectionTitle(doc, 'COST BREAKDOWN', yPosition + 3);
    yPosition = drawTwoColumnTable(doc, [
      ['Equipment/material', `Rs. ${formatCurrency(project.materialCost)}`],
      ['Installation/labour', `Rs. ${formatCurrency(project.laborCost)}`],
      ['Cost before profit', `Rs. ${formatCurrency(project.totalCostWithoutMarkup)}`],
      ['QUOTED PRICE', `Rs. ${formatCurrency(project.quotedPrice)}`]
    ], yPosition);

    yPosition = drawSectionTitle(doc, 'TERMS AND CONDITIONS', yPosition + 3);
    const terms = [
      'This quotation is valid for seven days from the date shown above.',
      'A 50% advance payment is required before installation scheduling.',
      'The final specification and price remain subject to site-survey confirmation.'
    ];
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    terms.forEach((term, index) => {
      yPosition = addPageIfNeeded(doc, yPosition, 8);
      const lines = doc.splitTextToSize(`${index + 1}. ${term}`, doc.internal.pageSize.getWidth() - (PAGE_MARGIN * 2));
      doc.text(lines, PAGE_MARGIN, yPosition);
      yPosition += lines.length * LINE_HEIGHT;
    });

    if (project.adminNotes) {
      yPosition = drawSectionTitle(doc, 'NOTES', yPosition + 3);
      const lines = doc.splitTextToSize(textValue(project.adminNotes), doc.internal.pageSize.getWidth() - (PAGE_MARGIN * 2));
      yPosition = addPageIfNeeded(doc, yPosition, lines.length * LINE_HEIGHT);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(lines, PAGE_MARGIN, yPosition);
    }

    addPageNumbers(doc);
    doc.save(`Quotation_${safeFilePart(project.projectId)}.pdf`);
    return { success: true };
  } catch (error) {
    console.error('Error generating quotation PDF:', error);
    return { success: false, error: error.message };
  }
}

export async function downloadInvoicePDF(project) {
  try {
    if (!project?.projectId) throw new Error('Project data is missing');
    if (!project.approvalDate || numberValue(project.quotedPrice) <= 0) {
      throw new Error('Approve the quotation before generating an invoice');
    }

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    let yPosition = drawHeader(doc, 'INVOICE');

    yPosition = drawLabelValue(doc, 'Invoice No.', `INV-${project.projectId}`, yPosition);
    yPosition = drawLabelValue(doc, 'Date', new Date().toLocaleDateString('en-IN'), yPosition);
    yPosition = drawLabelValue(doc, 'Customer', project.customerName, yPosition);
    yPosition = drawLabelValue(doc, 'Email', project.customerEmail, yPosition);
    yPosition = drawLabelValue(doc, 'Phone', project.customerPhone, yPosition);
    yPosition = drawLabelValue(doc, 'Address', project.address, yPosition);

    const panelCount = numberValue(project.panelCount);
    const inverterName = project.inverter?.name || 'Inverter';
    const batteryName = project.battery?.selectedBattery?.name;
    const batteryQuantity = numberValue(project.battery?.quantity);
    const equipmentDescription = batteryName
      ? `${panelCount} solar panel(s), ${inverterName}, ${batteryQuantity} x ${batteryName}`
      : `${panelCount} solar panel(s) and ${inverterName}`;
    const rows = [
      ['Solar equipment/material package', 1, `Rs. ${formatCurrency(project.materialCost)}`, `Rs. ${formatCurrency(project.materialCost)}`],
      [equipmentDescription, 1, 'Included', 'Included'],
      ['Installation and labour', 1, `Rs. ${formatCurrency(project.laborCost)}`, `Rs. ${formatCurrency(project.laborCost)}`]
    ];

    yPosition = drawSectionTitle(doc, 'INVOICE ITEMS', yPosition + 3);
    yPosition = drawFourColumnTable(doc, rows, yPosition);
    yPosition = drawSectionTitle(doc, 'PAYMENT SUMMARY', yPosition + 3);
    drawTwoColumnTable(doc, [
      ['Total invoice amount', `Rs. ${formatCurrency(project.quotedPrice)}`],
      ['Advance amount', `Rs. ${formatCurrency(project.advanceAmount)}`],
      ['Balance amount', `Rs. ${formatCurrency(project.balanceAmount)}`]
    ], yPosition);

    addPageNumbers(doc);
    doc.save(`Invoice_${safeFilePart(project.projectId)}.pdf`);
    return { success: true };
  } catch (error) {
    console.error('Error generating invoice PDF:', error);
    return { success: false, error: error.message };
  }
}
