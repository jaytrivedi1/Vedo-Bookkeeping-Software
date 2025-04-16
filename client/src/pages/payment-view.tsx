import { useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Transaction, Contact, Account, LedgerEntry } from "@shared/schema";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

interface PaymentResponse {
  transaction: Transaction;
  lineItems: any[];
  ledgerEntries: LedgerEntry[];
}

interface InvoiceDetails {
  id: number;
  reference: string;
  date: Date;
  dueDate?: Date | null;
  balance: number;
  amount: number;
}

export default function PaymentView() {
  const [, navigate] = useLocation();
  const params = useParams();
  const paymentId = params.id;

  // Fetch payment data
  const { data, isLoading, error } = useQuery<PaymentResponse>({
    queryKey: ['/api/transactions', paymentId],
    queryFn: async () => {
      const response = await fetch(`/api/transactions/${paymentId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch payment details");
      }
      return response.json();
    },
  });

  // Fetch contacts for customer info
  const { data: contacts } = useQuery<Contact[]>({
    queryKey: ['/api/contacts'],
  });

  // Fetch accounts for account names
  const { data: accounts } = useQuery<Account[]>({
    queryKey: ['/api/accounts'],
  });

  // Fetch all transactions to get invoice details
  const { data: transactions } = useQuery<Transaction[]>({
    queryKey: ['/api/transactions'],
  });
  
  // Get contact information
  const contact = contacts?.find(c => c.id === data?.transaction?.contactId);
  
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount).replace('$', '');
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading payment...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-destructive">
        <p className="text-lg">Error loading payment: {String(error)}</p>
        <Button
          className="mt-4"
          onClick={() => navigate("/dashboard")}
        >
          Back to Dashboard
        </Button>
      </div>
    );
  }

  // If the transaction is not a payment, redirect to dashboard
  if (data?.transaction?.type !== 'payment') {
    navigate("/dashboard");
    return null;
  }

  const payment = data.transaction;
  const ledgerEntries = data.ledgerEntries || [];
  
  // Find the deposit account from ledger entries
  const depositEntry = ledgerEntries.find((entry: LedgerEntry) => entry.debit > 0);
  const depositAccountId = depositEntry?.accountId;
  const depositAccount = accounts?.find(a => a.id === depositAccountId);
  
  // Find invoice payment details from ledger entries
  const invoicePayments = ledgerEntries
    .filter((entry: LedgerEntry) => entry.accountId === 2 && entry.credit > 0) // Accounts Receivable credits
    .map((entry: LedgerEntry) => {
      // Try to extract invoice information from description
      const match = entry.description?.match(/Invoice (\d+)/i);
      const invoiceRef = match ? match[1] : 'Unknown';
      
      // Find the actual invoice transaction if possible
      const relatedInvoice = transactions?.find(t => 
        t.type === 'invoice' && 
        t.reference === invoiceRef && 
        t.contactId === payment.contactId
      );
      
      return {
        id: entry.id,
        invoiceReference: invoiceRef,
        invoiceId: relatedInvoice?.id,
        date: relatedInvoice?.date ? new Date(relatedInvoice.date) : null,
        dueDate: null, // Not always available in our system
        amount: entry.credit,
        balance: relatedInvoice?.balance || 0,
        description: entry.description || ''
      };
    });

  // Calculate totals
  const totalReceived = payment.amount;
  const totalApplied = invoicePayments.reduce((sum, p) => sum + p.amount, 0);
  const unappliedCredit = totalReceived - totalApplied;

  return (
    <div className="py-6">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => window.history.back()}
              className="mr-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-2xl font-semibold text-gray-900">Receive Payment</h1>
          </div>
          <Button
            className="bg-primary text-white"
            disabled
          >
            Record Payment
          </Button>
        </div>

        {/* Payment Details Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Payment Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="customer">Customer</Label>
                <div className="relative mt-1">
                  <Input
                    id="customer"
                    value={contact?.name || ''}
                    className="pr-10"
                    readOnly
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={contact?.email || ''}
                  readOnly
                  className="bg-muted/50"
                />
              </div>

              <div>
                <Label htmlFor="date">Payment Date</Label>
                <Input
                  id="date"
                  value={format(new Date(payment.date), "MMMM dd, yyyy")}
                  readOnly
                />
              </div>

              <div>
                <Label htmlFor="method">Payment Method</Label>
                <Input
                  id="method"
                  value={(payment as any).paymentMethod === 'bank_transfer' ? 'Bank Transfer' : 
                         (payment as any).paymentMethod === 'credit_card' ? 'Credit Card' : 
                         (payment as any).paymentMethod === 'cash' ? 'Cash' : 
                         (payment as any).paymentMethod === 'cheque' ? 'Cheque' : 
                         'Bank Transfer'}
                  readOnly
                />
              </div>

              <div>
                <Label htmlFor="reference">Reference Number</Label>
                <Input
                  id="reference"
                  value={payment.reference || ''}
                  readOnly
                />
              </div>

              <div>
                <Label htmlFor="depositTo">Deposit To</Label>
                <Input
                  id="depositTo"
                  value={depositAccount ? `${depositAccount.name} ${depositAccount.code ? `(${depositAccount.code})` : ''}` : ''}
                  readOnly
                />
              </div>

              <div>
                <Label htmlFor="amount">Amount Received</Label>
                <Input
                  id="amount"
                  value={formatCurrency(payment.amount)}
                  readOnly
                />
              </div>
            </div>

            <div className="mt-6">
              <Label htmlFor="notes">Memo / Notes</Label>
              <Input
                id="notes"
                value={payment.description || ''}
                readOnly
              />
            </div>
          </CardContent>
        </Card>

        {/* Apply Payment Section */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <CardTitle>Apply Payment to Invoices</CardTitle>
              <Button
                variant="outline"
                size="sm"
                disabled
              >
                Auto Apply
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Select
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Invoice #
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Due Date
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Balance
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Payment
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {invoicePayments.map((invoice, idx) => (
                    <tr key={invoice.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Checkbox
                          id={`invoice-${invoice.id}`}
                          checked={true}
                          disabled
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {invoice.invoiceReference}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {invoice.date ? format(new Date(invoice.date), 'MMM dd, yyyy') : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {invoice.dueDate ? format(new Date(invoice.dueDate), 'MMM dd, yyyy') : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatCurrency(invoice.balance + invoice.amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Input
                          type="text"
                          className="text-right"
                          value={formatCurrency(invoice.amount)}
                          readOnly
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6">
              <div className="flex justify-between py-2">
                <span className="font-medium">Total Received:</span>
                <span className="font-medium">{formatCurrency(totalReceived)}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="font-medium">Total Applied:</span>
                <span className="font-medium">{formatCurrency(totalApplied)}</span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between py-2">
                <span className="font-medium">Unapplied Credit:</span>
                <span className="font-medium">{formatCurrency(unappliedCredit)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}