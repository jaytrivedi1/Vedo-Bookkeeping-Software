import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  FileText,
  Plus,
  CreditCard,
  PiggyBank,
  Receipt,
  BookOpen,
  ArrowLeftRight,
} from "lucide-react";
import SummaryCard from "@/components/dashboard/SummaryCard";
import TransactionTable from "@/components/dashboard/TransactionTable";
import RevenueChart from "@/components/dashboard/RevenueChart";
import AccountBalances from "@/components/dashboard/AccountBalances";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Link } from "wouter";
import { Transaction } from "@shared/schema";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("all");
  
  // Fetch transactions
  const { data: transactions, isLoading, refetch } = useQuery<Transaction[]>({
    queryKey: ['/api/transactions'],
  });

  // Fetch income statement for summary cards
  const { data: incomeStatement } = useQuery({
    queryKey: ['/api/reports/income-statement'],
  });

  // Prepare data for chart
  const currentDate = new Date();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const currentMonth = currentDate.getMonth();
  
  const chartData = [
    { month: months[(currentMonth - 5 + 12) % 12], income: 18350, expenses: 12450 },
    { month: months[(currentMonth - 4 + 12) % 12], income: 21500, expenses: 16200 },
    { month: months[(currentMonth - 3 + 12) % 12], income: 19800, expenses: 15300 },
    { month: months[(currentMonth - 2 + 12) % 12], income: 22400, expenses: 17100 },
    { month: months[(currentMonth - 1 + 12) % 12], income: 23600, expenses: 16450 },
    { month: months[currentMonth], income: 24567.80, expenses: 18230.45 },
  ];

  // Filter transactions based on active tab
  const filteredTransactions = transactions
    ? transactions.filter(transaction => {
        if (activeTab === "all") return true;
        return transaction.type === activeTab.slice(0, -1); // Remove 's' from the end
      })
    : [];

  // Get counts for unpaid invoices
  const unpaidInvoices = transactions
    ? transactions.filter(
        transaction => transaction.type === 'invoice' && 
        (transaction.status === 'open' || transaction.status === 'overdue' || transaction.status === 'partial')
      )
    : [];
  
  // Calculate the actual unpaid amounts using invoice balances
  const unpaidInvoicesAmount = unpaidInvoices.reduce(
    (sum, invoice) => {
      // If balance is explicitly set, use it (handles partial payments correctly)
      if (invoice.balance !== null && invoice.balance !== undefined) {
        return sum + invoice.balance;
      }
      // Otherwise use the full amount (if balance isn't tracked yet)
      return sum + invoice.amount;
    }, 
    0
  );

  return (
    <div className="py-6">
      {/* Page header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <div className="flex items-center space-x-3">
          <span className="text-sm text-gray-500">{format(new Date(), 'MMMM d, yyyy')}</span>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="text-white bg-primary hover:bg-primary/90">
                <Plus className="h-4 w-4 mr-2" />
                New Transaction
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <Link href="/invoice-new">
                <DropdownMenuItem>
                  <FileText className="mr-2 h-4 w-4" />
                  <span>Invoice</span>
                </DropdownMenuItem>
              </Link>
              <Link href="/payment-receive">
                <DropdownMenuItem>
                  <CreditCard className="mr-2 h-4 w-4" />
                  <span>Receive Payment</span>
                </DropdownMenuItem>
              </Link>
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
              <DropdownMenuItem>
                <DollarSign className="mr-2 h-4 w-4" />
                <span>Pay Bill</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <CreditCard className="mr-2 h-4 w-4" />
                <span>Cheque</span>
              </DropdownMenuItem>
              <Link href="/expenses">
                <DropdownMenuItem>
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  <span>Expense</span>
                </DropdownMenuItem>
              </Link>
              
              <DropdownMenuSeparator />
              
              <Link href="/journals">
                <DropdownMenuItem>
                  <BookOpen className="mr-2 h-4 w-4" />
                  <span>Journal Entry</span>
                </DropdownMenuItem>
              </Link>
              <DropdownMenuItem>
                <Receipt className="mr-2 h-4 w-4" />
                <span>Vendor Credit</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <FileText className="mr-2 h-4 w-4" />
                <span>Customer Credit</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <ArrowLeftRight className="mr-2 h-4 w-4" />
                <span>Transfer</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        {/* Dashboard content */}
        <div className="py-4">
          {/* Financial summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <SummaryCard
              title="Total Revenue"
              amount={incomeStatement?.revenues 
                ? new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(incomeStatement.revenues)
                : '0.00'}
              icon={<DollarSign />}
              trend="+12.5%"
              change="from last month"
              trendDirection="up"
              iconBgColor="bg-primary-100"
              iconTextColor="text-primary"
            />
            
            <SummaryCard
              title="Total Expenses"
              amount={incomeStatement?.expenses 
                ? new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(incomeStatement.expenses)
                : '0.00'}
              icon={<ShoppingCart />}
              trend="+4.3%"
              change="from last month"
              trendDirection="down"
              iconBgColor="bg-red-100"
              iconTextColor="text-red-600"
            />
            
            <SummaryCard
              title="Net Profit"
              amount={incomeStatement?.netIncome 
                ? new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(incomeStatement.netIncome)
                : '0.00'}
              icon={<TrendingUp />}
              trend="+8.2%"
              change="from last month"
              trendDirection="up"
              iconBgColor="bg-green-100"
              iconTextColor="text-green-600"
            />
            
            <SummaryCard
              title="Unpaid Invoices"
              amount={new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(unpaidInvoicesAmount)}
              icon={<FileText />}
              trend={`${unpaidInvoices.length} invoices`}
              change="awaiting payment"
              iconBgColor="bg-yellow-100"
              iconTextColor="text-yellow-600"
            />
          </div>
          
          {/* Recent transactions section */}
          <div className="mt-8">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Recent Transactions</h2>
            <div className="bg-white shadow-sm rounded-lg overflow-hidden">
              {/* Tab navigation */}
              <Tabs defaultValue="all" onValueChange={setActiveTab}>
                <div className="border-b border-gray-200">
                  <TabsList className="h-auto p-0 bg-transparent">
                    <TabsTrigger 
                      value="all" 
                      className="flex-1 py-4 px-1 border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=inactive]:border-transparent data-[state=inactive]:text-gray-500 rounded-none"
                    >
                      All Transactions
                    </TabsTrigger>
                    <TabsTrigger 
                      value="invoices" 
                      className="flex-1 py-4 px-1 border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=inactive]:border-transparent data-[state=inactive]:text-gray-500 rounded-none"
                    >
                      Invoices
                    </TabsTrigger>
                    <TabsTrigger 
                      value="expenses" 
                      className="flex-1 py-4 px-1 border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=inactive]:border-transparent data-[state=inactive]:text-gray-500 rounded-none"
                    >
                      Expenses
                    </TabsTrigger>
                    <TabsTrigger 
                      value="journal_entries" 
                      className="flex-1 py-4 px-1 border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=inactive]:border-transparent data-[state=inactive]:text-gray-500 rounded-none"
                    >
                      Journal Entries
                    </TabsTrigger>
                  </TabsList>
                </div>
                
                <TabsContent value={activeTab} className="mt-0">
                  <TransactionTable 
                    transactions={filteredTransactions} 
                    loading={isLoading} 
                    onDeleteSuccess={() => refetch()}
                  />
                </TabsContent>
              </Tabs>
            </div>
          </div>
          
          {/* Chart and account balances */}
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart */}
            <div className="lg:col-span-2 bg-white shadow-sm rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Financial Overview</h3>
              <RevenueChart data={chartData} />
            </div>
            
            {/* Account balances */}
            <AccountBalances />
          </div>
        </div>
      </div>
    </div>
  );
}