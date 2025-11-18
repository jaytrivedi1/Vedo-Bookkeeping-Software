import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { PlusIcon, Edit2Icon, Trash2Icon, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { Account, insertAccountSchema } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AddAccountDialog } from "@/components/dialogs/AddAccountDialog";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

export default function ChartOfAccounts() {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [newAccountOpen, setNewAccountOpen] = useState(false);
  const [editAccountOpen, setEditAccountOpen] = useState(false);
  const [currentAccount, setCurrentAccount] = useState<Account | null>(null);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  
  const { toast } = useToast();
  
  // Handle column header click for sorting
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      // Toggle direction if clicking the same column
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // Set new column and default to ascending
      setSortColumn(column);
      setSortDirection("asc");
    }
  };
  
  // Fetch all accounts
  const { data: accounts, isLoading: accountsLoading } = useQuery<Account[]>({
    queryKey: ['/api/accounts'],
  });
  
  // Fetch account balances
  const { data: accountBalances, isLoading: balancesLoading } = useQuery<{account: Account, balance: number}[]>({
    queryKey: ['/api/reports/account-balances'],
  });
  
  // Combine the loading states
  const isLoading = accountsLoading || balancesLoading;
  
  // Fetch all sales taxes for dropdown
  const { data: salesTaxes } = useQuery<any[]>({
    queryKey: ['/api/sales-taxes'],
  });
  
  // Handler for editing an account
  const updateAccount = useMutation({
    mutationFn: async (data: any) => {
      console.log("Updating account with data:", data);
      // FIXED: Correct parameter order for apiRequest
      return await apiRequest(`/api/accounts/${currentAccount?.id}`, 'PATCH', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/reports/account-balances'] });
      setEditAccountOpen(false);
      setCurrentAccount(null);
      toast({
        title: "Account updated",
        description: "The account has been updated successfully.",
      });
    },
  });
  
  // Form for editing account
  const editForm = useForm({
    resolver: zodResolver(insertAccountSchema),
    defaultValues: {
      code: "",
      name: "",
      type: "current_assets",
      currency: "CAD",
      salesTaxType: "",
      isActive: true,
    },
  });
  
  // Handler for clicking the edit button
  const handleEditAccount = (account: Account) => {
    setCurrentAccount(account);
    editForm.reset({
      code: account.code,
      name: account.name,
      type: account.type,
      currency: account.currency || "CAD",
      salesTaxType: account.salesTaxType || "none", // Use "none" instead of empty string
      isActive: account.isActive,
    });
    setEditAccountOpen(true);
  };
  
  // Handler for updating an account
  const onUpdate = (data: any) => {
    // Convert "none" to empty string for salesTaxType
    if (data.salesTaxType === "none") {
      data.salesTaxType = "";
    }
    updateAccount.mutate(data);
  };
  
  // Define the chronological sort order for account types
  const getAccountTypeSortOrder = (type: string): number => {
    switch (type) {
      // Bank / Cash Accounts
      case 'bank': return 1;
      
      // Current Assets (AR is a current asset)
      case 'accounts_receivable': return 2;
      case 'current_assets': return 3;
      
      // Other Current Assets (can be considered as current_assets variants)
      // Currently no specific type for this category
      
      // Fixed Assets
      case 'property_plant_equipment': return 4;
      
      // Other Assets
      case 'long_term_assets': return 5;
      
      // Current Liabilities
      case 'accounts_payable': return 6;
      case 'credit_card': return 7;
      case 'other_current_liabilities': return 8;
      
      // Other Liabilities
      case 'long_term_liabilities': return 9;
      
      // Equity
      case 'equity': return 10;
      
      // Income
      case 'income': return 11;
      
      // Cost of Goods Sold
      case 'cost_of_goods_sold': return 12;
      
      // Expenses
      case 'expenses': return 13;
      
      // Other Income
      case 'other_income': return 14;
      
      // Other Expenses
      case 'other_expense': return 15;
      
      // Legacy types (place at end)
      case 'asset': return 16;
      case 'liability': return 17;
      case 'expense': return 18;
      
      default: return 99; // Unknown types go to the end
    }
  };
  
  // Filter and sort accounts
  const filteredAccounts = accounts
    ? accounts
        .filter((account) => {
          if (typeFilter === "all") return true;
          return account.type === typeFilter;
        })
        .filter((account) => {
          if (!searchQuery) return true;
          const query = searchQuery.toLowerCase();
          return (
            account.code.toLowerCase().includes(query) ||
            account.name.toLowerCase().includes(query) ||
            (account.salesTaxType && account.salesTaxType.toLowerCase().includes(query)) ||
            (account.currency && account.currency.toLowerCase().includes(query))
          );
        })
        .sort((a, b) => {
          // If user has selected a column to sort by, use that
          if (sortColumn) {
            let compareValue = 0;
            
            switch (sortColumn) {
              case 'code':
                compareValue = a.code.localeCompare(b.code);
                break;
              case 'name':
                compareValue = a.name.localeCompare(b.name);
                break;
              case 'type':
                const typeOrderA = getAccountTypeSortOrder(a.type);
                const typeOrderB = getAccountTypeSortOrder(b.type);
                compareValue = typeOrderA - typeOrderB;
                break;
              case 'currency':
                compareValue = (a.currency || '').localeCompare(b.currency || '');
                break;
              case 'balance':
                const balanceA = accountBalances?.find(ab => ab.account.id === a.id)?.balance || 0;
                const balanceB = accountBalances?.find(ab => ab.account.id === b.id)?.balance || 0;
                compareValue = balanceA - balanceB;
                break;
              default:
                compareValue = 0;
            }
            
            return sortDirection === "asc" ? compareValue : -compareValue;
          }
          
          // Default sort: by account type (chronological order), then by code
          const typeOrderA = getAccountTypeSortOrder(a.type);
          const typeOrderB = getAccountTypeSortOrder(b.type);
          
          if (typeOrderA !== typeOrderB) {
            return typeOrderA - typeOrderB;
          }
          
          // Secondary sort: by account code (within the same type)
          return a.code.localeCompare(b.code);
        })
    : [];
  
  const getTypeLabel = (type: string) => {
    switch (type) {
      // Assets
      case 'accounts_receivable': return 'Accounts Receivable';
      case 'current_assets': return 'Current Assets';
      case 'bank': return 'Bank';
      case 'property_plant_equipment': return 'Property, Plant & Equipment';
      case 'long_term_assets': return 'Long-term Assets';
      
      // Liabilities
      case 'accounts_payable': return 'Accounts Payable';
      case 'credit_card': return 'Credit Card';
      case 'other_current_liabilities': return 'Other Current Liabilities';
      case 'long_term_liabilities': return 'Long-term Liabilities';
      
      // Standard types
      case 'equity': return 'Equity';
      case 'income': return 'Income';
      case 'other_income': return 'Other Income';
      case 'cost_of_goods_sold': return 'Cost of Goods Sold';
      case 'expenses': return 'Expenses';
      case 'other_expense': return 'Other Expense';
      
      // Legacy types
      case 'asset': return 'Asset';
      case 'liability': return 'Liability';
      case 'expense': return 'Expense';
      
      default: return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };
  
  const getTypeColor = (type: string) => {
    // Asset-like accounts (blues)
    if (type === 'accounts_receivable' || type === 'current_assets' || 
        type === 'bank' || type === 'property_plant_equipment' || 
        type === 'long_term_assets' || type === 'asset') {
      switch (type) {
        case 'accounts_receivable': return 'bg-sky-100 text-sky-800';
        case 'current_assets': return 'bg-blue-100 text-blue-800';
        case 'bank': return 'bg-indigo-100 text-indigo-800';
        case 'property_plant_equipment': return 'bg-cyan-100 text-cyan-800';
        case 'long_term_assets': return 'bg-teal-100 text-teal-800';
        case 'asset': return 'bg-blue-100 text-blue-800';
      }
    }
    
    // Liability-like accounts (reds/oranges)
    if (type === 'accounts_payable' || type === 'credit_card' || 
        type === 'other_current_liabilities' || type === 'long_term_liabilities' || 
        type === 'liability') {
      switch (type) {
        case 'accounts_payable': return 'bg-red-100 text-red-800';
        case 'credit_card': return 'bg-orange-100 text-orange-800';
        case 'other_current_liabilities': return 'bg-rose-100 text-rose-800';
        case 'long_term_liabilities': return 'bg-pink-100 text-pink-800';
        case 'liability': return 'bg-red-100 text-red-800';
      }
    }
    
    // Equity (green)
    if (type === 'equity') {
      return 'bg-green-100 text-green-800';
    }
    
    // Income-like accounts (purples)
    if (type === 'income' || type === 'other_income') {
      switch (type) {
        case 'income': return 'bg-purple-100 text-purple-800';
        case 'other_income': return 'bg-violet-100 text-violet-800';
      }
    }
    
    // Expense-like accounts (yellows/ambers)
    if (type === 'cost_of_goods_sold' || type === 'expenses' || 
        type === 'other_expense' || type === 'expense') {
      switch (type) {
        case 'cost_of_goods_sold': return 'bg-amber-100 text-amber-800';
        case 'expenses': return 'bg-yellow-100 text-yellow-800';
        case 'other_expense': return 'bg-lime-100 text-lime-800';
        case 'expense': return 'bg-yellow-100 text-yellow-800';
      }
    }
    
    // Default fallback
    return 'bg-gray-100 text-gray-800';
  };
  
  // Determine if an account type is normally a debit balance account
  const isDebitAccount = (type: string) => {
    return type === 'accounts_receivable' || 
           type === 'current_assets' || 
           type === 'bank' || 
           type === 'property_plant_equipment' || 
           type === 'long_term_assets' || 
           type === 'asset' ||
           type === 'cost_of_goods_sold' || 
           type === 'expenses' || 
           type === 'other_expense' || 
           type === 'expense';
  };
  
  // Format account balance according to accounting convention
  // For the Chart of Accounts:
  // - Assets and Expenses have normal debit balances and show as "DR"
  // - Liabilities, Equity, and Income have normal credit balances and show as "CR"
  const formatAccountBalance = (account: Account, balance: number) => {
    // Get the balance for this account from accountBalances
    const accountBalance = accountBalances?.find(
      (ab) => ab.account.id === account.id
    )?.balance || 0;
    
    // Check if the account is a debit-normal or credit-normal account
    const isDebitNormal = isDebitAccount(account.type);
    
    // For debits: positive balance = DR, negative balance = CR
    // For credits: positive balance = CR, negative balance = DR
    // Note: Our backend stores debits as positive and credits as negative
    
    // Calculate absolute value for display
    const absBalance = Math.abs(accountBalance);
    
    // Determine if the account has its normal balance
    // For debit accounts: positive balance means normal (DR)
    // For credit accounts: negative balance means normal (CR)
    const hasNormalBalance = isDebitNormal ? accountBalance >= 0 : accountBalance <= 0;
    
    // Display based on normal balance
    const indicator = hasNormalBalance 
      ? (isDebitNormal ? 'DR' : 'CR')
      : (isDebitNormal ? 'CR' : 'DR');
    
    return `$${absBalance.toFixed(2)} ${indicator}`;
  };
  
  return (
    <div className="py-6">
      {/* Page header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Chart of Accounts</h1>
        <div className="flex items-center space-x-3">
          <span className="text-sm text-gray-500">{format(new Date(), 'MMMM d, yyyy')}</span>
          <Button onClick={() => setNewAccountOpen(true)}>
            <PlusIcon className="h-4 w-4 mr-2" />
            New Account
          </Button>
          <AddAccountDialog
            open={newAccountOpen}
            onOpenChange={setNewAccountOpen}
          />
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="py-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 mb-4">
            <div className="relative w-full sm:w-64">
              <Input
                className="pl-10"
                placeholder="Search accounts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
            
            <Select
              value={typeFilter}
              onValueChange={setTypeFilter}
            >
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                
                <SelectGroup>
                  <SelectLabel>Assets</SelectLabel>
                  <SelectItem value="accounts_receivable">Accounts Receivable</SelectItem>
                  <SelectItem value="current_assets">Current Assets</SelectItem>
                  <SelectItem value="bank">Bank</SelectItem>
                  <SelectItem value="property_plant_equipment">Property, Plant & Equipment</SelectItem>
                  <SelectItem value="long_term_assets">Long-term Assets</SelectItem>
                </SelectGroup>
                
                <SelectGroup>
                  <SelectLabel>Liabilities</SelectLabel>
                  <SelectItem value="accounts_payable">Accounts Payable</SelectItem>
                  <SelectItem value="credit_card">Credit Card</SelectItem>
                  <SelectItem value="other_current_liabilities">Other Current Liabilities</SelectItem>
                  <SelectItem value="long_term_liabilities">Long-term Liabilities</SelectItem>
                </SelectGroup>
                
                <SelectGroup>
                  <SelectLabel>Equity</SelectLabel>
                  <SelectItem value="equity">Equity</SelectItem>
                </SelectGroup>
                
                <SelectGroup>
                  <SelectLabel>Income</SelectLabel>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="other_income">Other Income</SelectItem>
                </SelectGroup>
                
                <SelectGroup>
                  <SelectLabel>Expenses</SelectLabel>
                  <SelectItem value="cost_of_goods_sold">Cost of Goods Sold</SelectItem>
                  <SelectItem value="expenses">Expenses</SelectItem>
                  <SelectItem value="other_expense">Other Expense</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          
          {/* Accounts Table */}
          <div className="bg-white shadow-sm rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <button
                      onClick={() => handleSort('code')}
                      className="flex items-center gap-1 hover:text-gray-900 font-medium"
                      data-testid="sort-code"
                    >
                      Code
                      {sortColumn === 'code' ? (
                        sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                      ) : (
                        <ArrowUpDown className="h-4 w-4 opacity-40" />
                      )}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      onClick={() => handleSort('name')}
                      className="flex items-center gap-1 hover:text-gray-900 font-medium"
                      data-testid="sort-name"
                    >
                      Name
                      {sortColumn === 'name' ? (
                        sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                      ) : (
                        <ArrowUpDown className="h-4 w-4 opacity-40" />
                      )}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      onClick={() => handleSort('type')}
                      className="flex items-center gap-1 hover:text-gray-900 font-medium"
                      data-testid="sort-type"
                    >
                      Type
                      {sortColumn === 'type' ? (
                        sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                      ) : (
                        <ArrowUpDown className="h-4 w-4 opacity-40" />
                      )}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      onClick={() => handleSort('currency')}
                      className="flex items-center gap-1 hover:text-gray-900 font-medium"
                      data-testid="sort-currency"
                    >
                      Currency
                      {sortColumn === 'currency' ? (
                        sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                      ) : (
                        <ArrowUpDown className="h-4 w-4 opacity-40" />
                      )}
                    </button>
                  </TableHead>
                  <TableHead>Sales Tax Type</TableHead>
                  <TableHead className="text-right">
                    <button
                      onClick={() => handleSort('balance')}
                      className="flex items-center gap-1 hover:text-gray-900 font-medium ml-auto"
                      data-testid="sort-balance"
                    >
                      Balance
                      {sortColumn === 'balance' ? (
                        sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                      ) : (
                        <ArrowUpDown className="h-4 w-4 opacity-40" />
                      )}
                    </button>
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6">
                      Loading accounts...
                    </TableCell>
                  </TableRow>
                ) : filteredAccounts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6">
                      No accounts found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAccounts.map((account) => (
                    <TableRow key={account.id}>
                      <TableCell className="font-mono">{account.code}</TableCell>
                      <TableCell className="font-medium">{account.name}</TableCell>
                      <TableCell>
                        <Badge className={getTypeColor(account.type)}>
                          {getTypeLabel(account.type)}
                        </Badge>
                      </TableCell>
                      <TableCell>{account.currency || 'USD'}</TableCell>
                      <TableCell>{account.salesTaxType || '-'}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatAccountBalance(account, 0)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleEditAccount(account)}
                        >
                          <Edit2Icon className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
      
      {/* Edit Account Dialog */}
      <Dialog open={editAccountOpen} onOpenChange={setEditAccountOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Account</DialogTitle>
            <DialogDescription>
              Modify the account details.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit((data) => onUpdate(data))} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Code</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. 1000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editForm.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select account type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectGroup>
                            <SelectLabel>Assets</SelectLabel>
                            <SelectItem value="accounts_receivable">Accounts Receivable</SelectItem>
                            <SelectItem value="current_assets">Current Assets</SelectItem>
                            <SelectItem value="bank">Bank</SelectItem>
                            <SelectItem value="property_plant_equipment">Property, Plant & Equipment</SelectItem>
                            <SelectItem value="long_term_assets">Long-term Assets</SelectItem>
                          </SelectGroup>
                          <SelectGroup>
                            <SelectLabel>Liabilities</SelectLabel>
                            <SelectItem value="accounts_payable">Accounts Payable</SelectItem>
                            <SelectItem value="credit_card">Credit Card</SelectItem>
                            <SelectItem value="other_current_liabilities">Other Current Liabilities</SelectItem>
                            <SelectItem value="long_term_liabilities">Long-term Liabilities</SelectItem>
                          </SelectGroup>
                          <SelectGroup>
                            <SelectLabel>Equity</SelectLabel>
                            <SelectItem value="equity">Equity</SelectItem>
                          </SelectGroup>
                          <SelectGroup>
                            <SelectLabel>Income</SelectLabel>
                            <SelectItem value="income">Income</SelectItem>
                            <SelectItem value="other_income">Other Income</SelectItem>
                          </SelectGroup>
                          <SelectGroup>
                            <SelectLabel>Expenses</SelectLabel>
                            <SelectItem value="cost_of_goods_sold">Cost of Goods Sold</SelectItem>
                            <SelectItem value="expenses">Expenses</SelectItem>
                            <SelectItem value="other_expense">Other Expense</SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Cash" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency</FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select currency" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="USD">USD - US Dollar</SelectItem>
                            <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                            <SelectItem value="GBP">GBP - British Pound</SelectItem>
                            <SelectItem value="EUR">EUR - Euro</SelectItem>
                            <SelectItem value="INR">INR - Indian Rupee</SelectItem>
                            <SelectItem value="AUD">AUD - Australian Dollar</SelectItem>
                            <SelectItem value="JPY">JPY - Japanese Yen</SelectItem>
                            <SelectItem value="CNY">CNY - Chinese Yuan</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editForm.control}
                  name="salesTaxType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sales Tax Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a tax type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {salesTaxes && salesTaxes.filter(tax => tax.isActive && !tax.parentId).map(tax => (
                            <SelectItem key={tax.id} value={tax.name}>
                              {tax.name} ({tax.rate.toFixed(tax.rate % 1 ? 3 : 0)}%)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={editForm.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Active</FormLabel>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-is-active-edit"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setEditAccountOpen(false)}
                  data-testid="button-cancel-edit"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={updateAccount.isPending} data-testid="button-update-account">
                  {updateAccount.isPending ? "Updating..." : "Update Account"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
