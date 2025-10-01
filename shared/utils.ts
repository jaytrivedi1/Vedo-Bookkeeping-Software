export function roundTo2Decimals(amount: number): number {
  return Math.round(amount * 100) / 100;
}

export function formatCurrency(amount: number): string {
  return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
