import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Transaction, LineItem, Contact, Company, SalesTax } from '@shared/schema';
import { format } from 'date-fns';

interface InvoicePDFData {
  transaction: Transaction;
  lineItems: LineItem[];
  customer: Contact | null;
  company: Company;
  salesTaxes?: SalesTax[];
}

export async function generateInvoicePDF(data: InvoicePDFData): Promise<Buffer> {
  const { transaction, lineItems, customer, company } = data;
  
  // Create PDF document
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Define colors
  const primaryColor: [number, number, number] = [59, 130, 246]; // blue-600
  const textColor: [number, number, number] = [31, 41, 55]; // gray-800
  const lightGray: [number, number, number] = [243, 244, 246]; // gray-100
  const borderColor: [number, number, number] = [229, 231, 235]; // gray-200

  // Page dimensions
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;

  // Helper to add formatted text
  let yPosition = margin;

  // Company Logo and Header
  doc.setFontSize(24);
  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.text(company.name || 'Company Name', margin, yPosition);
  yPosition += 10;

  // Company Details
  doc.setFontSize(9);
  doc.setTextColor(...textColor);
  doc.setFont('helvetica', 'normal');
  if (company.street1) doc.text(company.street1, margin, yPosition), yPosition += 4;
  if (company.street2) doc.text(company.street2, margin, yPosition), yPosition += 4;
  if (company.city || company.state || company.postalCode) {
    const cityLine = [company.city, company.state, company.postalCode].filter(Boolean).join(', ');
    doc.text(cityLine, margin, yPosition);
    yPosition += 4;
  }
  if (company.country) doc.text(company.country, margin, yPosition), yPosition += 4;
  if (company.phone) doc.text(`Phone: ${company.phone}`, margin, yPosition), yPosition += 4;
  if (company.email) doc.text(`Email: ${company.email}`, margin, yPosition), yPosition += 4;

  // Invoice Title
  yPosition = margin;
  doc.setFontSize(28);
  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE', pageWidth - margin, yPosition, { align: 'right' });
  yPosition += 12;

  // Invoice Details (Right side)
  doc.setFontSize(10);
  doc.setTextColor(...textColor);
  doc.setFont('helvetica', 'bold');
  doc.text('Invoice #:', pageWidth - 60, yPosition);
  doc.setFont('helvetica', 'normal');
  doc.text(transaction.reference || 'N/A', pageWidth - margin, yPosition, { align: 'right' });
  yPosition += 6;

  doc.setFont('helvetica', 'bold');
  doc.text('Date:', pageWidth - 60, yPosition);
  doc.setFont('helvetica', 'normal');
  doc.text(format(new Date(transaction.date), 'MMM dd, yyyy'), pageWidth - margin, yPosition, { align: 'right' });
  yPosition += 6;

  if (transaction.dueDate) {
    doc.setFont('helvetica', 'bold');
    doc.text('Due Date:', pageWidth - 60, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(format(new Date(transaction.dueDate), 'MMM dd, yyyy'), pageWidth - margin, yPosition, { align: 'right' });
    yPosition += 6;
  }

  // Status badge
  const status = transaction.status || 'open';
  const statusText = status.charAt(0).toUpperCase() + status.slice(1);
  doc.setFont('helvetica', 'bold');
  doc.text('Status:', pageWidth - 60, yPosition);
  
  // Status with color
  if (status === 'paid' || status === 'completed') {
    doc.setTextColor(22, 163, 74); // green
  } else if (status === 'overdue') {
    doc.setTextColor(220, 38, 38); // red
  } else {
    doc.setTextColor(234, 179, 8); // yellow/amber
  }
  doc.text(statusText, pageWidth - margin, yPosition, { align: 'right' });
  doc.setTextColor(...textColor);

  // Bill To Section
  yPosition += 15;
  doc.setFillColor(...lightGray);
  doc.rect(margin, yPosition - 4, 80, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('BILL TO:', margin + 2, yPosition);
  yPosition += 6;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  if (customer) {
    doc.setFont('helvetica', 'bold');
    doc.text(customer.name, margin + 2, yPosition);
    yPosition += 5;
    doc.setFont('helvetica', 'normal');
    
    if (customer.contactName) {
      doc.text(customer.contactName, margin + 2, yPosition);
      yPosition += 5;
    }
    if (customer.address) {
      const addressLines = customer.address.split('\n');
      addressLines.forEach(line => {
        doc.text(line, margin + 2, yPosition);
        yPosition += 5;
      });
    }
    if (customer.email) {
      doc.text(customer.email, margin + 2, yPosition);
      yPosition += 5;
    }
    if (customer.phone) {
      doc.text(customer.phone, margin + 2, yPosition);
      yPosition += 5;
    }
  } else {
    doc.text('No customer specified', margin + 2, yPosition);
    yPosition += 5;
  }

  // Line Items Table
  yPosition += 10;

  // Prepare table data
  const tableData = lineItems.map(item => [
    item.description,
    item.quantity.toString(),
    `$${item.unitPrice.toFixed(2)}`,
    `$${item.amount.toFixed(2)}`
  ]);

  // Generate table
  autoTable(doc, {
    startY: yPosition,
    head: [['Description', 'Quantity', 'Unit Price', 'Amount']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontSize: 10,
      fontStyle: 'bold',
      halign: 'left'
    },
    bodyStyles: {
      fontSize: 9,
      textColor: textColor
    },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { halign: 'center', cellWidth: 25 },
      2: { halign: 'right', cellWidth: 30 },
      3: { halign: 'right', cellWidth: 30 }
    },
    margin: { left: margin, right: margin },
    didDrawPage: (data) => {
      // Add page numbers on every page
      const pageCount = doc.getNumberOfPages();
      const currentPage = doc.getCurrentPageInfo().pageNumber;
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(
        `Page ${currentPage} of ${pageCount}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }
  });

  // Get position after table
  yPosition = (doc as any).lastAutoTable.finalY + 10;

  // Totals Section (Right aligned)
  const totalsX = pageWidth - margin - 60;
  const labelX = totalsX - 2;
  const valueX = pageWidth - margin;

  // Subtotal
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Subtotal:', labelX, yPosition, { align: 'right' });
  doc.text(`$${(transaction.subTotal || 0).toFixed(2)}`, valueX, yPosition, { align: 'right' });
  yPosition += 6;

  // Tax
  if (transaction.taxAmount && transaction.taxAmount > 0) {
    doc.text('Tax:', labelX, yPosition, { align: 'right' });
    doc.text(`$${transaction.taxAmount.toFixed(2)}`, valueX, yPosition, { align: 'right' });
    yPosition += 6;
  }

  // Draw line above total
  doc.setLineWidth(0.5);
  doc.setDrawColor(...borderColor);
  doc.line(totalsX, yPosition - 2, valueX, yPosition - 2);
  yPosition += 2;

  // Total
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Total:', labelX, yPosition, { align: 'right' });
  doc.text(`$${(transaction.amount || 0).toFixed(2)}`, valueX, yPosition, { align: 'right' });
  yPosition += 8;

  // Amount Paid
  if (transaction.balance !== undefined && transaction.balance !== transaction.amount) {
    const amountPaid = (transaction.amount || 0) - (transaction.balance || 0);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Amount Paid:', labelX, yPosition, { align: 'right' });
    doc.text(`$${amountPaid.toFixed(2)}`, valueX, yPosition, { align: 'right' });
    yPosition += 6;
  }

  // Balance Due
  if (transaction.balance !== undefined && transaction.balance > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...primaryColor);
    doc.text('Balance Due:', labelX, yPosition, { align: 'right' });
    doc.text(`$${transaction.balance.toFixed(2)}`, valueX, yPosition, { align: 'right' });
    doc.setTextColor(...textColor);
    yPosition += 8;
  }

  // Notes/Description
  if (transaction.description) {
    yPosition += 10;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Notes:', margin, yPosition);
    yPosition += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const splitDescription = doc.splitTextToSize(transaction.description, pageWidth - (2 * margin));
    doc.text(splitDescription, margin, yPosition);
    yPosition += (splitDescription.length * 4);
  }

  // Payment Terms
  if (transaction.paymentTerms) {
    yPosition += 5;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Payment Terms:', margin, yPosition);
    yPosition += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(transaction.paymentTerms, margin, yPosition);
  }

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 20;
  doc.setFontSize(9);
  doc.setTextColor(128, 128, 128);
  doc.setFont('helvetica', 'italic');
  doc.text('Thank you for your business!', pageWidth / 2, footerY, { align: 'center' });

  // Convert to buffer
  const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
  return pdfBuffer;
}
