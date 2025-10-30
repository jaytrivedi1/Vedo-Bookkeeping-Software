import { db } from './db';
import { transactions, importedTransactionsSchema, contacts } from '../shared/schema';
import { eq, and, gte, lte, or, isNull, sql } from 'drizzle-orm';

export interface MatchSuggestion {
  transactionId: number;
  transactionType: string;
  reference: string | null;
  description: string | null;
  amount: number;
  date: Date;
  contactId: number | null;
  contactName: string | null;
  balance: number | null;
  confidence: number;
  matchType: 'exact' | 'tolerance' | 'fuzzy';
  matchReason: string;
}

interface MatchingParams {
  amount?: number;
  amountTolerance?: number;
  dateTolerance?: number;
  dateFrom?: Date;
  dateTo?: Date;
  description?: string;
}

export class MatchingService {
  private readonly DEFAULT_AMOUNT_TOLERANCE = 0.02; // 2%
  private readonly DEFAULT_DATE_TOLERANCE_DAYS = 30;

  async findMatchesForBankTransaction(
    importedTransactionId: number
  ): Promise<MatchSuggestion[]> {
    const importedTx = await db
      .select()
      .from(importedTransactionsSchema)
      .where(eq(importedTransactionsSchema.id, importedTransactionId))
      .limit(1);

    if (!importedTx.length) {
      throw new Error('Imported transaction not found');
    }

    const bankTx = importedTx[0];
    const suggestions: MatchSuggestion[] = [];

    const isDeposit = bankTx.amount > 0;

    if (isDeposit) {
      const invoiceMatches = await this.findInvoiceMatches(bankTx);
      suggestions.push(...invoiceMatches);

      const manualDepositMatches = await this.findManualDepositMatches(bankTx);
      suggestions.push(...manualDepositMatches);
    } else {
      const billMatches = await this.findBillMatches(bankTx);
      suggestions.push(...billMatches);

      const manualPaymentMatches = await this.findManualPaymentMatches(bankTx);
      suggestions.push(...manualPaymentMatches);
    }

    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }

  private async findInvoiceMatches(bankTx: any): Promise<MatchSuggestion[]> {
    const txAmount = Math.abs(bankTx.amount);
    const dateFrom = new Date(bankTx.date);
    dateFrom.setDate(dateFrom.getDate() - this.DEFAULT_DATE_TOLERANCE_DAYS);
    const dateTo = new Date(bankTx.date);
    dateTo.setDate(dateTo.getDate() + this.DEFAULT_DATE_TOLERANCE_DAYS);

    const openInvoices = await db
      .select({
        id: transactions.id,
        type: transactions.type,
        reference: transactions.reference,
        description: transactions.description,
        amount: transactions.amount,
        balance: transactions.balance,
        date: transactions.date,
        contactId: transactions.contactId,
        contactName: contacts.name,
      })
      .from(transactions)
      .leftJoin(contacts, eq(transactions.contactId, contacts.id))
      .where(
        and(
          eq(transactions.type, 'invoice'),
          or(
            eq(transactions.status, 'open'),
            eq(transactions.status, 'overdue'),
            eq(transactions.status, 'partial')
          ),
          gte(transactions.date, dateFrom),
          lte(transactions.date, dateTo)
        )
      );

    const matches: MatchSuggestion[] = [];

    for (const invoice of openInvoices) {
      const invoiceBalance = invoice.balance || invoice.amount;
      let confidence = 0;
      let matchType: 'exact' | 'tolerance' | 'fuzzy' = 'fuzzy';
      const matchReasons: string[] = [];

      const amountDiff = Math.abs(txAmount - Math.abs(invoiceBalance));
      const amountDiffPercent = amountDiff / Math.abs(invoiceBalance);

      if (amountDiff <= 0.01) {
        confidence += 50;
        matchType = 'exact';
        matchReasons.push('Exact amount match');
      } else if (amountDiffPercent <= this.DEFAULT_AMOUNT_TOLERANCE) {
        confidence += 40;
        matchType = 'tolerance';
        matchReasons.push(`Amount within ${(this.DEFAULT_AMOUNT_TOLERANCE * 100).toFixed(0)}% tolerance`);
      } else if (amountDiffPercent <= 0.05) {
        confidence += 25;
        matchReasons.push('Amount close match');
      }

      const daysDiff = Math.abs(
        (new Date(bankTx.date).getTime() - new Date(invoice.date).getTime()) /
          (1000 * 60 * 60 * 24)
      );
      if (daysDiff <= 3) {
        confidence += 20;
        matchReasons.push('Same week');
      } else if (daysDiff <= 7) {
        confidence += 15;
      } else if (daysDiff <= 14) {
        confidence += 10;
      }

      if (invoice.contactName && bankTx.name) {
        const nameInDescription = bankTx.name.toLowerCase().includes(invoice.contactName.toLowerCase()) ||
                                 invoice.contactName.toLowerCase().includes(bankTx.name.toLowerCase());
        if (nameInDescription) {
          confidence += 15;
          matchReasons.push('Customer name match');
        }
      }

      if (invoice.reference && bankTx.name) {
        const refInDescription = bankTx.name.toLowerCase().includes(invoice.reference.toLowerCase());
        if (refInDescription) {
          confidence += 15;
          matchReasons.push('Invoice # in description');
        }
      }

      if (confidence >= 50) {
        matches.push({
          transactionId: invoice.id,
          transactionType: 'invoice',
          reference: invoice.reference,
          description: invoice.description,
          amount: invoice.amount,
          date: invoice.date,
          contactId: invoice.contactId,
          contactName: invoice.contactName,
          balance: invoiceBalance,
          confidence,
          matchType,
          matchReason: matchReasons.join(', '),
        });
      }
    }

    return matches;
  }

  private async findBillMatches(bankTx: any): Promise<MatchSuggestion[]> {
    const txAmount = Math.abs(bankTx.amount);
    const dateFrom = new Date(bankTx.date);
    dateFrom.setDate(dateFrom.getDate() - this.DEFAULT_DATE_TOLERANCE_DAYS);
    const dateTo = new Date(bankTx.date);
    dateTo.setDate(dateTo.getDate() + this.DEFAULT_DATE_TOLERANCE_DAYS);

    const openBills = await db
      .select({
        id: transactions.id,
        type: transactions.type,
        reference: transactions.reference,
        description: transactions.description,
        amount: transactions.amount,
        balance: transactions.balance,
        date: transactions.date,
        contactId: transactions.contactId,
        contactName: contacts.name,
      })
      .from(transactions)
      .leftJoin(contacts, eq(transactions.contactId, contacts.id))
      .where(
        and(
          eq(transactions.type, 'bill'),
          or(
            eq(transactions.status, 'open'),
            eq(transactions.status, 'overdue'),
            eq(transactions.status, 'partial')
          ),
          gte(transactions.date, dateFrom),
          lte(transactions.date, dateTo)
        )
      );

    const matches: MatchSuggestion[] = [];

    for (const bill of openBills) {
      const billBalance = Math.abs(bill.balance || bill.amount);
      let confidence = 0;
      let matchType: 'exact' | 'tolerance' | 'fuzzy' = 'fuzzy';
      const matchReasons: string[] = [];

      const amountDiff = Math.abs(txAmount - billBalance);
      const amountDiffPercent = amountDiff / billBalance;

      if (amountDiff <= 0.01) {
        confidence += 50;
        matchType = 'exact';
        matchReasons.push('Exact amount match');
      } else if (amountDiffPercent <= this.DEFAULT_AMOUNT_TOLERANCE) {
        confidence += 40;
        matchType = 'tolerance';
        matchReasons.push(`Amount within ${(this.DEFAULT_AMOUNT_TOLERANCE * 100).toFixed(0)}% tolerance`);
      } else if (amountDiffPercent <= 0.05) {
        confidence += 25;
        matchReasons.push('Amount close match');
      }

      const daysDiff = Math.abs(
        (new Date(bankTx.date).getTime() - new Date(bill.date).getTime()) /
          (1000 * 60 * 60 * 24)
      );
      if (daysDiff <= 3) {
        confidence += 20;
        matchReasons.push('Same week');
      } else if (daysDiff <= 7) {
        confidence += 15;
      } else if (daysDiff <= 14) {
        confidence += 10;
      }

      if (bill.contactName && bankTx.name) {
        const nameInDescription = bankTx.name.toLowerCase().includes(bill.contactName.toLowerCase()) ||
                                 bill.contactName.toLowerCase().includes(bankTx.name.toLowerCase());
        if (nameInDescription) {
          confidence += 15;
          matchReasons.push('Vendor name match');
        }
      }

      if (bill.reference && bankTx.name) {
        const refInDescription = bankTx.name.toLowerCase().includes(bill.reference.toLowerCase());
        if (refInDescription) {
          confidence += 15;
          matchReasons.push('Bill # in description');
        }
      }

      if (confidence >= 50) {
        matches.push({
          transactionId: bill.id,
          transactionType: 'bill',
          reference: bill.reference,
          description: bill.description,
          amount: bill.amount,
          date: bill.date,
          contactId: bill.contactId,
          contactName: bill.contactName,
          balance: billBalance,
          confidence,
          matchType,
          matchReason: matchReasons.join(', '),
        });
      }
    }

    return matches;
  }

  private async findManualDepositMatches(bankTx: any): Promise<MatchSuggestion[]> {
    const txAmount = Math.abs(bankTx.amount);
    const dateFrom = new Date(bankTx.date);
    dateFrom.setDate(dateFrom.getDate() - this.DEFAULT_DATE_TOLERANCE_DAYS);
    const dateTo = new Date(bankTx.date);
    dateTo.setDate(dateTo.getDate() + this.DEFAULT_DATE_TOLERANCE_DAYS);

    const manualDeposits = await db
      .select({
        id: transactions.id,
        type: transactions.type,
        reference: transactions.reference,
        description: transactions.description,
        amount: transactions.amount,
        balance: transactions.balance,
        date: transactions.date,
        contactId: transactions.contactId,
        contactName: contacts.name,
      })
      .from(transactions)
      .leftJoin(contacts, eq(transactions.contactId, contacts.id))
      .where(
        and(
          or(
            eq(transactions.type, 'deposit'),
            eq(transactions.type, 'payment'),
            eq(transactions.type, 'sales_receipt')
          ),
          gte(transactions.date, dateFrom),
          lte(transactions.date, dateTo)
        )
      );

    const matches: MatchSuggestion[] = [];

    for (const deposit of manualDeposits) {
      let confidence = 0;
      let matchType: 'exact' | 'tolerance' | 'fuzzy' = 'fuzzy';
      const matchReasons: string[] = ['Manual entry'];

      const amountDiff = Math.abs(txAmount - Math.abs(deposit.amount));
      const amountDiffPercent = deposit.amount !== 0 ? amountDiff / Math.abs(deposit.amount) : 1;

      if (amountDiff <= 0.01) {
        confidence += 50;
        matchType = 'exact';
        matchReasons.push('Exact amount match');
      } else if (amountDiffPercent <= this.DEFAULT_AMOUNT_TOLERANCE) {
        confidence += 40;
        matchType = 'tolerance';
        matchReasons.push(`Amount within ${(this.DEFAULT_AMOUNT_TOLERANCE * 100).toFixed(0)}% tolerance`);
      }

      const daysDiff = Math.abs(
        (new Date(bankTx.date).getTime() - new Date(deposit.date).getTime()) /
          (1000 * 60 * 60 * 24)
      );
      if (daysDiff <= 1) {
        confidence += 25;
        matchReasons.push('Same/next day');
      } else if (daysDiff <= 3) {
        confidence += 20;
      } else if (daysDiff <= 7) {
        confidence += 15;
      }

      if (deposit.description && bankTx.name) {
        const descMatch = bankTx.name.toLowerCase().includes(deposit.description.toLowerCase()) ||
                         deposit.description.toLowerCase().includes(bankTx.name.toLowerCase());
        if (descMatch) {
          confidence += 10;
          matchReasons.push('Description match');
        }
      }

      // Check if contact name matches bank transaction name
      if (deposit.contactName && bankTx.name) {
        const nameMatch = bankTx.name.toLowerCase().includes(deposit.contactName.toLowerCase()) ||
                         deposit.contactName.toLowerCase().includes(bankTx.name.toLowerCase());
        if (nameMatch) {
          confidence += 15;
          matchReasons.push('Customer name match');
        }
      }

      if (confidence >= 50) {
        matches.push({
          transactionId: deposit.id,
          transactionType: deposit.type,
          reference: deposit.reference,
          description: deposit.description,
          amount: deposit.amount,
          date: deposit.date,
          contactId: deposit.contactId,
          contactName: deposit.contactName,
          balance: null,
          confidence,
          matchType,
          matchReason: matchReasons.join(', '),
        });
      }
    }

    return matches;
  }

  private async findManualPaymentMatches(bankTx: any): Promise<MatchSuggestion[]> {
    const txAmount = Math.abs(bankTx.amount);
    const dateFrom = new Date(bankTx.date);
    dateFrom.setDate(dateFrom.getDate() - this.DEFAULT_DATE_TOLERANCE_DAYS);
    const dateTo = new Date(bankTx.date);
    dateTo.setDate(dateTo.getDate() + this.DEFAULT_DATE_TOLERANCE_DAYS);

    const manualPayments = await db
      .select({
        id: transactions.id,
        type: transactions.type,
        reference: transactions.reference,
        description: transactions.description,
        amount: transactions.amount,
        balance: transactions.balance,
        date: transactions.date,
        contactId: transactions.contactId,
        contactName: contacts.name,
      })
      .from(transactions)
      .leftJoin(contacts, eq(transactions.contactId, contacts.id))
      .where(
        and(
          or(
            eq(transactions.type, 'expense'),
            eq(transactions.type, 'payment'),
            eq(transactions.type, 'cheque')
          ),
          gte(transactions.date, dateFrom),
          lte(transactions.date, dateTo)
        )
      );

    const matches: MatchSuggestion[] = [];

    for (const payment of manualPayments) {
      let confidence = 0;
      let matchType: 'exact' | 'tolerance' | 'fuzzy' = 'fuzzy';
      const matchReasons: string[] = ['Manual entry'];

      const amountDiff = Math.abs(txAmount - Math.abs(payment.amount));
      const amountDiffPercent = payment.amount !== 0 ? amountDiff / Math.abs(payment.amount) : 1;

      if (amountDiff <= 0.01) {
        confidence += 50;
        matchType = 'exact';
        matchReasons.push('Exact amount match');
      } else if (amountDiffPercent <= this.DEFAULT_AMOUNT_TOLERANCE) {
        confidence += 40;
        matchType = 'tolerance';
        matchReasons.push(`Amount within ${(this.DEFAULT_AMOUNT_TOLERANCE * 100).toFixed(0)}% tolerance`);
      }

      const daysDiff = Math.abs(
        (new Date(bankTx.date).getTime() - new Date(payment.date).getTime()) /
          (1000 * 60 * 60 * 24)
      );
      if (daysDiff <= 1) {
        confidence += 25;
        matchReasons.push('Same/next day');
      } else if (daysDiff <= 3) {
        confidence += 20;
      } else if (daysDiff <= 7) {
        confidence += 15;
      }

      if (payment.description && bankTx.name) {
        const descMatch = bankTx.name.toLowerCase().includes(payment.description.toLowerCase()) ||
                         payment.description.toLowerCase().includes(bankTx.name.toLowerCase());
        if (descMatch) {
          confidence += 10;
          matchReasons.push('Description match');
        }
      }

      // Check if contact name matches bank transaction name
      if (payment.contactName && bankTx.name) {
        const nameMatch = bankTx.name.toLowerCase().includes(payment.contactName.toLowerCase()) ||
                         payment.contactName.toLowerCase().includes(bankTx.name.toLowerCase());
        if (nameMatch) {
          confidence += 15;
          matchReasons.push('Vendor name match');
        }
      }

      if (confidence >= 50) {
        matches.push({
          transactionId: payment.id,
          transactionType: payment.type,
          reference: payment.reference,
          description: payment.description,
          amount: payment.amount,
          date: payment.date,
          contactId: payment.contactId,
          contactName: payment.contactName,
          balance: null,
          confidence,
          matchType,
          matchReason: matchReasons.join(', '),
        });
      }
    }

    return matches;
  }
}

export const matchingService = new MatchingService();
