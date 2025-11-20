import { useQuery } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface DashboardMetrics {
  profitLoss: {
    netProfit: number;
    percentageChange: number;
    income: number;
    expenses: number;
  };
  expensesByCategory: Array<{ category: string; amount: number }>;
  invoices: {
    unpaid: { count: number; amount: number };
    paid: { count: number; amount: number };
    overdue: { count: number; amount: number };
    deposited: { count: number; amount: number };
  };
  bankAccounts: {
    total: number;
    accounts: Array<{ name: string; balance: number; updated: string }>;
  };
  sales: Array<{ month: string; amount: number }>;
  accountsReceivable: {
    total: number;
    current: number;
    days30: number;
    days60: number;
    days90Plus: number;
  };
}

interface Company {
  id: number;
  name: string;
  logoUrl?: string;
}

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export default function Dashboard() {
  // Fetch company data
  const { data: company, isLoading: companyLoading } = useQuery<Company>({
    queryKey: ['/api/companies/default'],
  });

  // Fetch dashboard metrics
  const { data: metrics, isLoading: metricsLoading } = useQuery<DashboardMetrics>({
    queryKey: ['/api/dashboard/metrics'],
  });

  const isLoading = companyLoading || metricsLoading;

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Prepare Accounts Receivable data for donut chart
  const arData = metrics ? [
    { name: 'Current', value: metrics.accountsReceivable.current },
    { name: '31-60 days', value: metrics.accountsReceivable.days30 },
    { name: '61-90 days', value: metrics.accountsReceivable.days60 },
    { name: '91+ OVER', value: metrics.accountsReceivable.days90Plus },
  ].filter(item => item.value > 0) : [];

  return (
    <div className="py-6 min-h-screen">
      {/* Company Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 mb-6">
        {companyLoading ? (
          <div className="flex items-center gap-4">
            <Skeleton className="h-16 w-16 rounded-lg" />
            <Skeleton className="h-8 w-48" />
          </div>
        ) : company ? (
          <div className="flex items-center gap-4">
            {company.logoUrl && (
              <img
                src={company.logoUrl}
                alt={`${company.name} logo`}
                className="h-16 w-16 object-contain rounded-lg border border-border bg-card p-2"
                data-testid="company-logo"
              />
            )}
            <div>
              <h2 className="text-2xl font-bold text-foreground" data-testid="company-name">
                {company.name}
              </h2>
            </div>
          </div>
        ) : null}
      </div>

      {/* Dashboard Title */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 mb-6">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
          Dashboard
        </h1>
      </div>

      {/* Dashboard Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Profit & Loss Card */}
          <Card className="glass border-border/50" data-testid="card-profit-loss">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">PROFIT & LOSS</CardTitle>
                <span className="text-sm text-muted-foreground">Last month</span>
              </div>
              <div className="text-sm text-muted-foreground">Net profit for October</div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-10 w-32" />
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ) : metrics ? (
                <div className="space-y-4">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold" data-testid="text-net-profit">
                      {formatCurrency(metrics.profitLoss.netProfit)}
                    </span>
                    <div className="flex items-center gap-1 text-sm">
                      {metrics.profitLoss.percentageChange >= 0 ? (
                        <>
                          <TrendingUp className="h-4 w-4 text-green-600" />
                          <span className="text-green-600" data-testid="text-profit-change">
                            {Math.abs(metrics.profitLoss.percentageChange).toFixed(0)}%
                          </span>
                        </>
                      ) : (
                        <>
                          <TrendingDown className="h-4 w-4 text-red-600" />
                          <span className="text-red-600" data-testid="text-profit-change">
                            {Math.abs(metrics.profitLoss.percentageChange).toFixed(0)}%
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="text-sm text-muted-foreground">
                    {metrics.profitLoss.percentageChange >= 0 ? 'Up' : 'Down'} {Math.abs(metrics.profitLoss.percentageChange).toFixed(0)}% from prior 30 days
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground" data-testid="text-income-label">Income</span>
                        <span className="font-medium" data-testid="text-income-amount">
                          {formatCurrency(metrics.profitLoss.income)}
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500"
                          style={{
                            width: `${(metrics.profitLoss.income / (metrics.profitLoss.income + metrics.profitLoss.expenses)) * 100}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground" data-testid="text-expenses-label">Expenses</span>
                        <span className="font-medium" data-testid="text-expenses-amount">
                          {formatCurrency(metrics.profitLoss.expenses)}
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-cyan-500"
                          style={{
                            width: `${(metrics.profitLoss.expenses / (metrics.profitLoss.income + metrics.profitLoss.expenses)) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {/* Expenses Card */}
          <Card className="glass border-border/50" data-testid="card-expenses">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">EXPENSES</CardTitle>
                <span className="text-sm text-muted-foreground">Last 30 days</span>
              </div>
              <div className="text-sm text-muted-foreground">Spending for last 30 days</div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center h-64">
                  <Skeleton className="h-48 w-48 rounded-full" />
                </div>
              ) : metrics && metrics.expensesByCategory.length > 0 ? (
                <div className="space-y-4">
                  <div className="text-3xl font-bold" data-testid="text-total-expenses">
                    {formatCurrency(metrics.expensesByCategory.reduce((sum, cat) => sum + cat.amount, 0))}
                  </div>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={metrics.expensesByCategory}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        fill="#8884d8"
                        paddingAngle={2}
                        dataKey="amount"
                      >
                        {metrics.expensesByCategory.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2">
                    {metrics.expensesByCategory.slice(0, 4).map((category, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <span className="text-muted-foreground" data-testid={`text-expense-category-${index}`}>
                            {category.category}
                          </span>
                        </div>
                        <span className="font-medium" data-testid={`text-expense-amount-${index}`}>
                          {formatCurrency(category.amount)}
                        </span>
                      </div>
                    ))}
                    {metrics.expensesByCategory.length > 4 && (
                      <div className="text-sm text-muted-foreground">
                        +{metrics.expensesByCategory.length - 4} more
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-64 text-muted-foreground">
                  No expense data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Invoices Card */}
          <Card className="glass border-border/50" data-testid="card-invoices">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">INVOICES</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : metrics ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium" data-testid="text-unpaid-label">
                        ${metrics.invoices.unpaid.amount.toLocaleString()} Unpaid
                      </span>
                      <span className="text-sm text-muted-foreground">
                        Last 365 days
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex-1 space-y-1">
                        <div className="h-8 bg-orange-500 flex items-center justify-center text-white text-sm font-medium rounded">
                          Overdue
                        </div>
                        <div className="text-xs text-center text-muted-foreground">
                          {metrics.invoices.overdue.count}
                        </div>
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="h-8 bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-gray-700 dark:text-gray-200 text-sm font-medium rounded">
                          Not due yet
                        </div>
                        <div className="text-xs text-center text-muted-foreground">
                          {metrics.invoices.unpaid.count - metrics.invoices.overdue.count}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium" data-testid="text-paid-label">
                        ${metrics.invoices.paid.amount.toLocaleString()} Paid
                      </span>
                      <span className="text-sm text-muted-foreground">
                        Last 30 days
                      </span>
                    </div>
                    <div className="h-8 bg-green-500 flex items-center justify-center text-white text-sm font-medium rounded">
                      {metrics.invoices.paid.count} paid
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium" data-testid="text-deposited-label">
                        Deposited
                      </span>
                    </div>
                    <div className="h-8 bg-green-600 flex items-center justify-center text-white text-sm font-medium rounded">
                      {metrics.invoices.deposited.count} deposited
                    </div>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {/* Bank Accounts Card */}
          <Card className="glass border-border/50" data-testid="card-bank-accounts">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">BANK ACCOUNTS</CardTitle>
                <span className="text-sm text-muted-foreground">As of today</span>
              </div>
              <div className="text-sm text-muted-foreground">Today's cash balance</div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-10 w-32" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : metrics ? (
                <div className="space-y-4">
                  <div className="text-3xl font-bold" data-testid="text-total-balance">
                    {formatCurrency(metrics.bankAccounts.total)}
                  </div>

                  <div className="space-y-3">
                    {metrics.bankAccounts.accounts.map((account, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/30 transition-colors"
                        data-testid={`bank-account-${index}`}
                      >
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <div className="h-6 w-6 rounded-full bg-primary/20" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium" data-testid={`text-bank-name-${index}`}>
                            {account.name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Bank Balance
                          </div>
                          <div className="text-xs text-muted-foreground" data-testid={`text-bank-updated-${index}`}>
                            Updated {account.updated}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold" data-testid={`text-bank-balance-${index}`}>
                            {formatCurrency(account.balance)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {/* Sales Card */}
          <Card className="glass border-border/50 md:col-span-2" data-testid="card-sales">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">SALES</CardTitle>
                <span className="text-sm text-muted-foreground">This year to date</span>
              </div>
              <div className="text-sm text-muted-foreground">Total Amount</div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-10 w-32" />
                  <Skeleton className="h-64 w-full" />
                </div>
              ) : metrics && metrics.sales.length > 0 ? (
                <div className="space-y-4">
                  <div className="text-3xl font-bold" data-testid="text-total-sales">
                    {formatCurrency(metrics.sales.reduce((sum, month) => sum + month.amount, 0))}
                  </div>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={metrics.sales}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="month"
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                      />
                      <YAxis
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                      />
                      <Tooltip
                        formatter={(value) => formatCurrency(Number(value))}
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '0.5rem',
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="amount"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={{ fill: 'hsl(var(--primary))', r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex items-center justify-center h-64 text-muted-foreground">
                  No sales data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Accounts Receivable Card */}
          <Card className="glass border-border/50" data-testid="card-accounts-receivable">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">ACCOUNTS RECEIVABLE</CardTitle>
                <span className="text-sm text-muted-foreground">As of today</span>
              </div>
              <div className="text-sm text-muted-foreground">Total</div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-10 w-32" />
                  <Skeleton className="h-48 w-48 rounded-full mx-auto" />
                </div>
              ) : metrics ? (
                <div className="space-y-4">
                  <div className="text-3xl font-bold" data-testid="text-ar-total">
                    {formatCurrency(metrics.accountsReceivable.total)}
                  </div>

                  {arData.length > 0 ? (
                    <>
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie
                            data={arData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            fill="#8884d8"
                            paddingAngle={2}
                            dataKey="value"
                          >
                            {arData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                        </PieChart>
                      </ResponsiveContainer>

                      <div className="space-y-2">
                        {arData.map((bucket, index) => (
                          <div key={index} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <div
                                className="h-3 w-3 rounded-full"
                                style={{ backgroundColor: COLORS[index % COLORS.length] }}
                              />
                              <span className="text-muted-foreground" data-testid={`text-ar-bucket-${index}`}>
                                {bucket.name}
                              </span>
                            </div>
                            <span className="font-medium" data-testid={`text-ar-amount-${index}`}>
                              {formatCurrency(bucket.value)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-48 text-muted-foreground">
                      No receivables
                    </div>
                  )}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
