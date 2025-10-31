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

interface Bill {
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

interface PayBillsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bankTransactionAmount: number;
  onConfirm: (data: {
    selectedBills: { billId: number; amountToApply: number }[];
    difference?: {
      accountId: number;
      amount: number;
      description: string;
    };
  }) => void;
}

export function PayBillsDialog({ open, onOpenChange, bankTransactionAmount, onConfirm }: PayBillsDialogProps) {
  const [selectedBills, setSelectedBills] = useState<Map<number, number>>(new Map());
  const [vendorFilter, setVendorFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [differenceAccountId, setDifferenceAccountId] = useState<string>("");
  const [differenceAmount, setDifferenceAmount] = useState<string>("");
  const [differenceDescription, setDifferenceDescription] = useState<string>("");

  // Fetch all open bills
  const { data: bills = [], isLoading } = useQuery<Bill[]>({
    queryKey: ['/api/transactions', { type: 'bill', status: 'open' }],
    enabled: open,
    queryFn: async () => {
      const res = await fetch('/api/transactions?type=bill&status=open', {
        credentials: 'include',
      });
      if (!res.ok) {
        throw new Error('Failed to fetch bills');
      }
      return res.json();
    },
  });

  // Fetch all contacts for filtering
  const { data: contacts = [] } = useQuery<any[]>({
    queryKey: ['/api/contacts'],
    enabled: open,
  });

  // Fetch expense accounts for difference dropdown
  const { data: accounts = [] } = useQuery<any[]>({
    queryKey: ['/api/accounts'],
    enabled: open,
  });

  const expenseAccounts = useMemo(() => {
    return accounts.filter(a => a.type === 'expense' || a.type === 'other_expense' || a.type === 'cost_of_goods_sold');
  }, [accounts]);

  // Get bills with contact names
  const billsWithContacts = useMemo(() => {
    return bills.map(bill => ({
      ...bill,
      contactName: contacts.find(c => c.id === bill.contactId)?.name || 'Unknown Vendor'
    }));
  }, [bills, contacts]);

  // Filter bills
  const filteredBills = useMemo(() => {
    return billsWithContacts.filter(bill => {
      // Vendor filter
      if (vendorFilter !== "all" && bill.contactId?.toString() !== vendorFilter) {
        return false;
      }

      // Search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          bill.reference?.toLowerCase().includes(query) ||
          bill.contactName?.toLowerCase().includes(query) ||
          bill.description?.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [billsWithContacts, vendorFilter, searchQuery]);

  // Calculate total selected
  const totalSelected = useMemo(() => {
    let total = 0;
    selectedBills.forEach(amount => {
      total += amount;
    });
    return total;
  }, [selectedBills]);

  // Calculate remaining amount
  const remainingAmount = bankTransactionAmount - totalSelected;

  // Auto-fill difference amount when remaining changes (only for positive remainders)
  useEffect(() => {
    if (remainingAmount > 0.01) {
      setDifferenceAmount(remainingAmount.toFixed(2));
    } else {
      setDifferenceAmount("");
    }
  }, [remainingAmount]);

  // Check if totals match (either exact match or difference is accounted for)
  // For payments: only allow positive remainingAmount (under-allocation), never negative (over-allocation)
  const diffAmount = parseFloat(differenceAmount) || 0;
  const totalsMatch = Math.abs(remainingAmount) < 0.01 || 
    (remainingAmount > 0 && differenceAccountId && Math.abs(remainingAmount - diffAmount) < 0.01);

  const handleToggleBill = (billId: number, billBalance: number) => {
    const newSelected = new Map(selectedBills);
    
    if (newSelected.has(billId)) {
      newSelected.delete(billId);
    } else {
      // Auto-fill with available amount
      const amountToApply = Math.min(billBalance, remainingAmount);
      if (amountToApply > 0) {
        newSelected.set(billId, amountToApply);
      }
    }
    
    setSelectedBills(newSelected);
  };

  const handleAmountChange = (billId: number, value: string, maxAmount: number) => {
    const amount = parseFloat(value) || 0;
    const newSelected = new Map(selectedBills);
    
    // Enforce max amount (bill balance)
    const validAmount = Math.min(amount, maxAmount);
    
    if (validAmount > 0) {
      newSelected.set(billId, validAmount);
    } else {
      newSelected.delete(billId);
    }
    
    setSelectedBills(newSelected);
  };

  const handleConfirm = () => {
    if (!totalsMatch) {
      return;
    }

    // Prevent over-allocation: reject if remainingAmount is negative
    if (remainingAmount < -0.01) {
      return; // User has allocated more than the bank transaction
    }

    // Final validation: ensure no amount exceeds bill balance
    for (const [billId, amountToApply] of selectedBills.entries()) {
      const bill = filteredBills.find(b => b.id === billId);
      if (bill && amountToApply > bill.balance + 0.01) {
        return; // Shouldn't happen with input validation, but safety check
      }
    }

    const billsToMatch = Array.from(selectedBills.entries()).map(([billId, amountToApply]) => ({
      billId,
      amountToApply,
    }));

    // Include difference data if applicable (only for positive remainders)
    const data: any = { selectedBills: billsToMatch };
    
    if (remainingAmount > 0.01 && differenceAccountId && diffAmount > 0) {
      data.difference = {
        accountId: parseInt(differenceAccountId),
        amount: diffAmount,
        description: differenceDescription || `Bank payment difference - ${format(new Date(), 'PP')}`,
      };
    }

    onConfirm(data);
    setSelectedBills(new Map());
    setDifferenceAccountId("");
    setDifferenceAmount("");
    setDifferenceDescription("");
  };

  const handleCancel = () => {
    setSelectedBills(new Map());
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Pay Bills</DialogTitle>
          <DialogDescription>
            Select bills to pay with this ${bankTransactionAmount.toFixed(2)} bank payment
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Filters */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Vendor</Label>
              <Select value={vendorFilter} onValueChange={setVendorFilter}>
                <SelectTrigger data-testid="select-vendor-filter">
                  <SelectValue placeholder="All Vendors" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Vendors</SelectItem>
                  {contacts.filter(c => c.type === 'vendor' || c.type === 'both').map(contact => (
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
                placeholder="Search by bill # or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="input-search-bills"
              />
            </div>
          </div>

          {/* Bills List */}
          <ScrollArea className="flex-1 border rounded-md">
            <div className="p-4 space-y-2">
              {isLoading ? (
                <div className="text-center text-muted-foreground py-8">Loading bills...</div>
              ) : filteredBills.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">No outstanding bills found</div>
              ) : (
                filteredBills.map(bill => {
                  const isSelected = selectedBills.has(bill.id);
                  const billBalance = bill.balance ?? 0;
                  const amountToApply = selectedBills.get(bill.id) || billBalance;

                  return (
                    <div
                      key={bill.id}
                      className={`flex items-center gap-4 p-3 rounded-md border ${
                        isSelected ? 'bg-blue-50 border-blue-300' : 'hover:bg-gray-50'
                      }`}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleToggleBill(bill.id, billBalance)}
                        data-testid={`checkbox-bill-${bill.id}`}
                      />
                      
                      <div className="flex-1 grid grid-cols-4 gap-4">
                        <div>
                          <div className="font-medium text-sm">{bill.contactName}</div>
                          <div className="text-xs text-gray-500">{bill.reference}</div>
                        </div>
                        <div className="text-sm">
                          <div className="text-gray-500">Date</div>
                          <div>{format(new Date(bill.date), 'PP')}</div>
                        </div>
                        <div className="text-sm">
                          <div className="text-gray-500">Balance Due</div>
                          <div className="font-medium">${billBalance.toFixed(2)}</div>
                        </div>
                        <div className="text-sm">
                          {isSelected ? (
                            <div>
                              <div className="text-gray-500">Amount to Apply</div>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                max={billBalance}
                                value={amountToApply}
                                onChange={(e) => handleAmountChange(bill.id, e.target.value, billBalance)}
                                className="h-8 w-32"
                                data-testid={`input-amount-${bill.id}`}
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

          {/* Difference Section */}
          {Math.abs(remainingAmount) > 0.01 && (
            <div className="space-y-3 border rounded-md p-4 bg-blue-50">
              <div className="font-medium text-sm">Record Difference</div>
              <div className="text-xs text-muted-foreground mb-2">
                Allocate the remaining ${Math.abs(remainingAmount).toFixed(2)} to an expense account
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Account</Label>
                  <Select value={differenceAccountId} onValueChange={setDifferenceAccountId}>
                    <SelectTrigger data-testid="select-difference-account">
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      {expenseAccounts.map(account => (
                        <SelectItem key={account.id} value={account.id.toString()}>
                          {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Amount</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={differenceAmount}
                    onChange={(e) => setDifferenceAmount(e.target.value)}
                    data-testid="input-difference-amount"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Description</Label>
                  <Input
                    type="text"
                    placeholder="e.g., Bank fees"
                    value={differenceDescription}
                    onChange={(e) => setDifferenceDescription(e.target.value)}
                    data-testid="input-difference-description"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Summary */}
          <div className="space-y-2 border-t pt-4">
            <div className="flex justify-between text-sm">
              <span>Bank Payment Amount:</span>
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

            {!totalsMatch && Math.abs(remainingAmount) > 0.01 && (
              <Alert>
                <AlertDescription>
                  {Math.abs(remainingAmount) > 0.01 && !differenceAccountId
                    ? "Please select an account to record the difference or adjust your selections"
                    : "The difference amount must match the remaining amount"}
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
            disabled={!totalsMatch || selectedBills.size === 0}
            data-testid="button-confirm-pay-bills"
          >
            Match & Pay {selectedBills.size} Bill{selectedBills.size !== 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
