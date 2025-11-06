import { InsertExchangeRate } from "@shared/schema";

interface ExchangeRateAPIResponse {
  result: string;
  base_code: string;
  conversion_rates: Record<string, number>;
  time_last_update_unix: number;
}

export class ExchangeRateService {
  private apiKey: string;
  private baseUrl: string = "https://v6.exchangerate-api.com/v6";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async fetchRatesForCurrency(baseCurrency: string, date: Date): Promise<InsertExchangeRate[]> {
    try {
      const url = `${this.baseUrl}/${this.apiKey}/latest/${baseCurrency}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Exchange rate API returned status ${response.status}`);
      }

      const data: ExchangeRateAPIResponse = await response.json();

      if (data.result !== "success") {
        throw new Error("Exchange rate API did not return success");
      }

      const rates: InsertExchangeRate[] = [];
      for (const [targetCurrency, rate] of Object.entries(data.conversion_rates)) {
        if (targetCurrency !== baseCurrency) {
          rates.push({
            fromCurrency: baseCurrency,
            toCurrency: targetCurrency,
            rate: rate.toString(),
            effectiveDate: date.toISOString().split('T')[0],
            isManual: false,
          });
        }
      }

      return rates;
    } catch (error) {
      console.error(`Failed to fetch exchange rates for ${baseCurrency}:`, error);
      throw error;
    }
  }

  async fetchAndStoreRates(
    homeCurrency: string,
    date: Date,
    storage: any
  ): Promise<number> {
    try {
      const rates = await this.fetchRatesForCurrency(homeCurrency, date);
      
      let createdCount = 0;
      for (const rate of rates) {
        try {
          const existing = await storage.getExchangeRateForDate(
            rate.fromCurrency,
            rate.toCurrency,
            date
          );

          if (!existing) {
            await storage.createExchangeRate(rate);
            createdCount++;
          }
        } catch (error) {
          console.error(
            `Failed to create exchange rate ${rate.fromCurrency} -> ${rate.toCurrency}:`,
            error
          );
        }
      }

      console.log(`Created ${createdCount} new exchange rates for ${homeCurrency} on ${date.toISOString().split('T')[0]}`);
      return createdCount;
    } catch (error) {
      console.error(`Failed to fetch and store rates:`, error);
      throw error;
    }
  }

  async ensureRatesForDate(
    homeCurrency: string,
    date: Date,
    storage: any
  ): Promise<void> {
    // Pick a sample currency that's different from home currency
    const sampleCurrency = homeCurrency === "USD" ? "EUR" : "USD";
    const sampleRate = await storage.getExchangeRateForDate(homeCurrency, sampleCurrency, date);
    
    if (!sampleRate || sampleRate.effectiveDate !== date.toISOString().split('T')[0]) {
      console.log(`No rates found for ${date.toISOString().split('T')[0]}, fetching from API...`);
      await this.fetchAndStoreRates(homeCurrency, date, storage);
    }
  }
}

export function createExchangeRateService(): ExchangeRateService | null {
  const apiKey = process.env.EXCHANGERATE_API_KEY;
  
  if (!apiKey) {
    console.warn("EXCHANGERATE_API_KEY not configured. Automatic exchange rate updates disabled.");
    return null;
  }

  return new ExchangeRateService(apiKey);
}
