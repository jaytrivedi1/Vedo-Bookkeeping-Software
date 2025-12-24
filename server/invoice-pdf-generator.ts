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
  template?: 'classic' | 'modern' | 'minimal';
}

// Color schemes for different templates
const colorSchemes = {
  classic: {
    primary: [59, 130, 246] as [number, number, number],    // blue-600
    secondary: [37, 99, 235] as [number, number, number],   // blue-700
    accent: [243, 244, 246] as [number, number, number],    // gray-100
    text: [31, 41, 55] as [number, number, number],         // gray-800
    muted: [107, 114, 128] as [number, number, number],     // gray-500
    border: [229, 231, 235] as [number, number, number],    // gray-200
  },
  modern: {
    primary: [99, 102, 241] as [number, number, number],    // indigo-500
    secondary: [79, 70, 229] as [number, number, number],   // indigo-600
    accent: [238, 242, 255] as [number, number, number],    // indigo-50
    text: [17, 24, 39] as [number, number, number],         // gray-900
    muted: [107, 114, 128] as [number, number, number],     // gray-500
    border: [199, 210, 254] as [number, number, number],    // indigo-200
  },
  minimal: {
    primary: [0, 0, 0] as [number, number, number],         // black
    secondary: [64, 64, 64] as [number, number, number],    // gray
    accent: [250, 250, 250] as [number, number, number],    // near-white
    text: [38, 38, 38] as [number, number, number],         // dark gray
    muted: [115, 115, 115] as [number, number, number],     // medium gray
    border: [212, 212, 212] as [number, number, number],    // light gray
  }
};

export async function generateInvoicePDF(data: InvoicePDFData): Promise<Buffer> {
  const { transaction, lineItems, customer, company, template = 'classic' } = data;
  const colors = colorSchemes[template] || colorSchemes.classic;

  // Create PDF document
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;

  // Generate based on template
  switch (template) {
    case 'modern':
      generateModernTemplate(doc, { transaction, lineItems, customer, company, colors, pageWidth, pageHeight, margin });
      break;
    case 'minimal':
      generateMinimalTemplate(doc, { transaction, lineItems, customer, company, colors, pageWidth, pageHeight, margin });
      break;
    default:
      generateClassicTemplate(doc, { transaction, lineItems, customer, company, colors, pageWidth, pageHeight, margin });
  }

  // Convert to buffer
  const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
  return pdfBuffer;
}

interface TemplateParams {
  transaction: Transaction;
  lineItems: LineItem[];
  customer: Contact | null;
  company: Company;
  colors: typeof colorSchemes.classic;
  pageWidth: number;
  pageHeight: number;
  margin: number;
}

// ============ CLASSIC TEMPLATE ============
function generateClassicTemplate(doc: jsPDF, params: TemplateParams) {
  const { transaction, lineItems, customer, company, colors, pageWidth, margin } = params;
  let yPosition = margin;

  // Company Logo and Header
  doc.setFontSize(24);
  doc.setTextColor(...colors.primary);
  doc.setFont('helvetica', 'bold');
  doc.text(company.name || 'Company Name', margin, yPosition);
  yPosition += 10;

  // Company Details
  doc.setFontSize(9);
  doc.setTextColor(...colors.text);
  doc.setFont('helvetica', 'normal');
  if (company.street1) { doc.text(company.street1, margin, yPosition); yPosition += 4; }
  if (company.street2) { doc.text(company.street2, margin, yPosition); yPosition += 4; }
  if (company.city || company.state || company.postalCode) {
    const cityLine = [company.city, company.state, company.postalCode].filter(Boolean).join(', ');
    doc.text(cityLine, margin, yPosition);
    yPosition += 4;
  }
  if (company.country) { doc.text(company.country, margin, yPosition); yPosition += 4; }
  if (company.phone) { doc.text(`Phone: ${company.phone}`, margin, yPosition); yPosition += 4; }
  if (company.email) { doc.text(`Email: ${company.email}`, margin, yPosition); yPosition += 4; }

  // Invoice Title (Right side)
  yPosition = margin;
  doc.setFontSize(28);
  doc.setTextColor(...colors.primary);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE', pageWidth - margin, yPosition, { align: 'right' });
  yPosition += 12;

  // Invoice Details
  yPosition = renderInvoiceDetails(doc, transaction, colors, pageWidth, margin, yPosition);

  // Bill To Section
  yPosition += 15;
  doc.setFillColor(...colors.accent);
  doc.rect(margin, yPosition - 4, 80, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...colors.text);
  doc.text('BILL TO:', margin + 2, yPosition);
  yPosition += 6;

  yPosition = renderCustomerDetails(doc, customer, colors, margin, yPosition);

  // Line Items Table
  yPosition += 10;
  yPosition = renderLineItemsTable(doc, lineItems, colors, pageWidth, margin, yPosition);

  // Totals
  yPosition = renderTotals(doc, transaction, colors, pageWidth, margin, yPosition);

  // Notes & Terms
  yPosition = renderNotesAndTerms(doc, transaction, colors, pageWidth, margin, yPosition);

  // Footer
  renderFooter(doc, colors, pageWidth, params.pageHeight);
}

// ============ MODERN TEMPLATE ============
function generateModernTemplate(doc: jsPDF, params: TemplateParams) {
  const { transaction, lineItems, customer, company, colors, pageWidth, pageHeight, margin } = params;

  // Header band
  doc.setFillColor(...colors.primary);
  doc.rect(0, 0, pageWidth, 45, 'F');

  // Company name in header
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text(company.name || 'Company Name', margin, 20);

  // Invoice label
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text('INVOICE', margin, 32);

  // Invoice number in header (right)
  doc.setFontSize(12);
  doc.text(`#${transaction.reference || 'N/A'}`, pageWidth - margin, 20, { align: 'right' });
  doc.setFontSize(10);
  doc.text(format(new Date(transaction.date), 'MMMM dd, yyyy'), pageWidth - margin, 32, { align: 'right' });

  let yPosition = 60;

  // Two column layout for company and customer
  doc.setTextColor(...colors.text);

  // Left column - From
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colors.muted);
  doc.text('FROM', margin, yPosition);
  yPosition += 6;

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...colors.text);
  doc.setFontSize(10);
  doc.text(company.name || '', margin, yPosition);
  yPosition += 5;
  doc.setFontSize(9);
  if (company.street1) { doc.text(company.street1, margin, yPosition); yPosition += 4; }
  if (company.city || company.state) {
    doc.text([company.city, company.state, company.postalCode].filter(Boolean).join(', '), margin, yPosition);
    yPosition += 4;
  }
  if (company.email) { doc.text(company.email, margin, yPosition); yPosition += 4; }

  // Right column - Bill To
  let rightY = 60;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colors.muted);
  doc.text('BILL TO', pageWidth / 2 + 10, rightY);
  rightY += 6;

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...colors.text);
  if (customer) {
    doc.setFontSize(10);
    doc.text(customer.name, pageWidth / 2 + 10, rightY);
    rightY += 5;
    doc.setFontSize(9);
    if (customer.address) {
      const lines = customer.address.split('\n');
      lines.forEach(line => {
        doc.text(line, pageWidth / 2 + 10, rightY);
        rightY += 4;
      });
    }
    if (customer.email) { doc.text(customer.email, pageWidth / 2 + 10, rightY); rightY += 4; }
  }

  yPosition = Math.max(yPosition, rightY) + 15;

  // Due date highlight box
  if (transaction.dueDate) {
    doc.setFillColor(...colors.accent);
    doc.roundedRect(pageWidth - margin - 60, yPosition - 8, 60, 20, 3, 3, 'F');
    doc.setFontSize(8);
    doc.setTextColor(...colors.muted);
    doc.text('DUE DATE', pageWidth - margin - 55, yPosition - 2);
    doc.setFontSize(11);
    doc.setTextColor(...colors.primary);
    doc.setFont('helvetica', 'bold');
    doc.text(format(new Date(transaction.dueDate), 'MMM dd, yyyy'), pageWidth - margin - 55, yPosition + 6);
    doc.setFont('helvetica', 'normal');
  }

  yPosition += 20;

  // Line Items Table with modern styling
  const tableData = lineItems.map(item => [
    item.description,
    item.quantity.toString(),
    `$${item.unitPrice.toFixed(2)}`,
    `$${item.amount.toFixed(2)}`
  ]);

  autoTable(doc, {
    startY: yPosition,
    head: [['Description', 'Qty', 'Rate', 'Amount']],
    body: tableData,
    theme: 'plain',
    headStyles: {
      fillColor: colors.accent,
      textColor: colors.primary,
      fontSize: 9,
      fontStyle: 'bold',
      cellPadding: 4
    },
    bodyStyles: {
      fontSize: 9,
      textColor: colors.text,
      cellPadding: 4
    },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { halign: 'center', cellWidth: 20 },
      2: { halign: 'right', cellWidth: 30 },
      3: { halign: 'right', cellWidth: 30 }
    },
    margin: { left: margin, right: margin },
    alternateRowStyles: {
      fillColor: [250, 250, 255]
    }
  });

  yPosition = (doc as any).lastAutoTable.finalY + 15;

  // Totals with modern styling
  const totalsX = pageWidth - margin - 80;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...colors.text);
  doc.text('Subtotal', totalsX, yPosition);
  doc.text(`$${(transaction.subTotal || 0).toFixed(2)}`, pageWidth - margin, yPosition, { align: 'right' });
  yPosition += 7;

  if (transaction.taxAmount && transaction.taxAmount > 0) {
    doc.text('Tax', totalsX, yPosition);
    doc.text(`$${transaction.taxAmount.toFixed(2)}`, pageWidth - margin, yPosition, { align: 'right' });
    yPosition += 7;
  }

  // Total box
  doc.setFillColor(...colors.primary);
  doc.roundedRect(totalsX - 5, yPosition - 2, pageWidth - margin - totalsX + 10, 14, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('TOTAL', totalsX, yPosition + 7);
  doc.text(`$${(transaction.amount || 0).toFixed(2)}`, pageWidth - margin - 2, yPosition + 7, { align: 'right' });

  yPosition += 25;

  // Balance due if applicable
  if (transaction.balance !== undefined && transaction.balance > 0 && transaction.balance !== transaction.amount) {
    doc.setTextColor(...colors.text);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const amountPaid = (transaction.amount || 0) - (transaction.balance || 0);
    doc.text('Amount Paid', totalsX, yPosition);
    doc.text(`$${amountPaid.toFixed(2)}`, pageWidth - margin, yPosition, { align: 'right' });
    yPosition += 7;

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.primary);
    doc.text('Balance Due', totalsX, yPosition);
    doc.text(`$${transaction.balance.toFixed(2)}`, pageWidth - margin, yPosition, { align: 'right' });
  }

  // Notes
  if (transaction.description) {
    yPosition += 20;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.muted);
    doc.text('NOTES', margin, yPosition);
    yPosition += 5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...colors.text);
    const splitNotes = doc.splitTextToSize(transaction.description, pageWidth - (2 * margin));
    doc.text(splitNotes, margin, yPosition);
  }

  // Footer
  doc.setFontSize(9);
  doc.setTextColor(...colors.muted);
  doc.text('Thank you for your business!', pageWidth / 2, pageHeight - 15, { align: 'center' });
}

// ============ MINIMAL TEMPLATE ============
function generateMinimalTemplate(doc: jsPDF, params: TemplateParams) {
  const { transaction, lineItems, customer, company, colors, pageWidth, pageHeight, margin } = params;
  let yPosition = margin + 5;

  // Simple header line
  doc.setDrawColor(...colors.border);
  doc.setLineWidth(0.5);
  doc.line(margin, yPosition + 25, pageWidth - margin, yPosition + 25);

  // Company name - simple and clean
  doc.setFontSize(18);
  doc.setTextColor(...colors.text);
  doc.setFont('helvetica', 'normal');
  doc.text(company.name || 'Company Name', margin, yPosition);

  // Invoice label - right aligned, understated
  doc.setFontSize(10);
  doc.setTextColor(...colors.muted);
  doc.text('Invoice', pageWidth - margin, yPosition, { align: 'right' });

  yPosition += 35;

  // Two column: Invoice details left, Bill to right
  // Left: Invoice info
  doc.setFontSize(9);
  doc.setTextColor(...colors.muted);
  doc.text('Invoice No.', margin, yPosition);
  doc.text('Date', margin, yPosition + 10);
  if (transaction.dueDate) {
    doc.text('Due Date', margin, yPosition + 20);
  }

  doc.setTextColor(...colors.text);
  doc.text(transaction.reference || '—', margin + 30, yPosition);
  doc.text(format(new Date(transaction.date), 'dd/MM/yyyy'), margin + 30, yPosition + 10);
  if (transaction.dueDate) {
    doc.text(format(new Date(transaction.dueDate), 'dd/MM/yyyy'), margin + 30, yPosition + 20);
  }

  // Right: Bill To
  const rightCol = pageWidth / 2 + 20;
  doc.setTextColor(...colors.muted);
  doc.text('Bill To', rightCol, yPosition);

  let billToY = yPosition + 6;
  doc.setTextColor(...colors.text);
  if (customer) {
    doc.setFont('helvetica', 'bold');
    doc.text(customer.name, rightCol, billToY);
    billToY += 5;
    doc.setFont('helvetica', 'normal');
    if (customer.address) {
      const lines = customer.address.split('\n').slice(0, 3);
      lines.forEach(line => {
        doc.text(line, rightCol, billToY);
        billToY += 4;
      });
    }
  }

  yPosition += 40;

  // Minimal table
  const tableData = lineItems.map(item => [
    item.description,
    item.quantity.toString(),
    `$${item.unitPrice.toFixed(2)}`,
    `$${item.amount.toFixed(2)}`
  ]);

  autoTable(doc, {
    startY: yPosition,
    head: [['Item', 'Qty', 'Price', 'Total']],
    body: tableData,
    theme: 'plain',
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: colors.muted,
      fontSize: 8,
      fontStyle: 'normal',
      cellPadding: { top: 3, bottom: 3, left: 0, right: 0 }
    },
    bodyStyles: {
      fontSize: 9,
      textColor: colors.text,
      cellPadding: { top: 4, bottom: 4, left: 0, right: 0 }
    },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { halign: 'center', cellWidth: 20 },
      2: { halign: 'right', cellWidth: 30 },
      3: { halign: 'right', cellWidth: 30 }
    },
    margin: { left: margin, right: margin },
    tableLineColor: colors.border,
    tableLineWidth: 0.1
  });

  yPosition = (doc as any).lastAutoTable.finalY + 10;

  // Simple line
  doc.setDrawColor(...colors.border);
  doc.line(pageWidth - margin - 70, yPosition, pageWidth - margin, yPosition);
  yPosition += 8;

  // Totals - minimalist
  const labelX = pageWidth - margin - 70;
  const valueX = pageWidth - margin;

  doc.setFontSize(9);
  doc.setTextColor(...colors.muted);
  doc.text('Subtotal', labelX, yPosition);
  doc.setTextColor(...colors.text);
  doc.text(`$${(transaction.subTotal || 0).toFixed(2)}`, valueX, yPosition, { align: 'right' });
  yPosition += 6;

  if (transaction.taxAmount && transaction.taxAmount > 0) {
    doc.setTextColor(...colors.muted);
    doc.text('Tax', labelX, yPosition);
    doc.setTextColor(...colors.text);
    doc.text(`$${transaction.taxAmount.toFixed(2)}`, valueX, yPosition, { align: 'right' });
    yPosition += 6;
  }

  yPosition += 4;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colors.text);
  doc.text('Total', labelX, yPosition);
  doc.text(`$${(transaction.amount || 0).toFixed(2)}`, valueX, yPosition, { align: 'right' });

  // Balance due
  if (transaction.balance !== undefined && transaction.balance > 0 && transaction.balance !== transaction.amount) {
    yPosition += 10;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const amountPaid = (transaction.amount || 0) - (transaction.balance || 0);
    doc.setTextColor(...colors.muted);
    doc.text('Paid', labelX, yPosition);
    doc.setTextColor(...colors.text);
    doc.text(`$${amountPaid.toFixed(2)}`, valueX, yPosition, { align: 'right' });
    yPosition += 8;

    doc.setFontSize(10);
    doc.setTextColor(...colors.text);
    doc.text('Due', labelX, yPosition);
    doc.setFont('helvetica', 'bold');
    doc.text(`$${transaction.balance.toFixed(2)}`, valueX, yPosition, { align: 'right' });
  }

  // Notes - simple
  if (transaction.description) {
    yPosition += 25;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...colors.muted);
    doc.text('Notes', margin, yPosition);
    yPosition += 5;
    doc.setTextColor(...colors.text);
    doc.setFontSize(9);
    const splitNotes = doc.splitTextToSize(transaction.description, pageWidth - (2 * margin));
    doc.text(splitNotes, margin, yPosition);
  }

  // Minimal footer
  doc.setFontSize(8);
  doc.setTextColor(...colors.muted);
  doc.text('Thank you', pageWidth / 2, pageHeight - 15, { align: 'center' });
}

// ============ HELPER FUNCTIONS ============
function renderInvoiceDetails(
  doc: jsPDF,
  transaction: Transaction,
  colors: typeof colorSchemes.classic,
  pageWidth: number,
  margin: number,
  yPosition: number
): number {
  doc.setFontSize(10);
  doc.setTextColor(...colors.text);
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

  // Status
  const status = transaction.status || 'open';
  const statusText = status.charAt(0).toUpperCase() + status.slice(1);
  doc.setFont('helvetica', 'bold');
  doc.text('Status:', pageWidth - 60, yPosition);

  if (status === 'paid' || status === 'completed') {
    doc.setTextColor(22, 163, 74);
  } else if (status === 'overdue') {
    doc.setTextColor(220, 38, 38);
  } else {
    doc.setTextColor(234, 179, 8);
  }
  doc.text(statusText, pageWidth - margin, yPosition, { align: 'right' });
  doc.setTextColor(...colors.text);

  return yPosition;
}

function renderCustomerDetails(
  doc: jsPDF,
  customer: Contact | null,
  colors: typeof colorSchemes.classic,
  margin: number,
  yPosition: number
): number {
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...colors.text);

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

  return yPosition;
}

function renderLineItemsTable(
  doc: jsPDF,
  lineItems: LineItem[],
  colors: typeof colorSchemes.classic,
  pageWidth: number,
  margin: number,
  yPosition: number
): number {
  const tableData = lineItems.map(item => [
    item.description,
    item.quantity.toString(),
    `$${item.unitPrice.toFixed(2)}`,
    `$${item.amount.toFixed(2)}`
  ]);

  autoTable(doc, {
    startY: yPosition,
    head: [['Description', 'Quantity', 'Unit Price', 'Amount']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: colors.primary,
      textColor: [255, 255, 255],
      fontSize: 10,
      fontStyle: 'bold',
      halign: 'left'
    },
    bodyStyles: {
      fontSize: 9,
      textColor: colors.text
    },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { halign: 'center', cellWidth: 25 },
      2: { halign: 'right', cellWidth: 30 },
      3: { halign: 'right', cellWidth: 30 }
    },
    margin: { left: margin, right: margin }
  });

  return (doc as any).lastAutoTable.finalY + 10;
}

function renderTotals(
  doc: jsPDF,
  transaction: Transaction,
  colors: typeof colorSchemes.classic,
  pageWidth: number,
  margin: number,
  yPosition: number
): number {
  const totalsX = pageWidth - margin - 60;
  const labelX = totalsX - 2;
  const valueX = pageWidth - margin;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...colors.text);
  doc.text('Subtotal:', labelX, yPosition, { align: 'right' });
  doc.text(`$${(transaction.subTotal || 0).toFixed(2)}`, valueX, yPosition, { align: 'right' });
  yPosition += 6;

  if (transaction.taxAmount && transaction.taxAmount > 0) {
    doc.text('Tax:', labelX, yPosition, { align: 'right' });
    doc.text(`$${transaction.taxAmount.toFixed(2)}`, valueX, yPosition, { align: 'right' });
    yPosition += 6;
  }

  doc.setLineWidth(0.5);
  doc.setDrawColor(...colors.border);
  doc.line(totalsX, yPosition - 2, valueX, yPosition - 2);
  yPosition += 2;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Total:', labelX, yPosition, { align: 'right' });
  doc.text(`$${(transaction.amount || 0).toFixed(2)}`, valueX, yPosition, { align: 'right' });
  yPosition += 8;

  if (transaction.balance !== undefined && transaction.balance !== transaction.amount) {
    const amountPaid = (transaction.amount || 0) - (transaction.balance || 0);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Amount Paid:', labelX, yPosition, { align: 'right' });
    doc.text(`$${amountPaid.toFixed(2)}`, valueX, yPosition, { align: 'right' });
    yPosition += 6;
  }

  if (transaction.balance !== undefined && transaction.balance > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...colors.primary);
    doc.text('Balance Due:', labelX, yPosition, { align: 'right' });
    doc.text(`$${transaction.balance.toFixed(2)}`, valueX, yPosition, { align: 'right' });
    doc.setTextColor(...colors.text);
    yPosition += 8;
  }

  return yPosition;
}

function renderNotesAndTerms(
  doc: jsPDF,
  transaction: Transaction,
  colors: typeof colorSchemes.classic,
  pageWidth: number,
  margin: number,
  yPosition: number
): number {
  if (transaction.description) {
    yPosition += 10;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.text);
    doc.text('Notes:', margin, yPosition);
    yPosition += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const splitDescription = doc.splitTextToSize(transaction.description, pageWidth - (2 * margin));
    doc.text(splitDescription, margin, yPosition);
    yPosition += (splitDescription.length * 4);
  }

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

  return yPosition;
}

function renderFooter(
  doc: jsPDF,
  colors: typeof colorSchemes.classic,
  pageWidth: number,
  pageHeight: number
) {
  const footerY = pageHeight - 20;
  doc.setFontSize(9);
  doc.setTextColor(...colors.muted);
  doc.setFont('helvetica', 'italic');
  doc.text('Thank you for your business!', pageWidth / 2, footerY, { align: 'center' });
}
