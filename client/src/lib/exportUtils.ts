import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Account, Contact, Transaction } from '@shared/schema';
import Papa from 'papaparse';

// Type augmentation for jsPDF to support autotable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

// Format currency with commas
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  }).format(value);
};

// Helper to get transaction type display name
export const formatTransactionType = (type: string): string => {
  if (type === 'journal_entry') return 'Journal Entry';
  return type.charAt(0).toUpperCase() + type.slice(1);
};

// Helper to get contact name
export const getContactName = (contacts: Contact[], contactId?: number | null): string => {
  if (!contactId) return 'N/A';
  const contact = contacts.find(c => c.id === contactId);
  return contact ? contact.name : `Contact ID: ${contactId}`;
};

// Export transactions to CSV
export const exportTransactionsToCSV = (
  transactions: Transaction[],
  contacts: Contact[],
  filename: string = 'transactions.csv'
): void => {
  const fields = ['Date', 'Reference', 'Type', 'Amount', 'Contact', 'Description', 'Status'];
  
  const data = transactions.map(t => ({
    Date: new Date(t.date).toLocaleDateString(),
    Reference: t.reference,
    Type: formatTransactionType(t.type),
    Amount: t.type === 'expense' ? `-$${formatCurrency(t.amount)}` : `$${formatCurrency(t.amount)}`,
    Contact: getContactName(contacts, t.contactId),
    Description: t.description || '',
    Status: t.status
  }));
  
  const csv = Papa.unparse({
    fields,
    data
  });
  
  // Create a download link and trigger download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Export account balances to CSV
export const exportAccountBalancesToCSV = (
  accountBalances: { account: Account, balance: number }[],
  filename: string = 'account_balances.csv'
): void => {
  const fields = ['Account Code', 'Account Name', 'Type', 'Balance'];
  
  const data = accountBalances.map(item => ({
    'Account Code': item.account.code,
    'Account Name': item.account.name,
    'Type': item.account.type,
    'Balance': `$${formatCurrency(item.balance)}`
  }));
  
  const csv = Papa.unparse({
    fields,
    data
  });
  
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Export income statement to CSV
export const exportIncomeStatementToCSV = (
  incomeStatement: { revenues: number, expenses: number, netIncome: number },
  accountBalances: { account: Account, balance: number }[],
  filename: string = 'income_statement.csv'
): void => {
  // Get revenue accounts
  const revenueAccounts = accountBalances.filter(
    item => item.account.type.includes('income') || item.account.type.includes('revenue')
  );
  
  // Get expense accounts
  const expenseAccounts = accountBalances.filter(
    item => item.account.type.includes('expense')
  );
  
  // Prepare data for CSV
  const data: any[] = [];
  
  // Add header
  data.push(['Income Statement', '', '']);
  data.push(['', '', '']);
  
  // Add revenues section
  data.push(['Revenue', '', '']);
  revenueAccounts.forEach(item => {
    data.push([item.account.name, item.account.code, `$${formatCurrency(Math.abs(item.balance))}`]);
  });
  data.push(['Total Revenue', '', `$${formatCurrency(incomeStatement.revenues)}`]);
  data.push(['', '', '']);
  
  // Add expenses section
  data.push(['Expenses', '', '']);
  expenseAccounts.forEach(item => {
    data.push([item.account.name, item.account.code, `$${formatCurrency(Math.abs(item.balance))}`]);
  });
  data.push(['Total Expenses', '', `$${formatCurrency(incomeStatement.expenses)}`]);
  data.push(['', '', '']);
  
  // Add net income
  data.push(['Net Income', '', `$${formatCurrency(incomeStatement.netIncome)}`]);
  
  const csv = Papa.unparse(data);
  
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Export balance sheet to CSV
export const exportBalanceSheetToCSV = (
  balanceSheet: { assets: number, liabilities: number, equity: number },
  accountBalances: { account: Account, balance: number }[],
  filename: string = 'balance_sheet.csv'
): void => {
  // Get asset accounts
  const assetAccounts = accountBalances.filter(
    item => ['current_assets', 'bank', 'accounts_receivable', 'property_plant_equipment', 'long_term_assets'].includes(item.account.type)
  );
  
  // Get liability accounts
  const liabilityAccounts = accountBalances.filter(
    item => ['accounts_payable', 'credit_card', 'other_current_liabilities', 'long_term_liabilities'].includes(item.account.type)
  );
  
  // Get equity accounts
  const equityAccounts = accountBalances.filter(
    item => ['equity'].includes(item.account.type)
  );
  
  // Prepare data for CSV
  const data: any[] = [];
  
  // Add header
  data.push(['Balance Sheet', '', '']);
  data.push(['', '', '']);
  
  // Add assets section
  data.push(['Assets', '', '']);
  assetAccounts.forEach(item => {
    data.push([item.account.name, item.account.code, `$${formatCurrency(item.balance)}`]);
  });
  data.push(['Total Assets', '', `$${formatCurrency(balanceSheet.assets)}`]);
  data.push(['', '', '']);
  
  // Add liabilities section
  data.push(['Liabilities', '', '']);
  liabilityAccounts.forEach(item => {
    data.push([item.account.name, item.account.code, `$${formatCurrency(Math.abs(item.balance))}`]);
  });
  data.push(['Total Liabilities', '', `$${formatCurrency(balanceSheet.liabilities)}`]);
  data.push(['', '', '']);
  
  // Add equity section
  data.push(['Equity', '', '']);
  equityAccounts.forEach(item => {
    data.push([item.account.name, item.account.code, `$${formatCurrency(Math.abs(item.balance))}`]);
  });
  data.push(['Total Equity', '', `$${formatCurrency(balanceSheet.equity)}`]);
  data.push(['', '', '']);
  
  // Add total liabilities and equity
  data.push(['Total Liabilities & Equity', '', `$${formatCurrency(balanceSheet.liabilities + balanceSheet.equity)}`]);
  
  const csv = Papa.unparse(data);
  
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// PDF Export functions
// ===================

// Export transactions to PDF
export const exportTransactionsToPDF = (
  transactions: Transaction[],
  contacts: Contact[],
  filename: string = 'transactions.pdf'
): void => {
  const doc = new jsPDF();
  
  // Add title
  doc.setFontSize(18);
  doc.text('Transactions Report', 14, 22);
  
  // Add date
  doc.setFontSize(11);
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
  
  // Define table columns
  const columns = [
    { header: 'Date', dataKey: 'date' },
    { header: 'Reference', dataKey: 'reference' },
    { header: 'Type', dataKey: 'type' },
    { header: 'Contact', dataKey: 'contact' },
    { header: 'Amount', dataKey: 'amount' }
  ];
  
  // Prepare table data
  const data = transactions.map(t => ({
    date: new Date(t.date).toLocaleDateString(),
    reference: t.reference,
    type: formatTransactionType(t.type),
    contact: getContactName(contacts, t.contactId),
    amount: t.type === 'expense' 
      ? `-$${formatCurrency(t.amount)}` 
      : `$${formatCurrency(t.amount)}`
  }));
  
  // Set column styles
  const columnStyles = {
    amount: { halign: 'right' }
  };
  
  // Generate table
  doc.autoTable({
    head: [columns.map(col => col.header)],
    body: data.map(item => columns.map(col => item[col.dataKey as keyof typeof item])),
    startY: 40,
    margin: { top: 40 },
    styles: { overflow: 'linebreak' },
    columnStyles: columnStyles
  });
  
  // Save PDF
  doc.save(filename);
};

// Export account balances to PDF
export const exportAccountBalancesToPDF = (
  accountBalances: { account: Account, balance: number }[],
  filename: string = 'account_balances.pdf'
): void => {
  const doc = new jsPDF();
  
  // Add title
  doc.setFontSize(18);
  doc.text('Account Balances', 14, 22);
  
  // Add date
  doc.setFontSize(11);
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
  
  // Define table columns
  const columns = [
    { header: 'Account Code', dataKey: 'code' },
    { header: 'Account Name', dataKey: 'name' },
    { header: 'Type', dataKey: 'type' },
    { header: 'Balance', dataKey: 'balance' }
  ];
  
  // Prepare table data
  const data = accountBalances.map(item => ({
    code: item.account.code,
    name: item.account.name,
    type: item.account.type,
    balance: `$${formatCurrency(item.balance)}`
  }));
  
  // Set column styles
  const columnStyles = {
    balance: { halign: 'right' }
  };
  
  // Generate table
  doc.autoTable({
    head: [columns.map(col => col.header)],
    body: data.map(item => columns.map(col => item[col.dataKey as keyof typeof item])),
    startY: 40,
    margin: { top: 40 },
    styles: { overflow: 'linebreak' },
    columnStyles: columnStyles
  });
  
  // Save PDF
  doc.save(filename);
};

// Export income statement to PDF
export const exportIncomeStatementToPDF = (
  incomeStatement: { revenues: number, expenses: number, netIncome: number },
  accountBalances: { account: Account, balance: number }[],
  filename: string = 'income_statement.pdf'
): void => {
  const doc = new jsPDF();
  
  // Add title
  doc.setFontSize(18);
  doc.text('Income Statement', 14, 22);
  
  // Add date
  doc.setFontSize(11);
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
  
  // Get revenue accounts
  const revenueAccounts = accountBalances.filter(
    item => item.account.type.includes('income') || item.account.type.includes('revenue')
  );
  
  // Get expense accounts
  const expenseAccounts = accountBalances.filter(
    item => item.account.type.includes('expense')
  );
  
  // Prepare table data
  const tableData = [];
  
  // Add revenues section
  tableData.push([{ content: 'Revenue', colSpan: 3, styles: { fontStyle: 'bold' } }]);
  revenueAccounts.forEach(item => {
    tableData.push([
      item.account.name, 
      item.account.code, 
      `$${formatCurrency(Math.abs(item.balance))}`
    ]);
  });
  tableData.push([
    { content: 'Total Revenue', colSpan: 2, styles: { fontStyle: 'bold' } }, 
    { content: `$${formatCurrency(incomeStatement.revenues)}`, styles: { fontStyle: 'bold' } }
  ]);
  tableData.push([{ content: '', colSpan: 3 }]);
  
  // Add expenses section
  tableData.push([{ content: 'Expenses', colSpan: 3, styles: { fontStyle: 'bold' } }]);
  expenseAccounts.forEach(item => {
    tableData.push([
      item.account.name, 
      item.account.code, 
      `$${formatCurrency(Math.abs(item.balance))}`
    ]);
  });
  tableData.push([
    { content: 'Total Expenses', colSpan: 2, styles: { fontStyle: 'bold' } }, 
    { content: `$${formatCurrency(incomeStatement.expenses)}`, styles: { fontStyle: 'bold' } }
  ]);
  tableData.push([{ content: '', colSpan: 3 }]);
  
  // Add net income
  tableData.push([
    { content: 'Net Income', colSpan: 2, styles: { fontStyle: 'bold' } }, 
    { content: `$${formatCurrency(incomeStatement.netIncome)}`, styles: { fontStyle: 'bold' } }
  ]);
  
  // Generate table
  doc.autoTable({
    head: [[
      { content: 'Account', styles: { halign: 'left' } }, 
      { content: 'Code', styles: { halign: 'left' } }, 
      { content: 'Amount', styles: { halign: 'right' } }
    ]],
    body: tableData,
    startY: 40,
    margin: { top: 40 },
    styles: { overflow: 'linebreak' },
    columnStyles: {
      2: { halign: 'right' }
    }
  });
  
  // Save PDF
  doc.save(filename);
};

// Export balance sheet to PDF
export const exportBalanceSheetToPDF = (
  balanceSheet: { assets: number, liabilities: number, equity: number },
  accountBalances: { account: Account, balance: number }[],
  filename: string = 'balance_sheet.pdf'
): void => {
  const doc = new jsPDF();
  
  // Add title
  doc.setFontSize(18);
  doc.text('Balance Sheet', 14, 22);
  
  // Add date
  doc.setFontSize(11);
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
  
  // Get asset accounts
  const assetAccounts = accountBalances.filter(
    item => ['current_assets', 'bank', 'accounts_receivable', 'property_plant_equipment', 'long_term_assets'].includes(item.account.type)
  );
  
  // Get liability accounts
  const liabilityAccounts = accountBalances.filter(
    item => ['accounts_payable', 'credit_card', 'other_current_liabilities', 'long_term_liabilities'].includes(item.account.type)
  );
  
  // Get equity accounts
  const equityAccounts = accountBalances.filter(
    item => ['equity'].includes(item.account.type)
  );
  
  // Prepare table data
  const tableData = [];
  
  // Add assets section
  tableData.push([{ content: 'Assets', colSpan: 3, styles: { fontStyle: 'bold' } }]);
  assetAccounts.forEach(item => {
    tableData.push([
      item.account.name, 
      item.account.code, 
      `$${formatCurrency(item.balance)}`
    ]);
  });
  tableData.push([
    { content: 'Total Assets', colSpan: 2, styles: { fontStyle: 'bold' } }, 
    { content: `$${formatCurrency(balanceSheet.assets)}`, styles: { fontStyle: 'bold' } }
  ]);
  tableData.push([{ content: '', colSpan: 3 }]);
  
  // Add liabilities section
  tableData.push([{ content: 'Liabilities', colSpan: 3, styles: { fontStyle: 'bold' } }]);
  liabilityAccounts.forEach(item => {
    tableData.push([
      item.account.name, 
      item.account.code, 
      `$${formatCurrency(Math.abs(item.balance))}`
    ]);
  });
  tableData.push([
    { content: 'Total Liabilities', colSpan: 2, styles: { fontStyle: 'bold' } }, 
    { content: `$${formatCurrency(balanceSheet.liabilities)}`, styles: { fontStyle: 'bold' } }
  ]);
  tableData.push([{ content: '', colSpan: 3 }]);
  
  // Add equity section
  tableData.push([{ content: 'Equity', colSpan: 3, styles: { fontStyle: 'bold' } }]);
  equityAccounts.forEach(item => {
    tableData.push([
      item.account.name, 
      item.account.code, 
      `$${formatCurrency(Math.abs(item.balance))}`
    ]);
  });
  tableData.push([
    { content: 'Total Equity', colSpan: 2, styles: { fontStyle: 'bold' } }, 
    { content: `$${formatCurrency(balanceSheet.equity)}`, styles: { fontStyle: 'bold' } }
  ]);
  tableData.push([{ content: '', colSpan: 3 }]);
  
  // Add total liabilities and equity
  tableData.push([
    { content: 'Total Liabilities & Equity', colSpan: 2, styles: { fontStyle: 'bold' } }, 
    { content: `$${formatCurrency(balanceSheet.liabilities + balanceSheet.equity)}`, styles: { fontStyle: 'bold' } }
  ]);
  
  // Generate table
  doc.autoTable({
    head: [[
      { content: 'Account', styles: { halign: 'left' } }, 
      { content: 'Code', styles: { halign: 'left' } }, 
      { content: 'Amount', styles: { halign: 'right' } }
    ]],
    body: tableData,
    startY: 40,
    margin: { top: 40 },
    styles: { overflow: 'linebreak' },
    columnStyles: {
      2: { halign: 'right' }
    }
  });
  
  // Save PDF
  doc.save(filename);
};

// Helper function to get company name for filename
export const generateFilename = (
  baseFilename: string,
  companyName?: string
): string => {
  const formattedCompanyName = companyName 
    ? companyName.toLowerCase().replace(/\s+/g, '_') + '_'
    : '';
  
  const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  return `${formattedCompanyName}${baseFilename}_${date}`;
};