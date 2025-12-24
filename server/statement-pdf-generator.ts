import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Transaction, Contact, Company } from '@shared/schema';
import { format } from 'date-fns';

export type StatementType = 'balance_forward' | 'open_item' | 'transaction';

interface StatementPDFData {
  contact: Contact;
  company: Company;
  transactions: Transaction[];
  statementType: StatementType;
  statementDate: Date;
  startDate?: Date;
  endDate?: Date;
  openingBalance?: number;
  closingBalance?: number;
}

export async function generateStatementPDF(data: StatementPDFData): Promise<Buffer> {
  const { contact, company, transactions, statementType, statementDate, startDate, endDate } = data;

  // Create PDF document
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Define colors
  const primaryColor: [number, number, number] = [79, 70, 229]; // indigo-600
  const textColor: [number, number, number] = [31, 41, 55]; // gray-800
  const lightGray: [number, number, number] = [243, 244, 246]; // gray-100
  const borderColor: [number, number, number] = [229, 231, 235]; // gray-200

  // Page dimensions
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;

  let yPosition = margin;

  // Company Header
  doc.setFontSize(22);
  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.text(company.name || 'Company Name', margin, yPosition);
  yPosition += 8;

  // Company Details
  doc.setFontSize(9);
  doc.setTextColor(...textColor);
  doc.setFont('helvetica', 'normal');
  if (company.street1) doc.text(company.street1, margin, yPosition), yPosition += 4;
  if (company.city || company.state || company.postalCode) {
    const cityLine = [company.city, company.state, company.postalCode].filter(Boolean).join(', ');
    doc.text(cityLine, margin, yPosition);
    yPosition += 4;
  }
  if (company.phone) doc.text(`Tel: ${company.phone}`, margin, yPosition), yPosition += 4;
  if (company.email) doc.text(company.email, margin, yPosition), yPosition += 4;

  // Statement Title (Right side)
  yPosition = margin;
  doc.setFontSize(26);
  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.text('STATEMENT', pageWidth - margin, yPosition, { align: 'right' });
  yPosition += 10;

  // Statement Type
  doc.setFontSize(11);
  doc.setTextColor(...textColor);
  doc.setFont('helvetica', 'normal');
  const typeLabel = statementType === 'balance_forward'
    ? 'Balance Forward'
    : statementType === 'open_item'
      ? 'Open Item'
      : 'Transaction Statement';
  doc.text(typeLabel, pageWidth - margin, yPosition, { align: 'right' });
  yPosition += 8;

  // Statement Date
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Statement Date:', pageWidth - 55, yPosition);
  doc.setFont('helvetica', 'normal');
  doc.text(format(statementDate, 'MMM dd, yyyy'), pageWidth - margin, yPosition, { align: 'right' });
  yPosition += 6;

  // Date Range (if applicable)
  if (startDate && endDate && (statementType === 'balance_forward' || statementType === 'transaction')) {
    doc.setFont('helvetica', 'bold');
    doc.text('Period:', pageWidth - 55, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(`${format(startDate, 'MMM dd, yyyy')} - ${format(endDate, 'MMM dd, yyyy')}`, pageWidth - margin, yPosition, { align: 'right' });
    yPosition += 6;
  }

  // Customer Section
  yPosition += 15;
  doc.setFillColor(...lightGray);
  doc.rect(margin, yPosition - 4, 85, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('STATEMENT FOR:', margin + 2, yPosition);
  yPosition += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(contact.name, margin + 2, yPosition);
  yPosition += 5;
  doc.setFont('helvetica', 'normal');

  if (contact.contactName) {
    doc.text(contact.contactName, margin + 2, yPosition);
    yPosition += 5;
  }
  if (contact.address) {
    const addressLines = contact.address.split('\n');
    addressLines.forEach(line => {
      doc.text(line.trim(), margin + 2, yPosition);
      yPosition += 5;
    });
  }
  if (contact.email) {
    doc.text(contact.email, margin + 2, yPosition);
    yPosition += 5;
  }

  // Account Summary Box (Right side)
  const summaryX = pageWidth - margin - 70;
  const summaryY = yPosition - 30;

  // Calculate totals
  const invoiceTotal = transactions
    .filter(t => t.type === 'invoice' || t.type === 'bill')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const paymentTotal = transactions
    .filter(t => t.type === 'payment' || t.type === 'deposit' || t.type === 'cheque')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const balanceDue = transactions
    .filter(t => (t.type === 'invoice' || t.type === 'bill') && t.balance && t.balance > 0)
    .reduce((sum, t) => sum + (t.balance || 0), 0);

  doc.setFillColor(249, 250, 251); // gray-50
  doc.setDrawColor(...borderColor);
  doc.roundedRect(summaryX, summaryY, 70, 30, 2, 2, 'FD');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text('BALANCE DUE', summaryX + 35, summaryY + 8, { align: 'center' });

  doc.setFontSize(18);
  doc.setTextColor(...textColor);
  doc.text(`$${balanceDue.toFixed(2)}`, summaryX + 35, summaryY + 20, { align: 'center' });

  // Transactions Table
  yPosition += 15;

  if (transactions.length === 0) {
    doc.setFontSize(11);
    doc.setTextColor(128, 128, 128);
    doc.text('No transactions found for the selected period.', margin, yPosition);
  } else {
    // Prepare table data based on statement type
    let tableData: string[][];
    let headers: string[];

    if (statementType === 'open_item') {
      // Open Item: Only unpaid invoices/bills
      headers = ['Date', 'Type', 'Number', 'Due Date', 'Original', 'Balance'];
      tableData = transactions
        .filter(t => (t.type === 'invoice' || t.type === 'bill') && t.balance && t.balance > 0)
        .map(t => [
          format(new Date(t.date), 'MM/dd/yyyy'),
          t.type === 'invoice' ? 'Invoice' : 'Bill',
          t.reference || '-',
          t.dueDate ? format(new Date(t.dueDate), 'MM/dd/yyyy') : '-',
          `$${(t.amount || 0).toFixed(2)}`,
          `$${(t.balance || 0).toFixed(2)}`
        ]);
    } else {
      // Balance Forward & Transaction: All transactions with running balance
      headers = ['Date', 'Type', 'Number', 'Description', 'Amount', 'Balance'];
      let runningBalance = 0;
      tableData = transactions
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .map(t => {
          const isDebit = t.type === 'invoice' || t.type === 'bill';
          const amount = t.amount || 0;

          if (isDebit) {
            runningBalance += amount;
          } else {
            runningBalance -= amount;
          }

          return [
            format(new Date(t.date), 'MM/dd/yyyy'),
            formatTransactionType(t.type),
            t.reference || '-',
            truncateText(t.description || t.memo || '-', 30),
            (isDebit ? '' : '-') + `$${amount.toFixed(2)}`,
            `$${runningBalance.toFixed(2)}`
          ];
        });
    }

    // Generate table
    autoTable(doc, {
      startY: yPosition,
      head: [headers],
      body: tableData,
      theme: 'striped',
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontSize: 9,
        fontStyle: 'bold',
        halign: 'left'
      },
      bodyStyles: {
        fontSize: 8,
        textColor: textColor
      },
      columnStyles: statementType === 'open_item'
        ? {
            0: { cellWidth: 25 },
            1: { cellWidth: 20 },
            2: { cellWidth: 25 },
            3: { cellWidth: 25 },
            4: { halign: 'right', cellWidth: 25 },
            5: { halign: 'right', cellWidth: 25, fontStyle: 'bold' }
          }
        : {
            0: { cellWidth: 22 },
            1: { cellWidth: 22 },
            2: { cellWidth: 22 },
            3: { cellWidth: 'auto' },
            4: { halign: 'right', cellWidth: 25 },
            5: { halign: 'right', cellWidth: 25, fontStyle: 'bold' }
          },
      margin: { left: margin, right: margin },
      didDrawPage: (data) => {
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
  }

  // Totals Summary
  const totalsX = pageWidth - margin - 70;

  doc.setFillColor(...lightGray);
  doc.roundedRect(totalsX, yPosition, 70, statementType === 'open_item' ? 25 : 35, 2, 2, 'F');

  let totalsY = yPosition + 7;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...textColor);

  if (statementType !== 'open_item') {
    doc.text('Total Charges:', totalsX + 5, totalsY);
    doc.text(`$${invoiceTotal.toFixed(2)}`, totalsX + 65, totalsY, { align: 'right' });
    totalsY += 6;

    doc.text('Total Payments:', totalsX + 5, totalsY);
    doc.text(`-$${paymentTotal.toFixed(2)}`, totalsX + 65, totalsY, { align: 'right' });
    totalsY += 6;

    doc.setDrawColor(...borderColor);
    doc.line(totalsX + 5, totalsY - 2, totalsX + 65, totalsY - 2);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Balance Due:', totalsX + 5, totalsY + 2);
  doc.setTextColor(...primaryColor);
  doc.text(`$${balanceDue.toFixed(2)}`, totalsX + 65, totalsY + 2, { align: 'right' });

  // Aging Summary (for Open Item statements)
  if (statementType === 'open_item' && transactions.length > 0) {
    yPosition = (doc as any).lastAutoTable.finalY + 50;

    // Calculate aging
    const today = new Date();
    const aging = {
      current: 0,
      days1_30: 0,
      days31_60: 0,
      days61_90: 0,
      over90: 0
    };

    transactions
      .filter(t => (t.type === 'invoice' || t.type === 'bill') && t.balance && t.balance > 0)
      .forEach(t => {
        if (!t.dueDate) {
          aging.current += t.balance || 0;
          return;
        }
        const dueDate = new Date(t.dueDate);
        const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

        if (daysOverdue <= 0) aging.current += t.balance || 0;
        else if (daysOverdue <= 30) aging.days1_30 += t.balance || 0;
        else if (daysOverdue <= 60) aging.days31_60 += t.balance || 0;
        else if (daysOverdue <= 90) aging.days61_90 += t.balance || 0;
        else aging.over90 += t.balance || 0;
      });

    doc.setFillColor(...lightGray);
    doc.rect(margin, yPosition, pageWidth - 2 * margin, 20, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...textColor);

    const agingLabels = ['Current', '1-30 Days', '31-60 Days', '61-90 Days', 'Over 90'];
    const agingValues = [aging.current, aging.days1_30, aging.days31_60, aging.days61_90, aging.over90];
    const colWidth = (pageWidth - 2 * margin) / 5;

    agingLabels.forEach((label, i) => {
      const x = margin + (i * colWidth) + (colWidth / 2);
      doc.text(label, x, yPosition + 7, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.text(`$${agingValues[i].toFixed(2)}`, x, yPosition + 14, { align: 'center' });
      doc.setFont('helvetica', 'bold');
    });
  }

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 25;
  doc.setFontSize(9);
  doc.setTextColor(128, 128, 128);
  doc.setFont('helvetica', 'normal');
  doc.text('Please remit payment within the terms indicated. Thank you for your business.', pageWidth / 2, footerY, { align: 'center' });

  doc.setFontSize(8);
  doc.text(`Generated on ${format(new Date(), 'MMM dd, yyyy')}`, pageWidth / 2, footerY + 5, { align: 'center' });

  // Convert to buffer
  const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
  return pdfBuffer;
}

function formatTransactionType(type: string): string {
  const types: Record<string, string> = {
    invoice: 'Invoice',
    bill: 'Bill',
    payment: 'Payment',
    deposit: 'Deposit',
    cheque: 'Cheque',
    expense: 'Expense',
    sales_receipt: 'Receipt',
    customer_credit: 'Credit',
    vendor_credit: 'Credit'
  };
  return types[type] || type.charAt(0).toUpperCase() + type.slice(1);
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}
