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

interface PaymentResponse {
  transaction: Transaction;
  lineItems: any[];
  ledgerEntries: LedgerEntry[];
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
  
  // Get contact information
  const contact = contacts?.find(c => c.id === data?.transaction?.contactId);
  
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
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
  const depositEntry = ledgerEntries.find(entry => entry.debit > 0);
  const depositAccountId = depositEntry?.accountId;
  const depositAccount = accounts?.find(a => a.id === depositAccountId);
  
  // Find invoice payment details from ledger entries
  const invoicePayments = ledgerEntries
    .filter(entry => entry.accountId === 2 && entry.credit > 0) // Accounts Receivable credits
    .map(entry => {
      // Try to extract invoice information from description
      const match = entry.description?.match(/Invoice (\d+)/i);
      return {
        id: entry.id,
        invoiceReference: match ? match[1] : 'Unknown',
        amount: entry.credit,
        description: entry.description || ''
      };
    });

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center mb-6">
        <Button 
          variant="ghost" 
          onClick={() => navigate("/dashboard")}
          className="mr-2"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">
          Payment {payment.reference ? `#${payment.reference}` : ''}
        </h1>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main payment details */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Payment Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Customer</h3>
                    <p className="text-base font-medium">
                      {contact ? contact.name : `Customer #${payment.contactId}`}
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Date</h3>
                    <p className="text-base">
                      {format(new Date(payment.date), "MMMM dd, yyyy")}
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Status</h3>
                    <div className="mt-1">
                      <Badge className="bg-green-100 text-green-800">
                        {payment.status.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Reference</h3>
                    <p className="text-base">
                      {payment.reference || 'N/A'}
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Amount</h3>
                    <p className="text-xl font-semibold text-green-700">
                      {formatCurrency(payment.amount)}
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Deposit Account</h3>
                    <p className="text-base">
                      {depositAccount ? depositAccount.name : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
              
              {payment.description && (
                <div className="mt-6 border-t pt-6">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Description</h3>
                  <p className="text-base">{payment.description}</p>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Applied to Invoices */}
          <Card>
            <CardHeader>
              <CardTitle>Applied to Invoices</CardTitle>
            </CardHeader>
            <CardContent>
              {invoicePayments.length === 0 ? (
                <p className="text-gray-500">No invoice payments found</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoicePayments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>{payment.invoiceReference}</TableCell>
                        <TableCell>{payment.description}</TableCell>
                        <TableCell className="text-right">{formatCurrency(payment.amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Journal entries */}
        <Card>
          <CardHeader>
            <CardTitle>Journal Entries</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ledgerEntries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      {accounts?.find(a => a.id === entry.accountId)?.name || `Account #${entry.accountId}`}
                    </TableCell>
                    <TableCell className="text-right">
                      {entry.debit > 0 ? formatCurrency(entry.debit) : ''}
                    </TableCell>
                    <TableCell className="text-right">
                      {entry.credit > 0 ? formatCurrency(entry.credit) : ''}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}