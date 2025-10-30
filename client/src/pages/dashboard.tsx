import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subMonths, startOfMonth, endOfMonth, parseISO, isSameMonth } from "date-fns";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Link } from "wouter";
import { Transaction } from "@shared/schema";
import TransferForm from "@/components/forms/TransferForm";
import SalesReceiptForm from "@/components/forms/SalesReceiptForm";

// Type definition for income statement API response
interface IncomeStatementData {
  revenue: {
    accounts: Array<{ id: number; code: string; name: string; balance: number }>;
    total: number;
  };
  costOfGoodsSold: {
    accounts: Array<{ id: number; code: string; name: string; balance: number }>;
    total: number;
  };
  grossProfit: number;
  operatingExpenses: {
    accounts: Array<{ id: number; code: string; name: string; balance: number }>;
    total: number;
  };
  operatingIncome: number;
  otherIncome: {
    accounts: Array<{ id: number; code: string; name: string; balance: number }>;
    total: number;
  };
  otherExpense: {
    accounts: Array<{ id: number; code: string; name: string; balance: number }>;
    total: number;
  };
  netIncome: number;
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("all");
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [salesReceiptDialogOpen, setSalesReceiptDialogOpen] = useState(false);
  
  // Fetch transactions
  const { data: transactions, isLoading, refetch } = useQuery<Transaction[]>({
    queryKey: ['/api/transactions'],
  });

  // Fetch current month income statement
  const { data: incomeStatement } = useQuery<IncomeStatementData>({
    queryKey: ['/api/reports/income-statement'],
  });

  // Fetch previous month income statement for trend calculation
  const previousMonthStart = format(startOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd');
  const previousMonthEnd = format(endOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd');
  
  const { data: previousIncomeStatement } = useQuery<IncomeStatementData>({
    queryKey: ['/api/reports/income-statement', previousMonthStart, previousMonthEnd],
    queryFn: async () => {
      const response = await fetch(
        `/api/reports/income-statement?startDate=${previousMonthStart}&endDate=${previousMonthEnd}`
      );
      if (!response.ok) throw new Error('Failed to fetch previous month data');
      return response.json();
    },
  });

  // Calculate monthly chart data from actual transactions
  const chartData = useMemo(() => {
    if (!transactions) return [];
    
    const currentDate = new Date();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const data = [];
    
    // Generate data for last 6 months
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(currentDate, i);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      
      // Filter transactions for this month
      const monthTransactions = transactions.filter(t => {
        const txDate = parseISO(t.date);
        return txDate >= monthStart && txDate <= monthEnd;
      });
      
      // Calculate income (invoices and deposits)
      const income = monthTransactions
        .filter(t => ['invoice', 'deposit', 'sales_receipt'].includes(t.type))
        .reduce((sum, t) => sum + t.amount, 0);
      
      // Calculate expenses (expenses, bills, cheques)
      const expenses = monthTransactions
        .filter(t => ['expense', 'bill', 'cheque'].includes(t.type))
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);
      
      data.push({
        month: months[monthDate.getMonth()],
        income: Math.round(income * 100) / 100,
        expenses: Math.round(expenses * 100) / 100,
      });
    }
    
    return data;
  }, [transactions]);

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

  // Calculate trends (month-over-month comparison)
  const revenueTrend = useMemo(() => {
    if (!incomeStatement || !previousIncomeStatement) return { percentage: 0, direction: 'neutral' as const };
    const current = incomeStatement.revenue.total;
    const previous = previousIncomeStatement.revenue.total;
    if (previous === 0) return { percentage: current > 0 ? 100 : 0, direction: 'up' as const };
    const change = ((current - previous) / previous) * 100;
    return {
      percentage: Math.abs(Math.round(change * 10) / 10),
      direction: change > 0 ? 'up' as const : change < 0 ? 'down' as const : 'neutral' as const,
    };
  }, [incomeStatement, previousIncomeStatement]);

  const expensesTrend = useMemo(() => {
    if (!incomeStatement || !previousIncomeStatement) return { percentage: 0, direction: 'neutral' as const };
    const current = incomeStatement.operatingExpenses.total;
    const previous = previousIncomeStatement.operatingExpenses.total;
    if (previous === 0) return { percentage: current > 0 ? 100 : 0, direction: 'up' as const };
    const change = ((current - previous) / previous) * 100;
    return {
      percentage: Math.abs(Math.round(change * 10) / 10),
      direction: change > 0 ? 'up' as const : change < 0 ? 'down' as const : 'neutral' as const,
    };
  }, [incomeStatement, previousIncomeStatement]);

  const profitTrend = useMemo(() => {
    if (!incomeStatement || !previousIncomeStatement) return { percentage: 0, direction: 'neutral' as const };
    const current = incomeStatement.netIncome;
    const previous = previousIncomeStatement.netIncome;
    if (previous === 0) return { percentage: current > 0 ? 100 : 0, direction: 'up' as const };
    const change = ((current - previous) / previous) * 100;
    return {
      percentage: Math.abs(Math.round(change * 10) / 10),
      direction: change > 0 ? 'up' as const : change < 0 ? 'down' as const : 'neutral' as const,
    };
  }, [incomeStatement, previousIncomeStatement]);

  return (
    <div className="py-6 min-h-screen">
      {/* Page header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 flex justify-between items-center mb-2">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">Dashboard</h1>
        <div className="flex items-center space-x-3">
          <span className="text-sm text-muted-foreground font-medium">{format(new Date(), 'MMMM d, yyyy')}</span>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="text-white bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 shadow-lg hover:shadow-xl smooth-transition hover-lift glow-hover" data-testid="button-new-transaction">
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
              <DropdownMenuItem>
                <Receipt className="mr-2 h-4 w-4" />
                <span>Vendor Credit</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <FileText className="mr-2 h-4 w-4" />
                <span>Customer Credit</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTransferDialogOpen(true)}>
                <ArrowLeftRight className="mr-2 h-4 w-4" />
                <span>Transfer</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {/* Transfer Dialog */}
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
              refetch();
            }}
            onCancel={() => setTransferDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Sales Receipt Dialog */}
      <Dialog open={salesReceiptDialogOpen} onOpenChange={setSalesReceiptDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Sales Receipt</DialogTitle>
            <DialogDescription>
              Record immediate cash sales without creating an invoice
            </DialogDescription>
          </DialogHeader>
          <SalesReceiptForm
            onSuccess={() => {
              setSalesReceiptDialogOpen(false);
              refetch();
            }}
            onCancel={() => setSalesReceiptDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        {/* Dashboard content */}
        <div className="py-4">
          {/* Financial summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <SummaryCard
              title="Total Revenue"
              amount={incomeStatement?.revenue.total 
                ? new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(incomeStatement.revenue.total)
                : '0.00'}
              icon={<DollarSign />}
              trend={revenueTrend.percentage > 0 ? `${revenueTrend.direction === 'up' ? '+' : '-'}${revenueTrend.percentage}%` : '0%'}
              change="from last month"
              trendDirection={revenueTrend.direction}
              iconBgColor="bg-primary-100"
              iconTextColor="text-primary"
            />
            
            <SummaryCard
              title="Total Expenses"
              amount={incomeStatement?.operatingExpenses.total 
                ? new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(incomeStatement.operatingExpenses.total)
                : '0.00'}
              icon={<ShoppingCart />}
              trend={expensesTrend.percentage > 0 ? `${expensesTrend.direction === 'up' ? '+' : '-'}${expensesTrend.percentage}%` : '0%'}
              change="from last month"
              trendDirection={expensesTrend.direction === 'up' ? 'down' : 'up'}
              iconBgColor="bg-red-100"
              iconTextColor="text-red-600"
            />
            
            <SummaryCard
              title="Net Profit"
              amount={incomeStatement?.netIncome 
                ? new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(incomeStatement.netIncome)
                : '0.00'}
              icon={<TrendingUp />}
              trend={profitTrend.percentage > 0 ? `${profitTrend.direction === 'up' ? '+' : '-'}${profitTrend.percentage}%` : '0%'}
              change="from last month"
              trendDirection={profitTrend.direction}
              iconBgColor="bg-green-100"
              iconTextColor="text-green-600"
            />
            
            <SummaryCard
              title="Unpaid Invoices"
              amount={new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(unpaidInvoicesAmount)}
              icon={<FileText />}
              trend={`${unpaidInvoices.length} ${unpaidInvoices.length === 1 ? 'invoice' : 'invoices'}`}
              change="awaiting payment"
              iconBgColor="bg-yellow-100"
              iconTextColor="text-yellow-600"
            />
          </div>
          
          {/* Recent transactions section */}
          <div className="mt-8">
            <h2 className="text-xl font-bold text-foreground mb-4">Recent Transactions</h2>
            <div className="glass-card rounded-xl overflow-hidden smooth-transition hover:border-primary/30" data-testid="card-recent-transactions">
              {/* Tab navigation */}
              <Tabs defaultValue="all" onValueChange={setActiveTab}>
                <div className="border-b border-border/50">
                  <TabsList className="h-auto p-0 bg-transparent">
                    <TabsTrigger 
                      value="all" 
                      className="flex-1 py-4 px-1 border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:font-semibold data-[state=inactive]:border-transparent data-[state=inactive]:text-muted-foreground rounded-none smooth-transition"
                      data-testid="tab-all-transactions"
                    >
                      All Transactions
                    </TabsTrigger>
                    <TabsTrigger 
                      value="invoices" 
                      className="flex-1 py-4 px-1 border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:font-semibold data-[state=inactive]:border-transparent data-[state=inactive]:text-muted-foreground rounded-none smooth-transition"
                      data-testid="tab-invoices"
                    >
                      Invoices
                    </TabsTrigger>
                    <TabsTrigger 
                      value="expenses" 
                      className="flex-1 py-4 px-1 border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:font-semibold data-[state=inactive]:border-transparent data-[state=inactive]:text-muted-foreground rounded-none smooth-transition"
                      data-testid="tab-expenses"
                    >
                      Expenses
                    </TabsTrigger>
                    <TabsTrigger 
                      value="journal_entries" 
                      className="flex-1 py-4 px-1 border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:font-semibold data-[state=inactive]:border-transparent data-[state=inactive]:text-muted-foreground rounded-none smooth-transition"
                      data-testid="tab-journal-entries"
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
            <div className="lg:col-span-2 glass-card rounded-xl p-6 smooth-transition hover:border-primary/30 hover-lift" data-testid="card-financial-overview">
              <h3 className="text-xl font-bold text-foreground mb-6">Financial Overview</h3>
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