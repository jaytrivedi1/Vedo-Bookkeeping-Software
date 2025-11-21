import { InsertTransaction, InsertLineItem, InsertLedgerEntry, RecurringTemplate, RecurringLine, Contact } from "@shared/schema";
import { calculateNextRunDate } from "./recurringUtils";

export async function generateInvoiceFromTemplate(
  template: RecurringTemplate & { customerName?: string },
  templateLines: RecurringLine[],
  customer: Contact,
  nextInvoiceNumber: string
): Promise<{
  invoice: InsertTransaction;
  lineItems: InsertLineItem[];
  nextRunAt: Date;
}> {
  const today = new Date();
  const currentOccurrences = (template.currentOccurrences || 0) + 1;

  // Calculate next run date
  const nextRunAt = calculateNextRunDate(template);

  // Calculate amounts
  const subTotal = templateLines.reduce((sum, line) => sum + line.amount, 0);
  const taxAmount = template.taxAmount || 0;
  const totalAmount = subTotal + taxAmount;

  const invoice: InsertTransaction = {
    reference: nextInvoiceNumber,
    type: "invoice",
    date: today,
    description: template.templateName,
    amount: totalAmount,
    subTotal,
    taxAmount,
    balance: totalAmount,
    contactId: template.customerId,
    status: "open",
    memo: template.memo,
    dueDate: template.paymentTerms ? new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000) : undefined,
    paymentTerms: template.paymentTerms,
    currency: template.currency,
    exchangeRate: template.exchangeRate,
  };

  const lineItems = templateLines.map((line) => ({
    description: line.description,
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    amount: line.amount,
    accountId: line.accountId,
    salesTaxId: line.salesTaxId,
    productId: line.productId,
  } as InsertLineItem));

  return {
    invoice,
    lineItems,
    nextRunAt,
  };
}
