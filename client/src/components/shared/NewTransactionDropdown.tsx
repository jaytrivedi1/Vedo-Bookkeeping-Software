import { useState } from "react";
import { useLocation } from "wouter";
import {
  FileText,
  Receipt,
  RefreshCw,
  DollarSign,
  CreditCard,
  FileCheck,
  ChevronDown,
  Plus,
  Wallet,
  Banknote,
  FileX
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NewTransactionDropdownProps {
  contactId: number;
  contactType: 'customer' | 'vendor';
  disabled?: boolean;
}

interface TransactionOption {
  label: string;
  icon: React.ReactNode;
  path: string;
  description?: string;
}

export default function NewTransactionDropdown({
  contactId,
  contactType,
  disabled = false
}: NewTransactionDropdownProps) {
  const [, navigate] = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  // Customer transaction options
  const customerOptions: TransactionOption[] = [
    {
      label: "Invoice",
      icon: <FileText className="h-4 w-4" />,
      path: `/invoices/new?customerId=${contactId}`,
      description: "Create a new invoice"
    },
    {
      label: "Quotation",
      icon: <FileCheck className="h-4 w-4" />,
      path: `/quotations/new?customerId=${contactId}`,
      description: "Create a price quote"
    },
    {
      label: "Recurring Invoice",
      icon: <RefreshCw className="h-4 w-4" />,
      path: `/recurring-invoices/new?customerId=${contactId}`,
      description: "Set up recurring billing"
    },
    {
      label: "Receive Payment",
      icon: <DollarSign className="h-4 w-4" />,
      path: `/payment-receive?customerId=${contactId}`,
      description: "Record a payment"
    },
    {
      label: "Sales Receipt",
      icon: <Receipt className="h-4 w-4" />,
      path: `/sales-receipts/new?customerId=${contactId}`,
      description: "Record a sale with payment"
    },
    {
      label: "Deposit",
      icon: <Wallet className="h-4 w-4" />,
      path: `/deposits/new?customerId=${contactId}`,
      description: "Record a deposit"
    },
    {
      label: "Customer Credit",
      icon: <CreditCard className="h-4 w-4" />,
      path: `/customer-credits/new?customerId=${contactId}`,
      description: "Issue a credit memo"
    }
  ];

  // Vendor transaction options
  const vendorOptions: TransactionOption[] = [
    {
      label: "Bill",
      icon: <FileText className="h-4 w-4" />,
      path: `/bills/new?vendorId=${contactId}`,
      description: "Record a bill"
    },
    {
      label: "Pay Bill",
      icon: <DollarSign className="h-4 w-4" />,
      path: `/payments/new?vendorId=${contactId}`,
      description: "Make a payment"
    },
    {
      label: "Cheque",
      icon: <Banknote className="h-4 w-4" />,
      path: `/cheques/new?vendorId=${contactId}`,
      description: "Write a cheque"
    },
    {
      label: "Expense",
      icon: <Receipt className="h-4 w-4" />,
      path: `/expenses/new?vendorId=${contactId}`,
      description: "Record an expense"
    },
    {
      label: "Vendor Credit",
      icon: <FileX className="h-4 w-4" />,
      path: `/vendor-credits/new?vendorId=${contactId}`,
      description: "Record a credit from vendor"
    }
  ];

  const options = contactType === 'customer' ? customerOptions : vendorOptions;

  const handleSelect = (path: string) => {
    setIsOpen(false);
    navigate(path);
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
          disabled={disabled}
        >
          <Plus className="h-4 w-4 mr-2" />
          New Transaction
          <ChevronDown className="h-4 w-4 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {options.map((option, index) => (
          <div key={option.label}>
            {/* Add separator before "Receive Payment" for customers or "Pay Bill" for vendors */}
            {contactType === 'customer' && option.label === 'Receive Payment' && (
              <DropdownMenuSeparator />
            )}
            {contactType === 'vendor' && option.label === 'Pay Bill' && (
              <DropdownMenuSeparator />
            )}
            <DropdownMenuItem
              onClick={() => handleSelect(option.path)}
              className="flex items-center gap-3 py-2.5 px-3 cursor-pointer"
            >
              <span className="text-slate-500">{option.icon}</span>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-slate-700">{option.label}</span>
                {option.description && (
                  <span className="text-xs text-slate-400">{option.description}</span>
                )}
              </div>
            </DropdownMenuItem>
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
