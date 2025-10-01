import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { PlusIcon, Eye, Edit2, Trash2 } from "lucide-react";
import { Link } from "wouter";
import VendorDialog from "@/components/vendors/VendorDialog";
import VendorList from "@/components/vendors/VendorList";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Transaction, Contact } from "@shared/schema";
import { formatCurrency } from "@shared/utils";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Expenses() {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);
  
  const { data: transactions, isLoading, refetch, error } = useQuery<Transaction[]>({
    queryKey: ['/api/transactions'],
  });
  
  const { data: contacts } = useQuery<Contact[]>({
    queryKey: ['/api/contacts'],
  });
  
  const getContactName = (contactId: number | null): string => {
    if (!contactId) return 'No vendor';
    if (!contacts) return `ID: ${contactId}`;
    
    const contact = contacts.find(c => c.id === contactId);
    return contact ? contact.name : `ID: ${contactId}`;
  };
  
  const getPaymentMethodLabel = (method: string | null): string => {
    if (!method) return 'N/A';
    const labels: Record<string, string> = {
      'cash': 'Cash',
      'check': 'Check',
      'credit_card': 'Credit Card',
      'bank_transfer': 'Bank Transfer',
      'other': 'Other'
    };
    return labels[method] || method;
  };
  
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'open':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  const expenses = transactions
    ? transactions
        .filter((transaction) => transaction.type === "expense")
        .filter((expense) => {
          if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const contactName = getContactName(expense.contactId).toLowerCase();
            if (
              !expense.reference.toLowerCase().includes(query) &&
              !expense.description?.toLowerCase().includes(query) &&
              !contactName.includes(query)
            ) {
              return false;
            }
          }
          
          if (statusFilter !== "all" && expense.status !== statusFilter) {
            return false;
          }
          
          if (dateFrom && new Date(expense.date) < dateFrom) {
            return false;
          }
          
          if (dateTo && new Date(expense.date) > dateTo) {
            return false;
          }
          
          return true;
        })
    : [];
  
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const completedExpenses = expenses
    .filter((expense) => expense.status === "completed")
    .reduce((sum, expense) => sum + expense.amount, 0);
  const openExpenses = expenses
    .filter((expense) => expense.status === "open")
    .reduce((sum, expense) => sum + expense.amount, 0);
  
  const handleDelete = async () => {
    if (!transactionToDelete) return;
    
    setIsDeleteLoading(true);
    try {
      await apiRequest(`/api/transactions/${transactionToDelete.id}`, 'DELETE');
      setTransactionToDelete(null);
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      refetch();
    } catch (error) {
      console.error('Failed to delete expense:', error);
    } finally {
      setIsDeleteLoading(false);
    }
  };
  
  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900" data-testid="heading-expenses">Expenses</h1>
        <div className="flex items-center space-x-3">
          <span className="text-sm text-gray-500" data-testid="text-current-date">
            {format(new Date(), 'MMMM d, yyyy')}
          </span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <VendorDialog 
                    buttonLabel="Add Vendor" 
                    buttonVariant="secondary"
                    onSuccess={() => refetch()}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Add a new vendor</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Link href="/expenses/new">
            <Button 
              className="text-white bg-primary hover:bg-primary/90"
              data-testid="button-new-expense"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              New Expense
            </Button>
          </Link>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="py-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-500">Total Expenses</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold" data-testid="text-total-expenses">
                  ${formatCurrency(totalExpenses)}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-500">Completed</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold text-green-600" data-testid="text-completed-expenses">
                  ${formatCurrency(completedExpenses)}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-500">Open</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold text-yellow-600" data-testid="text-open-expenses">
                  ${formatCurrency(openExpenses)}
                </p>
              </CardContent>
            </Card>
          </div>
          
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 mb-4">
            <div className="relative w-full sm:w-64">
              <Input
                className="pl-10"
                placeholder="Search expenses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="input-search-expenses"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40" data-testid="select-status-filter">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full sm:w-[200px] justify-start text-left font-normal",
                    !dateFrom && "text-muted-foreground"
                  )}
                  data-testid="button-date-from"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateFrom ? format(dateFrom, "PPP") : "From date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateFrom}
                  onSelect={setDateFrom}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full sm:w-[200px] justify-start text-left font-normal",
                    !dateTo && "text-muted-foreground"
                  )}
                  data-testid="button-date-to"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateTo ? format(dateTo, "PPP") : "To date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateTo}
                  onSelect={setDateTo}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            
            {(dateFrom || dateTo) && (
              <Button
                variant="ghost"
                onClick={() => {
                  setDateFrom(undefined);
                  setDateTo(undefined);
                }}
                data-testid="button-clear-dates"
              >
                Clear dates
              </Button>
            )}
          </div>
          
          <Tabs defaultValue="expenses" className="mb-6">
            <TabsList>
              <TabsTrigger value="expenses" data-testid="tab-expenses">Expenses</TabsTrigger>
              <TabsTrigger value="vendors" data-testid="tab-vendors">Vendors</TabsTrigger>
            </TabsList>
            
            <TabsContent value="expenses" className="mt-4">
              <div className="bg-white shadow-sm rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  {isLoading ? (
                    <div className="flex justify-center items-center py-8">
                      <p data-testid="text-loading">Loading expenses...</p>
                    </div>
                  ) : error ? (
                    <div className="flex justify-center items-center py-8">
                      <p className="text-red-500" data-testid="text-error">Error loading expenses. Please try again.</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead data-testid="header-reference">Reference</TableHead>
                          <TableHead data-testid="header-date">Date</TableHead>
                          <TableHead data-testid="header-payee">Payee</TableHead>
                          <TableHead data-testid="header-payment-method">Payment Method</TableHead>
                          <TableHead data-testid="header-amount">Amount</TableHead>
                          <TableHead data-testid="header-status">Status</TableHead>
                          <TableHead className="text-right" data-testid="header-actions">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {expenses.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-6" data-testid="text-no-expenses">
                              No expenses found
                            </TableCell>
                          </TableRow>
                        ) : (
                          expenses.map((expense) => (
                            <TableRow key={expense.id} className="hover:bg-gray-50" data-testid={`row-expense-${expense.id}`}>
                              <TableCell className="text-sm text-gray-900" data-testid={`text-reference-${expense.id}`}>
                                {expense.reference}
                              </TableCell>
                              <TableCell className="text-sm text-gray-500" data-testid={`text-date-${expense.id}`}>
                                {format(new Date(expense.date), 'MMM dd, yyyy')}
                              </TableCell>
                              <TableCell className="text-sm font-medium text-gray-900" data-testid={`text-payee-${expense.id}`}>
                                {getContactName(expense.contactId)}
                              </TableCell>
                              <TableCell className="text-sm text-gray-500" data-testid={`text-payment-method-${expense.id}`}>
                                {getPaymentMethodLabel(expense.paymentMethod)}
                              </TableCell>
                              <TableCell className="text-sm font-medium text-gray-900" data-testid={`text-amount-${expense.id}`}>
                                ${formatCurrency(expense.amount)}
                              </TableCell>
                              <TableCell data-testid={`badge-status-${expense.id}`}>
                                <Badge className={getStatusBadgeColor(expense.status)}>
                                  {expense.status.charAt(0).toUpperCase() + expense.status.slice(1)}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex gap-2 justify-end">
                                  <Link href={`/expenses/${expense.id}`}>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 px-2"
                                      data-testid={`button-view-${expense.id}`}
                                    >
                                      <Eye className="h-4 w-4" />
                                      <span className="sr-only">View</span>
                                    </Button>
                                  </Link>
                                  
                                  <Link href={`/expenses/edit/${expense.id}`}>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 px-2 text-blue-500 hover:text-blue-600 hover:bg-blue-50"
                                      data-testid={`button-edit-${expense.id}`}
                                    >
                                      <Edit2 className="h-4 w-4" />
                                      <span className="sr-only">Edit</span>
                                    </Button>
                                  </Link>
                                  
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 px-2 text-red-500 hover:text-red-600 hover:bg-red-50"
                                        onClick={() => setTransactionToDelete(expense)}
                                        data-testid={`button-delete-${expense.id}`}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                        <span className="sr-only">Delete</span>
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          This will permanently delete this expense and all associated records.
                                          This action cannot be undone.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel onClick={() => setTransactionToDelete(null)}>
                                          Cancel
                                        </AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={handleDelete}
                                          className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                                          disabled={isDeleteLoading}
                                        >
                                          {isDeleteLoading ? 'Deleting...' : 'Delete'}
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="vendors" className="mt-4">
              <VendorList />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
