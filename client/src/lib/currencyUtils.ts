const CURRENCY_SYMBOLS: Record<string, string> = {
  'USD': '$',
  'CAD': '$',
  'EUR': '€',
  'GBP': '£',
  'JPY': '¥',
  'CNY': '¥',
  'AUD': '$',
  'NZD': '$',
  'CHF': 'CHF',
  'INR': '₹',
  'MXN': '$',
  'BRL': 'R$',
  'ZAR': 'R',
  'RUB': '₽',
  'KRW': '₩',
  'SGD': '$',
  'HKD': '$',
  'NOK': 'kr',
  'SEK': 'kr',
  'DKK': 'kr',
  'PLN': 'zł',
  'THB': '฿',
  'IDR': 'Rp',
  'MYR': 'RM',
  'PHP': '₱',
  'CZK': 'Kč',
  'ILS': '₪',
  'CLP': '$',
  'TRY': '₺',
  'AED': 'د.إ',
  'SAR': '﷼',
};

export function getCurrencySymbol(currencyCode?: string | null): string {
  if (!currencyCode) return '$';
  return CURRENCY_SYMBOLS[currencyCode.toUpperCase()] || currencyCode;
}

export function formatCurrency(
  amount: number | null | undefined,
  currencyCode?: string | null,
  homeCurrency: string = 'CAD'
): string {
  // Handle undefined/null amounts
  const safeAmount = amount ?? 0;

  if (!currencyCode || currencyCode === homeCurrency) {
    const symbol = getCurrencySymbol(homeCurrency);
    return `${symbol}${safeAmount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  const symbol = getCurrencySymbol(currencyCode);
  const formattedAmount = safeAmount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  if (currencyCode === 'USD' || currencyCode === 'AUD' || currencyCode === 'NZD' || 
      currencyCode === 'SGD' || currencyCode === 'HKD' || currencyCode === 'MXN' || currencyCode === 'CLP') {
    return `${symbol}${formattedAmount} ${currencyCode}`;
  }

  return `${symbol}${formattedAmount}`;
}

export function formatReportAmount(amount: number | null | undefined): string {
  const safeAmount = amount ?? 0;
  return safeAmount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatCurrencyCompact(amount: number | null | undefined, currencyCode?: string | null, homeCurrency: string = 'CAD'): string {
  const safeAmount = amount ?? 0;

  if (!currencyCode || currencyCode === homeCurrency) {
    const symbol = getCurrencySymbol(homeCurrency);
    return `${symbol}${safeAmount.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  }

  const symbol = getCurrencySymbol(currencyCode);
  const formattedAmount = safeAmount.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  if (currencyCode === 'USD' || currencyCode === 'AUD' || currencyCode === 'NZD' || 
      currencyCode === 'SGD' || currencyCode === 'HKD' || currencyCode === 'MXN' || currencyCode === 'CLP') {
    return `${symbol}${formattedAmount} ${currencyCode}`;
  }

  return `${symbol}${formattedAmount}`;
}

export function formatContactName(
  name: string,
  currencyCode?: string | null,
  homeCurrency: string = 'CAD'
): string {
  if (!currencyCode || !name) return name;
  
  if (currencyCode !== homeCurrency) {
    return `${name} - ${currencyCode.toUpperCase()}`;
  }
  
  return name;
}
