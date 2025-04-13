import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { PlusIcon, Edit2Icon, Trash2Icon } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { Account, insertAccountSchema } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

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
import { useToast } from "@/hooks/use-toast";

export default function ChartOfAccounts() {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [newAccountOpen, setNewAccountOpen] = useState(false);
  const [editAccountOpen, setEditAccountOpen] = useState(false);
  const [currentAccount, setCurrentAccount] = useState<Account | null>(null);
  
  const { toast } = useToast();
  
  // Fetch all accounts
  const { data: accounts, isLoading } = useQuery<Account[]>({
    queryKey: ['/api/accounts'],
  });
  
  // Fetch all sales taxes for dropdown
  const { data: salesTaxes } = useQuery<any[]>({
    queryKey: ['/api/sales-taxes'],
  });
  
  const form = useForm({
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
  
  const createAccount = useMutation({
    mutationFn: async (data: any) => {
      console.log("Creating account with data:", data);
      return await apiRequest('POST', '/api/accounts', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
      setNewAccountOpen(false);
      form.reset();
      toast({
        title: "Account created",
        description: "The account has been created successfully.",
      });
    },
  });
  
  // Handler for editing an account
  const updateAccount = useMutation({
    mutationFn: async (data: any) => {
      console.log("Updating account with data:", data);
      return await apiRequest('PATCH', `/api/accounts/${currentAccount?.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
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
  
  // Handler for creating an account
  const onSubmit = (data: any) => {
    // Convert "none" to empty string for salesTaxType
    if (data.salesTaxType === "none") {
      data.salesTaxType = "";
    }
    createAccount.mutate(data);
  };
  
  // Handler for updating an account
  const onUpdate = (data: any) => {
    // Convert "none" to empty string for salesTaxType
    if (data.salesTaxType === "none") {
      data.salesTaxType = "";
    }
    updateAccount.mutate(data);
  };
  
  // Filter accounts
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
  
  return (
    <div className="py-6">
      {/* Page header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Chart of Accounts</h1>
        <div className="flex items-center space-x-3">
          <span className="text-sm text-gray-500">{format(new Date(), 'MMMM d, yyyy')}</span>
          <Dialog open={newAccountOpen} onOpenChange={setNewAccountOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusIcon className="h-4 w-4 mr-2" />
                New Account
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Account</DialogTitle>
                <DialogDescription>
                  Add a new account to your chart of accounts.
                </DialogDescription>
              </DialogHeader>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit((data) => onSubmit(data))} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
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
                      control={form.control}
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
                    control={form.control}
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
                      control={form.control}
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
                                <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                                <SelectItem value="USD">USD - US Dollar</SelectItem>
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
                      control={form.control}
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
                              {salesTaxes && salesTaxes.filter(tax => tax.isActive).map(tax => (
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
                  
                  <DialogFooter>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setNewAccountOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createAccount.isPending}>
                      {createAccount.isPending ? "Creating..." : "Create Account"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
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
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead>Sales Tax Type</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
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
                        ${account.balance.toFixed(2)}
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
                          {salesTaxes && salesTaxes.filter(tax => tax.isActive).map(tax => (
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
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setEditAccountOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={updateAccount.isPending}>
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
