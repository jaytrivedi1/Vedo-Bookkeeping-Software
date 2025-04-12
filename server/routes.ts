import express, { type Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertAccountSchema, 
  insertContactSchema, 
  insertTransactionSchema, 
  insertLineItemSchema, 
  insertLedgerEntrySchema,
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
      const accountData = insertAccountSchema.parse(req.body);
      const account = await storage.createAccount(accountData);
      res.status(201).json(account);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid account data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create account" });
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
      const invoiceData = invoiceSchema.parse(req.body);
      
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
      // Debit Accounts Receivable, Credit Revenue
      const receivableAccount = await storage.getAccountByCode('1200'); // Accounts Receivable
      const revenueAccount = await storage.getAccountByCode('4000'); // Service Revenue
      
      if (!receivableAccount || !revenueAccount) {
        return res.status(500).json({ message: "Required accounts do not exist" });
      }
      
      const ledgerEntries = [
        {
          accountId: receivableAccount.id,
          description: `Invoice ${transaction.reference}`,
          debit: totalAmount,
          credit: 0,
          date: transaction.date,
          transactionId: 0 // Will be set by createTransaction
        },
        {
          accountId: revenueAccount.id,
          description: `Invoice ${transaction.reference}`,
          debit: 0,
          credit: totalAmount,
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
      const expenseData = expenseSchema.parse(req.body);
      
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
      const journalData = journalEntrySchema.parse(req.body);
      
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
      const depositData = depositSchema.parse(req.body);
      
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

  app.use("/api", apiRouter);
  
  const httpServer = createServer(app);
  
  return httpServer;
}
