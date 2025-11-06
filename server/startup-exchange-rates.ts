import { storage } from "./storage";
import { createExchangeRateService } from "./exchange-rate-service";

export async function fetchYesterdayRates(): Promise<void> {
  try {
    const exchangeRateService = createExchangeRateService();
    
    if (!exchangeRateService) {
      console.log("Exchange rate API key not configured, skipping automatic rate fetch");
      return;
    }

    // Get preferences to determine home currency
    const preferences = await storage.getPreferences();
    if (!preferences || !preferences.multiCurrencyEnabled) {
      console.log("Multi-currency not enabled, skipping exchange rate fetch");
      return;
    }

    const homeCurrency = preferences.homeCurrency || 'USD';
    
    // Calculate yesterday's date
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    console.log(`Checking if exchange rates exist for ${yesterday.toISOString().split('T')[0]}...`);

    // Check if we already have yesterday's rates
    const sampleCurrencies = ['USD', 'EUR', 'GBP', 'CAD'];
    const needsFetch = sampleCurrencies.some(async (currency) => {
      if (currency === homeCurrency) return false;
      
      const rate = await storage.getExchangeRateForDate(
        homeCurrency,
        currency,
        yesterday
      );
      
      return !rate || rate.effectiveDate !== yesterday.toISOString().split('T')[0];
    });

    if (needsFetch) {
      console.log(`Fetching exchange rates for ${yesterday.toISOString().split('T')[0]}...`);
      await exchangeRateService.fetchAndStoreRates(homeCurrency, yesterday, storage);
      console.log("Exchange rates fetched successfully");
    } else {
      console.log("Exchange rates for yesterday already exist, skipping fetch");
    }
  } catch (error) {
    console.error("Error fetching yesterday's exchange rates:", error);
    // Don't throw - this should not block server startup
  }
}
