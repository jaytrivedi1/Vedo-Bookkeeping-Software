import { ShopifyClient, ShopifyOrder, ShopifyTransaction } from './client';
import { IStorage } from '../storage';
import { Transaction, Contact, LineItem } from '../../shared/schema';

export interface SyncOptions {
  dateFrom?: string;
  dateTo?: string;
  syncOrders?: boolean;
  syncTransactions?: boolean;
  syncProducts?: boolean;
  syncTaxData?: boolean;
}

export interface SyncResult {
  success: boolean;
  ordersProcessed: number;
  transactionsProcessed: number;
  customersProcessed: number;
  errors: string[];
  lastSyncDate: string;
}

export class ShopifySync {
  private client: ShopifyClient;
  private storage: IStorage;

  constructor(storage: IStorage) {
    this.storage = storage;
    this.client = new ShopifyClient();
  }

  /**
   * Test Shopify connection
   */
  async testConnection(): Promise<boolean> {
    try {
      return await this.client.testConnection();
    } catch (error) {
      console.error('Shopify connection test failed:', error);
      return false;
    }
  }

  /**
   * Full sync of Shopify data
   */
  async syncAll(options: SyncOptions = {}): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      ordersProcessed: 0,
      transactionsProcessed: 0,
      customersProcessed: 0,
      errors: [],
      lastSyncDate: new Date().toISOString()
    };

    try {
      // Test connection first
      const connected = await this.testConnection();
      if (!connected) {
        result.errors.push('Failed to connect to Shopify');
        return result;
      }

      // Sync orders and related data
      if (options.syncOrders !== false) {
        const orderResult = await this.syncOrders({
          created_at_min: options.dateFrom,
          created_at_max: options.dateTo
        });
        result.ordersProcessed = orderResult.ordersProcessed;
        result.customersProcessed = orderResult.customersProcessed;
        result.errors.push(...orderResult.errors);
      }

      // Sync transactions
      if (options.syncTransactions !== false) {
        const transactionResult = await this.syncTransactions({
          created_at_min: options.dateFrom,
          created_at_max: options.dateTo
        });
        result.transactionsProcessed = transactionResult.transactionsProcessed;
        result.errors.push(...transactionResult.errors);
      }

      result.success = result.errors.length === 0;
      return result;

    } catch (error) {
      console.error('Shopify sync error:', error);
      result.errors.push(`Sync failed: ${error.message}`);
      return result;
    }
  }

  /**
   * Sync orders from Shopify
   */
  async syncOrders(params?: {
    created_at_min?: string;
    created_at_max?: string;
  }): Promise<{
    ordersProcessed: number;
    customersProcessed: number;
    errors: string[];
  }> {
    const result = {
      ordersProcessed: 0,
      customersProcessed: 0,
      errors: []
    };

    try {
      const orders = await this.client.getOrders(params);
      const processedCustomers = new Set<number>();

      for (const order of orders) {
        try {
          // Process customer
          if (order.customer && !processedCustomers.has(order.customer.id)) {
            await this.processCustomer(order.customer);
            processedCustomers.add(order.customer.id);
            result.customersProcessed++;
          }

          // Process order as invoice
          await this.processOrderAsInvoice(order);
          result.ordersProcessed++;

        } catch (error) {
          console.error(`Error processing order ${order.id}:`, error);
          result.errors.push(`Order ${order.order_number}: ${error.message}`);
        }
      }

      return result;

    } catch (error) {
      console.error('Error syncing orders:', error);
      result.errors.push(`Failed to sync orders: ${error.message}`);
      return result;
    }
  }

  /**
   * Sync transactions from Shopify
   */
  async syncTransactions(params?: {
    created_at_min?: string;
    created_at_max?: string;
  }): Promise<{
    transactionsProcessed: number;
    errors: string[];
  }> {
    const result = {
      transactionsProcessed: 0,
      errors: []
    };

    try {
      const transactions = await this.client.getAllTransactions(params);

      for (const transaction of transactions) {
        try {
          await this.processTransaction(transaction);
          result.transactionsProcessed++;
        } catch (error) {
          console.error(`Error processing transaction ${transaction.id}:`, error);
          result.errors.push(`Transaction ${transaction.id}: ${error.message}`);
        }
      }

      return result;

    } catch (error) {
      console.error('Error syncing transactions:', error);
      result.errors.push(`Failed to sync transactions: ${error.message}`);
      return result;
    }
  }

  /**
   * Process Shopify customer as contact
   */
  private async processCustomer(customer: any): Promise<void> {
    try {
      // Check if customer already exists
      const existingContacts = await this.storage.getContacts();
      const existingContact = existingContacts.find(c => 
        c.email === customer.email || c.name === `${customer.first_name} ${customer.last_name}`
      );

      if (existingContact) {
        // Update existing contact
        const updatedContact = {
          ...existingContact,
          name: `${customer.first_name} ${customer.last_name}`,
          email: customer.email || existingContact.email,
          phone: customer.phone || existingContact.phone,
          type: 'customer' as const
        };
        await this.storage.updateContact(existingContact.id, updatedContact);
      } else {
        // Create new contact
        const newContact = {
          name: `${customer.first_name} ${customer.last_name}`,
          contactName: `${customer.first_name} ${customer.last_name}`,
          email: customer.email || '',
          phone: customer.phone || '',
          address: customer.default_address ? 
            `${customer.default_address.address1}, ${customer.default_address.city}, ${customer.default_address.country}` : '',
          type: 'customer' as const,
          currency: 'USD',
          defaultTaxRate: 0,
          documentIds: []
        };
        await this.storage.createContact(newContact);
      }
    } catch (error) {
      console.error('Error processing customer:', error);
      throw error;
    }
  }

  /**
   * Process Shopify order as invoice
   */
  private async processOrderAsInvoice(order: ShopifyOrder): Promise<void> {
    try {
      // Find or create customer contact
      const contacts = await this.storage.getContacts();
      let customerContact = contacts.find(c => c.email === order.customer.email);

      if (!customerContact) {
        // Create customer contact
        const newContact = {
          name: `${order.customer.first_name} ${order.customer.last_name}`,
          contactName: `${order.customer.first_name} ${order.customer.last_name}`,
          email: order.customer.email || '',
          phone: '',
          address: '',
          type: 'customer' as const,
          currency: order.currency,
          defaultTaxRate: 0,
          documentIds: []
        };
        customerContact = await this.storage.createContact(newContact);
      }

      // Check if order already exists
      const existingTransactions = await this.storage.getTransactions();
      const existingOrder = existingTransactions.find(t => 
        t.reference === `SHOPIFY-${order.order_number}` && t.type === 'invoice'
      );

      if (existingOrder) {
        console.log(`Order ${order.order_number} already exists, skipping...`);
        return;
      }

      // Create invoice transaction
      const invoiceTransaction = {
        reference: `SHOPIFY-${order.order_number}`,
        type: 'invoice' as const,
        date: new Date(order.created_at),
        description: `Shopify Order #${order.order_number}`,
        amount: parseFloat(order.total_price),
        balance: parseFloat(order.total_price),
        contactId: customerContact.id,
        status: order.financial_status === 'paid' ? 'completed' as const : 'open' as const,
        currency: order.currency
      };

      const createdTransaction = await this.storage.createTransaction(invoiceTransaction);

      // Create line items
      for (const lineItem of order.line_items) {
        const newLineItem = {
          transactionId: createdTransaction.id,
          description: lineItem.title,
          quantity: lineItem.quantity,
          unitPrice: parseFloat(lineItem.price),
          amount: parseFloat(lineItem.price) * lineItem.quantity,
          accountId: undefined, // Will be set to revenue account
          salesTaxId: null
        };

        await this.storage.createLineItem(newLineItem);
      }

      // Add shipping as line item if exists
      if (order.shipping_lines && order.shipping_lines.length > 0) {
        for (const shipping of order.shipping_lines) {
          const shippingLineItem = {
            transactionId: createdTransaction.id,
            description: `Shipping: ${shipping.title}`,
            quantity: 1,
            unitPrice: parseFloat(shipping.price),
            amount: parseFloat(shipping.price),
            accountId: undefined,
            salesTaxId: null
          };

          await this.storage.createLineItem(shippingLineItem);
        }
      }

      console.log(`Successfully created invoice for Shopify order ${order.order_number}`);

    } catch (error) {
      console.error('Error processing order as invoice:', error);
      throw error;
    }
  }

  /**
   * Process Shopify transaction as payment
   */
  private async processTransaction(transaction: ShopifyTransaction): Promise<void> {
    try {
      // Only process successful payments
      if (transaction.kind !== 'sale' || transaction.status !== 'success') {
        return;
      }

      // Find corresponding invoice
      const transactions = await this.storage.getTransactions();
      const invoice = transactions.find(t => 
        t.reference?.includes(transaction.order_id.toString()) && t.type === 'invoice'
      );

      if (!invoice) {
        console.log(`No invoice found for transaction ${transaction.id}`);
        return;
      }

      // Check if payment already exists
      const existingPayment = transactions.find(t => 
        t.reference === `SHOPIFY-PAY-${transaction.id}` && t.type === 'payment'
      );

      if (existingPayment) {
        console.log(`Payment ${transaction.id} already exists, skipping...`);
        return;
      }

      // Create payment transaction
      const paymentTransaction = {
        reference: `SHOPIFY-PAY-${transaction.id}`,
        type: 'payment' as const,
        date: new Date(transaction.created_at),
        description: `Shopify Payment for Order #${transaction.order_id}`,
        amount: parseFloat(transaction.amount),
        balance: 0,
        contactId: invoice.contactId,
        status: 'completed' as const,
        currency: transaction.currency
      };

      await this.storage.createTransaction(paymentTransaction);

      console.log(`Successfully created payment for Shopify transaction ${transaction.id}`);

    } catch (error) {
      console.error('Error processing transaction:', error);
      throw error;
    }
  }

  /**
   * Get sync status and statistics
   */
  async getSyncStatus(): Promise<{
    connected: boolean;
    lastSyncDate: string | null;
    totalOrders: number;
    totalTransactions: number;
    totalCustomers: number;
  }> {
    try {
      const connected = await this.testConnection();
      const transactions = await this.storage.getTransactions();
      const contacts = await this.storage.getContacts();

      const shopifyOrders = transactions.filter(t => 
        t.reference?.startsWith('SHOPIFY-') && t.type === 'invoice'
      );
      const shopifyTransactions = transactions.filter(t => 
        t.reference?.startsWith('SHOPIFY-PAY-') && t.type === 'payment'
      );
      const shopifyCustomers = contacts.filter(c => 
        c.type === 'customer'
      );

      return {
        connected,
        lastSyncDate: null, // Could be stored in database
        totalOrders: shopifyOrders.length,
        totalTransactions: shopifyTransactions.length,
        totalCustomers: shopifyCustomers.length
      };

    } catch (error) {
      console.error('Error getting sync status:', error);
      return {
        connected: false,
        lastSyncDate: null,
        totalOrders: 0,
        totalTransactions: 0,
        totalCustomers: 0
      };
    }
  }
}