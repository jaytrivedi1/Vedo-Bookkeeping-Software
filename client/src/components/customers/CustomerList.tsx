import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Contact, Transaction } from "@shared/schema";
import { Search, User, ChevronRight } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency, formatContactName } from "@/lib/currencyUtils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface CustomerListProps {
  className?: string;
}

export default function CustomerList({ className }: CustomerListProps) {
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [includeInactive, setIncludeInactive] = useState(false);

  // Fetch customers
  const { data: contacts, isLoading: contactsLoading } = useQuery<Contact[]>({
    queryKey: ['/api/contacts', { includeInactive }],
    queryFn: () => apiRequest(`/api/contacts?includeInactive=${includeInactive}`, 'GET'),
  });

  // Fetch transactions for balance display
  const { data: transactions } = useQuery<Transaction[]>({
    queryKey: ['/api/transactions'],
  });

  // Fetch preferences for home currency
  const { data: preferences } = useQuery<any>({
    queryKey: ['/api/settings/preferences'],
  });

  const homeCurrency = preferences?.homeCurrency || 'CAD';

  const handleCustomerClick = (customer: Contact) => {
    navigate(`/customers/${customer.id}`);
  };

  // Filter customers by search query
  const filteredCustomers = contacts
    ? contacts
        .filter(contact =>
          contact.type === 'customer' || contact.type === 'both'
        )
        .filter(customer => {
          if (!searchQuery) return true;
          const query = searchQuery.toLowerCase();
          return (
            customer.name.toLowerCase().includes(query) ||
            (customer.email ? customer.email.toLowerCase().includes(query) : false) ||
            (customer.contactName ? customer.contactName.toLowerCase().includes(query) : false) ||
            (customer.phone ? customer.phone.toLowerCase().includes(query) : false)
          );
        })
    : [];

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

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle>Customers</CardTitle>
          <CardDescription>
            View and manage all your customers
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search bar and toggle */}
          <div className="space-y-4 mb-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search customers..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="input-search-customers"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="show-inactive-customers"
                checked={includeInactive}
                onCheckedChange={setIncludeInactive}
                data-testid="switch-show-inactive-customers"
              />
              <Label htmlFor="show-inactive-customers" className="text-sm text-gray-600">
                Show inactive customers
              </Label>
            </div>
          </div>

          {/* Customers list */}
          <ScrollArea className="h-[400px]">
            {contactsLoading ? (
              <div className="flex justify-center items-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <User className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-semibold">No customers found</h3>
                <p className="mt-1 text-sm">Get started by adding a new customer.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredCustomers.map((customer) => {
                  const balance = getCustomerBalance(customer.id);

                  return (
                    <div
                      key={customer.id}
                      className="group p-4 rounded-lg border border-gray-200 hover:border-emerald-300 hover:shadow-md transition-all duration-200 cursor-pointer flex items-center gap-3"
                      onClick={() => handleCustomerClick(customer)}
                      data-testid={`customer-row-${customer.id}`}
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-100 to-emerald-200 flex items-center justify-center flex-shrink-0">
                        <span className="text-emerald-700 font-medium">
                          {customer.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-gray-900 truncate">
                            {formatContactName(customer.name, customer.currency, homeCurrency)}
                          </h3>
                          {customer.isActive === false && (
                            <Badge variant="secondary" className="text-xs" data-testid={`badge-inactive-${customer.id}`}>
                              Inactive
                            </Badge>
                          )}
                        </div>
                        <p className={`text-sm mt-0.5 ${
                          balance > 0
                            ? 'text-emerald-600 font-medium'
                            : balance < 0
                              ? 'text-red-600 font-medium'
                              : 'text-gray-400'
                        }`}>
                          {balance !== 0
                            ? formatCurrency(Math.abs(balance), homeCurrency, homeCurrency)
                            : 'No balance'
                          }
                          {balance > 0 && ' due'}
                          {balance < 0 && ' credit'}
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-emerald-500 transition-colors flex-shrink-0" />
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
