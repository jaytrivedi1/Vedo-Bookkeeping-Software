import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Contact, Transaction } from "@shared/schema";
import { Search, User, Users } from "lucide-react";
import { formatCurrency, formatContactName } from "@/lib/currencyUtils";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";

interface CustomerSidebarProps {
  selectedId?: number;
  homeCurrency: string;
}

export default function CustomerSidebar({ selectedId, homeCurrency }: CustomerSidebarProps) {
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [includeInactive, setIncludeInactive] = useState(false);

  // Fetch customers
  const { data: contacts, isLoading: contactsLoading } = useQuery<Contact[]>({
    queryKey: ['/api/contacts', { includeInactive }],
    queryFn: () => apiRequest(`/api/contacts?includeInactive=${includeInactive}`, 'GET'),
  });

  // Fetch transactions for balance calculations
  const { data: transactions } = useQuery<Transaction[]>({
    queryKey: ['/api/transactions'],
  });

  // Filter customers
  const customers = contacts
    ? contacts.filter(contact => contact.type === 'customer' || contact.type === 'both')
    : [];

  // Filter by search query
  const filteredCustomers = customers.filter(customer => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      customer.name.toLowerCase().includes(query) ||
      (customer.email ? customer.email.toLowerCase().includes(query) : false) ||
      (customer.contactName ? customer.contactName.toLowerCase().includes(query) : false)
    );
  });

  // Calculate outstanding balance for a customer
  const getCustomerBalance = (customerId: number) => {
    if (!transactions) return 0;

    const customerTransactions = transactions.filter(t => t.contactId === customerId);
    const invoices = customerTransactions.filter(t => t.type === 'invoice');

    return invoices.reduce((sum, invoice) => {
      const balance = (invoice.balance !== null && invoice.balance !== undefined)
        ? invoice.balance
        : invoice.amount;
      return sum + balance;
    }, 0);
  };

  const handleCustomerClick = (customerId: number) => {
    navigate(`/customers/${customerId}`);
  };

  return (
    <div className="h-full flex flex-col bg-white border-r border-slate-200">
      {/* Header */}
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-5 w-5 text-slate-600" />
          <h2 className="font-semibold text-slate-800">Customers</h2>
          <Badge variant="secondary" className="ml-auto">
            {filteredCustomers.length}
          </Badge>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search customers..."
            className="pl-9 h-10 bg-slate-50 border-slate-200 focus:bg-white"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Include inactive toggle */}
        <div className="flex items-center gap-2 mt-3">
          <Switch
            id="show-inactive"
            checked={includeInactive}
            onCheckedChange={setIncludeInactive}
            className="scale-90"
          />
          <Label htmlFor="show-inactive" className="text-xs text-slate-500 cursor-pointer">
            Show inactive
          </Label>
        </div>
      </div>

      {/* Customer List */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {contactsLoading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600"></div>
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <User className="mx-auto h-10 w-10 mb-2 opacity-50" />
              <p className="text-sm">No customers found</p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredCustomers.map((customer) => {
                const balance = getCustomerBalance(customer.id);
                const isSelected = selectedId === customer.id;

                return (
                  <div
                    key={customer.id}
                    onClick={() => handleCustomerClick(customer.id)}
                    className={`
                      group p-3 rounded-xl cursor-pointer transition-all duration-150
                      ${isSelected
                        ? 'bg-emerald-50 border-l-4 border-l-emerald-500 shadow-sm'
                        : 'hover:bg-slate-50 border-l-4 border-l-transparent'
                      }
                    `}
                  >
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div className={`
                        w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-medium
                        ${isSelected
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
                        }
                      `}>
                        {customer.name.charAt(0).toUpperCase()}
                      </div>

                      {/* Name and Balance */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className={`
                            font-medium truncate text-sm
                            ${isSelected ? 'text-emerald-800' : 'text-slate-700'}
                          `}>
                            {formatContactName(customer.name, customer.currency, homeCurrency)}
                          </h3>
                          {customer.isActive === false && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              Inactive
                            </Badge>
                          )}
                        </div>
                        <p className={`
                          text-xs mt-0.5
                          ${balance > 0
                            ? 'text-emerald-600 font-medium'
                            : balance < 0
                              ? 'text-red-600 font-medium'
                              : 'text-slate-400'
                          }
                        `}>
                          {balance !== 0
                            ? formatCurrency(Math.abs(balance), homeCurrency, homeCurrency)
                            : 'No balance'
                          }
                          {balance > 0 && ' due'}
                          {balance < 0 && ' credit'}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
