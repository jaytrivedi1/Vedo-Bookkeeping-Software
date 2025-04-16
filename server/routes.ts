import express, { type Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { 
  insertAccountSchema, 
  insertContactSchema, 
  insertTransactionSchema, 
  insertLineItemSchema, 
  insertLedgerEntrySchema,
  insertSalesTaxSchema,
  insertProductSchema,
  insertCompanySchema,
  insertPreferencesSchema,
  invoiceSchema,
  expenseSchema,
  journalEntrySchema,
  depositSchema,
  Transaction,
  salesTaxSchema
} from "@shared/schema";
import { z } from "zod";
import { ZodError } from "zod-validation-error";
import { companyRouter } from "./company-routes";

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
  // Update an existing invoice
  apiRouter.patch("/invoices/:id", async (req: Request, res: Response) => {
    try {
      const invoiceId = parseInt(req.params.id);
      
      // Fetch the existing transaction to make sure it exists and is an invoice
      const existingTransaction = await storage.getTransaction(invoiceId);
      if (!existingTransaction) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      if (existingTransaction.type !== 'invoice') {
        return res.status(400).json({ message: "Transaction is not an invoice" });
      }
      
      // Convert string dates to Date objects before validation
      const body = {
        ...req.body,
        date: req.body.date ? new Date(req.body.date) : undefined,
        dueDate: req.body.dueDate ? new Date(req.body.dueDate) : undefined,
      };
      
      // If reference is changing, check it's not already used
      if (body.reference && body.reference !== existingTransaction.reference) {
        const transactions = await storage.getTransactions();
        const duplicateReference = transactions.find(t => 
          t.reference === body.reference && 
          t.type === 'invoice' &&
          t.id !== invoiceId // Exclude the current invoice
        );
        
        if (duplicateReference) {
          return res.status(400).json({ 
            message: "Invoice reference must be unique", 
            errors: [{ 
              path: ["reference"], 
              message: "An invoice with this reference number already exists" 
            }] 
          });
        }
      }
      
      // Get existing line items and ledger entries
      const existingLineItems = await storage.getLineItemsByTransaction(invoiceId);
      const existingLedgerEntries = await storage.getLedgerEntriesByTransaction(invoiceId);
      
      // Update the transaction
      const transactionUpdate: Partial<Transaction> = {
        reference: body.reference,
        date: body.date,
        description: body.description,
        status: body.status,
        contactId: body.contactId,
        // Amount will be recalculated if line items are updated
      };
      
      // If we have new line items, we need to handle them specially
      if (body.lineItems) {
        // Delete existing line items - we'll recreate them
        // This is a simple approach, a more sophisticated one would update existing items
        
        // Calculate the new subtotal from line items
        const subTotal = body.lineItems.reduce((sum: number, item: any) => sum + item.amount, 0);
        const taxAmount = body.taxAmount || 0;
        
        // Update transaction amount
        transactionUpdate.amount = subTotal + taxAmount;
        
        // Update the transaction
        const updatedTransaction = await storage.updateTransaction(invoiceId, transactionUpdate);
        
        if (!updatedTransaction) {
          return res.status(404).json({ message: "Failed to update invoice" });
        }
        
        // Create new line items
        const lineItems = body.lineItems.map((item: {
          description: string;
          quantity: number;
          unitPrice: number;
          amount: number;
          salesTaxId?: number;
        }) => {
          const lineItem: any = {
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            amount: item.amount,
            transactionId: invoiceId
          };
          
          if (item.salesTaxId) {
            lineItem.salesTaxId = item.salesTaxId;
          }
          
          return lineItem;
        });
        
        // We'd need to delete old line items and create new ones
        // This would be handled by storage.updateInvoice in a real implementation
        
        // Return updated invoice data
        res.status(200).json({
          transaction: updatedTransaction,
          lineItems: body.lineItems, // Return the new line items from the request
          // Additional invoice details
          subTotal: body.subTotal,
          taxAmount: body.taxAmount,
          totalAmount: body.totalAmount || (subTotal + taxAmount),
          dueDate: body.dueDate,
          paymentTerms: body.paymentTerms
        });
      } else {
        // Just update the transaction without touching line items
        const updatedTransaction = await storage.updateTransaction(invoiceId, transactionUpdate);
        
        if (!updatedTransaction) {
          return res.status(404).json({ message: "Failed to update invoice" });
        }
        
        res.status(200).json({
          transaction: updatedTransaction,
          lineItems: existingLineItems,
          ledgerEntries: existingLedgerEntries,
          // Keep the original values if not provided
          subTotal: body.subTotal,
          taxAmount: body.taxAmount,
          totalAmount: body.totalAmount || updatedTransaction.amount,
          dueDate: body.dueDate,
          paymentTerms: body.paymentTerms
        });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid invoice data", errors: error.errors });
      }
      console.error("Error updating invoice:", error);
      res.status(500).json({ message: "Failed to update invoice", error: String(error) });
    }
  });
  
  // Create a new invoice
  apiRouter.post("/invoices", async (req: Request, res: Response) => {
    try {
      console.log("Invoice payload:", JSON.stringify(req.body));
      
      // Convert string dates to Date objects before validation
      const body = {
        ...req.body,
        date: new Date(req.body.date),
        dueDate: req.body.dueDate ? new Date(req.body.dueDate) : undefined,
        // Ensure these fields exist even if they weren't sent
        reference: req.body.reference || `INV-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}`,
        status: req.body.status || 'draft',
        description: req.body.description || ''
      };
      
      // Check if invoice reference already exists
      const transactions = await storage.getTransactions();
      const existingInvoice = transactions.find(t => 
        t.reference === body.reference && 
        t.type === 'invoice'
      );
      
      if (existingInvoice) {
        return res.status(400).json({ 
          message: "Invoice reference must be unique", 
          errors: [{ 
            path: ["reference"], 
            message: "An invoice with this reference number already exists" 
          }] 
        });
      }
      
      // Validate invoice data - with detailed logging
      console.log("Validating invoice data:", JSON.stringify(body));
      const result = invoiceSchema.safeParse(body);
      if (!result.success) {
        console.log("Invoice validation errors:", JSON.stringify(result.error));
        return res.status(400).json({ 
          message: "Invalid invoice data", 
          errors: result.error.errors 
        });
      }
      
      const invoiceData = result.data;
      
      // More detailed logging for debugging
      console.log("Invoice data passed validation:", JSON.stringify(invoiceData));
      
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
      
      // Create line items with proper handling of salesTaxId
      const lineItems = invoiceData.lineItems.map(item => {
        const lineItem: any = {
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          amount: item.amount,
          transactionId: 0 // Will be set by createTransaction
        };
        
        // Only add salesTaxId if it exists and is not undefined/null
        if (item.salesTaxId) {
          lineItem.salesTaxId = item.salesTaxId;
          console.log(`Line item has sales tax ID: ${item.salesTaxId}`);
        }
        
        return lineItem;
      });
      
      // Create ledger entries - Double Entry Accounting
      // Debit Accounts Receivable, Credit Revenue and Sales Tax Payable accounts
      const receivableAccount = await storage.getAccountByCode('1100'); // Accounts Receivable
      const revenueAccount = await storage.getAccountByCode('4000'); // Service Revenue
      
      // Get the default sales tax payable account
      const taxPayableAccount = await storage.getAccountByCode('2100'); // Sales Tax Payable
      
      if (!receivableAccount || !revenueAccount || !taxPayableAccount) {
        return res.status(500).json({ message: "Required accounts do not exist" });
      }
      
      // Use the provided subtotal and tax amount from the client
      const subTotal = invoiceData.subTotal || totalAmount;
      const taxAmount = invoiceData.taxAmount || 0;
      
      // Create base ledger entries (will add tax entries after)
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
        }
      ];
      
      // Handle tax allocation with proper accounts for composite taxes
      // Initialize tax ledger entries map to combine entries for same account
      const taxLedgerMap = new Map<number, { accountId: number, amount: number }>();
      
      // Process each line item to determine tax allocation
      for (const item of invoiceData.lineItems) {
        if (item.salesTaxId) {
          // Get the tax information for the line item
          const salesTax = await storage.getSalesTax(item.salesTaxId);
          
          if (salesTax) {
            // Check if it's a composite tax (has components)
            if (salesTax.isComposite) {
              // Get all component taxes for this composite tax
              const componentTaxes = await db
                .select()
                .from(salesTaxSchema)
                .where(eq(salesTaxSchema.parentId, salesTax.id))
                .execute();
                
              console.log(`Fetched ${componentTaxes.length} component taxes for parent ID ${salesTax.id}:`, componentTaxes);
              
              if (componentTaxes.length > 0) {
                // Process each component tax separately
                for (const component of componentTaxes) {
                  // Calculate tax amount for this component
                  const componentTaxAmount = (item.amount * (component.rate / 100));
                  
                  // Get the proper account ID for this component
                  const accountId = component.accountId || taxPayableAccount.id;
                  
                  // Add to the tax ledger map for this account
                  if (taxLedgerMap.has(accountId)) {
                    // Add to existing amount for this account
                    const entry = taxLedgerMap.get(accountId)!;
                    entry.amount += componentTaxAmount;
                    taxLedgerMap.set(accountId, entry);
                  } else {
                    // Create new entry for this account
                    taxLedgerMap.set(accountId, { accountId, amount: componentTaxAmount });
                  }
                }
              } else {
                // No components found, use the main tax account
                const taxAmount = (item.amount * (salesTax.rate / 100));
                const accountId = salesTax.accountId || taxPayableAccount.id;
                
                if (taxLedgerMap.has(accountId)) {
                  const entry = taxLedgerMap.get(accountId)!;
                  entry.amount += taxAmount;
                  taxLedgerMap.set(accountId, entry);
                } else {
                  taxLedgerMap.set(accountId, { accountId, amount: taxAmount });
                }
              }
            } else {
              // Regular non-composite tax
              const taxAmount = (item.amount * (salesTax.rate / 100));
              const accountId = salesTax.accountId || taxPayableAccount.id;
              
              if (taxLedgerMap.has(accountId)) {
                const entry = taxLedgerMap.get(accountId)!;
                entry.amount += taxAmount;
                taxLedgerMap.set(accountId, entry);
              } else {
                taxLedgerMap.set(accountId, { accountId, amount: taxAmount });
              }
            }
          }
        }
      }
      
      // Add tax ledger entries from the map
      console.log('Creating tax ledger entries:', Array.from(taxLedgerMap.values()));
      
      // If no tax entries were created (or calculation issue), use the total tax amount
      if (taxLedgerMap.size === 0 && taxAmount > 0) {
        ledgerEntries.push({
          accountId: taxPayableAccount.id,
          description: `Invoice ${transaction.reference} - Sales Tax`,
          debit: 0,
          credit: taxAmount,
          date: transaction.date,
          transactionId: 0 // Will be set by createTransaction
        });
      } else {
        // Add the tax entries from our map - convert to array first to avoid iterator issues
        const taxEntries = Array.from(taxLedgerMap.values());
        for (const entry of taxEntries) {
          ledgerEntries.push({
            accountId: entry.accountId,
            description: `Invoice ${transaction.reference} - Sales Tax`,
            debit: 0,
            credit: parseFloat(entry.amount.toFixed(2)), // Round to 2 decimal places
            date: transaction.date,
            transactionId: 0 // Will be set by createTransaction
          });
        }
      }
      
      const newTransaction = await storage.createTransaction(transaction, lineItems, ledgerEntries);
      
      // Include additional invoice details in the response
      res.status(201).json({
        transaction: newTransaction,
        lineItems: await storage.getLineItemsByTransaction(newTransaction.id),
        ledgerEntries: await storage.getLedgerEntriesByTransaction(newTransaction.id),
        // Additional invoice details
        subTotal: invoiceData.subTotal,
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
      
      // Check if expense reference already exists
      const transactions = await storage.getTransactions();
      const existingExpense = transactions.find(t => 
        t.reference === body.reference && 
        t.type === 'expense'
      );
      
      if (existingExpense) {
        return res.status(400).json({ 
          message: "Expense reference must be unique", 
          errors: [{ 
            path: ["reference"], 
            message: "An expense with this reference number already exists" 
          }] 
        });
      }
      
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
      
      // Check if journal entry reference already exists
      const transactions = await storage.getTransactions();
      const existingJournal = transactions.find(t => 
        t.reference === body.reference && 
        t.type === 'journal_entry'
      );
      
      if (existingJournal) {
        return res.status(400).json({ 
          message: "Journal entry reference must be unique", 
          errors: [{ 
            path: ["reference"], 
            message: "A journal entry with this reference number already exists" 
          }] 
        });
      }
      
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
  apiRouter.post("/payments", async (req: Request, res: Response) => {
    const data = req.body;
    const lineItems = data.lineItems || [];
    const unappliedAmount = data.unappliedAmount || 0;
    
    try {
      // Create the payment transaction
      const paymentData = {
        reference: data.reference,
        date: new Date(data.date),
        contactId: data.contactId,
        amount: data.amount,
        status: 'completed' as const,
        type: 'payment' as const,
        description: data.description || 'Payment received',
      };
      
      // Prepare ledger entries
      const ledgerEntries = [
        // Debit the bank account (increase)
        {
          accountId: data.depositAccountId,
          debit: data.amount,
          credit: 0,
          description: `Payment from customer #${data.contactId}`,
          date: new Date(data.date),
          transactionId: 0 // Will be set by createTransaction
        }
      ];
      
      // Apply payments to invoices
      if (lineItems.length > 0) {
        for (const item of lineItems) {
          // Get the invoice to apply payment to
          const invoice = await storage.getTransaction(item.transactionId);
          
          if (!invoice) {
            continue;
          }
          
          // Update invoice balance and status
          // Calculate the new balance by subtracting payment from current balance
          // Make sure balance can't go below 0 (overpayment protection)
          const currentBalance = invoice.balance || invoice.amount || 0;
          const newBalance = Math.max(0, currentBalance - item.amount);
          
          // Use 'partial' status for partially paid invoices, 'paid' for fully paid
          const newStatus = newBalance <= 0 ? 'paid' : 'partial';
          
          console.log(`Updating invoice #${invoice.id} balance from ${currentBalance} to ${newBalance}, status: ${newStatus}`);
          
          await storage.updateTransaction(invoice.id, { 
            balance: newBalance, 
            status: newStatus 
          });
          
          // Add credit to Accounts Receivable (decrease)
          // Using account ID 2 which is Accounts Receivable
          ledgerEntries.push({
            accountId: 2, // Accounts Receivable (ID 2 from the database)
            debit: 0,
            credit: item.amount,
            description: `Payment applied to invoice #${invoice.reference}`,
            date: new Date(data.date),
            transactionId: 0 // Will be set by createTransaction
          });
        }
      }
      
      // Handle unapplied credit if any
      if (unappliedAmount > 0) {
        // We need to credit customer prepayments/credits account (Business Credit Card)
        ledgerEntries.push({
          accountId: 19, // Business Credit Card (ID 19 from the database)
          debit: 0,
          credit: unappliedAmount,
          description: `Unapplied credit for customer #${data.contactId}`,
          date: new Date(data.date),
          transactionId: 0 // Will be set by createTransaction
        });
      }
      
      // Create the transaction with ledger entries
      const payment = await storage.createTransaction(
        paymentData,
        [], // No line items for the payment itself
        ledgerEntries
      );
      
      res.status(201).json(payment);
    } catch (error: any) {
      console.error("Error processing payment:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  apiRouter.post("/deposits", async (req: Request, res: Response) => {
    try {
      // Convert string dates to Date objects before validation
      const body = {
        ...req.body,
        date: new Date(req.body.date)
      };
      
      // Check if deposit reference already exists
      const transactions = await storage.getTransactions();
      const existingDeposit = transactions.find(t => 
        t.reference === body.reference && 
        t.type === 'deposit'
      );
      
      if (existingDeposit) {
        return res.status(400).json({ 
          message: "Deposit reference must be unique", 
          errors: [{ 
            path: ["reference"], 
            message: "A deposit with this reference number already exists" 
          }] 
        });
      }
      
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

  // Products & Services routes
  apiRouter.get("/products", async (req: Request, res: Response) => {
    try {
      const products = await storage.getProducts();
      res.json(products);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  apiRouter.get("/products/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const product = await storage.getProduct(id);
      
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      res.json(product);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch product" });
    }
  });

  apiRouter.post("/products", async (req: Request, res: Response) => {
    try {
      console.log("Product creation request body:", req.body);
      const productData = insertProductSchema.parse(req.body);
      console.log("Parsed product data:", productData);
      const product = await storage.createProduct(productData);
      res.status(201).json(product);
    } catch (error) {
      console.error("Product creation error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid product data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create product" });
    }
  });

  apiRouter.patch("/products/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      // Allow partial data for update (don't require all fields)
      const productData = insertProductSchema.partial().parse(req.body);
      const product = await storage.updateProduct(id, productData);
      
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      res.json(product);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid product data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update product" });
    }
  });

  apiRouter.delete("/products/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteProduct(id);
      
      if (!success) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete product" });
    }
  });
  
  // Transaction delete endpoint
  apiRouter.delete("/transactions/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteTransaction(id);
      
      if (!success) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting transaction:", error);
      res.status(500).json({ message: "Failed to delete transaction" });
    }
  });

  // Sales Tax routes
  apiRouter.get("/sales-taxes", async (req: Request, res: Response) => {
    try {
      // Handle query for component taxes by parent ID
      if (req.query.parentId) {
        const parentId = parseInt(req.query.parentId as string);
        
        // Fetch child taxes directly from the database
        const childTaxes = await db
          .select()
          .from(salesTaxSchema)
          .where(eq(salesTaxSchema.parentId, parentId))
          .execute();
          
        console.log(`Fetched ${childTaxes.length} component taxes for parent ID ${parentId}:`, childTaxes);
        return res.json(childTaxes);
      }
      
      // Default: fetch all parent-level taxes (not components)
      const salesTaxes = await storage.getSalesTaxes();
      res.json(salesTaxes);
    } catch (error) {
      console.error("Error fetching sales taxes:", error);
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
      console.log("Create sales tax request:", req.body);
      
      // Extract componentTaxes before parsing with Zod
      const componentTaxes = req.body.componentTaxes;
      
      const salesTaxData = insertSalesTaxSchema.parse(req.body);
      const salesTax = await storage.createSalesTax(salesTaxData);
      
      // Handle component taxes if provided and this is a composite tax
      if (salesTax.isComposite && componentTaxes && Array.isArray(componentTaxes)) {
        console.log("Processing component taxes:", componentTaxes);
        
        try {
          // Process and save each component tax
          for (let index = 0; index < componentTaxes.length; index++) {
            const component = componentTaxes[index];
            console.log(`Processing component ${index}:`, component);
            
            // Create child tax in the main sales_taxes table
            const childTaxResult = await db
              .insert(salesTaxSchema)
              .values({
                name: component.name,
                description: `Component of ${salesTax.name}`,
                rate: component.rate,
                accountId: component.accountId ? parseInt(component.accountId.toString()) : null,
                isActive: true,
                isComposite: false,
                parentId: salesTax.id,
                displayOrder: index
              })
              .execute();
              
            console.log(`Created component tax: ${component.name} with accountId: ${component.accountId}`, childTaxResult);
          }
          
          console.log("All component taxes saved successfully");
        } catch (err) {
          console.error("Error saving component taxes:", err);
        }
      }
      
      res.status(201).json(salesTax);
    } catch (error) {
      console.error("Error creating sales tax:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid sales tax data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create sales tax" });
    }
  });

  apiRouter.patch("/sales-taxes/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      console.log("Sales tax update request:", req.body);
      
      // Extract componentTaxes before parsing with Zod
      const componentTaxes = req.body.componentTaxes;
      
      // Allow partial data for update (don't require all fields)
      const salesTaxData = insertSalesTaxSchema.partial().parse(req.body);
      
      // First update the main sales tax
      const salesTax = await storage.updateSalesTax(id, salesTaxData);
      
      if (!salesTax) {
        return res.status(404).json({ message: "Sales tax not found" });
      }
      
      // Handle component taxes if provided and this is a composite tax
      if (salesTax.isComposite && componentTaxes && Array.isArray(componentTaxes)) {
        console.log("Processing component taxes:", componentTaxes);
        
        try {
          // First, delete all existing components for this tax by querying the sales_taxes table
          // Components are stored as child entries in the sales_taxes table with parentId field
          await db
            .delete(salesTaxSchema)
            .where(eq(salesTaxSchema.parentId, id))
            .execute();
          
          console.log("Deleted existing component taxes for parent ID:", id);
          
          // Process and save each component tax
          for (let index = 0; index < componentTaxes.length; index++) {
            const component = componentTaxes[index];
            console.log(`Processing component ${index}:`, component);
            
            // Create child tax in the main sales_taxes table
            const childTaxResult = await db
              .insert(salesTaxSchema)
              .values({
                name: component.name,
                description: `Component of ${salesTax.name}`,
                rate: component.rate,
                accountId: component.accountId ? parseInt(component.accountId.toString()) : null,
                isActive: true,
                isComposite: false,
                parentId: id,
                displayOrder: index
              })
              .execute();
              
            console.log(`Created component tax: ${component.name} with accountId: ${component.accountId}`, childTaxResult);
          }
          
          console.log("All component taxes saved successfully");
        } catch (err) {
          console.error("Error saving component taxes:", err);
        }
      }
      
      res.json(salesTax);
    } catch (error) {
      console.error("Error updating sales tax:", error);
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

  // Settings routes
  apiRouter.get("/settings/company", async (req: Request, res: Response) => {
    try {
      const companySettings = await storage.getCompanySettings();
      res.json(companySettings || {});
    } catch (error) {
      console.error("Error fetching company settings:", error);
      res.status(500).json({ message: "Failed to get company settings" });
    }
  });

  apiRouter.post("/settings/company", async (req: Request, res: Response) => {
    try {
      const companyData = insertCompanySchema.parse(req.body);
      const result = await storage.saveCompanySettings(companyData);
      res.json(result);
    } catch (error) {
      console.error("Error saving company settings:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid company data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to save company settings" });
    }
  });

  apiRouter.get("/settings/preferences", async (req: Request, res: Response) => {
    try {
      const preferences = await storage.getPreferences();
      res.json(preferences || {});
    } catch (error) {
      console.error("Error fetching preferences:", error);
      res.status(500).json({ message: "Failed to get preferences" });
    }
  });

  apiRouter.post("/settings/preferences", async (req: Request, res: Response) => {
    try {
      const preferencesData = insertPreferencesSchema.parse(req.body);
      const result = await storage.savePreferences(preferencesData);
      res.json(result);
    } catch (error) {
      console.error("Error saving preferences:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid preferences data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to save preferences" });
    }
  });

  // Use company router for company management endpoints
  apiRouter.use("/companies", companyRouter);

  app.use("/api", apiRouter);
  
  const httpServer = createServer(app);
  
  return httpServer;
}
