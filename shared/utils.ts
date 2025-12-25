export function roundTo2Decimals(amount: number): number {
  return Math.round(amount * 100) / 100;
}

export function formatCurrency(amount: number | null | undefined): string {
  const safeAmount = amount ?? 0;
  return safeAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
