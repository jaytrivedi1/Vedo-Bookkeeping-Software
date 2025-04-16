import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  DollarSignIcon,
  ShoppingCartIcon,
  TrendingUpIcon,
  FileTextIcon,
} from "lucide-react";
import SummaryCard from "@/components/dashboard/SummaryCard";
import TransactionTable from "@/components/dashboard/TransactionTable";
import RevenueChart from "@/components/dashboard/RevenueChart";
import AccountBalances from "@/components/dashboard/AccountBalances";
import TransactionForm from "@/components/transactions/TransactionForm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
        (transaction.status === 'pending' || transaction.status === 'overdue')
      )
    : [];
  
  const unpaidInvoicesAmount = unpaidInvoices.reduce(
    (sum, invoice) => sum + invoice.amount, 
    0
  );

  return (
    <div className="py-6">
      {/* Page header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <div className="flex items-center space-x-3">
          <span className="text-sm text-gray-500">{format(new Date(), 'MMMM d, yyyy')}</span>
          <TransactionForm onSuccess={refetch} />
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
              icon={<DollarSignIcon />}
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
              icon={<ShoppingCartIcon />}
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
              icon={<TrendingUpIcon />}
              trend="+8.2%"
              change="from last month"
              trendDirection="up"
              iconBgColor="bg-green-100"
              iconTextColor="text-green-600"
            />
            
            <SummaryCard
              title="Unpaid Invoices"
              amount={new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(unpaidInvoicesAmount)}
              icon={<FileTextIcon />}
              trend={`${unpaidInvoices.length} invoices`}
              change="pending payment"
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
