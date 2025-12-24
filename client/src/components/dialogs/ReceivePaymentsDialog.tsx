import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ExchangeRateInput } from "@/components/ui/exchange-rate-input";
import { ExchangeRateUpdateDialog } from "./ExchangeRateUpdateDialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface Invoice {
  id: number;
  reference: string;
  date: string;
  description: string;
  amount: number;
  balance: number;
  contactId: number;
  contactName?: string;
  status: string;
  currency?: string;
  exchangeRate?: string;
}

interface ReceivePaymentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bankTransactionAmount: number;
  onConfirm: (data: {
    selectedInvoices: { invoiceId: number; amountToApply: number }[];
    difference?: {
      accountId: number;
      amount: number;
      description: string;
    };
  }) => void;
}

// Utility function to round to 2 decimal places
const roundTo2Decimals = (num: number): number => {
  return Math.round(num * 100) / 100;
};

export function ReceivePaymentsDialog({ open, onOpenChange, bankTransactionAmount, onConfirm }: ReceivePaymentsDialogProps) {
  const { toast } = useToast();
  const [selectedInvoices, setSelectedInvoices] = useState<Map<number, number>>(new Map());
  const [customerFilter, setCustomerFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [differenceAccountId, setDifferenceAccountId] = useState<string>("");
  const [differenceAmount, setDifferenceAmount] = useState<string>("");
  const [differenceDescription, setDifferenceDescription] = useState<string>("");
  const [exchangeRate, setExchangeRate] = useState<number>(1);
  const [showExchangeRateDialog, setShowExchangeRateDialog] = useState(false);
  const [pendingExchangeRate, setPendingExchangeRate] = useState<number | null>(null);

  // Fetch preferences for home currency
  const { data: preferences } = useQuery<any>({
    queryKey: ["/api/preferences"],
    enabled: open,
  });
  
  const homeCurrency = preferences?.homeCurrency || 'CAD';
  const isMultiCurrencyEnabled = preferences?.multiCurrencyEnabled || false;

  // Fetch all open invoices
  const { data: invoices = [], isLoading } = useQuery<Invoice[]>({
    queryKey: ['/api/transactions', { type: 'invoice', status: 'open' }],
    enabled: open,
    queryFn: async () => {
      const res = await fetch('/api/transactions?type=invoice&status=open', {
        credentials: 'include',
      });
      if (!res.ok) {
        throw new Error('Failed to fetch invoices');
      }
      return res.json();
    },
  });

  // Fetch all contacts for filtering
  const { data: contacts = [] } = useQuery<any[]>({
    queryKey: ['/api/contacts'],
    enabled: open,
  });

  // Fetch income accounts for difference dropdown
  const { data: accounts = [] } = useQuery<any[]>({
    queryKey: ['/api/accounts'],
    enabled: open,
  });

  const incomeAccounts = useMemo(() => {
    return accounts.filter(a => a.type === 'income' || a.type === 'other_income');
  }, [accounts]);

  // Get invoices with contact names
  const invoicesWithContacts = useMemo(() => {
    return invoices.map(invoice => ({
      ...invoice,
      contactName: contacts.find(c => c.id === invoice.contactId)?.name || 'Unknown Customer'
    }));
  }, [invoices, contacts]);

  // Filter invoices
  const filteredInvoices = useMemo(() => {
    return invoicesWithContacts.filter(invoice => {
      // Customer filter
      if (customerFilter !== "all" && invoice.contactId?.toString() !== customerFilter) {
        return false;
      }

      // Search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          invoice.reference?.toLowerCase().includes(query) ||
          invoice.contactName?.toLowerCase().includes(query) ||
          invoice.description?.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [invoicesWithContacts, customerFilter, searchQuery]);

  // Calculate total selected
  const totalSelected = useMemo(() => {
    let total = 0;
    selectedInvoices.forEach(amount => {
      total += amount;
    });
    return roundTo2Decimals(total);
  }, [selectedInvoices]);

  // Calculate remaining amount (rounded to 2 decimals)
  const remainingAmount = roundTo2Decimals(bankTransactionAmount - totalSelected);

  // Detect foreign currency from selected invoices
  const selectedInvoiceCurrency = useMemo(() => {
    if (selectedInvoices.size === 0 || !isMultiCurrencyEnabled) return null;
    
    const selectedIds = Array.from(selectedInvoices.keys());
    const selectedInvoiceData = filteredInvoices.filter(inv => selectedIds.includes(inv.id));
    
    // Find if any selected invoice has a foreign currency
    const foreignCurrencyInvoices = selectedInvoiceData.filter(
      inv => inv.currency && inv.currency !== homeCurrency
    );
    
    // Return the currency if all foreign currency invoices share the same currency
    if (foreignCurrencyInvoices.length > 0) {
      const currencies = Array.from(new Set(foreignCurrencyInvoices.map(inv => inv.currency)));
      if (currencies.length === 1) {
        return currencies[0];
      }
    }
    
    return null;
  }, [selectedInvoices, filteredInvoices, isMultiCurrencyEnabled, homeCurrency]);

  const isForeignCurrency = selectedInvoiceCurrency !== null;
  const paymentDate = new Date();

  // Fetch exchange rate when foreign currency is detected
  const { data: exchangeRateData, isLoading: exchangeRateLoading } = useQuery<any>({
    queryKey: ['/api/exchange-rates/rate', { fromCurrency: selectedInvoiceCurrency, toCurrency: homeCurrency, date: paymentDate }],
    enabled: isForeignCurrency && open,
    queryFn: async () => {
      const response = await fetch(
        `/api/exchange-rates/rate?fromCurrency=${selectedInvoiceCurrency}&toCurrency=${homeCurrency}&date=${format(paymentDate, 'yyyy-MM-dd')}`
      );
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error('Failed to fetch exchange rate');
      }
      return response.json();
    },
  });

  // Update exchange rate when exchange rate data changes
  useEffect(() => {
    if (exchangeRateData && exchangeRateData.rate) {
      setExchangeRate(parseFloat(exchangeRateData.rate));
    } else if (!isForeignCurrency) {
      setExchangeRate(1);
    }
  }, [exchangeRateData, isForeignCurrency]);

  // Handle exchange rate changes from the ExchangeRateInput component
  const handleExchangeRateChange = (newRate: number, shouldUpdate: boolean) => {
    if (shouldUpdate) {
      setPendingExchangeRate(newRate);
      setShowExchangeRateDialog(true);
    } else {
      setExchangeRate(newRate);
    }
  };

  // Handle exchange rate update dialog confirmation
  const handleExchangeRateUpdate = async (scope: 'transaction_only' | 'all_on_date') => {
    if (pendingExchangeRate === null || !selectedInvoiceCurrency) return;

    if (scope === 'transaction_only') {
      setExchangeRate(pendingExchangeRate);
      toast({
        title: "Exchange rate updated",
        description: "The rate has been updated for this transaction only.",
      });
    } else {
      try {
        await apiRequest('/api/exchange-rates', 'PUT', {
          fromCurrency: selectedInvoiceCurrency,
          toCurrency: homeCurrency,
          rate: pendingExchangeRate,
          date: format(paymentDate, 'yyyy-MM-dd'),
          scope: 'all_on_date'
        });
        
        setExchangeRate(pendingExchangeRate);
        queryClient.invalidateQueries({ queryKey: ['/api/exchange-rates'] });
        
        toast({
          title: "Exchange rate updated",
          description: `The rate has been updated for all transactions on ${format(paymentDate, 'PPP')}.`,
        });
      } catch (error: any) {
        toast({
          title: "Error updating exchange rate",
          description: error?.message || "Failed to update exchange rate in database.",
          variant: "destructive",
        });
      }
    }
    
    setPendingExchangeRate(null);
    setShowExchangeRateDialog(false);
  };

  // Auto-fill difference amount when remaining changes (only for positive remainders)
  useEffect(() => {
    if (remainingAmount > 0.01) {
      setDifferenceAmount(remainingAmount.toFixed(2));
    } else {
      setDifferenceAmount("");
    }
  }, [remainingAmount]);

  // Check if totals match (either exact match or difference is accounted for)
  // For deposits: only allow positive remainingAmount (under-allocation), never negative (over-allocation)
  const diffAmount = parseFloat(differenceAmount) || 0;
  const totalsMatch = Math.abs(remainingAmount) < 0.01 || 
    (remainingAmount > 0 && differenceAccountId && Math.abs(remainingAmount - diffAmount) < 0.01);

  const handleToggleInvoice = (invoiceId: number, invoiceBalance: number) => {
    const newSelected = new Map(selectedInvoices);
    
    if (newSelected.has(invoiceId)) {
      newSelected.delete(invoiceId);
    } else {
      // Auto-fill with available amount (rounded to 2 decimals)
      const amountToApply = roundTo2Decimals(Math.min(invoiceBalance, remainingAmount));
      if (amountToApply > 0) {
        newSelected.set(invoiceId, amountToApply);
      }
    }
    
    setSelectedInvoices(newSelected);
  };

  const handleAmountChange = (invoiceId: number, value: string, maxAmount: number) => {
    const amount = parseFloat(value) || 0;
    const newSelected = new Map(selectedInvoices);
    
    // Enforce max amount (invoice balance) and round to 2 decimals
    const validAmount = roundTo2Decimals(Math.min(amount, maxAmount));
    
    if (validAmount > 0) {
      newSelected.set(invoiceId, validAmount);
    } else {
      newSelected.delete(invoiceId);
    }
    
    setSelectedInvoices(newSelected);
  };

  const handleConfirm = () => {
    if (!totalsMatch) {
      return;
    }

    // Prevent over-allocation: reject if remainingAmount is negative
    if (remainingAmount < -0.01) {
      return; // User has allocated more than the bank transaction
    }

    // Final validation: ensure no amount exceeds invoice balance
    for (const [invoiceId, amountToApply] of Array.from(selectedInvoices.entries())) {
      const invoice = filteredInvoices.find(inv => inv.id === invoiceId);
      if (invoice && amountToApply > invoice.balance + 0.01) {
        return; // Shouldn't happen with input validation, but safety check
      }
    }

    const invoicesToMatch = Array.from(selectedInvoices.entries()).map(([invoiceId, amountToApply]) => ({
      invoiceId,
      amountToApply,
    }));

    // Include difference data if applicable (only for positive remainders)
    const data: any = { selectedInvoices: invoicesToMatch };
    
    if (remainingAmount > 0.01 && differenceAccountId && diffAmount > 0) {
      data.difference = {
        accountId: parseInt(differenceAccountId),
        amount: diffAmount,
        description: differenceDescription || `Bank deposit difference - ${format(new Date(), 'PP')}`,
      };
    }

    // Include exchange rate data for foreign currency payments
    if (isForeignCurrency && selectedInvoiceCurrency) {
      data.exchangeRate = exchangeRate;
      data.currency = selectedInvoiceCurrency;
    }

    onConfirm(data);
    setSelectedInvoices(new Map());
    setDifferenceAccountId("");
    setDifferenceAmount("");
    setDifferenceDescription("");
  };

  const handleCancel = () => {
    setSelectedInvoices(new Map());
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Receive Payments</DialogTitle>
          <DialogDescription>
            Select invoices to apply this ${bankTransactionAmount.toFixed(2)} bank deposit to
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Filters */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Customer</Label>
              <Select value={customerFilter} onValueChange={setCustomerFilter}>
                <SelectTrigger className="bg-slate-50 border-slate-200 h-11 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl" data-testid="select-customer-filter">
                  <SelectValue placeholder="All Customers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Customers</SelectItem>
                  {contacts.filter(c => c.type === 'customer' || c.type === 'both').map(contact => (
                    <SelectItem key={contact.id} value={contact.id.toString()}>
                      {contact.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Search</Label>
              <Input
                placeholder="Search by invoice # or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-50 border-slate-200 h-11 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl"
                data-testid="input-search-invoices"
              />
            </div>
          </div>

          {/* Invoices List */}
          <ScrollArea className="flex-1 border border-slate-200 rounded-xl">
            <div className="p-4 space-y-2">
              {isLoading ? (
                <div className="text-center text-slate-500 py-8">Loading invoices...</div>
              ) : filteredInvoices.length === 0 ? (
                <div className="text-center text-slate-500 py-8">No outstanding invoices found</div>
              ) : (
                filteredInvoices.map(invoice => {
                  const isSelected = selectedInvoices.has(invoice.id);
                  const invoiceBalance = invoice.balance ?? 0;
                  const amountToApply = selectedInvoices.get(invoice.id) || invoiceBalance;

                  return (
                    <div
                      key={invoice.id}
                      className={`flex items-center gap-4 p-4 rounded-xl border ${
                        isSelected ? 'bg-green-50 border-green-300' : 'border-slate-200 hover:bg-slate-50/50'
                      }`}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleToggleInvoice(invoice.id, invoiceBalance)}
                        data-testid={`checkbox-invoice-${invoice.id}`}
                      />

                      <div className="flex-1 grid grid-cols-4 gap-4">
                        <div>
                          <div className="font-medium text-sm text-slate-900">{invoice.contactName}</div>
                          <div className="text-xs text-slate-500">{invoice.reference}</div>
                        </div>
                        <div className="text-sm">
                          <div className="text-xs text-slate-500 uppercase tracking-wide">Date</div>
                          <div className="text-slate-700">{format(new Date(invoice.date), 'PP')}</div>
                        </div>
                        <div className="text-sm">
                          <div className="text-xs text-slate-500 uppercase tracking-wide">Balance Due</div>
                          <div className="font-medium text-slate-900">${invoiceBalance.toFixed(2)}</div>
                        </div>
                        <div className="text-sm">
                          {isSelected ? (
                            <div>
                              <div className="text-xs text-slate-500 uppercase tracking-wide">Amount to Apply</div>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                max={invoiceBalance}
                                value={amountToApply}
                                onChange={(e) => handleAmountChange(invoice.id, e.target.value, invoiceBalance)}
                                className="h-10 w-32 bg-white border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-lg"
                                data-testid={`input-amount-${invoice.id}`}
                              />
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>

          {/* Exchange Rate Section for Foreign Currency Invoices */}
          {isForeignCurrency && selectedInvoiceCurrency && (
            <div className="rounded-xl border border-slate-200 bg-blue-50 p-4">
              <ExchangeRateInput
                fromCurrency={selectedInvoiceCurrency}
                toCurrency={homeCurrency}
                value={exchangeRate}
                onChange={handleExchangeRateChange}
                isLoading={exchangeRateLoading}
              />
              <div className="text-xs text-slate-500 mt-2">
                Selected invoices are in {selectedInvoiceCurrency}. Payment will use this exchange rate.
              </div>
            </div>
          )}

          {/* Difference Section */}
          {Math.abs(remainingAmount) > 0.01 && (
            <div className="space-y-3 border border-slate-200 rounded-xl p-4 bg-blue-50">
              <div className="font-semibold text-sm text-slate-900">Record Difference</div>
              <div className="text-xs text-slate-500 mb-2">
                Allocate the remaining ${Math.abs(remainingAmount).toFixed(2)} to an income account
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Account</Label>
                  <Select value={differenceAccountId} onValueChange={setDifferenceAccountId}>
                    <SelectTrigger className="bg-white border-slate-200 h-10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-lg" data-testid="select-difference-account">
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      {incomeAccounts.map(account => (
                        <SelectItem key={account.id} value={account.id.toString()}>
                          {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Amount</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={differenceAmount}
                    onChange={(e) => setDifferenceAmount(e.target.value)}
                    className="bg-white border-slate-200 h-10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-lg"
                    data-testid="input-difference-amount"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Description</Label>
                  <Input
                    type="text"
                    placeholder="e.g., Bank interest"
                    value={differenceDescription}
                    onChange={(e) => setDifferenceDescription(e.target.value)}
                    className="bg-white border-slate-200 h-10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-lg"
                    data-testid="input-difference-description"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Summary */}
          <div className="space-y-2 border-t border-slate-200 pt-4">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Bank Deposit Amount:</span>
              <span className="font-medium text-slate-900">${bankTransactionAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Total Selected:</span>
              <span className="font-medium text-slate-900">${totalSelected.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold">
              <span className="text-slate-900">Remaining:</span>
              <span className={remainingAmount !== 0 ? 'text-red-600' : 'text-green-600'}>
                ${remainingAmount.toFixed(2)}
              </span>
            </div>

            {!totalsMatch && Math.abs(remainingAmount) > 0.01 && (
              <Alert className="border-orange-200 bg-orange-50">
                <AlertDescription className="text-orange-700">
                  {Math.abs(remainingAmount) > 0.01 && !differenceAccountId
                    ? "Please select an account to record the difference or adjust your selections"
                    : "The difference amount must match the remaining amount"}
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} className="border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl px-6" data-testid="button-cancel">
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!totalsMatch || selectedInvoices.size === 0}
            className="bg-blue-600 hover:bg-blue-700 rounded-xl px-6"
            data-testid="button-confirm-receive-payments"
          >
            Match & Receive {selectedInvoices.size} Payment{selectedInvoices.size !== 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>

      <ExchangeRateUpdateDialog
        open={showExchangeRateDialog}
        onOpenChange={setShowExchangeRateDialog}
        onConfirm={handleExchangeRateUpdate}
        fromCurrency={selectedInvoiceCurrency || homeCurrency}
        toCurrency={homeCurrency}
        oldRate={exchangeRate}
        newRate={pendingExchangeRate || exchangeRate}
        date={paymentDate}
      />
    </Dialog>
  );
}
