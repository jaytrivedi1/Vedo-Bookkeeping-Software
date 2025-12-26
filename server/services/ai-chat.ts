import { IStorage } from '../storage';
import { format, subDays, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfYear } from 'date-fns';

interface ChatResponse {
  message: string;
  data?: any;
  actions?: ChatAction[];
}

interface ChatAction {
  label: string;
  action: string;
  params?: any;
}

interface QueryPattern {
  patterns: RegExp[];
  handler: (match: RegExpMatchArray, context: QueryContext) => Promise<ChatResponse>;
}

interface QueryContext {
  storage: IStorage;
  companyId: number;
  homeCurrency: string;
}

// Helper to format currency
function formatCurrency(amount: number, currency: string = 'CAD'): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

// Helper to parse date references
function parseDateReference(text: string): { startDate: Date; endDate: Date } | null {
  const now = new Date();
  const lowerText = text.toLowerCase();

  if (lowerText.includes('this month') || lowerText.includes('current month')) {
    return { startDate: startOfMonth(now), endDate: now };
  }
  if (lowerText.includes('last month') || lowerText.includes('previous month')) {
    const lastMonth = subMonths(now, 1);
    return { startDate: startOfMonth(lastMonth), endDate: endOfMonth(lastMonth) };
  }
  if (lowerText.includes('this week')) {
    return { startDate: startOfWeek(now), endDate: now };
  }
  if (lowerText.includes('last week') || lowerText.includes('past week')) {
    return { startDate: subDays(now, 7), endDate: now };
  }
  if (lowerText.includes('this year') || lowerText.includes('current year')) {
    return { startDate: startOfYear(now), endDate: now };
  }
  if (lowerText.includes('last 30 days') || lowerText.includes('past 30 days')) {
    return { startDate: subDays(now, 30), endDate: now };
  }
  if (lowerText.includes('last 90 days') || lowerText.includes('past 90 days')) {
    return { startDate: subDays(now, 90), endDate: now };
  }
  // Default to this month
  return { startDate: startOfMonth(now), endDate: now };
}

// Query patterns and handlers
const queryPatterns: QueryPattern[] = [
  // ===== MONTHLY/PERIOD SUMMARY =====
  {
    patterns: [
      /how\s+(are|is)\s+(we|the\s+business|things)\s+doing/i,
      /monthly\s+summary/i,
      /give\s+me\s+a\s+summary/i,
      /overview/i,
      /financial\s+snapshot/i,
    ],
    handler: async (match, ctx) => {
      const dateRange = parseDateReference(match.input || '') || {
        startDate: startOfMonth(new Date()),
        endDate: new Date()
      };

      // Get revenue (deposits/invoices)
      const transactions = await ctx.storage.getTransactions(ctx.companyId);
      const periodTransactions = transactions.filter(t => {
        const txDate = new Date(t.date);
        return txDate >= dateRange.startDate && txDate <= dateRange.endDate;
      });

      const revenue = periodTransactions
        .filter(t => t.type === 'deposit' || t.type === 'invoice' || t.type === 'sales_receipt')
        .reduce((sum, t) => sum + Number(t.total || 0), 0);

      const expenses = periodTransactions
        .filter(t => t.type === 'expense' || t.type === 'bill' || t.type === 'cheque')
        .reduce((sum, t) => sum + Number(t.total || 0), 0);

      const netIncome = revenue - expenses;

      // Get unpaid invoices
      const invoices = await ctx.storage.getInvoices(ctx.companyId);
      const unpaidInvoices = invoices.filter(i => i.status === 'sent' || i.status === 'overdue');
      const unpaidTotal = unpaidInvoices.reduce((sum, i) => sum + Number(i.total || 0), 0);

      // Get unpaid bills
      const bills = await ctx.storage.getBills(ctx.companyId);
      const unpaidBills = bills.filter(b => b.status === 'pending' || b.status === 'overdue');
      const unpaidBillsTotal = unpaidBills.reduce((sum, b) => sum + Number(b.total || 0), 0);

      const periodLabel = format(dateRange.startDate, 'MMMM yyyy');

      return {
        message: `Here's your ${periodLabel} snapshot:\n\n` +
          `📈 **Revenue:** ${formatCurrency(revenue, ctx.homeCurrency)}\n` +
          `📉 **Expenses:** ${formatCurrency(expenses, ctx.homeCurrency)}\n` +
          `💰 **Net Income:** ${formatCurrency(netIncome, ctx.homeCurrency)}\n\n` +
          `📬 **Outstanding Receivables:** ${formatCurrency(unpaidTotal, ctx.homeCurrency)} (${unpaidInvoices.length} invoices)\n` +
          `📥 **Unpaid Bills:** ${formatCurrency(unpaidBillsTotal, ctx.homeCurrency)} (${unpaidBills.length} bills)`,
        data: {
          type: 'summary',
          metrics: {
            'Revenue': formatCurrency(revenue, ctx.homeCurrency),
            'Expenses': formatCurrency(expenses, ctx.homeCurrency),
            'Net Income': formatCurrency(netIncome, ctx.homeCurrency),
            'Outstanding AR': formatCurrency(unpaidTotal, ctx.homeCurrency),
            'Unpaid Bills': formatCurrency(unpaidBillsTotal, ctx.homeCurrency),
          }
        },
        actions: [
          { label: 'View P&L Report', action: 'navigate', params: { path: '/reports' } },
          { label: 'See Invoices', action: 'navigate', params: { path: '/invoices' } },
        ]
      };
    }
  },

  // ===== EXPENSES =====
  {
    patterns: [
      /(?:what|show|list|get)\s+(?:were|are|my|our|the)?\s*expenses/i,
      /expense\s+(?:summary|breakdown|report)/i,
      /how\s+much\s+(?:did\s+(?:we|i)\s+spend|spent)/i,
      /spending/i,
    ],
    handler: async (match, ctx) => {
      const dateRange = parseDateReference(match.input || '') || {
        startDate: startOfMonth(new Date()),
        endDate: new Date()
      };

      const transactions = await ctx.storage.getTransactions(ctx.companyId);
      const expenses = transactions.filter(t => {
        const txDate = new Date(t.date);
        return (t.type === 'expense' || t.type === 'bill' || t.type === 'cheque') &&
          txDate >= dateRange.startDate && txDate <= dateRange.endDate;
      });

      const total = expenses.reduce((sum, e) => sum + Number(e.total || 0), 0);

      // Group by category/account
      const byAccount: Record<string, number> = {};
      for (const exp of expenses) {
        const accountName = exp.lineItems?.[0]?.accountName || 'Uncategorized';
        byAccount[accountName] = (byAccount[accountName] || 0) + Number(exp.total || 0);
      }

      const topCategories = Object.entries(byAccount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

      const periodLabel = format(dateRange.startDate, 'MMM d') + ' - ' + format(dateRange.endDate, 'MMM d, yyyy');

      let message = `Your expenses for ${periodLabel}:\n\n` +
        `**Total:** ${formatCurrency(total, ctx.homeCurrency)} (${expenses.length} transactions)\n\n`;

      if (topCategories.length > 0) {
        message += `**Top categories:**\n`;
        topCategories.forEach(([name, amount]) => {
          const pct = total > 0 ? ((amount / total) * 100).toFixed(0) : 0;
          message += `• ${name}: ${formatCurrency(amount, ctx.homeCurrency)} (${pct}%)\n`;
        });
      }

      return {
        message,
        data: {
          type: 'summary',
          metrics: {
            'Total Expenses': formatCurrency(total, ctx.homeCurrency),
            'Transactions': expenses.length.toString(),
          }
        },
        actions: [
          { label: 'View All Expenses', action: 'navigate', params: { path: '/expenses' } },
        ]
      };
    }
  },

  // ===== UNPAID INVOICES =====
  {
    patterns: [
      /(?:show|list|get|what\s+are)\s+(?:my|our|the)?\s*unpaid\s+invoices/i,
      /outstanding\s+invoices/i,
      /invoices?\s+(?:that\s+are\s+)?(?:unpaid|overdue|outstanding)/i,
      /(?:who|which\s+customers?)\s+(?:owes?|haven't\s+paid)/i,
      /accounts?\s+receivable/i,
    ],
    handler: async (match, ctx) => {
      const invoices = await ctx.storage.getInvoices(ctx.companyId);
      const unpaid = invoices.filter(i => i.status === 'sent' || i.status === 'overdue');

      const total = unpaid.reduce((sum, i) => sum + Number(i.total || 0), 0);
      const overdue = unpaid.filter(i => i.status === 'overdue');
      const overdueTotal = overdue.reduce((sum, i) => sum + Number(i.total || 0), 0);

      let message = `You have **${unpaid.length} unpaid invoices** totaling **${formatCurrency(total, ctx.homeCurrency)}**.\n\n`;

      if (overdue.length > 0) {
        message += `⚠️ **${overdue.length} are overdue** (${formatCurrency(overdueTotal, ctx.homeCurrency)})\n\n`;
      }

      // Show top 5 largest unpaid
      const topUnpaid = unpaid
        .sort((a, b) => Number(b.total || 0) - Number(a.total || 0))
        .slice(0, 5);

      if (topUnpaid.length > 0) {
        const tableData = {
          type: 'table',
          headers: ['Invoice', 'Customer', 'Amount', 'Status'],
          rows: topUnpaid.map(inv => [
            inv.invoiceNumber || `#${inv.id}`,
            inv.customerName || 'Unknown',
            formatCurrency(Number(inv.total || 0), ctx.homeCurrency),
            inv.status === 'overdue' ? '🔴 Overdue' : '🟡 Pending'
          ])
        };

        return {
          message,
          data: tableData,
          actions: [
            { label: 'View All Invoices', action: 'navigate', params: { path: '/invoices' } },
            { label: 'Send Reminders', action: 'sendReminders', params: { invoiceIds: overdue.map(i => i.id) } },
          ]
        };
      }

      return { message };
    }
  },

  // ===== TOP CUSTOMERS =====
  {
    patterns: [
      /(?:who\s+are|show|list)\s+(?:my|our|the)?\s*top\s+(?:\d+\s+)?customers?/i,
      /(?:best|biggest|largest)\s+customers?/i,
      /customers?\s+by\s+revenue/i,
    ],
    handler: async (match, ctx) => {
      // Extract number from query (default to 5)
      const numMatch = match.input?.match(/top\s+(\d+)/i);
      const limit = numMatch ? parseInt(numMatch[1]) : 5;

      const invoices = await ctx.storage.getInvoices(ctx.companyId);
      const paidInvoices = invoices.filter(i => i.status === 'paid');

      // Group by customer
      const byCustomer: Record<string, { name: string; total: number; count: number }> = {};
      for (const inv of paidInvoices) {
        const customerId = inv.customerId?.toString() || 'unknown';
        const name = inv.customerName || 'Unknown Customer';
        if (!byCustomer[customerId]) {
          byCustomer[customerId] = { name, total: 0, count: 0 };
        }
        byCustomer[customerId].total += Number(inv.total || 0);
        byCustomer[customerId].count += 1;
      }

      const topCustomers = Object.values(byCustomer)
        .sort((a, b) => b.total - a.total)
        .slice(0, limit);

      const totalRevenue = topCustomers.reduce((sum, c) => sum + c.total, 0);

      let message = `Here are your top ${limit} customers by revenue:\n\n`;

      const tableData = {
        type: 'table',
        headers: ['Customer', 'Revenue', 'Invoices'],
        rows: topCustomers.map((c, i) => [
          `${i + 1}. ${c.name}`,
          formatCurrency(c.total, ctx.homeCurrency),
          c.count.toString()
        ])
      };

      return {
        message,
        data: tableData,
        actions: [
          { label: 'View Customers', action: 'navigate', params: { path: '/customers' } },
        ]
      };
    }
  },

  // ===== REVENUE =====
  {
    patterns: [
      /(?:what|how\s+much)\s+(?:is|was|were)\s+(?:my|our|the)?\s*revenue/i,
      /(?:total|show)\s+revenue/i,
      /how\s+much\s+(?:did\s+(?:we|i)\s+(?:make|earn)|money\s+came\s+in)/i,
      /income\s+(?:summary|this\s+month)/i,
    ],
    handler: async (match, ctx) => {
      const dateRange = parseDateReference(match.input || '') || {
        startDate: startOfMonth(new Date()),
        endDate: new Date()
      };

      const transactions = await ctx.storage.getTransactions(ctx.companyId);
      const revenue = transactions.filter(t => {
        const txDate = new Date(t.date);
        return (t.type === 'deposit' || t.type === 'invoice' || t.type === 'sales_receipt') &&
          txDate >= dateRange.startDate && txDate <= dateRange.endDate;
      });

      const total = revenue.reduce((sum, r) => sum + Number(r.total || 0), 0);

      // Compare to previous period
      const periodLength = dateRange.endDate.getTime() - dateRange.startDate.getTime();
      const prevStart = new Date(dateRange.startDate.getTime() - periodLength);
      const prevEnd = new Date(dateRange.endDate.getTime() - periodLength);

      const prevRevenue = transactions.filter(t => {
        const txDate = new Date(t.date);
        return (t.type === 'deposit' || t.type === 'invoice' || t.type === 'sales_receipt') &&
          txDate >= prevStart && txDate <= prevEnd;
      });
      const prevTotal = prevRevenue.reduce((sum, r) => sum + Number(r.total || 0), 0);

      const change = prevTotal > 0 ? ((total - prevTotal) / prevTotal * 100).toFixed(1) : 0;
      const trend = total >= prevTotal ? '📈' : '📉';

      const periodLabel = format(dateRange.startDate, 'MMM d') + ' - ' + format(dateRange.endDate, 'MMM d, yyyy');

      return {
        message: `Your revenue for ${periodLabel}:\n\n` +
          `**${formatCurrency(total, ctx.homeCurrency)}** from ${revenue.length} transactions\n\n` +
          `${trend} ${change}% compared to previous period`,
        data: {
          type: 'summary',
          metrics: {
            'Revenue': formatCurrency(total, ctx.homeCurrency),
            'Transactions': revenue.length.toString(),
            'vs Previous Period': `${change}%`,
          }
        }
      };
    }
  },

  // ===== UNPAID BILLS =====
  {
    patterns: [
      /(?:show|list|get|what\s+are)\s+(?:my|our|the)?\s*unpaid\s+bills/i,
      /bills?\s+(?:to\s+pay|due|outstanding)/i,
      /(?:what|how\s+much)\s+do\s+(?:we|i)\s+owe/i,
      /accounts?\s+payable/i,
    ],
    handler: async (match, ctx) => {
      const bills = await ctx.storage.getBills(ctx.companyId);
      const unpaid = bills.filter(b => b.status === 'pending' || b.status === 'overdue');

      const total = unpaid.reduce((sum, b) => sum + Number(b.total || 0), 0);
      const overdue = unpaid.filter(b => b.status === 'overdue');
      const overdueTotal = overdue.reduce((sum, b) => sum + Number(b.total || 0), 0);

      let message = `You have **${unpaid.length} unpaid bills** totaling **${formatCurrency(total, ctx.homeCurrency)}**.\n\n`;

      if (overdue.length > 0) {
        message += `⚠️ **${overdue.length} are overdue** (${formatCurrency(overdueTotal, ctx.homeCurrency)})\n\n`;
      }

      // Show top 5 bills
      const topBills = unpaid
        .sort((a, b) => Number(b.total || 0) - Number(a.total || 0))
        .slice(0, 5);

      if (topBills.length > 0) {
        const tableData = {
          type: 'table',
          headers: ['Bill', 'Vendor', 'Amount', 'Due'],
          rows: topBills.map(bill => [
            bill.billNumber || `#${bill.id}`,
            bill.vendorName || 'Unknown',
            formatCurrency(Number(bill.total || 0), ctx.homeCurrency),
            bill.dueDate ? format(new Date(bill.dueDate), 'MMM d') : '-'
          ])
        };

        return {
          message,
          data: tableData,
          actions: [
            { label: 'Pay Bills', action: 'navigate', params: { path: '/pay-bill' } },
          ]
        };
      }

      return { message };
    }
  },

  // ===== HELP =====
  {
    patterns: [
      /^help$/i,
      /what\s+can\s+you\s+do/i,
      /what\s+(?:can\s+i|should\s+i)\s+ask/i,
    ],
    handler: async () => {
      return {
        message: `I can help you with:\n\n` +
          `📊 **Summaries:** "How are we doing this month?"\n` +
          `💰 **Revenue:** "What's our revenue this week?"\n` +
          `📉 **Expenses:** "Show me expenses for last month"\n` +
          `📄 **Invoices:** "List unpaid invoices"\n` +
          `📥 **Bills:** "What bills are due?"\n` +
          `👥 **Customers:** "Who are my top 5 customers?"\n\n` +
          `Just ask in natural language!`,
        data: {
          type: 'list',
          items: [
            'Monthly/weekly summaries',
            'Revenue and expense tracking',
            'Unpaid invoices and bills',
            'Top customers analysis',
            'Period comparisons',
          ]
        }
      };
    }
  }
];

// Main chat processor
export async function processAIChat(
  query: string,
  storage: IStorage,
  companyId: number,
  homeCurrency: string = 'CAD'
): Promise<ChatResponse> {
  const context: QueryContext = { storage, companyId, homeCurrency };

  // Try to match query against patterns
  for (const { patterns, handler } of queryPatterns) {
    for (const pattern of patterns) {
      const match = query.match(pattern);
      if (match) {
        try {
          return await handler(match, context);
        } catch (error) {
          console.error('Error processing AI chat query:', error);
          return {
            message: "I encountered an error processing your request. Please try again.",
          };
        }
      }
    }
  }

  // No pattern matched - provide helpful response
  return {
    message: `I'm not sure how to help with that. Try asking about:\n\n` +
      `• Your monthly summary\n` +
      `• Expenses or revenue\n` +
      `• Unpaid invoices or bills\n` +
      `• Top customers\n\n` +
      `Or type "help" for more options.`,
  };
}
