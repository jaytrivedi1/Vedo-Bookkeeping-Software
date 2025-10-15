import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } from 'plaid';

const PLAID_CLIENT_ID = process.env.PLAID_CLIENT_ID;
const PLAID_SECRET = process.env.PLAID_SECRET;
const PLAID_ENV = process.env.PLAID_ENV || 'sandbox';

if (!PLAID_CLIENT_ID || !PLAID_SECRET) {
  throw new Error('PLAID_CLIENT_ID and PLAID_SECRET environment variables are required');
}

const configuration = new Configuration({
  basePath: PlaidEnvironments[PLAID_ENV as keyof typeof PlaidEnvironments],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': PLAID_CLIENT_ID,
      'PLAID-SECRET': PLAID_SECRET,
    },
  },
});

export const plaidClient = new PlaidApi(configuration);

export const PLAID_PRODUCTS = [Products.Transactions];
export const PLAID_COUNTRY_CODES = [CountryCode.Us, CountryCode.Ca];
