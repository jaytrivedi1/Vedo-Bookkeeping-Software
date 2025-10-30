/**
 * Tax calculation utilities for handling both tax-inclusive and tax-exclusive amounts
 */

export function roundTo2Decimals(value: number): number {
  return Math.round(value * 100) / 100;
}

export interface TaxCalculationResult {
  taxAmount: number;
  subtotal: number;
  total: number;
}

/**
 * Calculate tax amount from a total that includes tax
 * Formula: taxAmount = total × (rate / (100 + rate))
 */
export function calculateInclusiveTax(totalAmount: number, taxRate: number): number {
  return roundTo2Decimals(totalAmount - (totalAmount * 100) / (100 + taxRate));
}

/**
 * Calculate tax amount from a subtotal (tax-exclusive)
 * Formula: taxAmount = subtotal × (rate / 100)
 */
export function calculateExclusiveTax(subtotal: number, taxRate: number): number {
  return roundTo2Decimals(subtotal * (taxRate / 100));
}

/**
 * Calculate subtotal, tax, and total for a line item
 */
export function calculateLineItemTax(
  amount: number,
  taxRate: number,
  isExclusiveOfTax: boolean
): TaxCalculationResult {
  if (isExclusiveOfTax) {
    // Amount is pre-tax (subtotal)
    const taxAmount = calculateExclusiveTax(amount, taxRate);
    return {
      subtotal: roundTo2Decimals(amount),
      taxAmount,
      total: roundTo2Decimals(amount + taxAmount)
    };
  } else {
    // Amount includes tax (total)
    const taxAmount = calculateInclusiveTax(amount, taxRate);
    const subtotal = roundTo2Decimals(amount - taxAmount);
    return {
      subtotal,
      taxAmount,
      total: roundTo2Decimals(amount)
    };
  }
}

/**
 * Calculate totals for multiple line items with different tax rates
 */
export function calculateTransactionTotals(
  lineItems: Array<{ amount: number; taxRate?: number }>,
  isExclusiveOfTax: boolean
): TaxCalculationResult {
  let totalSubtotal = 0;
  let totalTax = 0;
  
  lineItems.forEach(item => {
    if (item.taxRate !== undefined && item.taxRate > 0) {
      const result = calculateLineItemTax(item.amount, item.taxRate, isExclusiveOfTax);
      totalSubtotal += result.subtotal;
      totalTax += result.taxAmount;
    } else {
      // No tax on this item
      totalSubtotal += item.amount;
    }
  });
  
  return {
    subtotal: roundTo2Decimals(totalSubtotal),
    taxAmount: roundTo2Decimals(totalTax),
    total: roundTo2Decimals(totalSubtotal + totalTax)
  };
}
