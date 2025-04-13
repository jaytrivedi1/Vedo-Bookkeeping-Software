import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { PlusIcon, UserPlus } from "lucide-react";
import TransactionTable from "@/components/dashboard/TransactionTable";
import TransactionForm from "@/components/transactions/TransactionForm";
import VendorDialog from "@/components/vendors/VendorDialog";
import VendorList from "@/components/vendors/VendorList";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
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
import { Input } from "@/components/ui/input";
import { Transaction } from "@shared/schema";

export default function Expenses() {

  const [searchQuery, setSearchQuery] = useState<string>("");
  
  // Fetch all transactions
  const { data: transactions, isLoading, refetch } = useQuery<Transaction[]>({
    queryKey: ['/api/transactions'],
  });
  
  // Filter expenses
  const expenses = transactions
    ? transactions
        .filter((transaction) => transaction.type === "expense")
        .filter((expense) => {
          if (!searchQuery) return true;
          const query = searchQuery.toLowerCase();
          return (
            expense.reference.toLowerCase().includes(query) ||
            expense.description?.toLowerCase().includes(query)
          );
        })
    : [];
  
  // Get total amounts
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const completedExpenses = expenses
    .filter((expense) => expense.status === "completed")
    .reduce((sum, expense) => sum + expense.amount, 0);
  const pendingExpenses = expenses
    .filter((expense) => expense.status === "pending")
    .reduce((sum, expense) => sum + expense.amount, 0);
  
  return (
    <div className="py-6">
      {/* Page header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Expenses</h1>
        <div className="flex items-center space-x-3">
          <span className="text-sm text-gray-500">{format(new Date(), 'MMMM d, yyyy')}</span>
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
          <TransactionForm onSuccess={refetch} />
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="py-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-500">Total Expenses</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">${totalExpenses.toFixed(2)}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-500">Completed</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold text-green-600">${completedExpenses.toFixed(2)}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-500">Pending</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold text-yellow-600">${pendingExpenses.toFixed(2)}</p>
              </CardContent>
            </Card>
          </div>
          
          {/* Filters */}
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 mb-4">
            <div className="relative w-full sm:w-64">
              <Input
                className="pl-10"
                placeholder="Search expenses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
            

          </div>
          
          {/* Tabbed Content - Expenses and Vendors */}
          <Tabs defaultValue="expenses" className="mb-6">
            <TabsList>
              <TabsTrigger value="expenses">Expenses</TabsTrigger>
              <TabsTrigger value="vendors">Vendors</TabsTrigger>
            </TabsList>
            
            <TabsContent value="expenses" className="mt-4">
              <div className="bg-white shadow-sm rounded-lg overflow-hidden">
                <TransactionTable transactions={expenses} loading={isLoading} />
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
