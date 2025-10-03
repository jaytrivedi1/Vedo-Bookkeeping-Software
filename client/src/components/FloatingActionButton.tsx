import { Plus, FileText, Receipt, ShoppingCart, CreditCard, DollarSign, BookOpen } from 'lucide-react';
import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function FloatingActionButton() {
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);

  const transactionOptions = [
    { label: 'Invoice', icon: FileText, path: '/invoice-new', color: 'text-blue-600' },
    { label: 'Payment', icon: DollarSign, path: '/payment-receive', color: 'text-green-600' },
    { label: 'Bill', icon: Receipt, path: '/bill-create', color: 'text-orange-600' },
    { label: 'Expense', icon: ShoppingCart, path: '/expenses/new', color: 'text-red-600' },
    { label: 'Deposit', icon: CreditCard, path: '/deposits', color: 'text-teal-600' },
    { label: 'Journal Entry', icon: BookOpen, path: '/journals', color: 'text-purple-600' },
  ];

  const handleSelect = (path: string) => {
    setOpen(false);
    setLocation(path);
  };

  return (
    <div className="fixed bottom-8 right-8 z-50">
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            size="lg"
            className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-110"
            data-testid="fab-button"
          >
            <Plus className="h-6 w-6" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56" data-testid="fab-menu">
          <DropdownMenuLabel>Create New Transaction</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {transactionOptions.map((option) => (
            <DropdownMenuItem
              key={option.path}
              onClick={() => handleSelect(option.path)}
              className="cursor-pointer"
              data-testid={`fab-option-${option.label.toLowerCase().replace(' ', '-')}`}
            >
              <option.icon className={`mr-2 h-4 w-4 ${option.color}`} />
              <span>{option.label}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
