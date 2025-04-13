import express, { type Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertAccountSchema, 
  insertContactSchema, 
  insertTransactionSchema, 
  insertLineItemSchema, 
  insertLedgerEntrySchema,
  insertSalesTaxSchema,
  insertProductSchema,
  invoiceSchema,
  expenseSchema,
  journalEntrySchema,
  depositSchema
} from "@shared/schema";
import { z } from "zod";
import { ZodError } from "zod-validation-error";

export async function registerRoutes(app: Express): Promise<Server> {
  // API routes
  const apiRouter = express.Router();
  
  // Accounts routes
  apiRouter.get("/accounts", async (req: Request, res: Response) => {
    try {
      const accounts = await storage.getAccounts();
      res.json(accounts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch accounts" });
    }
  });

  apiRouter.get("/accounts/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const account = await storage.getAccount(id);
      
      if (!account) {
        return res.status(404).json({ message: "Account not found" });
      }
      
      res.json(account);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch account" });
    }
  });

  apiRouter.post("/accounts", async (req: Request, res: Response) => {
    try {
      console.log("Request body:", req.body);
      const accountData = insertAccountSchema.parse(req.body);
      console.log("Parsed account data:", accountData);
      const account = await storage.createAccount(accountData);
      res.status(201).json(account);
    } catch (error) {
      console.error("Error creating account:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid account data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create account" });
    }
  });
  
  apiRouter.patch("/accounts/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      // Allow partial data for update (don't require all fields)
      const accountData = insertAccountSchema.partial().parse(req.body);
      const account = await storage.updateAccount(id, accountData);
      
      if (!account) {
        return res.status(404).json({ message: "Account not found" });
      }
      
      res.json(account);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid account data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update account" });
    }
  });

  // Contacts routes
  apiRouter.get("/contacts", async (req: Request, res: Response) => {
    try {
      const contacts = await storage.getContacts();
      res.json(contacts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch contacts" });
    }
  });

  apiRouter.get("/contacts/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const contact = await storage.getContact(id);
      
      if (!contact) {
        return res.status(404).json({ message: "Contact not found" });
      }
      
      res.json(contact);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch contact" });
    }
  });

  apiRouter.post("/contacts", async (req: Request, res: Response) => {
    try {
      const contactData = insertContactSchema.parse(req.body);
      const contact = await storage.createContact(contactData);
      res.status(201).json(contact);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid contact data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create contact" });
    }
  });

  // Transactions routes
  apiRouter.get("/transactions", async (req: Request, res: Response) => {
    try {
      const transactions = await storage.getTransactions();
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  apiRouter.get("/transactions/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const transaction = await storage.getTransaction(id);
      
      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      
      // Get related line items and ledger entries
      const lineItems = await storage.getLineItemsByTransaction(id);
      const ledgerEntries = await storage.getLedgerEntriesByTransaction(id);
      
      res.json({
        transaction,
        lineItems,
        ledgerEntries
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch transaction" });
    }
  });

  // Invoice routes
  apiRouter.post("/invoices", async (req: Request, res: Response) => {
    try {
      console.log("Invoice payload:", JSON.stringify(req.body));
      
      // Convert string dates to Date objects before validation
      const body = {
        ...req.body,
        date: new Date(req.body.date),
        dueDate: req.body.dueDate ? new Date(req.body.dueDate) : undefined
      };
      
      // Validate invoice data
      const result = invoiceSchema.safeParse(body);
      if (!result.success) {
        console.log("Invoice validation errors:", JSON.stringify(result.error));
        return res.status(400).json({ 
          message: "Invalid invoice data", 
          errors: result.error.errors 
        });
      }
      
      const invoiceData = result.data;
      
      // Calculate amount from line items or use provided total amount
      const totalAmount = invoiceData.totalAmount || 
        invoiceData.lineItems.reduce((sum, item) => sum + item.amount, 0);
      
      // Create transaction
      const transaction = {
        reference: invoiceData.reference,
        type: 'invoice' as const,
        date: invoiceData.date,
        description: invoiceData.description,
        amount: totalAmount,
        contactId: invoiceData.contactId,
        status: invoiceData.status
      };
      
      // Create line items
      const lineItems = invoiceData.lineItems.map(item => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        amount: item.amount,
        transactionId: 0 // Will be set by createTransaction
      }));
      
      // Create ledger entries - Double Entry Accounting
      // Debit Accounts Receivable, Credit Revenue and Sales Tax Payable
      const receivableAccount = await storage.getAccountByCode('1100'); // Accounts Receivable
      const revenueAccount = await storage.getAccountByCode('4000'); // Service Revenue
      
      // Get the sales tax account from the sales tax record if available
      let taxPayableAccount = null;
      if (invoiceData.salesTaxId) {
        const salesTax = await storage.getSalesTax(invoiceData.salesTaxId);
        if (salesTax && salesTax.accountId) {
          taxPayableAccount = await storage.getAccount(salesTax.accountId);
        }
      }
      
      // Fallback to default sales tax payable account if none found
      if (!taxPayableAccount) {
        taxPayableAccount = await storage.getAccountByCode('2100'); // Sales Tax Payable
      }
      
      if (!receivableAccount || !revenueAccount || !taxPayableAccount) {
        return res.status(500).json({ message: "Required accounts do not exist" });
      }
      
      // Calculate subtotal (revenue) and tax amounts
      const subTotal = invoiceData.subTotal || totalAmount / (1 + (invoiceData.taxRate || 0) / 100);
      const taxAmount = invoiceData.taxAmount || (totalAmount - subTotal);
      
      const ledgerEntries = [
        {
          accountId: receivableAccount.id,
          description: `Invoice ${transaction.reference}`,
          debit: totalAmount,  // Total invoice amount including tax
          credit: 0,
          date: transaction.date,
          transactionId: 0 // Will be set by createTransaction
        },
        {
          accountId: revenueAccount.id,
          description: `Invoice ${transaction.reference} - Revenue`,
          debit: 0,
          credit: subTotal,  // Revenue amount (subtotal)
          date: transaction.date,
          transactionId: 0 // Will be set by createTransaction
        },
        {
          accountId: taxPayableAccount.id,
          description: `Invoice ${transaction.reference} - Sales Tax`,
          debit: 0,
          credit: taxAmount,  // Tax amount only
          date: transaction.date,
          transactionId: 0 // Will be set by createTransaction
        }
      ];
      
      const newTransaction = await storage.createTransaction(transaction, lineItems, ledgerEntries);
      
      // Include additional invoice details in the response
      res.status(201).json({
        transaction: newTransaction,
        lineItems: await storage.getLineItemsByTransaction(newTransaction.id),
        ledgerEntries: await storage.getLedgerEntriesByTransaction(newTransaction.id),
        // Additional invoice details
        subTotal: invoiceData.subTotal,
        taxRate: invoiceData.taxRate,
        taxAmount: invoiceData.taxAmount,
        totalAmount: invoiceData.totalAmount || totalAmount,
        dueDate: invoiceData.dueDate,
        paymentTerms: invoiceData.paymentTerms
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid invoice data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create invoice", error: error });
    }
  });

  // Expense routes
  apiRouter.post("/expenses", async (req: Request, res: Response) => {
    try {
      // Convert string dates to Date objects before validation
      const body = {
        ...req.body,
        date: new Date(req.body.date)
      };
      
      const expenseData = expenseSchema.parse(body);
      
      // Create transaction
      const transaction = {
        reference: expenseData.reference,
        type: 'expense' as const,
        date: expenseData.date,
        description: expenseData.description,
        amount: expenseData.lineItems.reduce((sum, item) => sum + item.amount, 0),
        contactId: expenseData.contactId,
        status: expenseData.status
      };
      
      // Create line items
      const lineItems = expenseData.lineItems.map(item => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        amount: item.amount,
        transactionId: 0 // Will be set by createTransaction
      }));
      
      // Create ledger entries - Double Entry Accounting
      // Debit Expense, Credit Accounts Payable or Cash
      const expenseAccount = await storage.getAccountByCode('6900'); // Other Expenses
      const payableAccount = await storage.getAccountByCode('2000'); // Accounts Payable
      
      if (!expenseAccount || !payableAccount) {
        return res.status(500).json({ message: "Required accounts do not exist" });
      }
      
      const totalAmount = transaction.amount;
      const ledgerEntries = [
        {
          accountId: expenseAccount.id,
          description: `Expense ${transaction.reference}`,
          debit: totalAmount,
          credit: 0,
          date: transaction.date,
          transactionId: 0 // Will be set by createTransaction
        },
        {
          accountId: payableAccount.id,
          description: `Expense ${transaction.reference}`,
          debit: 0,
          credit: totalAmount,
          date: transaction.date,
          transactionId: 0 // Will be set by createTransaction
        }
      ];
      
      const newTransaction = await storage.createTransaction(transaction, lineItems, ledgerEntries);
      
      res.status(201).json({
        transaction: newTransaction,
        lineItems: await storage.getLineItemsByTransaction(newTransaction.id),
        ledgerEntries: await storage.getLedgerEntriesByTransaction(newTransaction.id)
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid expense data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create expense" });
    }
  });

  // Journal Entry routes
  apiRouter.post("/journal-entries", async (req: Request, res: Response) => {
    try {
      // Convert string dates to Date objects before validation
      const body = {
        ...req.body,
        date: new Date(req.body.date)
      };
      
      const journalData = journalEntrySchema.parse(body);
      
      // Validate debits = credits
      const totalDebits = journalData.entries.reduce((sum, entry) => sum + entry.debit, 0);
      const totalCredits = journalData.entries.reduce((sum, entry) => sum + entry.credit, 0);
      
      if (Math.abs(totalDebits - totalCredits) >= 0.01) {
        return res.status(400).json({ message: "Total debits must equal total credits" });
      }
      
      // Create transaction
      const transaction = {
        reference: journalData.reference,
        type: 'journal_entry' as const,
        date: journalData.date,
        description: journalData.description,
        amount: totalDebits, // Use total debits (which should equal total credits)
        contactId: null,
        status: 'completed' as const
      };
      
      // Empty line items for journal entries
      const lineItems: any[] = [];
      
      // Create ledger entries from the journal data
      const ledgerEntries = journalData.entries.map(entry => ({
        accountId: entry.accountId,
        description: entry.description || journalData.description,
        debit: entry.debit,
        credit: entry.credit,
        date: journalData.date,
        transactionId: 0 // Will be set by createTransaction
      }));
      
      const newTransaction = await storage.createTransaction(transaction, lineItems, ledgerEntries);
      
      res.status(201).json({
        transaction: newTransaction,
        ledgerEntries: await storage.getLedgerEntriesByTransaction(newTransaction.id)
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid journal entry data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create journal entry" });
    }
  });

  // Deposit routes
  apiRouter.post("/deposits", async (req: Request, res: Response) => {
    try {
      // Convert string dates to Date objects before validation
      const body = {
        ...req.body,
        date: new Date(req.body.date)
      };
      
      const depositData = depositSchema.parse(body);
      
      // Create transaction
      const transaction = {
        reference: depositData.reference,
        type: 'deposit' as const,
        date: depositData.date,
        description: depositData.description,
        amount: depositData.amount,
        contactId: null,
        status: 'completed' as const
      };
      
      // Empty line items for deposits
      const lineItems: any[] = [];
      
      // Create ledger entries - Double Entry Accounting
      // Debit Bank/Cash account, Credit Source account
      const ledgerEntries = [
        {
          accountId: depositData.destinationAccountId,
          description: `Deposit ${transaction.reference}`,
          debit: depositData.amount,
          credit: 0,
          date: depositData.date,
          transactionId: 0 // Will be set by createTransaction
        },
        {
          accountId: depositData.sourceAccountId,
          description: `Deposit ${transaction.reference}`,
          debit: 0,
          credit: depositData.amount,
          date: depositData.date,
          transactionId: 0 // Will be set by createTransaction
        }
      ];
      
      const newTransaction = await storage.createTransaction(transaction, lineItems, ledgerEntries);
      
      res.status(201).json({
        transaction: newTransaction,
        ledgerEntries: await storage.getLedgerEntriesByTransaction(newTransaction.id)
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid deposit data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create deposit" });
    }
  });

  // Sales Tax routes
  apiRouter.get("/sales-taxes", async (req: Request, res: Response) => {
    try {
      const salesTaxes = await storage.getSalesTaxes();
      res.json(salesTaxes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch sales taxes" });
    }
  });

  apiRouter.get("/sales-taxes/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const salesTax = await storage.getSalesTax(id);
      
      if (!salesTax) {
        return res.status(404).json({ message: "Sales tax not found" });
      }
      
      res.json(salesTax);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch sales tax" });
    }
  });

  apiRouter.post("/sales-taxes", async (req: Request, res: Response) => {
    try {
      const salesTaxData = insertSalesTaxSchema.parse(req.body);
      const salesTax = await storage.createSalesTax(salesTaxData);
      res.status(201).json(salesTax);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid sales tax data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create sales tax" });
    }
  });

  apiRouter.patch("/sales-taxes/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      // Allow partial data for update (don't require all fields)
      const salesTaxData = insertSalesTaxSchema.partial().parse(req.body);
      const salesTax = await storage.updateSalesTax(id, salesTaxData);
      
      if (!salesTax) {
        return res.status(404).json({ message: "Sales tax not found" });
      }
      
      res.json(salesTax);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid sales tax data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update sales tax" });
    }
  });

  apiRouter.delete("/sales-taxes/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteSalesTax(id);
      
      if (!success) {
        return res.status(404).json({ message: "Sales tax not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete sales tax" });
    }
  });

  // Reports routes
  apiRouter.get("/reports/income-statement", async (req: Request, res: Response) => {
    try {
      const incomeStatement = await storage.getIncomeStatement();
      res.json(incomeStatement);
    } catch (error) {
      res.status(500).json({ message: "Failed to generate income statement" });
    }
  });

  apiRouter.get("/reports/balance-sheet", async (req: Request, res: Response) => {
    try {
      const balanceSheet = await storage.getBalanceSheet();
      res.json(balanceSheet);
    } catch (error) {
      res.status(500).json({ message: "Failed to generate balance sheet" });
    }
  });

  apiRouter.get("/reports/account-balances", async (req: Request, res: Response) => {
    try {
      const accountBalances = await storage.getAccountBalances();
      res.json(accountBalances);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch account balances" });
    }
  });
  
  // Ledger entries route - needed for Account Books
  apiRouter.get("/ledger-entries", async (req: Request, res: Response) => {
    try {
      const ledgerEntries = await storage.getAllLedgerEntries();
      res.json(ledgerEntries);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch ledger entries" });
    }
  });
  
  // General Ledger report route - for date range filtering
  apiRouter.get("/reports/general-ledger", async (req: Request, res: Response) => {
    try {
      const startDateStr = req.query.startDate as string | undefined;
      const endDateStr = req.query.endDate as string | undefined;
      
      // Parse dates if provided
      const startDate = startDateStr ? new Date(startDateStr) : undefined;
      const endDate = endDateStr ? new Date(endDateStr) : undefined;
      
      // Get ledger entries for the date range
      const ledgerEntries = await storage.getLedgerEntriesByDateRange(startDate, endDate);
      
      // Get all accounts and transactions for reference
      const accounts = await storage.getAccounts();
      const transactions = await storage.getTransactions();
      
      // Create account and transaction lookup maps
      const accountMap = new Map(accounts.map(acc => [acc.id, acc]));
      const transactionMap = new Map(transactions.map(tx => [tx.id, tx]));
      
      // Enrich ledger entries with account and transaction data
      const enrichedEntries = ledgerEntries.map(entry => {
        const account = accountMap.get(entry.accountId);
        const transaction = transactionMap.get(entry.transactionId);
        
        return {
          ...entry,
          account: account ? {
            id: account.id,
            code: account.code,
            name: account.name,
            type: account.type
          } : null,
          transaction: transaction ? {
            id: transaction.id,
            type: transaction.type,
            reference: transaction.reference,
            date: transaction.date,
            status: transaction.status
          } : null
        };
      });
      
      res.json(enrichedEntries);
    } catch (error) {
      console.error("Error fetching general ledger:", error);
      res.status(500).json({ message: "Failed to fetch general ledger data" });
    }
  });

  // Banking routes for transaction classification and import
  apiRouter.post("/banking/classify", async (req: Request, res: Response) => {
    try {
      const { transactions, accountType, accountId } = req.body;
      
      if (!transactions || !Array.isArray(transactions)) {
        return res.status(400).json({ message: "Invalid transaction data format" });
      }
      
      // Process each classified transaction
      const processedTransactions = [];
      
      for (const transaction of transactions) {
        if (!transaction.accountId) {
          continue; // Skip unclassified transactions
        }
        
        // Determine the bank/credit account to use for the offsetting entry
        let bankAccountId = 1000; // Default to Cash account
        
        if (accountType === 'credit-card') {
          bankAccountId = 2000; // Credit Card Payable account
        } else if (accountType === 'line-of-credit') {
          bankAccountId = 2100; // Line of Credit account
        }
        
        // Amount handling based on payment or deposit
        const transactionAmount = transaction.payment > 0 ? transaction.payment : transaction.deposit;
        const isPayment = transaction.payment > 0;
        
        // Create a transaction record
        const newTransaction = await storage.createTransaction(
          {
            type: isPayment ? 'expense' : 'deposit',
            reference: transaction.chequeNo ? `Cheque #${transaction.chequeNo}` : `Banking import: ${transaction.description}`,
            amount: transactionAmount,
            date: new Date(transaction.date),
            description: transaction.description,
            status: 'completed',
            contactId: null
          },
          [], // No line items for bank transactions
          [
            // Create a ledger entry for the classified account
            {
              accountId: transaction.accountId,
              transactionId: 0, // Will be set by createTransaction
              date: new Date(transaction.date),
              description: transaction.description,
              debit: isPayment ? transactionAmount : 0,
              credit: !isPayment ? transactionAmount : 0
            },
            // Create the offset entry (bank/credit card account)
            {
              accountId: bankAccountId,
              transactionId: 0, // Will be set by createTransaction
              date: new Date(transaction.date),
              description: transaction.description,
              debit: !isPayment ? transactionAmount : 0,
              credit: isPayment ? transactionAmount : 0
            }
          ]
        );
        
        // Add sales tax entry if provided
        if (transaction.salesTax && transaction.salesTax > 0) {
          await storage.createLedgerEntry({
            accountId: 2200, // Sales Tax Payable account
            transactionId: newTransaction.id,
            date: new Date(transaction.date),
            description: `Sales tax for: ${transaction.description}`,
            debit: 0,
            credit: transaction.salesTax
          });
          
          // Adjust the main account entry to account for the tax
          const mainEntry = await storage.getLedgerEntriesByTransaction(newTransaction.id);
          if (mainEntry && mainEntry.length > 0) {
            const targetEntry = mainEntry.find(entry => entry.accountId === transaction.accountId);
            if (targetEntry) {
              if (isPayment) {
                // For payments, increase the debit to account for tax
                await storage.updateLedgerEntry(targetEntry.id, {
                  debit: targetEntry.debit + transaction.salesTax
                });
              } else {
                // For deposits, decrease the credit to account for tax
                await storage.updateLedgerEntry(targetEntry.id, {
                  credit: targetEntry.credit - transaction.salesTax
                });
              }
            }
          }
        }
        
        processedTransactions.push(newTransaction);
      }
      
      res.status(200).json({ 
        message: `Successfully classified ${processedTransactions.length} transactions`,
        transactions: processedTransactions
      });
    } catch (error) {
      console.error("Error classifying bank transactions:", error);
      res.status(500).json({ message: "Failed to process bank transactions" });
    }
  });

  app.use("/api", apiRouter);
  
  const httpServer = createServer(app);
  
  return httpServer;
}
