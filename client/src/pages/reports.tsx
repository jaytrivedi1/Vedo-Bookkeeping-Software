import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { Calendar as CalendarIcon, ArrowLeft } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { Account, LedgerEntry } from "@shared/schema";

export default function Reports() {
  const [activeTab, setActiveTab] = useState("");
  const [startDate, setStartDate] = useState<Date | undefined>(startOfMonth(subMonths(new Date(), 1)));
  const [endDate, setEndDate] = useState<Date | undefined>(endOfMonth(new Date()));
  
  
  // Fetch income statement
  const { data: incomeStatement, isLoading: incomeLoading } = useQuery({
    queryKey: ['/api/reports/income-statement'],
  });
  
  // Fetch balance sheet
  const { data: balanceSheet, isLoading: balanceLoading } = useQuery({
    queryKey: ['/api/reports/balance-sheet'],
  });
  
  // Fetch account balances
  const { data: accountBalances, isLoading: accountsLoading } = useQuery({
    queryKey: ['/api/reports/account-balances'],
  });
  
  // Fetch general ledger entries with date filtering
  const { data: generalLedger, isLoading: ledgerLoading } = useQuery<LedgerEntry[]>({
    queryKey: ['/api/reports/general-ledger', { startDate, endDate }],
    queryFn: async ({ queryKey }) => {
      const [_path, params] = queryKey;
      const urlParams = new URLSearchParams();
      
      if (params && typeof params === 'object' && 'startDate' in params && params.startDate) {
        urlParams.append('startDate', params.startDate.toISOString());
      }
      
      if (params && typeof params === 'object' && 'endDate' in params && params.endDate) {
        urlParams.append('endDate', params.endDate.toISOString());
      }
      
      const response = await fetch(`/api/reports/general-ledger?${urlParams.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch general ledger data');
      }
      return response.json();
    },
    enabled: activeTab === 'general-ledger'
  });
  
  // Prepare data for charts
  const incomeData = [
    { name: 'Revenue', value: incomeStatement?.revenues || 0 },
    { name: 'Expenses', value: incomeStatement?.expenses || 0 },
    { name: 'Net Income', value: incomeStatement?.netIncome || 0 },
  ];
  
  const balanceData = [
    { name: 'Assets', value: balanceSheet?.assets || 0 },
    { name: 'Liabilities', value: balanceSheet?.liabilities || 0 },
    { name: 'Equity', value: balanceSheet?.equity || 0 },
  ];
  
  // Colors for the pie chart
  const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'];
  
  // Group accounts by type for detailed reports
  const accountsByType = accountBalances
    ? accountBalances.reduce((acc, { account }) => {
        if (!acc[account.type]) {
          acc[account.type] = [];
        }
        acc[account.type].push(account);
        return acc;
      }, {} as Record<string, Account[]>)
    : {};
  
  // Helper function to get report title
  const getReportTitle = (tab: string): string => {
    switch (tab) {
      case 'income-statement':
        return 'Income Statement';
      case 'balance-sheet':
        return 'Balance Sheet';
      case 'general-ledger':
        return 'General Ledger';
      case 'expense-analysis':
        return 'Expense Analysis';
      case 'revenue-analysis':
        return 'Revenue Analysis';
      default:
        return 'Financial Reports';
    }
  };
  
  // Transform account balances for pie chart
  const expenseAccounts = accountBalances
    ? accountBalances
        .filter(({ account }) => account.type === 'expense')
        .map(({ account, balance }) => ({
          name: account.name,
          value: balance,
        }))
    : [];
  
  const revenueAccounts = accountBalances
    ? accountBalances
        .filter(({ account }) => account.type === 'income')
        .map(({ account, balance }) => ({
          name: account.name,
          value: balance,
        }))
    : [];
  
  return (
    <div className="py-6">
      {/* Page header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <h1 className="text-2xl font-semibold text-gray-900">Financial Reports</h1>
        <p className="mt-1 text-sm text-gray-500">
          View and analyze your financial data
        </p>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="py-4">
          {activeTab === '' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card 
                className="cursor-pointer hover:bg-gray-50 transition-colors" 
                onClick={() => setActiveTab("income-statement")}
              >
                <CardHeader>
                  <CardTitle>Income Statement</CardTitle>
                  <CardDescription>
                    View your revenues, expenses, and net income for a specific period
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    The income statement shows how your business performed financially over a specific 
                    time period, displaying revenues earned and expenses incurred.
                  </p>
                </CardContent>
                <CardFooter className="flex justify-end">
                  <Button variant="ghost" size="sm">View Report →</Button>
                </CardFooter>
              </Card>

              <Card 
                className="cursor-pointer hover:bg-gray-50 transition-colors" 
                onClick={() => setActiveTab("balance-sheet")}
              >
                <CardHeader>
                  <CardTitle>Balance Sheet</CardTitle>
                  <CardDescription>
                    Examine your assets, liabilities, and equity at a specific point in time
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    The balance sheet provides a snapshot of your company's financial position, showing 
                    what you own (assets), what you owe (liabilities), and the resulting net worth (equity).
                  </p>
                </CardContent>
                <CardFooter className="flex justify-end">
                  <Button variant="ghost" size="sm">View Report →</Button>
                </CardFooter>
              </Card>

              <Card 
                className="cursor-pointer hover:bg-gray-50 transition-colors" 
                onClick={() => setActiveTab("general-ledger")}
              >
                <CardHeader>
                  <CardTitle>General Ledger</CardTitle>
                  <CardDescription>
                    Examine all financial transactions with detailed debit and credit entries
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    The general ledger provides a complete record of all financial transactions, 
                    showing every debit and credit entry made to each account in your chart of accounts.
                  </p>
                </CardContent>
                <CardFooter className="flex justify-end">
                  <Button variant="ghost" size="sm">View Report →</Button>
                </CardFooter>
              </Card>

              <Card 
                className="cursor-pointer hover:bg-gray-50 transition-colors" 
                onClick={() => setActiveTab("expense-analysis")}
              >
                <CardHeader>
                  <CardTitle>Expense Analysis</CardTitle>
                  <CardDescription>
                    Break down your expenses by category to identify spending patterns
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    The expense analysis report helps you understand where your money is going by categorizing 
                    and visualizing expense transactions across different accounts and time periods.
                  </p>
                </CardContent>
                <CardFooter className="flex justify-end">
                  <Button variant="ghost" size="sm">View Report →</Button>
                </CardFooter>
              </Card>

              <Card 
                className="cursor-pointer hover:bg-gray-50 transition-colors" 
                onClick={() => setActiveTab("revenue-analysis")}
              >
                <CardHeader>
                  <CardTitle>Revenue Analysis</CardTitle>
                  <CardDescription>
                    Analyze your revenue streams to understand your income sources
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    The revenue analysis report helps you track where your income is coming from by breaking down
                    revenue by source, customer, product or service categories.
                  </p>
                </CardContent>
                <CardFooter className="flex justify-end">
                  <Button variant="ghost" size="sm">View Report →</Button>
                </CardFooter>
              </Card>
            </div>
          )}

          {activeTab !== '' && (
            <div className="mb-6 flex items-center gap-4">
              <Button variant="outline" onClick={() => setActiveTab('')}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Reports
              </Button>
              <h2 className="text-xl font-semibold">{getReportTitle(activeTab)}</h2>
            </div>
          )}
            
          <Tabs value={activeTab} defaultValue="income-statement">
            {/* Income Statement */}
            <TabsContent value="income-statement">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Income Statement</CardTitle>
                    <CardDescription>
                      For the period ending {format(new Date(), 'MMMM d, yyyy')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {incomeLoading ? (
                      <div className="text-center py-6">Loading income statement...</div>
                    ) : (
                      <div>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[50%]">Item</TableHead>
                              <TableHead className="text-right">Amount</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <TableRow>
                              <TableCell className="font-medium">Revenues</TableCell>
                              <TableCell className="text-right">${incomeStatement?.revenues.toFixed(2)}</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium">Expenses</TableCell>
                              <TableCell className="text-right">${incomeStatement?.expenses.toFixed(2)}</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-bold">Net Income</TableCell>
                              <TableCell className="text-right font-bold">
                                ${incomeStatement?.netIncome.toFixed(2)}
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Income Visualization</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-60">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={incomeData}
                          margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                          <Bar dataKey="value" fill="#3b82f6" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Detailed revenue and expense breakdown */}
                <Card className="lg:col-span-3">
                  <CardHeader>
                    <CardTitle>Detailed Revenue & Expense Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Revenues */}
                      <div>
                        <h3 className="text-lg font-medium mb-3">Revenues</h3>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Account</TableHead>
                              <TableHead className="text-right">Amount</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {accountsLoading ? (
                              <TableRow>
                                <TableCell colSpan={2} className="text-center">Loading...</TableCell>
                              </TableRow>
                            ) : accountsByType['income'] && accountsByType['income'].length > 0 ? (
                              accountsByType['income'].map((account) => (
                                <TableRow key={account.id}>
                                  <TableCell>{account.name}</TableCell>
                                  <TableCell className="text-right">${account.balance.toFixed(2)}</TableCell>
                                </TableRow>
                              ))
                            ) : (
                              <TableRow>
                                <TableCell colSpan={2} className="text-center">No revenue accounts found</TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                      
                      {/* Expenses */}
                      <div>
                        <h3 className="text-lg font-medium mb-3">Expenses</h3>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Account</TableHead>
                              <TableHead className="text-right">Amount</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {accountsLoading ? (
                              <TableRow>
                                <TableCell colSpan={2} className="text-center">Loading...</TableCell>
                              </TableRow>
                            ) : accountsByType['expense'] && accountsByType['expense'].length > 0 ? (
                              accountsByType['expense'].map((account) => (
                                <TableRow key={account.id}>
                                  <TableCell>{account.name}</TableCell>
                                  <TableCell className="text-right">${account.balance.toFixed(2)}</TableCell>
                                </TableRow>
                              ))
                            ) : (
                              <TableRow>
                                <TableCell colSpan={2} className="text-center">No expense accounts found</TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            {/* Balance Sheet */}
            <TabsContent value="balance-sheet">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Balance Sheet</CardTitle>
                    <CardDescription>
                      As of {format(new Date(), 'MMMM d, yyyy')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {balanceLoading ? (
                      <div className="text-center py-6">Loading balance sheet...</div>
                    ) : (
                      <div>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[50%]">Item</TableHead>
                              <TableHead className="text-right">Amount</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <TableRow>
                              <TableCell className="font-medium">Total Assets</TableCell>
                              <TableCell className="text-right">${balanceSheet?.assets.toFixed(2)}</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium">Total Liabilities</TableCell>
                              <TableCell className="text-right">${balanceSheet?.liabilities.toFixed(2)}</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium">Total Equity</TableCell>
                              <TableCell className="text-right">${balanceSheet?.equity.toFixed(2)}</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-bold">Total Liabilities & Equity</TableCell>
                              <TableCell className="text-right font-bold">
                                ${(balanceSheet?.liabilities + balanceSheet?.equity).toFixed(2)}
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Balance Sheet Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-60">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={balanceData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                            {balanceData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Detailed asset, liability, and equity breakdown */}
                <Card className="lg:col-span-3">
                  <CardHeader>
                    <CardTitle>Detailed Balance Sheet Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Assets */}
                      <div>
                        <h3 className="text-lg font-medium mb-3">Assets</h3>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Account</TableHead>
                              <TableHead className="text-right">Amount</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {accountsLoading ? (
                              <TableRow>
                                <TableCell colSpan={2} className="text-center">Loading...</TableCell>
                              </TableRow>
                            ) : accountsByType['asset'] && accountsByType['asset'].length > 0 ? (
                              accountsByType['asset'].map((account) => (
                                <TableRow key={account.id}>
                                  <TableCell>{account.name}</TableCell>
                                  <TableCell className="text-right">${account.balance.toFixed(2)}</TableCell>
                                </TableRow>
                              ))
                            ) : (
                              <TableRow>
                                <TableCell colSpan={2} className="text-center">No asset accounts found</TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                      
                      {/* Liabilities */}
                      <div>
                        <h3 className="text-lg font-medium mb-3">Liabilities</h3>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Account</TableHead>
                              <TableHead className="text-right">Amount</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {accountsLoading ? (
                              <TableRow>
                                <TableCell colSpan={2} className="text-center">Loading...</TableCell>
                              </TableRow>
                            ) : accountsByType['liability'] && accountsByType['liability'].length > 0 ? (
                              accountsByType['liability'].map((account) => (
                                <TableRow key={account.id}>
                                  <TableCell>{account.name}</TableCell>
                                  <TableCell className="text-right">${account.balance.toFixed(2)}</TableCell>
                                </TableRow>
                              ))
                            ) : (
                              <TableRow>
                                <TableCell colSpan={2} className="text-center">No liability accounts found</TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                      
                      {/* Equity */}
                      <div>
                        <h3 className="text-lg font-medium mb-3">Equity</h3>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Account</TableHead>
                              <TableHead className="text-right">Amount</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {accountsLoading ? (
                              <TableRow>
                                <TableCell colSpan={2} className="text-center">Loading...</TableCell>
                              </TableRow>
                            ) : accountsByType['equity'] && accountsByType['equity'].length > 0 ? (
                              accountsByType['equity'].map((account) => (
                                <TableRow key={account.id}>
                                  <TableCell>{account.name}</TableCell>
                                  <TableCell className="text-right">${account.balance.toFixed(2)}</TableCell>
                                </TableRow>
                              ))
                            ) : (
                              <TableRow>
                                <TableCell colSpan={2} className="text-center">No equity accounts found</TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            {/* General Ledger */}
            <TabsContent value="general-ledger">
              <div className="grid grid-cols-1 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>General Ledger</CardTitle>
                      <CardDescription>
                        View all ledger entries for the selected period
                      </CardDescription>
                    </div>
                    <div className="flex items-center space-x-2">
                      {/* Start Date Selector */}
                      <div className="flex flex-col space-y-1">
                        <span className="text-sm font-medium">Start Date</span>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-[200px] justify-start text-left font-normal",
                                !startDate && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {startDate ? format(startDate, "PPP") : "Select date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={startDate}
                              onSelect={setStartDate}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      
                      {/* End Date Selector */}
                      <div className="flex flex-col space-y-1">
                        <span className="text-sm font-medium">End Date</span>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-[200px] justify-start text-left font-normal",
                                !endDate && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {endDate ? format(endDate, "PPP") : "Select date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={endDate}
                              onSelect={setEndDate}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {ledgerLoading ? (
                      <div className="text-center py-6">Loading ledger entries...</div>
                    ) : !generalLedger || generalLedger.length === 0 ? (
                      <div className="text-center py-6">No ledger entries found for the selected period</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Date</TableHead>
                              <TableHead>Account</TableHead>
                              <TableHead>Description</TableHead>
                              <TableHead className="text-right">Debit</TableHead>
                              <TableHead className="text-right">Credit</TableHead>
                              <TableHead>Reference</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {generalLedger.map((entry) => (
                              <TableRow key={entry.id}>
                                <TableCell>{format(new Date(entry.date), "yyyy-MM-dd")}</TableCell>
                                <TableCell>{entry.account?.name || `Account #${entry.accountId}`}</TableCell>
                                <TableCell>{entry.description || entry.transaction?.description || "—"}</TableCell>
                                <TableCell className="text-right">{entry.debit > 0 ? `$${entry.debit.toFixed(2)}` : ""}</TableCell>
                                <TableCell className="text-right">{entry.credit > 0 ? `$${entry.credit.toFixed(2)}` : ""}</TableCell>
                                <TableCell>{entry.transaction?.reference || "—"}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            {/* Expense Analysis */}
            <TabsContent value="expense-analysis">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Expense Distribution</CardTitle>
                    <CardDescription>Breakdown of expenses by category</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={expenseAccounts}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                            {expenseAccounts.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Expense Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Expense Account</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead className="text-right">% of Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {accountsLoading ? (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center">Loading...</TableCell>
                          </TableRow>
                        ) : expenseAccounts.length > 0 ? (
                          expenseAccounts.map((item, index) => (
                            <TableRow key={index}>
                              <TableCell>{item.name}</TableCell>
                              <TableCell className="text-right">${item.value.toFixed(2)}</TableCell>
                              <TableCell className="text-right">
                                {((item.value / incomeStatement?.expenses) * 100).toFixed(1)}%
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center">No expense data available</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            {/* Revenue Analysis */}
            <TabsContent value="revenue-analysis">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Revenue Distribution</CardTitle>
                    <CardDescription>Breakdown of revenue by source</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={revenueAccounts}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                            {revenueAccounts.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Revenue Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Revenue Account</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead className="text-right">% of Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {accountsLoading ? (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center">Loading...</TableCell>
                          </TableRow>
                        ) : revenueAccounts.length > 0 ? (
                          revenueAccounts.map((item, index) => (
                            <TableRow key={index}>
                              <TableCell>{item.name}</TableCell>
                              <TableCell className="text-right">${item.value.toFixed(2)}</TableCell>
                              <TableCell className="text-right">
                                {((item.value / incomeStatement?.revenues) * 100).toFixed(1)}%
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center">No revenue data available</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
