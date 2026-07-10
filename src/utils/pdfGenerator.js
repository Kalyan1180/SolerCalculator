// src/utils/pdfGenerator.js
// PDF export functionality for quotations and invoices

import jsPDF from 'jspdf';
import html2pdf from 'html2pdf.js';

/**
 * Generate and download quotation PDF
 */
export async function downloadQuotationPDF(project) {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPosition = 20;

    // Header
    doc.setFontSize(24);
    doc.text('ANT SOLAR', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text('Professional Solar Solutions', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 8;

    // Title
    doc.setFontSize(16);
    doc.setTextColor(0);
    doc.text('QUOTATION', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 12;

    // Quotation Details
    doc.setFontSize(10);
    doc.text(`Quotation #: ${project.projectId}`, 20, yPosition);
    yPosition += 7;
    doc.text(`Date: ${new Date().toLocaleDateString('en-IN')}`, 20, yPosition);
    yPosition += 7;
    doc.text(`Valid Till: ${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN')}`, 20, yPosition);
    yPosition += 12;

    // Customer Details
    doc.setFontSize(11);
    doc.text('CUSTOMER DETAILS:', 20, yPosition);
    yPosition += 7;
    doc.setFontSize(10);
    doc.text(`Name: ${project.customerName}`, 20, yPosition);
    yPosition += 6;
    doc.text(`Email: ${project.customerEmail}`, 20, yPosition);
    yPosition += 6;
    doc.text(`Phone: ${project.customerPhone}`, 20, yPosition);
    yPosition += 6;
    doc.text(`Address: ${project.address}`, 20, yPosition);
    yPosition += 12;

    // Solar Specifications
    doc.setFontSize(11);
    doc.text('SOLAR SPECIFICATIONS:', 20, yPosition);
    yPosition += 7;
    doc.setFontSize(10);
    doc.text(`Solar Panels: ${project.panelCount} pieces @ ₹15,000 each`, 20, yPosition);
    yPosition += 6;
    doc.text(`Inverter: ${project.inverter?.name || 'N/A'}`, 20, yPosition);
    yPosition += 6;
    doc.text(`Battery: ${project.battery?.selectedBattery?.name || 'N/A'} (${project.battery?.quantity || 0} units)`, 20, yPosition);
    yPosition += 12;

    // Cost Breakdown Table
    doc.setFontSize(11);
    doc.text('COST BREAKDOWN:', 20, yPosition);
    yPosition += 8;

    const columns = ['Description', 'Amount'];
    const rows = [
      ['Material Cost', `₹${formatCurrency(project.materialCost)}`],
      ['Labor Cost', `₹${formatCurrency(project.laborCost)}`],
      ['Total Cost', `₹${formatCurrency(project.materialCost + project.laborCost)}`],
      ['Markup/Profit', `₹${formatCurrency(project.quotedPrice - project.materialCost - project.laborCost)}`],
      ['QUOTED PRICE', `₹${formatCurrency(project.quotedPrice)}`]
    ];

    doc.autoTable({
      head: [columns],
      body: rows,
      startY: yPosition,
      columnStyles: {
        0: { cellWidth: 100 },
        1: { cellWidth: 60, halign: 'right' }
      },
      didDrawPage: function (data) {
        // Footer
        const pageCount = doc.internal.getPages().length;
        const pageSize = doc.internal.pageSize;
        const pageHeight = pageSize.getHeight();
        const pageWidth = pageSize.getWidth();
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(
          `Page ${data.pageNumber} of ${pageCount}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
      }
    });

    yPosition = doc.lastAutoTable.finalY + 15;

    // Terms & Conditions
    doc.setFontSize(10);
    doc.text('TERMS & CONDITIONS:', 20, yPosition);
    yPosition += 7;
    doc.setFontSize(9);
    const termsText = 'This quotation is valid for 7 days. Advance payment of 50% is required to confirm the order. Installation will commence after advance payment receipt.';
    const wrappedTerms = doc.splitTextToSize(termsText, pageWidth - 40);
    doc.text(wrappedTerms, 20, yPosition);
    yPosition += wrappedTerms.length * 5 + 5;

    // Notes
    if (project.adminNotes) {
      doc.setFontSize(10);
      doc.text('NOTES:', 20, yPosition);
      yPosition += 7;
      doc.setFontSize(9);
      const wrappedNotes = doc.splitTextToSize(project.adminNotes, pageWidth - 40);
      doc.text(wrappedNotes, 20, yPosition);
    }

    // Save the PDF
    doc.save(`Quotation_${project.projectId}.pdf`);
    return { success: true };
  } catch (error) {
    console.error('Error generating quotation PDF:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Generate and download invoice PDF
 */
export async function downloadInvoicePDF(project) {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    let yPosition = 20;

    // Header
    doc.setFontSize(24);
    doc.text('ANT SOLAR', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text('Professional Solar Solutions', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 8;

    // Title
    doc.setFontSize(16);
    doc.setTextColor(0);
    doc.text('INVOICE', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 12;

    // Invoice Details
    doc.setFontSize(10);
    doc.text(`Invoice #: INV-${project.projectId}`, 20, yPosition);
    yPosition += 7;
    doc.text(`Date: ${new Date().toLocaleDateString('en-IN')}`, 20, yPosition);
    yPosition += 7;
    doc.text(`Due Date: ${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN')}`, 20, yPosition);
    yPosition += 12;

    // Customer Details
    doc.setFontSize(11);
    doc.text('BILL TO:', 20, yPosition);
    yPosition += 7;
    doc.setFontSize(10);
    doc.text(`${project.customerName}`, 20, yPosition);
    yPosition += 6;
    doc.text(`${project.customerEmail}`, 20, yPosition);
    yPosition += 6;
    doc.text(`${project.customerPhone}`, 20, yPosition);
    yPosition += 6;
    doc.text(`${project.address}`, 20, yPosition);
    yPosition += 12;

    // Invoice Items Table
    const columns = ['Description', 'Qty', 'Unit Price', 'Total'];
    const rows = [
      ['Solar Panels Installation', project.panelCount, '₹15,000', `₹${formatCurrency(project.panelCount * 15000)}`],
      [project.inverter?.name || 'Inverter', '1', `₹${formatCurrency(project.inverter?.cost || 0)}`, `₹${formatCurrency(project.inverter?.cost || 0)}`],
      [project.battery?.selectedBattery?.name || 'Battery', project.battery?.quantity || 1, `₹${formatCurrency(project.battery?.selectedBattery?.price || 0)}`, `₹${formatCurrency((project.battery?.quantity || 1) * (project.battery?.selectedBattery?.price || 0))}`],
      ['Installation & Labor', '1', `₹${formatCurrency(project.laborCost || 0)}`, `₹${formatCurrency(project.laborCost || 0)}`]
    ];

    doc.autoTable({
      head: [columns],
      body: rows,
      startY: yPosition,
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 20, halign: 'center' },
        2: { cellWidth: 30, halign: 'right' },
        3: { cellWidth: 30, halign: 'right' }
      }
    });

    yPosition = doc.lastAutoTable.finalY + 10;

    // Summary
    doc.setFontSize(11);
    doc.text('SUMMARY:', 20, yPosition);
    yPosition += 8;

    const summary = [
      [`Subtotal:`, `₹${formatCurrency(project.materialCost + project.laborCost)}`],
      [`Total:`, `₹${formatCurrency(project.quotedPrice)}`],
      [`Advance Paid:`, `₹${formatCurrency(project.advanceAmount || 0)}`],
      [`Balance Due:`, `₹${formatCurrency(project.balanceAmount || 0)}`]
    ];

    doc.setFontSize(10);
    summary.forEach((row, index) => {
      const isBold = index === 1 || index === 3;
      if (isBold) doc.setFont(undefined, 'bold');
      doc.text(row[0], 20, yPosition);
      doc.text(row[1], pageWidth - 30, yPosition, { align: 'right' });
      doc.setFont(undefined, 'normal');
      yPosition += 7;
    });

    yPosition += 5;
    doc.text('Thank you for your business!', pageWidth / 2, yPosition, { align: 'center' });

    // Save the PDF
    doc.save(`Invoice_${project.projectId}.pdf`);
    return { success: true };
  } catch (error) {
    console.error('Error generating invoice PDF:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Format currency helper
 */
function formatCurrency(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'decimal',
    maximumFractionDigits: 0
  }).format(value);
}
