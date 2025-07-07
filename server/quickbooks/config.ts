import { OAuthClient } from 'intuit-oauth';

export interface QuickBooksConfig {
  clientId: string;
  clientSecret: string;
  environment: 'sandbox' | 'production';
  redirectUri: string;
  scope: string[];
}

export const getQuickBooksConfig = (): QuickBooksConfig => {
  const config: QuickBooksConfig = {
    clientId: process.env.QUICKBOOKS_CLIENT_ID || '',
    clientSecret: process.env.QUICKBOOKS_CLIENT_SECRET || '',
    environment: (process.env.QUICKBOOKS_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox',
    redirectUri: process.env.QUICKBOOKS_REDIRECT_URI || 'http://localhost:5000/api/quickbooks/callback',
    scope: [OAuthClient.scopes.Accounting]
  };

  return config;
};

export const createOAuthClient = (config: QuickBooksConfig): OAuthClient => {
  return new OAuthClient({
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    environment: config.environment,
    redirectUri: config.redirectUri,
    logging: true
  });
};