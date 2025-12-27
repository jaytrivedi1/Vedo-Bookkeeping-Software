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

interface FinancialSummary {
  currentMonth: {
    revenue: number;
    expenses: number;
    netIncome: number;
    transactionCount: number;
  };
  unpaidInvoices: {
    count: number;
    total: number;
    overdue: number;
  };
  unpaidBills: {
    count: number;
    total: number;
    overdue: number;
  };
  cashBalance: number;
  recentTransactions: Array<{
    date: string;
    type: string;
    description: string;
    amount: number;
  }>;
  topCustomers: Array<{ name: string; revenue: number }>;
  topVendors: Array<{ name: string; spend: number }>;
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

// Build financial context for AI
async function buildFinancialContext(ctx: QueryContext): Promise<FinancialSummary> {
  const now = new Date();
  const monthStart = startOfMonth(now);

  // Get all data in parallel
  const [transactions, accounts, contacts] = await Promise.all([
    ctx.storage.getTransactions(),
    ctx.storage.getAccounts(),
    ctx.storage.getContacts(),
  ]);

  const contactMap = new Map(contacts.map(c => [c.id, c.name]));

  // Current month transactions
  const monthTransactions = transactions.filter(t => {
    const txDate = new Date(t.date);
    return txDate >= monthStart && txDate <= now;
  });

  const revenue = monthTransactions
    .filter(t => t.type === 'deposit' || t.type === 'invoice' || t.type === 'sales_receipt')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const expenses = monthTransactions
    .filter(t => t.type === 'expense' || t.type === 'bill' || t.type === 'cheque')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  // Unpaid invoices
  const invoices = transactions.filter(t => t.type === 'invoice');
  const unpaidInvoices = invoices.filter(i => i.status === 'open' || i.status === 'overdue' || i.status === 'partial');
  const overdueInvoices = unpaidInvoices.filter(i => i.status === 'overdue');

  // Unpaid bills
  const bills = transactions.filter(t => t.type === 'bill');
  const unpaidBills = bills.filter(b => b.status === 'open' || b.status === 'overdue' || b.status === 'partial');
  const overdueBills = unpaidBills.filter(b => b.status === 'overdue');

  // Cash balance (bank accounts and cash-related accounts by name)
  const bankAccounts = accounts.filter(a =>
    a.type === 'bank' ||
    a.name.toLowerCase().includes('bank') || a.name.toLowerCase().includes('cash')
  );
  const cashBalance = bankAccounts.reduce((sum, a) => sum + Number(a.balance || 0), 0);

  // Recent transactions
  const recentTransactions = transactions.slice(0, 10).map(t => ({
    date: format(new Date(t.date), 'yyyy-MM-dd'),
    type: t.type,
    description: t.description || contactMap.get(t.contactId || 0) || 'Unknown',
    amount: Number(t.amount || 0),
  }));

  // Top customers
  const customerRevenue: Record<string, { name: string; revenue: number }> = {};
  invoices.filter(i => i.status === 'paid').forEach(inv => {
    const name = contactMap.get(inv.contactId || 0) || 'Unknown';
    if (!customerRevenue[name]) customerRevenue[name] = { name, revenue: 0 };
    customerRevenue[name].revenue += Number(inv.amount || 0);
  });
  const topCustomers = Object.values(customerRevenue)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // Top vendors
  const vendorSpend: Record<string, { name: string; spend: number }> = {};
  transactions.filter(t => t.type === 'bill' || t.type === 'expense').forEach(bill => {
    const name = contactMap.get(bill.contactId || 0) || 'Unknown';
    if (!vendorSpend[name]) vendorSpend[name] = { name, spend: 0 };
    vendorSpend[name].spend += Number(bill.amount || 0);
  });
  const topVendors = Object.values(vendorSpend)
    .sort((a, b) => b.spend - a.spend)
    .slice(0, 5);

  return {
    currentMonth: {
      revenue,
      expenses,
      netIncome: revenue - expenses,
      transactionCount: monthTransactions.length,
    },
    unpaidInvoices: {
      count: unpaidInvoices.length,
      total: unpaidInvoices.reduce((sum, i) => sum + Number(i.balance || i.amount || 0), 0),
      overdue: overdueInvoices.length,
    },
    unpaidBills: {
      count: unpaidBills.length,
      total: unpaidBills.reduce((sum, b) => sum + Number(b.balance || b.amount || 0), 0),
      overdue: overdueBills.length,
    },
    cashBalance,
    recentTransactions,
    topCustomers,
    topVendors,
  };
}

// Call OpenAI for complex queries
async function askOpenAI(query: string, ctx: QueryContext): Promise<ChatResponse> {
  try {
    // Check if OpenAI API key is available
    const apiKey = process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
    if (!apiKey) {
      console.log('OpenAI API key not configured, falling back to default response');
      return {
        message: `I'm not sure how to help with that specific question. Try asking about:\n\n` +
          `• Your monthly summary or financial overview\n` +
          `• Expenses or revenue for a specific period\n` +
          `• Unpaid invoices or bills\n` +
          `• Top customers or vendors\n` +
          `• Cash or bank balance\n\n` +
          `Or type "help" for more options.`,
      };
    }

    // Build financial context
    const financialData = await buildFinancialContext(ctx);

    // Dynamic import of OpenAI
    const OpenAI = (await import('openai')).default;
    const openai = new OpenAI({
      apiKey,
      baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
    });

    const systemPrompt = `You are Vedo AI, a helpful financial assistant for a small business bookkeeping application.
You have access to the user's financial data and can answer questions about their business finances.

Current date: ${format(new Date(), 'MMMM d, yyyy')}
Currency: ${ctx.homeCurrency}

Here is the user's current financial summary:

**This Month (${format(startOfMonth(new Date()), 'MMMM yyyy')}):**
- Revenue: ${formatCurrency(financialData.currentMonth.revenue, ctx.homeCurrency)}
- Expenses: ${formatCurrency(financialData.currentMonth.expenses, ctx.homeCurrency)}
- Net Income: ${formatCurrency(financialData.currentMonth.netIncome, ctx.homeCurrency)}
- Transactions: ${financialData.currentMonth.transactionCount}

**Outstanding Receivables:**
- Unpaid Invoices: ${financialData.unpaidInvoices.count} totaling ${formatCurrency(financialData.unpaidInvoices.total, ctx.homeCurrency)}
- Overdue: ${financialData.unpaidInvoices.overdue}

**Bills to Pay:**
- Unpaid Bills: ${financialData.unpaidBills.count} totaling ${formatCurrency(financialData.unpaidBills.total, ctx.homeCurrency)}
- Overdue: ${financialData.unpaidBills.overdue}

**Cash Position:**
- Total Cash & Bank Balance: ${formatCurrency(financialData.cashBalance, ctx.homeCurrency)}

**Top 5 Customers by Revenue:**
${financialData.topCustomers.map((c, i) => `${i + 1}. ${c.name}: ${formatCurrency(c.revenue, ctx.homeCurrency)}`).join('\n')}

**Top 5 Vendors by Spend:**
${financialData.topVendors.map((v, i) => `${i + 1}. ${v.name}: ${formatCurrency(v.spend, ctx.homeCurrency)}`).join('\n')}

**Recent Transactions:**
${financialData.recentTransactions.map(t => `- ${t.date} | ${t.type} | ${t.description} | ${formatCurrency(t.amount, ctx.homeCurrency)}`).join('\n')}

Guidelines:
1. Be concise but helpful. Keep responses focused and actionable.
2. Use the financial data provided to give accurate answers.
3. When appropriate, suggest relevant actions the user might want to take.
4. Format numbers as currency with appropriate symbols.
5. Be conversational and friendly, but professional.
6. If you don't have enough information to answer accurately, say so.
7. Don't make up data - only use what's provided above.
8. Use markdown formatting for readability (bold for emphasis, bullet points for lists).`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: query },
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    const aiMessage = response.choices[0]?.message?.content || 'I apologize, but I was unable to process your request.';

    // Parse the response to potentially extract suggested actions
    const suggestedActions: ChatAction[] = [];

    // Add relevant actions based on query content
    if (query.toLowerCase().includes('invoice') || aiMessage.toLowerCase().includes('invoice')) {
      suggestedActions.push({ label: 'View Invoices', action: 'navigate', params: { path: '/invoices' } });
    }
    if (query.toLowerCase().includes('expense') || aiMessage.toLowerCase().includes('expense')) {
      suggestedActions.push({ label: 'View Expenses', action: 'navigate', params: { path: '/expenses' } });
    }
    if (query.toLowerCase().includes('bill') || aiMessage.toLowerCase().includes('bills to pay')) {
      suggestedActions.push({ label: 'Pay Bills', action: 'navigate', params: { path: '/pay-bill' } });
    }
    if (query.toLowerCase().includes('report') || query.toLowerCase().includes('p&l') || query.toLowerCase().includes('profit')) {
      suggestedActions.push({ label: 'View Reports', action: 'navigate', params: { path: '/reports' } });
    }
    if (query.toLowerCase().includes('customer')) {
      suggestedActions.push({ label: 'View Customers', action: 'navigate', params: { path: '/customers' } });
    }

    return {
      message: aiMessage,
      actions: suggestedActions.length > 0 ? suggestedActions.slice(0, 2) : undefined,
    };

  } catch (error) {
    console.error('OpenAI API error:', error);
    return {
      message: `I encountered an issue processing your question. Please try rephrasing it, or ask about:\n\n` +
        `• Monthly financial summary\n` +
        `• Revenue or expenses\n` +
        `• Unpaid invoices or bills\n` +
        `• Cash balance`,
    };
  }
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

      // Get all transactions (storage doesn't take companyId - single tenant)
      const transactions = await ctx.storage.getTransactions();
      const periodTransactions = transactions.filter(t => {
        const txDate = new Date(t.date);
        return txDate >= dateRange.startDate && txDate <= dateRange.endDate;
      });

      const revenue = periodTransactions
        .filter(t => t.type === 'deposit' || t.type === 'invoice' || t.type === 'sales_receipt')
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);

      const expenses = periodTransactions
        .filter(t => t.type === 'expense' || t.type === 'bill' || t.type === 'cheque')
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);

      const netIncome = revenue - expenses;

      // Get unpaid invoices (invoices are transactions with type='invoice')
      const unpaidInvoices = transactions.filter(i =>
        i.type === 'invoice' && (i.status === 'open' || i.status === 'overdue' || i.status === 'partial')
      );
      const unpaidTotal = unpaidInvoices.reduce((sum, i) => sum + Number(i.balance || i.amount || 0), 0);

      // Get unpaid bills
      const unpaidBills = transactions.filter(b =>
        b.type === 'bill' && (b.status === 'open' || b.status === 'overdue' || b.status === 'partial')
      );
      const unpaidBillsTotal = unpaidBills.reduce((sum, b) => sum + Number(b.balance || b.amount || 0), 0);

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

      const transactions = await ctx.storage.getTransactions();
      const expenses = transactions.filter(t => {
        const txDate = new Date(t.date);
        return (t.type === 'expense' || t.type === 'bill' || t.type === 'cheque') &&
          txDate >= dateRange.startDate && txDate <= dateRange.endDate;
      });

      const total = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);

      // Group by category/account
      const byAccount: Record<string, number> = {};
      for (const exp of expenses) {
        const accountName = (exp as any).lineItems?.[0]?.accountName || 'Uncategorized';
        byAccount[accountName] = (byAccount[accountName] || 0) + Number(exp.amount || 0);
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

  // ===== OVERDUE INVOICES (specific) =====
  {
    patterns: [
      /(?:show|list|get|what\s+are)\s+(?:me\s+)?(?:my|our|the)?\s*overdue\s+invoices/i,
      /overdue\s+invoices/i,
      /invoices?\s+(?:that\s+are\s+)?overdue/i,
      /late\s+invoices/i,
      /past\s+due\s+invoices/i,
    ],
    handler: async (match, ctx) => {
      const transactions = await ctx.storage.getTransactions();
      const invoices = transactions.filter(t => t.type === 'invoice');
      const overdue = invoices.filter(i => i.status === 'overdue');

      const total = overdue.reduce((sum, i) => sum + Number(i.balance || i.amount || 0), 0);

      if (overdue.length === 0) {
        return {
          message: `Great news! You have **no overdue invoices** at the moment. 🎉`,
          actions: [
            { label: 'View All Invoices', action: 'navigate', params: { path: '/invoices' } },
          ]
        };
      }

      let message = `⚠️ You have **${overdue.length} overdue invoice${overdue.length > 1 ? 's' : ''}** totaling **${formatCurrency(total, ctx.homeCurrency)}**.\n\n`;

      // Get contacts for customer names
      const contacts = await ctx.storage.getContacts();
      const contactMap = new Map(contacts.map(c => [c.id, c.name]));

      // Show all overdue (up to 10)
      const topOverdue = overdue
        .sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0))
        .slice(0, 10);

      const tableData = {
        type: 'table',
        headers: ['Invoice', 'Customer', 'Amount', 'Due Date'],
        rows: topOverdue.map(inv => [
          inv.reference || `#${inv.id}`,
          contactMap.get(inv.contactId || 0) || 'Unknown',
          formatCurrency(Number(inv.balance || inv.amount || 0), ctx.homeCurrency),
          inv.dueDate ? format(new Date(inv.dueDate), 'MMM d, yyyy') : '-'
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
  },

  // ===== UNPAID INVOICES =====
  {
    patterns: [
      /(?:show|list|get|what\s+are)\s+(?:me\s+)?(?:my|our|the)?\s*unpaid\s+invoices/i,
      /unpaid\s+invoices/i,
      /outstanding\s+invoices/i,
      /invoices?\s+(?:that\s+are\s+)?(?:unpaid|outstanding)/i,
      /(?:who|which\s+customers?)\s+(?:owes?|haven't\s+paid)/i,
      /accounts?\s+receivable/i,
    ],
    handler: async (match, ctx) => {
      const transactions = await ctx.storage.getTransactions();
      const invoices = transactions.filter(t => t.type === 'invoice');
      const unpaid = invoices.filter(i => i.status === 'open' || i.status === 'overdue' || i.status === 'partial');

      const total = unpaid.reduce((sum, i) => sum + Number(i.balance || i.amount || 0), 0);
      const overdue = unpaid.filter(i => i.status === 'overdue');
      const overdueTotal = overdue.reduce((sum, i) => sum + Number(i.balance || i.amount || 0), 0);

      let message = `You have **${unpaid.length} unpaid invoices** totaling **${formatCurrency(total, ctx.homeCurrency)}**.\n\n`;

      if (overdue.length > 0) {
        message += `⚠️ **${overdue.length} are overdue** (${formatCurrency(overdueTotal, ctx.homeCurrency)})\n\n`;
      }

      // Show top 5 largest unpaid
      const topUnpaid = unpaid
        .sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0))
        .slice(0, 5);

      if (topUnpaid.length > 0) {
        // Get contacts for customer names
        const contacts = await ctx.storage.getContacts();
        const contactMap = new Map(contacts.map(c => [c.id, c.name]));

        const tableData = {
          type: 'table',
          headers: ['Invoice', 'Customer', 'Amount', 'Status'],
          rows: topUnpaid.map(inv => [
            inv.reference || `#${inv.id}`,
            contactMap.get(inv.contactId || 0) || 'Unknown',
            formatCurrency(Number(inv.balance || inv.amount || 0), ctx.homeCurrency),
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

      const transactions = await ctx.storage.getTransactions();
      const invoices = transactions.filter(t => t.type === 'invoice');
      const paidInvoices = invoices.filter(i => i.status === 'paid');

      // Get contacts for names
      const contacts = await ctx.storage.getContacts();
      const contactMap = new Map(contacts.map(c => [c.id, c.name]));

      // Group by customer
      const byCustomer: Record<string, { name: string; total: number; count: number }> = {};
      for (const inv of paidInvoices) {
        const customerId = inv.contactId?.toString() || 'unknown';
        const name = contactMap.get(inv.contactId || 0) || 'Unknown Customer';
        if (!byCustomer[customerId]) {
          byCustomer[customerId] = { name, total: 0, count: 0 };
        }
        byCustomer[customerId].total += Number(inv.amount || 0);
        byCustomer[customerId].count += 1;
      }

      const topCustomers = Object.values(byCustomer)
        .sort((a, b) => b.total - a.total)
        .slice(0, limit);

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

      const transactions = await ctx.storage.getTransactions();
      const revenue = transactions.filter(t => {
        const txDate = new Date(t.date);
        return (t.type === 'deposit' || t.type === 'invoice' || t.type === 'sales_receipt') &&
          txDate >= dateRange.startDate && txDate <= dateRange.endDate;
      });

      const total = revenue.reduce((sum, r) => sum + Number(r.amount || 0), 0);

      // Compare to previous period
      const periodLength = dateRange.endDate.getTime() - dateRange.startDate.getTime();
      const prevStart = new Date(dateRange.startDate.getTime() - periodLength);
      const prevEnd = new Date(dateRange.endDate.getTime() - periodLength);

      const prevRevenue = transactions.filter(t => {
        const txDate = new Date(t.date);
        return (t.type === 'deposit' || t.type === 'invoice' || t.type === 'sales_receipt') &&
          txDate >= prevStart && txDate <= prevEnd;
      });
      const prevTotal = prevRevenue.reduce((sum, r) => sum + Number(r.amount || 0), 0);

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

  // ===== OVERDUE BILLS (specific) =====
  {
    patterns: [
      /(?:show|list|get|what\s+are)\s+(?:me\s+)?(?:my|our|the)?\s*overdue\s+bills/i,
      /overdue\s+bills/i,
      /bills?\s+(?:that\s+are\s+)?overdue/i,
      /late\s+bills/i,
      /past\s+due\s+bills/i,
    ],
    handler: async (match, ctx) => {
      const transactions = await ctx.storage.getTransactions();
      const bills = transactions.filter(t => t.type === 'bill');
      const overdue = bills.filter(b => b.status === 'overdue');

      const total = overdue.reduce((sum, b) => sum + Number(b.balance || b.amount || 0), 0);

      if (overdue.length === 0) {
        return {
          message: `Great news! You have **no overdue bills** at the moment. 🎉`,
          actions: [
            { label: 'View All Bills', action: 'navigate', params: { path: '/pay-bill' } },
          ]
        };
      }

      let message = `⚠️ You have **${overdue.length} overdue bill${overdue.length > 1 ? 's' : ''}** totaling **${formatCurrency(total, ctx.homeCurrency)}**.\n\n`;

      // Get contacts for vendor names
      const contacts = await ctx.storage.getContacts();
      const contactMap = new Map(contacts.map(c => [c.id, c.name]));

      // Show all overdue (up to 10)
      const topOverdue = overdue
        .sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0))
        .slice(0, 10);

      const tableData = {
        type: 'table',
        headers: ['Bill', 'Vendor', 'Amount', 'Due Date'],
        rows: topOverdue.map(bill => [
          bill.reference || `#${bill.id}`,
          contactMap.get(bill.contactId || 0) || 'Unknown',
          formatCurrency(Number(bill.balance || bill.amount || 0), ctx.homeCurrency),
          bill.dueDate ? format(new Date(bill.dueDate), 'MMM d, yyyy') : '-'
        ])
      };

      return {
        message,
        data: tableData,
        actions: [
          { label: 'Pay Bills Now', action: 'navigate', params: { path: '/pay-bill' } },
        ]
      };
    }
  },

  // ===== UNPAID BILLS =====
  {
    patterns: [
      /(?:show|list|get|what\s+are)\s+(?:me\s+)?(?:my|our|the)?\s*unpaid\s+bills/i,
      /unpaid\s+bills/i,
      /bills?\s+(?:to\s+pay|outstanding)/i,
      /(?:what|how\s+much)\s+do\s+(?:we|i)\s+owe/i,
      /accounts?\s+payable/i,
    ],
    handler: async (match, ctx) => {
      const transactions = await ctx.storage.getTransactions();
      const bills = transactions.filter(t => t.type === 'bill');
      const unpaid = bills.filter(b => b.status === 'open' || b.status === 'overdue' || b.status === 'partial');

      const total = unpaid.reduce((sum, b) => sum + Number(b.balance || b.amount || 0), 0);
      const overdue = unpaid.filter(b => b.status === 'overdue');
      const overdueTotal = overdue.reduce((sum, b) => sum + Number(b.balance || b.amount || 0), 0);

      let message = `You have **${unpaid.length} unpaid bills** totaling **${formatCurrency(total, ctx.homeCurrency)}**.\n\n`;

      if (overdue.length > 0) {
        message += `⚠️ **${overdue.length} are overdue** (${formatCurrency(overdueTotal, ctx.homeCurrency)})\n\n`;
      }

      // Show top 5 bills
      const topBills = unpaid
        .sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0))
        .slice(0, 5);

      if (topBills.length > 0) {
        // Get contacts for vendor names
        const contacts = await ctx.storage.getContacts();
        const contactMap = new Map(contacts.map(c => [c.id, c.name]));

        const tableData = {
          type: 'table',
          headers: ['Bill', 'Vendor', 'Amount', 'Due'],
          rows: topBills.map(bill => [
            bill.reference || `#${bill.id}`,
            contactMap.get(bill.contactId || 0) || 'Unknown',
            formatCurrency(Number(bill.balance || bill.amount || 0), ctx.homeCurrency),
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

  // ===== BANK/CASH BALANCE =====
  {
    patterns: [
      /(?:what(?:'s|is)|show|get)\s+(?:my|our|the)?\s*(?:cash|bank)\s*balance/i,
      /how\s+much\s+(?:cash|money)\s+(?:do\s+)?(?:we|i)\s+have/i,
      /(?:cash|bank)\s+(?:on\s+hand|available)/i,
      /(?:what(?:'s|is)|show)\s+(?:in\s+)?(?:my|our|the)?\s*bank/i,
    ],
    handler: async (match, ctx) => {
      const accounts = await ctx.storage.getAccounts();

      // Get bank and cash accounts
      const bankAccounts = accounts.filter(a =>
        a.type === 'bank' || a.name.toLowerCase().includes('bank') || a.name.toLowerCase().includes('cash')
      );

      const totalCash = bankAccounts.reduce((sum, a) => sum + Number(a.balance || 0), 0);

      let message = `💵 **Total Cash & Bank Balance:** ${formatCurrency(totalCash, ctx.homeCurrency)}\n\n`;

      if (bankAccounts.length > 0) {
        message += `**Account Breakdown:**\n`;
        bankAccounts.forEach(acc => {
          message += `• ${acc.name}: ${formatCurrency(Number(acc.balance || 0), ctx.homeCurrency)}\n`;
        });
      }

      return {
        message,
        data: {
          type: 'summary',
          metrics: {
            'Total Cash': formatCurrency(totalCash, ctx.homeCurrency),
            'Bank Accounts': bankAccounts.length.toString(),
          }
        },
        actions: [
          { label: 'View Chart of Accounts', action: 'navigate', params: { path: '/chart-of-accounts' } },
        ]
      };
    }
  },

  // ===== RECENT TRANSACTIONS =====
  {
    patterns: [
      /(?:show|list|get)\s+(?:me\s+)?(?:recent|latest|last)\s+transactions/i,
      /what\s+(?:happened|transactions)\s+(?:today|yesterday|recently)/i,
      /(?:recent|latest)\s+(?:activity|transactions)/i,
    ],
    handler: async (match, ctx) => {
      const transactions = await ctx.storage.getTransactions();
      const recent = transactions.slice(0, 10); // Get 10 most recent

      const contacts = await ctx.storage.getContacts();
      const contactMap = new Map(contacts.map(c => [c.id, c.name]));

      let message = `Here are your **${recent.length} most recent transactions**:\n\n`;

      const tableData = {
        type: 'table',
        headers: ['Date', 'Type', 'Description', 'Amount'],
        rows: recent.map(t => [
          format(new Date(t.date), 'MMM d'),
          t.type.charAt(0).toUpperCase() + t.type.slice(1).replace('_', ' '),
          t.description || contactMap.get(t.contactId || 0) || '-',
          formatCurrency(Number(t.amount || 0), ctx.homeCurrency)
        ])
      };

      return {
        message,
        data: tableData,
        actions: [
          { label: 'View Banking', action: 'navigate', params: { path: '/banking' } },
        ]
      };
    }
  },

  // ===== TRANSACTION COUNTS =====
  {
    patterns: [
      /how\s+many\s+(?:invoices|bills|expenses|transactions)/i,
      /(?:count|number\s+of)\s+(?:invoices|bills|expenses|transactions)/i,
    ],
    handler: async (match, ctx) => {
      const dateRange = parseDateReference(match.input || '') || {
        startDate: startOfMonth(new Date()),
        endDate: new Date()
      };

      const transactions = await ctx.storage.getTransactions();
      const periodTransactions = transactions.filter(t => {
        const txDate = new Date(t.date);
        return txDate >= dateRange.startDate && txDate <= dateRange.endDate;
      });

      const invoiceCount = periodTransactions.filter(t => t.type === 'invoice').length;
      const billCount = periodTransactions.filter(t => t.type === 'bill').length;
      const expenseCount = periodTransactions.filter(t => t.type === 'expense').length;
      const depositCount = periodTransactions.filter(t => t.type === 'deposit').length;

      const periodLabel = format(dateRange.startDate, 'MMM d') + ' - ' + format(dateRange.endDate, 'MMM d, yyyy');

      return {
        message: `📊 **Transaction counts for ${periodLabel}:**\n\n` +
          `📄 Invoices: **${invoiceCount}**\n` +
          `📥 Bills: **${billCount}**\n` +
          `💸 Expenses: **${expenseCount}**\n` +
          `💰 Deposits: **${depositCount}**\n` +
          `\n**Total:** ${periodTransactions.length} transactions`,
        data: {
          type: 'summary',
          metrics: {
            'Invoices': invoiceCount.toString(),
            'Bills': billCount.toString(),
            'Expenses': expenseCount.toString(),
            'Deposits': depositCount.toString(),
          }
        }
      };
    }
  },

  // ===== PROFIT/LOSS =====
  {
    patterns: [
      /(?:what(?:'s|is)|show)\s+(?:my|our|the)?\s*(?:profit|net\s+income|bottom\s+line)/i,
      /(?:are|am)\s+(?:we|i)\s+(?:profitable|making\s+money)/i,
      /profit\s+(?:and\s+)?loss/i,
      /p\s*&\s*l/i,
    ],
    handler: async (match, ctx) => {
      const dateRange = parseDateReference(match.input || '') || {
        startDate: startOfMonth(new Date()),
        endDate: new Date()
      };

      const transactions = await ctx.storage.getTransactions();
      const periodTransactions = transactions.filter(t => {
        const txDate = new Date(t.date);
        return txDate >= dateRange.startDate && txDate <= dateRange.endDate;
      });

      const revenue = periodTransactions
        .filter(t => t.type === 'deposit' || t.type === 'invoice' || t.type === 'sales_receipt')
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);

      const expenses = periodTransactions
        .filter(t => t.type === 'expense' || t.type === 'bill' || t.type === 'cheque')
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);

      const profit = revenue - expenses;
      const profitMargin = revenue > 0 ? (profit / revenue * 100).toFixed(1) : '0';
      const isProfitable = profit >= 0;

      const periodLabel = format(dateRange.startDate, 'MMMM yyyy');

      return {
        message: `📈 **Profit & Loss for ${periodLabel}:**\n\n` +
          `Revenue: ${formatCurrency(revenue, ctx.homeCurrency)}\n` +
          `Expenses: ${formatCurrency(expenses, ctx.homeCurrency)}\n` +
          `\n${isProfitable ? '✅' : '⚠️'} **Net ${isProfitable ? 'Profit' : 'Loss'}:** ${formatCurrency(Math.abs(profit), ctx.homeCurrency)}\n` +
          `📊 Profit Margin: **${profitMargin}%**`,
        data: {
          type: 'summary',
          metrics: {
            'Revenue': formatCurrency(revenue, ctx.homeCurrency),
            'Expenses': formatCurrency(expenses, ctx.homeCurrency),
            'Net Profit': formatCurrency(profit, ctx.homeCurrency),
            'Profit Margin': `${profitMargin}%`,
          }
        },
        actions: [
          { label: 'View P&L Report', action: 'navigate', params: { path: '/reports' } },
        ]
      };
    }
  },

  // ===== TOP VENDORS =====
  {
    patterns: [
      /(?:who\s+are|show|list)\s+(?:my|our|the)?\s*top\s+(?:\d+\s+)?vendors?/i,
      /(?:biggest|largest)\s+vendors?/i,
      /vendors?\s+by\s+(?:spend|expense|amount)/i,
      /who\s+do\s+(?:we|i)\s+pay\s+(?:the\s+)?most/i,
    ],
    handler: async (match, ctx) => {
      const numMatch = match.input?.match(/top\s+(\d+)/i);
      const limit = numMatch ? parseInt(numMatch[1]) : 5;

      const transactions = await ctx.storage.getTransactions();
      const bills = transactions.filter(t => t.type === 'bill' || t.type === 'expense');

      const contacts = await ctx.storage.getContacts();
      const contactMap = new Map(contacts.map(c => [c.id, c.name]));

      const byVendor: Record<string, { name: string; total: number; count: number }> = {};
      for (const bill of bills) {
        const vendorId = bill.contactId?.toString() || 'unknown';
        const name = contactMap.get(bill.contactId || 0) || 'Unknown Vendor';
        if (!byVendor[vendorId]) {
          byVendor[vendorId] = { name, total: 0, count: 0 };
        }
        byVendor[vendorId].total += Number(bill.amount || 0);
        byVendor[vendorId].count += 1;
      }

      const topVendors = Object.values(byVendor)
        .sort((a, b) => b.total - a.total)
        .slice(0, limit);

      let message = `Here are your top ${limit} vendors by spend:\n\n`;

      const tableData = {
        type: 'table',
        headers: ['Vendor', 'Total Spend', 'Transactions'],
        rows: topVendors.map((v, i) => [
          `${i + 1}. ${v.name}`,
          formatCurrency(v.total, ctx.homeCurrency),
          v.count.toString()
        ])
      };

      return {
        message,
        data: tableData,
        actions: [
          { label: 'View Expenses', action: 'navigate', params: { path: '/expenses' } },
        ]
      };
    }
  },

  // ===== GREETINGS =====
  {
    patterns: [
      /^(?:hi|hello|hey|good\s+(?:morning|afternoon|evening))$/i,
      /^(?:what's\s+up|howdy|greetings)$/i,
    ],
    handler: async () => {
      return {
        message: `Hello! 👋 I'm your AI-powered financial assistant. How can I help you today?\n\n` +
          `Try asking me:\n` +
          `• "How are we doing this month?"\n` +
          `• "Show me unpaid invoices"\n` +
          `• "What's our cash balance?"\n` +
          `• "Who are our top customers?"\n\n` +
          `You can also ask complex questions and I'll analyze your data!`,
      };
    }
  },

  // ===== THANKS =====
  {
    patterns: [
      /^(?:thanks|thank\s+you|thx|ty)$/i,
      /(?:thanks|thank\s+you)\s+(?:for\s+)?(?:your\s+)?(?:help|that|the\s+info)/i,
    ],
    handler: async () => {
      return {
        message: `You're welcome! 😊 Let me know if you need anything else.`,
      };
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
          `👥 **Customers:** "Who are my top 5 customers?"\n` +
          `🏦 **Bank:** "What's our cash balance?"\n` +
          `📈 **Profit:** "Are we profitable?"\n` +
          `🔄 **Recent:** "Show recent transactions"\n\n` +
          `💡 **Pro tip:** You can also ask complex questions in natural language - I'm powered by AI and can analyze your financial data to answer questions like:\n` +
          `• "Should I be worried about my cash flow?"\n` +
          `• "How does this month compare to last month?"\n` +
          `• "What are my biggest expense categories?"`,
        data: {
          type: 'list',
          items: [
            'Monthly/weekly summaries',
            'Revenue and expense tracking',
            'Unpaid invoices and bills',
            'Cash and bank balances',
            'Top customers and vendors',
            'Profit & loss analysis',
            'Recent transactions',
            'Complex financial questions (AI-powered)',
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

  // No pattern matched - use OpenAI for complex/natural language queries
  console.log('No pattern match, falling back to OpenAI for query:', query);
  return await askOpenAI(query, context);
}
