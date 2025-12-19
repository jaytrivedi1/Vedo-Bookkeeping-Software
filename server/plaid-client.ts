import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } from 'plaid';

const PLAID_CLIENT_ID = process.env.PLAID_CLIENT_ID;
const PLAID_SECRET = process.env.PLAID_SECRET;
const PLAID_ENV = process.env.PLAID_ENV || 'sandbox';

// Make Plaid optional - only create client if credentials are provided
let plaidClient: PlaidApi | null = null;

if (PLAID_CLIENT_ID && PLAID_SECRET) {
  const configuration = new Configuration({
    basePath: PlaidEnvironments[PLAID_ENV as keyof typeof PlaidEnvironments],
    baseOptions: {
      headers: {
        'PLAID-CLIENT-ID': PLAID_CLIENT_ID,
        'PLAID-SECRET': PLAID_SECRET,
      },
    },
  });
  plaidClient = new PlaidApi(configuration);
} else {
  console.warn('Plaid credentials not configured - bank connection features will be disabled');
}

export { plaidClient };

export const PLAID_PRODUCTS = [Products.Transactions];
export const PLAID_COUNTRY_CODES = [CountryCode.Us, CountryCode.Ca];
