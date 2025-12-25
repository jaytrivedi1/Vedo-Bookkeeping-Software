import { useQuery } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import { TrendingUp, TrendingDown, DollarSign, CreditCard, FileText, Building2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { formatCurrencyCompact } from "@/lib/currencyUtils";
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

// Professional color palette
const COLORS = ['#3b82f6', '#14b8a6', '#8b5cf6', '#22c55e', '#f59e0b'];

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

  // Prepare Accounts Receivable data for donut chart
  const arData = metrics ? [
    { name: 'Current', value: metrics.accountsReceivable.current },
    { name: '31-60 days', value: metrics.accountsReceivable.days30 },
    { name: '61-90 days', value: metrics.accountsReceivable.days60 },
    { name: '91+ OVER', value: metrics.accountsReceivable.days90Plus },
  ].filter(item => item.value > 0) : [];

  return (
    <div className="py-6 min-h-screen bg-background">
      {/* Page Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Welcome back{company?.name ? `, ${company.name}` : ''}
            </p>
          </div>
          {company?.logoUrl && (
            <img
              src={company.logoUrl}
              alt={`${company.name} logo`}
              className="h-12 w-12 object-contain rounded-lg border border-border bg-white p-1.5"
              data-testid="company-logo"
            />
          )}
        </div>
      </div>

      {/* Dashboard Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

          {/* Profit & Loss Card */}
          <Card className="bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow" data-testid="card-profit-loss">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-blue-50">
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                  </div>
                  <CardTitle className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Profit & Loss</CardTitle>
                </div>
                <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">Last 30 days</span>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-10 w-32" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ) : metrics ? (
                <div className="space-y-4">
                  <div className="flex items-baseline gap-3">
                    <span className="text-3xl font-bold text-slate-900" data-testid="text-net-profit">
                      {formatCurrencyCompact(metrics.profitLoss.netProfit, 'CAD', 'CAD')}
                    </span>
                    <div className={`flex items-center gap-1 text-sm font-medium px-2 py-0.5 rounded-full ${
                      metrics.profitLoss.percentageChange >= 0
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-red-50 text-red-700'
                    }`}>
                      {metrics.profitLoss.percentageChange >= 0 ? (
                        <TrendingUp className="h-3.5 w-3.5" />
                      ) : (
                        <TrendingDown className="h-3.5 w-3.5" />
                      )}
                      <span data-testid="text-profit-change">
                        {Math.abs(metrics.profitLoss.percentageChange).toFixed(0)}%
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500" data-testid="text-income-label">Income</span>
                        <span className="font-semibold text-slate-700" data-testid="text-income-amount">
                          {formatCurrencyCompact(metrics.profitLoss.income, 'CAD', 'CAD')}
                        </span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all"
                          style={{
                            width: `${(metrics.profitLoss.income / (metrics.profitLoss.income + metrics.profitLoss.expenses)) * 100}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500" data-testid="text-expenses-label">Expenses</span>
                        <span className="font-semibold text-slate-700" data-testid="text-expenses-amount">
                          {formatCurrencyCompact(metrics.profitLoss.expenses, 'CAD', 'CAD')}
                        </span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all"
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
          <Card className="bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow" data-testid="card-expenses">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-purple-50">
                    <CreditCard className="h-4 w-4 text-purple-600" />
                  </div>
                  <CardTitle className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Expenses</CardTitle>
                </div>
                <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">Last 30 days</span>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center h-64">
                  <Skeleton className="h-48 w-48 rounded-full" />
                </div>
              ) : metrics && metrics.expensesByCategory.length > 0 ? (
                <div className="space-y-4">
                  <div className="text-3xl font-bold text-slate-900" data-testid="text-total-expenses">
                    {formatCurrencyCompact(metrics.expensesByCategory.reduce((sum, cat) => sum + cat.amount, 0), 'CAD', 'CAD')}
                  </div>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie
                        data={metrics.expensesByCategory}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={75}
                        fill="#8884d8"
                        paddingAngle={2}
                        dataKey="amount"
                      >
                        {metrics.expensesByCategory.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => formatCurrencyCompact(Number(value), 'CAD', 'CAD')}
                        contentStyle={{
                          backgroundColor: '#fff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2">
                    {metrics.expensesByCategory.slice(0, 4).map((category, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <span className="text-slate-600" data-testid={`text-expense-category-${index}`}>
                            {category.category}
                          </span>
                        </div>
                        <span className="font-medium text-slate-700" data-testid={`text-expense-amount-${index}`}>
                          {formatCurrencyCompact(category.amount, 'CAD', 'CAD')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-64 text-slate-400">
                  No expense data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Invoices Card */}
          <Card className="bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow" data-testid="card-invoices">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-teal-50">
                  <FileText className="h-4 w-4 text-teal-600" />
                </div>
                <CardTitle className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Invoices</CardTitle>
              </div>
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
                  {/* Unpaid */}
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-slate-700" data-testid="text-unpaid-label">Unpaid</span>
                      <span className="text-lg font-bold text-slate-900">
                        ${(metrics.invoices.unpaid?.amount || 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1 text-center py-1.5 bg-amber-100 text-amber-700 text-xs font-medium rounded">
                        {metrics.invoices.overdue?.count || 0} Overdue
                      </div>
                      <div className="flex-1 text-center py-1.5 bg-slate-200 text-slate-600 text-xs font-medium rounded">
                        {(metrics.invoices.unpaid?.count || 0) - (metrics.invoices.overdue?.count || 0)} Not due
                      </div>
                    </div>
                  </div>

                  {/* Paid */}
                  <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-emerald-700" data-testid="text-paid-label">Paid (30 days)</span>
                      <span className="text-lg font-bold text-emerald-700">
                        ${(metrics.invoices.paid?.amount || 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-xs text-emerald-600 mt-1">
                      {metrics.invoices.paid?.count || 0} invoices paid
                    </div>
                  </div>

                  {/* Deposited */}
                  <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-blue-700" data-testid="text-deposited-label">Deposited</span>
                      <span className="text-sm font-medium text-blue-600">
                        {metrics.invoices.deposited?.count || 0} deposits
                      </span>
                    </div>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {/* Bank Accounts Card */}
          <Card className="bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow" data-testid="card-bank-accounts">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-green-50">
                    <Building2 className="h-4 w-4 text-green-600" />
                  </div>
                  <CardTitle className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Bank Accounts</CardTitle>
                </div>
                <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">Today</span>
              </div>
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
                  <div className="text-3xl font-bold text-slate-900" data-testid="text-total-balance">
                    {formatCurrencyCompact(metrics.bankAccounts.total, 'CAD', 'CAD')}
                  </div>

                  <div className="space-y-2">
                    {metrics.bankAccounts.accounts.map((account, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100 hover:border-blue-200 transition-colors"
                        data-testid={`bank-account-${index}`}
                      >
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-teal-400 flex items-center justify-center text-white font-semibold text-sm">
                          {account.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-slate-800 truncate" data-testid={`text-bank-name-${index}`}>
                            {account.name}
                          </div>
                          <div className="text-xs text-slate-500" data-testid={`text-bank-updated-${index}`}>
                            Updated {account.updated}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-slate-900" data-testid={`text-bank-balance-${index}`}>
                            {formatCurrencyCompact(account.balance, 'CAD', 'CAD')}
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
          <Card className="bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow md:col-span-2" data-testid="card-sales">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-blue-50">
                    <DollarSign className="h-4 w-4 text-blue-600" />
                  </div>
                  <CardTitle className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Sales</CardTitle>
                </div>
                <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">Year to date</span>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-10 w-32" />
                  <Skeleton className="h-64 w-full" />
                </div>
              ) : metrics && metrics.sales.length > 0 ? (
                <div className="space-y-4">
                  <div className="text-3xl font-bold text-slate-900" data-testid="text-total-sales">
                    {formatCurrencyCompact(metrics.sales.reduce((sum, month) => sum + month.amount, 0), 'CAD', 'CAD')}
                  </div>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={metrics.sales}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis
                        dataKey="month"
                        stroke="#64748b"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        stroke="#64748b"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                      />
                      <Tooltip
                        formatter={(value) => formatCurrencyCompact(Number(value), 'CAD', 'CAD')}
                        contentStyle={{
                          backgroundColor: '#fff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="amount"
                        stroke="#3b82f6"
                        strokeWidth={2.5}
                        dot={{ fill: '#3b82f6', r: 4, strokeWidth: 2, stroke: '#fff' }}
                        activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex items-center justify-center h-64 text-slate-400">
                  No sales data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Accounts Receivable Card */}
          <Card className="bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow" data-testid="card-accounts-receivable">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-amber-50">
                    <FileText className="h-4 w-4 text-amber-600" />
                  </div>
                  <CardTitle className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Receivables</CardTitle>
                </div>
                <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">Today</span>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-10 w-32" />
                  <Skeleton className="h-48 w-48 rounded-full mx-auto" />
                </div>
              ) : metrics ? (
                <div className="space-y-4">
                  <div className="text-3xl font-bold text-slate-900" data-testid="text-ar-total">
                    {formatCurrencyCompact(metrics.accountsReceivable.total, 'CAD', 'CAD')}
                  </div>

                  {arData.length > 0 ? (
                    <>
                      <ResponsiveContainer width="100%" height={180}>
                        <PieChart>
                          <Pie
                            data={arData}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={75}
                            fill="#8884d8"
                            paddingAngle={2}
                            dataKey="value"
                          >
                            {arData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value) => formatCurrencyCompact(Number(value), 'CAD', 'CAD')}
                            contentStyle={{
                              backgroundColor: '#fff',
                              border: '1px solid #e2e8f0',
                              borderRadius: '8px',
                              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>

                      <div className="space-y-2">
                        {arData.map((bucket, index) => (
                          <div key={index} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <div
                                className="h-2.5 w-2.5 rounded-full"
                                style={{ backgroundColor: COLORS[index % COLORS.length] }}
                              />
                              <span className="text-slate-600" data-testid={`text-ar-bucket-${index}`}>
                                {bucket.name}
                              </span>
                            </div>
                            <span className="font-medium text-slate-700" data-testid={`text-ar-amount-${index}`}>
                              {formatCurrencyCompact(bucket.value, 'CAD', 'CAD')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-48 text-slate-400">
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
