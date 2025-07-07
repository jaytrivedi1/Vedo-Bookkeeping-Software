export interface ShopifyConfig {
  apiKey: string;
  apiSecret: string;
  shopName: string;
  accessToken: string;
  apiVersion: string;
}

export const getShopifyConfig = (): ShopifyConfig => {
  const config: ShopifyConfig = {
    apiKey: process.env.SHOPIFY_API_KEY || '',
    apiSecret: process.env.SHOPIFY_API_SECRET || '',
    shopName: process.env.SHOPIFY_SHOP_NAME || '',
    accessToken: process.env.SHOPIFY_ACCESS_TOKEN || '',
    apiVersion: process.env.SHOPIFY_API_VERSION || '2023-10'
  };

  return config;
};

export const validateShopifyConfig = (config: ShopifyConfig): boolean => {
  return !!(config.apiKey && config.apiSecret && config.shopName && config.accessToken);
};

export const getShopifyUrl = (shopName: string): string => {
  return `https://${shopName}.myshopify.com`;
};