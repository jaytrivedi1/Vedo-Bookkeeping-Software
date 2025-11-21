import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Plus,
  Search,
  FileText,
  CreditCard,
  Receipt,
  PiggyBank,
  DollarSign,
  ShoppingCart,
  BookOpen,
  ArrowLeftRight,
  Clock,
} from "lucide-react";
import TransferForm from "@/components/forms/TransferForm";
import SalesReceiptForm from "@/components/forms/SalesReceiptForm";
import type { Transaction, Contact, Account } from "@shared/schema";

interface SearchResults {
  transactions: (Transaction & { contactName?: string })[];
  contacts: Contact[];
  accounts: Account[];
  products: any[];
}

export function GlobalTopPanel() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [salesReceiptDialogOpen, setSalesReceiptDialogOpen] = useState(false);
  const [, navigate] = useLocation();
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: searchResults } = useQuery<SearchResults>({
    queryKey: [`/api/search?q=${encodeURIComponent(debouncedQuery)}`],
    enabled: debouncedQuery.trim().length > 0,
  });

  const { data: recentTransactions } = useQuery<Transaction[]>({
    queryKey: ["/api/search/recent?limit=5"],
    enabled: searchQuery.trim().length === 0 && showResults,
  });

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNavigate = (path: string) => {
    navigate(path);
    setShowResults(false);
    setSearchQuery("");
  };

  const getTransactionLink = (transaction: Transaction) => {
    switch (transaction.type) {
      case "invoice":
        return `/invoices/${transaction.id}`;
      case "bill":
        return `/bills/${transaction.id}`;
      case "expense":
        return `/expenses/${transaction.id}`;
      case "journal_entry":
        return `/journals/${transaction.id}`;
      case "deposit":
        return `/deposits/${transaction.id}`;
      case "cheque":
        return `/cheques/${transaction.id}`;
      case "payment":
        return `/payments/${transaction.id}`;
      case "sales_receipt":
        return `/sales-receipts/${transaction.id}`;
      case "transfer":
        return `/transfers/${transaction.id}`;
      case "customer_credit":
      case "vendor_credit":
        return `/`;
      default:
        return `/`;
    }
  };

  const hasResults = searchResults && (
    searchResults.transactions.length > 0 ||
    searchResults.contacts.length > 0 ||
    searchResults.accounts.length > 0 ||
    searchResults.products.length > 0
  );

  return (
    <>
      <div className="border-b border-gray-200 bg-white shadow-sm" data-testid="global-top-panel">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <div className="flex items-center justify-between h-14 gap-4">
            <div className="flex-1 max-w-2xl relative" ref={searchRef}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search by name, amount, ref #, memo..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setShowResults(true)}
                  className="pl-10 pr-4"
                  data-testid="input-global-search"
                />
              </div>

              {showResults && (
                <div className="absolute top-full mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-96 overflow-y-auto">
                  {debouncedQuery.trim().length === 0 ? (
                    <div className="p-2">
                      <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
                        Recent Transactions
                      </div>
                      {recentTransactions && recentTransactions.length > 0 ? (
                        recentTransactions.map((transaction) => (
                          <button
                            key={transaction.id}
                            onClick={() => handleNavigate(getTransactionLink(transaction))}
                            className="w-full px-3 py-2 text-left hover:bg-gray-100 rounded flex items-center justify-between"
                            data-testid={`search-result-transaction-${transaction.id}`}
                          >
                            <div className="flex flex-col">
                              <span className="text-sm font-medium">{transaction.reference}</span>
                              <span className="text-xs text-gray-500">{transaction.description}</span>
                            </div>
                            <span className="text-sm font-medium">${transaction.amount.toFixed(2)}</span>
                          </button>
                        ))
                      ) : (
                        <div className="px-3 py-4 text-sm text-gray-500 text-center">
                          No recent transactions
                        </div>
                      )}
                    </div>
                  ) : hasResults ? (
                    <div className="p-2">
                      {searchResults.transactions.length > 0 && (
                        <div>
                          <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
                            Transactions ({searchResults.transactions.length})
                          </div>
                          {searchResults.transactions.map((transaction) => (
                            <button
                              key={transaction.id}
                              onClick={() => handleNavigate(getTransactionLink(transaction))}
                              className="w-full px-3 py-2 text-left hover:bg-gray-100 rounded flex items-center justify-between"
                              data-testid={`search-result-transaction-${transaction.id}`}
                            >
                              <div className="flex flex-col flex-1">
                                <span className="text-sm font-medium">{transaction.reference || 'No Ref'}</span>
                                <span className="text-xs text-gray-500">
                                  {transaction.type.replace('_', ' ')}
                                  {transaction.contactName && ` • ${transaction.contactName}`}
                                  {transaction.description && ` • ${transaction.description}`}
                                </span>
                                {transaction.memo && (
                                  <span className="text-xs text-gray-400 italic mt-0.5">{transaction.memo}</span>
                                )}
                              </div>
                              <span className="text-sm font-medium whitespace-nowrap ml-2">${transaction.amount.toFixed(2)}</span>
                            </button>
                          ))}
                        </div>
                      )}

                      {searchResults.contacts.length > 0 && (
                        <div className="mt-2">
                          <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
                            Contacts ({searchResults.contacts.length})
                          </div>
                          {searchResults.contacts.map((contact) => (
                            <button
                              key={contact.id}
                              onClick={() => handleNavigate(`/contacts/${contact.id}`)}
                              className="w-full px-3 py-2 text-left hover:bg-gray-100 rounded"
                              data-testid={`search-result-contact-${contact.id}`}
                            >
                              <div className="flex flex-col">
                                <span className="text-sm font-medium">{contact.name}</span>
                                <span className="text-xs text-gray-500">
                                  {contact.type} • {contact.email || contact.phone || "No contact info"}
                                </span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}

                      {searchResults.accounts.length > 0 && (
                        <div className="mt-2">
                          <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
                            Accounts ({searchResults.accounts.length})
                          </div>
                          {searchResults.accounts.map((account) => (
                            <button
                              key={account.id}
                              onClick={() => handleNavigate(`/account-transactions?accountId=${account.id}&accountName=${encodeURIComponent(account.name)}`)}
                              className="w-full px-3 py-2 text-left hover:bg-gray-100 rounded"
                              data-testid={`search-result-account-${account.id}`}
                            >
                              <div className="flex flex-col">
                                <span className="text-sm font-medium">{account.name}</span>
                                <span className="text-xs text-gray-500">
                                  {account.code} • {account.type}
                                </span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}

                      {searchResults.products && searchResults.products.length > 0 && (
                        <div className="mt-2">
                          <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
                            Products ({searchResults.products.length})
                          </div>
                          {searchResults.products.map((product) => (
                            <button
                              key={product.id}
                              onClick={() => handleNavigate(`/products`)}
                              className="w-full px-3 py-2 text-left hover:bg-gray-100 rounded"
                              data-testid={`search-result-product-${product.id}`}
                            >
                              <div className="flex flex-col">
                                <span className="text-sm font-medium">{product.name}</span>
                                <span className="text-xs text-gray-500">
                                  {product.sku && `${product.sku} • `}
                                  ${product.price?.toFixed(2) || '0.00'}
                                  {product.description && ` • ${product.description.substring(0, 50)}`}
                                </span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="px-3 py-4 text-sm text-gray-500 text-center">
                      No results found for "{debouncedQuery}"
                    </div>
                  )}
                </div>
              )}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  className="text-white bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
                  data-testid="button-new-transaction"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Transaction
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <Link href="/invoices/new">
                  <DropdownMenuItem>
                    <FileText className="mr-2 h-4 w-4" />
                    <span>Invoice</span>
                  </DropdownMenuItem>
                </Link>
                <Link href="/quotations/new">
                  <DropdownMenuItem>
                    <FileText className="mr-2 h-4 w-4" />
                    <span>Quotation</span>
                  </DropdownMenuItem>
                </Link>
                <Link href="/recurring-invoices/new">
                  <DropdownMenuItem>
                    <Clock className="mr-2 h-4 w-4" />
                    <span>Recurring Invoice</span>
                  </DropdownMenuItem>
                </Link>
                <Link href="/payment-receive">
                  <DropdownMenuItem>
                    <CreditCard className="mr-2 h-4 w-4" />
                    <span>Receive Payment</span>
                  </DropdownMenuItem>
                </Link>
                <DropdownMenuItem onClick={() => setSalesReceiptDialogOpen(true)}>
                  <Receipt className="mr-2 h-4 w-4" />
                  <span>Sales Receipt</span>
                </DropdownMenuItem>
                <Link href="/deposits">
                  <DropdownMenuItem>
                    <PiggyBank className="mr-2 h-4 w-4" />
                    <span>Deposit</span>
                  </DropdownMenuItem>
                </Link>

                <DropdownMenuSeparator />

                <Link href="/bill-create">
                  <DropdownMenuItem>
                    <Receipt className="mr-2 h-4 w-4" />
                    <span>Bill</span>
                  </DropdownMenuItem>
                </Link>
                <Link href="/pay-bill">
                  <DropdownMenuItem>
                    <DollarSign className="mr-2 h-4 w-4" />
                    <span>Pay Bill</span>
                  </DropdownMenuItem>
                </Link>
                <Link href="/cheques/new">
                  <DropdownMenuItem>
                    <CreditCard className="mr-2 h-4 w-4" />
                    <span>Cheque</span>
                  </DropdownMenuItem>
                </Link>
                <Link href="/expenses/new">
                  <DropdownMenuItem>
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    <span>Expense</span>
                  </DropdownMenuItem>
                </Link>

                <DropdownMenuSeparator />

                <Link href="/journals/new">
                  <DropdownMenuItem>
                    <BookOpen className="mr-2 h-4 w-4" />
                    <span>Journal Entry</span>
                  </DropdownMenuItem>
                </Link>
                <Link href="/customer-credits/new">
                  <DropdownMenuItem>
                    <FileText className="mr-2 h-4 w-4" />
                    <span>Customer Credit</span>
                  </DropdownMenuItem>
                </Link>
                <Link href="/vendor-credits/new">
                  <DropdownMenuItem>
                    <Receipt className="mr-2 h-4 w-4" />
                    <span>Vendor Credit</span>
                  </DropdownMenuItem>
                </Link>
                <DropdownMenuItem onClick={() => setTransferDialogOpen(true)}>
                  <ArrowLeftRight className="mr-2 h-4 w-4" />
                  <span>Transfer</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Transfer</DialogTitle>
            <DialogDescription>
              Move money between balance sheet accounts (bank accounts, assets, liabilities).
            </DialogDescription>
          </DialogHeader>
          <TransferForm
            onSuccess={() => {
              setTransferDialogOpen(false);
            }}
            onCancel={() => setTransferDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={salesReceiptDialogOpen} onOpenChange={setSalesReceiptDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Sales Receipt</DialogTitle>
            <DialogDescription>
              Record a sale that is paid for at the time of purchase.
            </DialogDescription>
          </DialogHeader>
          <SalesReceiptForm
            onSuccess={() => {
              setSalesReceiptDialogOpen(false);
            }}
            onCancel={() => setSalesReceiptDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
