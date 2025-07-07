import Shopify from 'shopify-api-node';
import axios from 'axios';
import { getShopifyConfig, validateShopifyConfig, getShopifyUrl } from './config';

export interface ShopifyOrder {
  id: number;
  order_number: string;
  created_at: string;
  updated_at: string;
  total_price: string;
  subtotal_price: string;
  total_tax: string;
  currency: string;
  financial_status: string;
  fulfillment_status: string;
  customer: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
  };
  line_items: Array<{
    id: number;
    product_id: number;
    title: string;
    quantity: number;
    price: string;
    total_discount: string;
    tax_lines: Array<{
      title: string;
      price: string;
      rate: number;
    }>;
  }>;
  tax_lines: Array<{
    title: string;
    price: string;
    rate: number;
  }>;
  shipping_lines: Array<{
    title: string;
    price: string;
    tax_lines: Array<{
      title: string;
      price: string;
      rate: number;
    }>;
  }>;
}

export interface ShopifyTransaction {
  id: number;
  order_id: number;
  kind: string;
  gateway: string;
  status: string;
  amount: string;
  currency: string;
  created_at: string;
  processed_at: string;
}

export interface ShopifyProduct {
  id: number;
  title: string;
  handle: string;
  product_type: string;
  vendor: string;
  created_at: string;
  updated_at: string;
  variants: Array<{
    id: number;
    title: string;
    price: string;
    sku: string;
    inventory_quantity: number;
  }>;
}

export class ShopifyClient {
  private shopify: Shopify;
  private config: any;
  private axiosClient: any;

  constructor() {
    this.config = getShopifyConfig();
    
    if (!validateShopifyConfig(this.config)) {
      throw new Error('Invalid Shopify configuration. Please check your environment variables.');
    }

    this.shopify = new Shopify({
      shopName: this.config.shopName,
      accessToken: this.config.accessToken,
      apiVersion: this.config.apiVersion
    });

    this.axiosClient = axios.create({
      baseURL: `${getShopifyUrl(this.config.shopName)}/admin/api/${this.config.apiVersion}`,
      headers: {
        'X-Shopify-Access-Token': this.config.accessToken,
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Get orders from Shopify
   */
  async getOrders(params?: {
    limit?: number;
    status?: string;
    created_at_min?: string;
    created_at_max?: string;
    updated_at_min?: string;
    updated_at_max?: string;
  }): Promise<ShopifyOrder[]> {
    try {
      const orders = await this.shopify.order.list(params);
      return orders;
    } catch (error) {
      console.error('Error fetching Shopify orders:', error);
      throw new Error('Failed to fetch orders from Shopify');
    }
  }

  /**
   * Get specific order by ID
   */
  async getOrder(orderId: number): Promise<ShopifyOrder> {
    try {
      const order = await this.shopify.order.get(orderId);
      return order;
    } catch (error) {
      console.error(`Error fetching Shopify order ${orderId}:`, error);
      throw new Error(`Failed to fetch order ${orderId} from Shopify`);
    }
  }

  /**
   * Get transactions for an order
   */
  async getOrderTransactions(orderId: number): Promise<ShopifyTransaction[]> {
    try {
      const transactions = await this.shopify.transaction.list(orderId);
      return transactions;
    } catch (error) {
      console.error(`Error fetching transactions for order ${orderId}:`, error);
      throw new Error(`Failed to fetch transactions for order ${orderId}`);
    }
  }

  /**
   * Get all transactions within a date range
   */
  async getAllTransactions(params?: {
    created_at_min?: string;
    created_at_max?: string;
    limit?: number;
  }): Promise<ShopifyTransaction[]> {
    try {
      const orders = await this.getOrders(params);
      const allTransactions: ShopifyTransaction[] = [];

      for (const order of orders) {
        const transactions = await this.getOrderTransactions(order.id);
        allTransactions.push(...transactions);
      }

      return allTransactions;
    } catch (error) {
      console.error('Error fetching all transactions:', error);
      throw new Error('Failed to fetch all transactions from Shopify');
    }
  }

  /**
   * Get products from Shopify
   */
  async getProducts(params?: {
    limit?: number;
    created_at_min?: string;
    created_at_max?: string;
    updated_at_min?: string;
    updated_at_max?: string;
  }): Promise<ShopifyProduct[]> {
    try {
      const products = await this.shopify.product.list(params);
      return products;
    } catch (error) {
      console.error('Error fetching Shopify products:', error);
      throw new Error('Failed to fetch products from Shopify');
    }
  }

  /**
   * Get tax information from orders
   */
  async getTaxData(params?: {
    created_at_min?: string;
    created_at_max?: string;
  }): Promise<Array<{
    order_id: number;
    order_number: string;
    total_tax: string;
    currency: string;
    tax_lines: Array<{
      title: string;
      price: string;
      rate: number;
    }>;
    created_at: string;
  }>> {
    try {
      const orders = await this.getOrders(params);
      
      return orders.map(order => ({
        order_id: order.id,
        order_number: order.order_number,
        total_tax: order.total_tax,
        currency: order.currency,
        tax_lines: order.tax_lines,
        created_at: order.created_at
      }));
    } catch (error) {
      console.error('Error fetching tax data:', error);
      throw new Error('Failed to fetch tax data from Shopify');
    }
  }

  /**
   * Get sales data aggregated by date
   */
  async getSalesData(params?: {
    created_at_min?: string;
    created_at_max?: string;
  }): Promise<Array<{
    date: string;
    total_sales: number;
    total_tax: number;
    order_count: number;
    currency: string;
  }>> {
    try {
      const orders = await this.getOrders(params);
      
      const salesByDate: { [date: string]: {
        total_sales: number;
        total_tax: number;
        order_count: number;
        currency: string;
      }} = {};

      orders.forEach(order => {
        const date = new Date(order.created_at).toISOString().split('T')[0];
        
        if (!salesByDate[date]) {
          salesByDate[date] = {
            total_sales: 0,
            total_tax: 0,
            order_count: 0,
            currency: order.currency
          };
        }

        salesByDate[date].total_sales += parseFloat(order.total_price);
        salesByDate[date].total_tax += parseFloat(order.total_tax);
        salesByDate[date].order_count += 1;
      });

      return Object.entries(salesByDate).map(([date, data]) => ({
        date,
        ...data
      }));
    } catch (error) {
      console.error('Error fetching sales data:', error);
      throw new Error('Failed to fetch sales data from Shopify');
    }
  }

  /**
   * Get shop information
   */
  async getShopInfo(): Promise<any> {
    try {
      const shop = await this.shopify.shop.get();
      return shop;
    } catch (error) {
      console.error('Error fetching shop info:', error);
      throw new Error('Failed to fetch shop information from Shopify');
    }
  }

  /**
   * Test connection to Shopify
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.getShopInfo();
      return true;
    } catch (error) {
      console.error('Shopify connection test failed:', error);
      return false;
    }
  }
}