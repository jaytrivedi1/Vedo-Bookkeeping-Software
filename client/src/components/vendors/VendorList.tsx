import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Contact, Transaction } from "@shared/schema";
import { Search, Building2, ChevronRight } from "lucide-react";
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

interface VendorListProps {
  className?: string;
}

export default function VendorList({ className }: VendorListProps) {
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [includeInactive, setIncludeInactive] = useState(false);

  // Fetch vendors
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

  const handleVendorClick = (vendor: Contact) => {
    navigate(`/vendors/${vendor.id}`);
  };

  // Filter vendors by search query
  const filteredVendors = contacts
    ? contacts
        .filter(contact =>
          contact.type === 'vendor' || contact.type === 'both'
        )
        .filter(vendor => {
          if (!searchQuery) return true;
          const query = searchQuery.toLowerCase();
          return (
            vendor.name.toLowerCase().includes(query) ||
            (vendor.email ? vendor.email.toLowerCase().includes(query) : false) ||
            (vendor.contactName ? vendor.contactName.toLowerCase().includes(query) : false) ||
            (vendor.phone ? vendor.phone.toLowerCase().includes(query) : false)
          );
        })
    : [];

  // Calculate outstanding balance for a vendor (bills owed)
  const getVendorBalance = (vendorId: number) => {
    if (!transactions) return 0;

    const vendorTransactions = transactions.filter(t => t.contactId === vendorId);
    const bills = vendorTransactions.filter(t => t.type === 'bill');

    return bills.reduce((sum, bill) => {
      const balance = (bill.balance !== null && bill.balance !== undefined)
        ? bill.balance
        : bill.amount;
      return sum + balance;
    }, 0);
  };

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle>Vendors</CardTitle>
          <CardDescription>
            View and manage all your vendors
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search bar and toggle */}
          <div className="space-y-4 mb-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search vendors..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="input-search-vendors"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="show-inactive-vendors"
                checked={includeInactive}
                onCheckedChange={setIncludeInactive}
                data-testid="switch-show-inactive-vendors"
              />
              <Label htmlFor="show-inactive-vendors" className="text-sm text-gray-600">
                Show inactive vendors
              </Label>
            </div>
          </div>

          {/* Vendors list */}
          <ScrollArea className="h-[400px]">
            {contactsLoading ? (
              <div className="flex justify-center items-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredVendors.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Building2 className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-semibold">No vendors found</h3>
                <p className="mt-1 text-sm">Get started by adding a new vendor.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredVendors.map((vendor) => {
                  const balance = getVendorBalance(vendor.id);

                  return (
                    <div
                      key={vendor.id}
                      className="group p-4 rounded-lg border border-gray-200 hover:border-violet-300 hover:shadow-md transition-all duration-200 cursor-pointer flex items-center gap-3"
                      onClick={() => handleVendorClick(vendor)}
                      data-testid={`vendor-row-${vendor.id}`}
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-100 to-violet-200 flex items-center justify-center flex-shrink-0">
                        <span className="text-violet-700 font-medium">
                          {vendor.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-gray-900 truncate">
                            {formatContactName(vendor.name, vendor.currency, homeCurrency)}
                          </h3>
                          {vendor.isActive === false && (
                            <Badge variant="secondary" className="text-xs" data-testid={`badge-inactive-${vendor.id}`}>
                              Inactive
                            </Badge>
                          )}
                        </div>
                        <p className={`text-sm mt-0.5 ${
                          balance > 0
                            ? 'text-red-600 font-medium'
                            : balance < 0
                              ? 'text-emerald-600 font-medium'
                              : 'text-gray-400'
                        }`}>
                          {balance !== 0
                            ? formatCurrency(Math.abs(balance), homeCurrency, homeCurrency)
                            : 'No balance'
                          }
                          {balance > 0 && ' owed'}
                          {balance < 0 && ' credit'}
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-violet-500 transition-colors flex-shrink-0" />
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
