import { useState, useMemo } from "react";
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
}

interface ReceivePaymentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bankTransactionAmount: number;
  onConfirm: (selectedInvoices: { invoiceId: number; amountToApply: number }[]) => void;
}

export function ReceivePaymentsDialog({ open, onOpenChange, bankTransactionAmount, onConfirm }: ReceivePaymentsDialogProps) {
  const [selectedInvoices, setSelectedInvoices] = useState<Map<number, number>>(new Map());
  const [customerFilter, setCustomerFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch all open invoices
  const { data: invoices = [], isLoading } = useQuery<Invoice[]>({
    queryKey: ['/api/transactions', { type: 'invoice', status: 'open' }],
    enabled: open,
  });

  // Fetch all contacts for filtering
  const { data: contacts = [] } = useQuery<any[]>({
    queryKey: ['/api/contacts'],
    enabled: open,
  });

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
    return total;
  }, [selectedInvoices]);

  // Calculate remaining amount
  const remainingAmount = bankTransactionAmount - totalSelected;

  // Check if totals match
  const totalsMatch = Math.abs(remainingAmount) < 0.01;

  const handleToggleInvoice = (invoiceId: number, invoiceBalance: number) => {
    const newSelected = new Map(selectedInvoices);
    
    if (newSelected.has(invoiceId)) {
      newSelected.delete(invoiceId);
    } else {
      // Auto-fill with available amount
      const amountToApply = Math.min(invoiceBalance, remainingAmount);
      if (amountToApply > 0) {
        newSelected.set(invoiceId, amountToApply);
      }
    }
    
    setSelectedInvoices(newSelected);
  };

  const handleAmountChange = (invoiceId: number, value: string, maxAmount: number) => {
    const amount = parseFloat(value) || 0;
    const newSelected = new Map(selectedInvoices);
    
    // Enforce max amount (invoice balance)
    const validAmount = Math.min(amount, maxAmount);
    
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

    // Final validation: ensure no amount exceeds invoice balance
    for (const [invoiceId, amountToApply] of selectedInvoices.entries()) {
      const invoice = filteredInvoices.find(inv => inv.id === invoiceId);
      if (invoice && amountToApply > invoice.balance + 0.01) {
        return; // Shouldn't happen with input validation, but safety check
      }
    }

    const invoicesToMatch = Array.from(selectedInvoices.entries()).map(([invoiceId, amountToApply]) => ({
      invoiceId,
      amountToApply,
    }));

    onConfirm(invoicesToMatch);
    setSelectedInvoices(new Map());
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
              <Label>Customer</Label>
              <Select value={customerFilter} onValueChange={setCustomerFilter}>
                <SelectTrigger data-testid="select-customer-filter">
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
              <Label>Search</Label>
              <Input
                placeholder="Search by invoice # or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="input-search-invoices"
              />
            </div>
          </div>

          {/* Invoices List */}
          <ScrollArea className="flex-1 border rounded-md">
            <div className="p-4 space-y-2">
              {isLoading ? (
                <div className="text-center text-muted-foreground py-8">Loading invoices...</div>
              ) : filteredInvoices.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">No outstanding invoices found</div>
              ) : (
                filteredInvoices.map(invoice => {
                  const isSelected = selectedInvoices.has(invoice.id);
                  const amountToApply = selectedInvoices.get(invoice.id) || invoice.balance;

                  return (
                    <div
                      key={invoice.id}
                      className={`flex items-center gap-4 p-3 rounded-md border ${
                        isSelected ? 'bg-green-50 border-green-300' : 'hover:bg-gray-50'
                      }`}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleToggleInvoice(invoice.id, invoice.balance)}
                        data-testid={`checkbox-invoice-${invoice.id}`}
                      />
                      
                      <div className="flex-1 grid grid-cols-4 gap-4">
                        <div>
                          <div className="font-medium text-sm">{invoice.contactName}</div>
                          <div className="text-xs text-gray-500">{invoice.reference}</div>
                        </div>
                        <div className="text-sm">
                          <div className="text-gray-500">Date</div>
                          <div>{format(new Date(invoice.date), 'PP')}</div>
                        </div>
                        <div className="text-sm">
                          <div className="text-gray-500">Balance Due</div>
                          <div className="font-medium">${invoice.balance.toFixed(2)}</div>
                        </div>
                        <div className="text-sm">
                          {isSelected ? (
                            <div>
                              <div className="text-gray-500">Amount to Apply</div>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                max={invoice.balance}
                                value={amountToApply}
                                onChange={(e) => handleAmountChange(invoice.id, e.target.value, invoice.balance)}
                                className="h-8 w-32"
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

          {/* Summary */}
          <div className="space-y-2 border-t pt-4">
            <div className="flex justify-between text-sm">
              <span>Bank Deposit Amount:</span>
              <span className="font-medium">${bankTransactionAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Total Selected:</span>
              <span className="font-medium">${totalSelected.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold">
              <span>Remaining:</span>
              <span className={remainingAmount !== 0 ? 'text-red-600' : 'text-green-600'}>
                ${remainingAmount.toFixed(2)}
              </span>
            </div>

            {!totalsMatch && selectedInvoices.size > 0 && (
              <Alert variant="destructive">
                <AlertDescription>
                  Total selected invoices must equal the bank deposit amount
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} data-testid="button-cancel">
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!totalsMatch || selectedInvoices.size === 0}
            data-testid="button-confirm-receive-payments"
          >
            Match & Receive {selectedInvoices.size} Payment{selectedInvoices.size !== 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
