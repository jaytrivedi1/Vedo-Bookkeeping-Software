import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { Calendar as CalendarIcon, ArrowLeft, FileDown } from "lucide-react";
import ExportMenu from "@/components/ExportMenu";
import { 
  exportIncomeStatementToCSV, 
  exportIncomeStatementToPDF,
  exportBalanceSheetToCSV,
  exportBalanceSheetToPDF,
  exportAccountBalancesToCSV,
  exportAccountBalancesToPDF,
  generateFilename 
} from "@/lib/exportUtils";
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
  const [activeTab, setActiveTab] = useState<string>('');
  const [startDate, setStartDate] = useState<Date | undefined>(subMonths(new Date(), 1));
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  
  // Fetch income statement data
  const { data: incomeStatement, isLoading: incomeLoading } = useQuery({
    queryKey: ['/api/reports/income-statement', startDate?.toISOString(), endDate?.toISOString()],
    enabled: activeTab === 'income-statement' || activeTab === '',
  });
  
  // Fetch balance sheet data
  const { data: balanceSheet, isLoading: balanceLoading } = useQuery({
    queryKey: ['/api/reports/balance-sheet'],
    enabled: activeTab === 'balance-sheet' || activeTab === '',
  });
  
  // Fetch account balances (for trial balance and detailed breakdowns)
  const { data: accountBalances, isLoading: accountsLoading } = useQuery({
    queryKey: ['/api/reports/account-balances'],
    enabled: activeTab !== 'general-ledger',
  });
  
  // Fetch ledger entries (for general ledger)
  const { data: ledgerEntries, isLoading: ledgerLoading } = useQuery<LedgerEntry[]>({
    queryKey: ['/api/ledger-entries'],
    enabled: activeTab === 'general-ledger',
  });
  
  // Prepare data for charts
  const incomeData = incomeStatement 
    ? [
        { name: 'Revenues', value: incomeStatement.revenues },
        { name: 'Expenses', value: incomeStatement.expenses },
        { name: 'Net Income', value: incomeStatement.netIncome }
      ]
    : [];
  
  const balanceData = balanceSheet
    ? [
        { name: 'Assets', value: balanceSheet.assets },
        { name: 'Liabilities', value: balanceSheet.liabilities },
        { name: 'Equity', value: balanceSheet.equity }
      ]
    : [];
  
  // Colors for the pie chart
  const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'];
  
  // Group accounts by their types for various reports
  const accountsByType: Record<string, any[]> = {};
  
  if (accountBalances) {
    // Group accounts by their types
    // Asset accounts
    accountsByType['asset'] = accountBalances.filter(({ account }) => 
      account.type === 'accounts_receivable' || 
      account.type === 'current_assets' || 
      account.type === 'bank' || 
      account.type === 'property_plant_equipment' || 
      account.type === 'long_term_assets'
    ).map(({ account, balance }) => ({
      ...account,
      balance: Math.abs(balance)
    }));
    
    // Liability accounts
    accountsByType['liability'] = accountBalances.filter(({ account }) => 
      account.type === 'accounts_payable' || 
      account.type === 'credit_card' || 
      account.type === 'other_current_liabilities' ||
      account.type === 'long_term_liabilities'
    ).map(({ account, balance }) => ({
      ...account,
      balance: Math.abs(balance)
    }));
    
    // Equity accounts
    accountsByType['equity'] = accountBalances.filter(({ account }) => 
      account.type === 'equity'
    ).map(({ account, balance }) => ({
      ...account,
      balance: Math.abs(balance)
    }));
    
    // Income accounts
    accountsByType['income'] = accountBalances.filter(({ account }) => 
      account.type === 'income' || 
      account.type === 'other_income'
    ).map(({ account, balance }) => ({
      ...account, 
      balance: Math.abs(balance)
    }));
    
    // Expense accounts
    accountsByType['expense'] = accountBalances.filter(({ account }) => 
      account.type === 'expenses' || 
      account.type === 'cost_of_goods_sold' ||
      account.type === 'other_expense'
    ).map(({ account, balance }) => ({
      ...account,
      balance: Math.abs(balance)
    }));
  }
  
  // Transform account balances for pie chart
  const expenseAccounts = accountsByType['expense'] 
    ? accountsByType['expense'].map(account => ({
        name: account.name,
        value: account.balance,
      }))
    : [];
  
  const revenueAccounts = accountsByType['income']
    ? accountsByType['income'].map(account => ({
        name: account.name, 
        value: account.balance,
      }))
    : [];
  
  // Helper function to get report title
  const getReportTitle = (tab: string): string => {
    switch (tab) {
      case 'income-statement':
        return 'Income Statement';
      case 'balance-sheet':
        return 'Balance Sheet';
      case 'general-ledger':
        return 'General Ledger';
      case 'trial-balance':
        return 'Trial Balance';
      case 'expense-analysis':
        return 'Expense Analysis';
      case 'revenue-analysis':
        return 'Revenue Analysis';
      default:
        return 'Financial Reports';
    }
  };
  
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
                onClick={() => setActiveTab("trial-balance")}
              >
                <CardHeader>
                  <CardTitle>Trial Balance</CardTitle>
                  <CardDescription>
                    View account balances with debit and credit columns to verify accounting equation
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    The trial balance report verifies that total debits equal total credits across all accounts,
                    confirming the accounting equation is in balance before creating financial statements.
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
                  <CardHeader className="flex flex-col sm:flex-row justify-between">
                    <div>
                      <CardTitle>Income Statement</CardTitle>
                      <CardDescription>
                        For the period ending {format(new Date(), 'MMMM d, yyyy')}
                      </CardDescription>
                    </div>
                    {incomeStatement && !incomeLoading && (
                      <div className="mt-2 sm:mt-0">
                        <ExportMenu
                          onExportCSV={() => {
                            const filename = generateFilename('income_statement', startDate, endDate);
                            exportIncomeStatementToCSV(incomeStatement, accountsByType['income'], accountsByType['expense'], `${filename}.csv`);
                          }}
                          onExportPDF={() => {
                            const filename = generateFilename('income_statement', startDate, endDate);
                            exportIncomeStatementToPDF(incomeStatement, accountsByType['income'], accountsByType['expense'], `${filename}.pdf`);
                          }}
                          label="Export"
                        />
                      </div>
                    )}
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
                              <TableCell className="text-right">
                                {incomeStatement?.revenues ? new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(incomeStatement.revenues) : '0.00'}
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium">Expenses</TableCell>
                              <TableCell className="text-right">
                                {incomeStatement?.expenses ? new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(incomeStatement.expenses) : '0.00'}
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-bold">Net Income</TableCell>
                              <TableCell className="text-right font-bold">
                                {incomeStatement?.netIncome ? new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(incomeStatement.netIncome) : '0.00'}
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
                          <Tooltip formatter={(value: any) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value))} />
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
                              accountsByType['income'].map((account: any) => (
                                <TableRow key={account.id}>
                                  <TableCell>{account.name}</TableCell>
                                  <TableCell className="text-right">
                                    {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(account.balance)}
                                  </TableCell>
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
                              accountsByType['expense'].map((account: any) => (
                                <TableRow key={account.id}>
                                  <TableCell>{account.name}</TableCell>
                                  <TableCell className="text-right">
                                    {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(account.balance)}
                                  </TableCell>
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
                  <CardHeader className="flex flex-col sm:flex-row justify-between">
                    <div>
                      <CardTitle>Balance Sheet</CardTitle>
                      <CardDescription>
                        As of {format(new Date(), 'MMMM d, yyyy')}
                      </CardDescription>
                    </div>
                    {balanceSheet && !balanceLoading && (
                      <div className="mt-2 sm:mt-0">
                        <ExportMenu
                          onExportCSV={() => {
                            const filename = generateFilename('balance_sheet');
                            exportBalanceSheetToCSV(
                              balanceSheet, 
                              accountsByType['asset'], 
                              accountsByType['liability'], 
                              accountsByType['equity'], 
                              `${filename}.csv`
                            );
                          }}
                          onExportPDF={() => {
                            const filename = generateFilename('balance_sheet');
                            exportBalanceSheetToPDF(
                              balanceSheet, 
                              accountsByType['asset'], 
                              accountsByType['liability'], 
                              accountsByType['equity'], 
                              `${filename}.pdf`
                            );
                          }}
                          label="Export"
                        />
                      </div>
                    )}
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
                              <TableCell className="font-medium">Assets</TableCell>
                              <TableCell className="text-right">
                                {balanceSheet?.assets ? new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(balanceSheet.assets) : '0.00'}
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium">Liabilities</TableCell>
                              <TableCell className="text-right">
                                {balanceSheet?.liabilities ? new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(balanceSheet.liabilities) : '0.00'}
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium">Equity</TableCell>
                              <TableCell className="text-right">
                                {balanceSheet?.equity ? new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(balanceSheet.equity) : '0.00'}
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-bold">Liabilities + Equity</TableCell>
                              <TableCell className="text-right font-bold">
                                {balanceSheet?.liabilities && balanceSheet?.equity ? 
                                  new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(balanceSheet.liabilities + balanceSheet.equity) : '0.00'}
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
                    <CardTitle>Balance Sheet Visualization</CardTitle>
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
                            label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                            {balanceData.map((entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: any) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value))} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Detailed balance sheet breakdown */}
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
                              accountsByType['asset'].map((account: any) => (
                                <TableRow key={account.id}>
                                  <TableCell>{account.name}</TableCell>
                                  <TableCell className="text-right">
                                    {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(account.balance)}
                                  </TableCell>
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
                              accountsByType['liability'].map((account: any) => (
                                <TableRow key={account.id}>
                                  <TableCell>{account.name}</TableCell>
                                  <TableCell className="text-right">
                                    {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(account.balance)}
                                  </TableCell>
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
                            ) : (
                              <>
                                {/* Show all equity accounts */}
                                {(() => {
                                  // Find Retained Earnings account if it exists
                                  const retainedEarningsAccount = accountsByType['equity'] && 
                                    accountsByType['equity'].find((account: any) => 
                                      account.name.toLowerCase().includes('retained earnings'));
                                  
                                  // Map and show all equity accounts except Retained Earnings
                                  return (
                                    <>
                                      {accountsByType['equity'] && accountsByType['equity']
                                        .filter((account: any) => 
                                          !account.name.toLowerCase().includes('retained earnings'))
                                        .map((account: any) => (
                                          <TableRow key={account.id}>
                                            <TableCell>{account.name}</TableCell>
                                            <TableCell className="text-right">
                                              {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(account.balance)}
                                            </TableCell>
                                          </TableRow>
                                        ))
                                      }
                                      
                                      {/* Add Retained Earnings with correct balance (original + net income) */}
                                      <TableRow>
                                        <TableCell>
                                          {retainedEarningsAccount ? retainedEarningsAccount.name : 'Retained Earnings'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                          {incomeStatement?.netIncome ? new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(incomeStatement.netIncome) : '0.00'}
                                        </TableCell>
                                      </TableRow>
                                    </>
                                  );
                                })()}
                              </>
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
                              variant={"outline"}
                              className={cn(
                                "w-[200px] justify-start text-left font-normal",
                                !startDate && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
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
                              variant={"outline"}
                              className={cn(
                                "w-[200px] justify-start text-left font-normal",
                                !endDate && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {endDate ? format(endDate, "PPP") : <span>Pick a date</span>}
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
                      <div className="text-center py-6">Loading general ledger...</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Date</TableHead>
                              <TableHead>Description</TableHead>
                              <TableHead>Account</TableHead>
                              <TableHead className="text-right">Debit</TableHead>
                              <TableHead className="text-right">Credit</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {ledgerEntries && ledgerEntries.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={5} className="text-center py-6 text-gray-500">
                                  No entries found in the general ledger
                                </TableCell>
                              </TableRow>
                            ) : (
                              ledgerEntries && ledgerEntries.map((entry: any) => {
                                const accountName = accountBalances?.find(
                                  ({ account }) => account.id === entry.accountId
                                )?.account.name || 'Unknown Account';
                                
                                return (
                                  <TableRow key={entry.id}>
                                    <TableCell>{format(new Date(entry.date), "MMM d, yyyy")}</TableCell>
                                    <TableCell>{entry.description}</TableCell>
                                    <TableCell>{accountName}</TableCell>
                                    <TableCell className="text-right">
                                      {entry.debit > 0 ? new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(entry.debit) : ''}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      {entry.credit > 0 ? new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(entry.credit) : ''}
                                    </TableCell>
                                  </TableRow>
                                );
                              })
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            {/* Trial Balance */}
            <TabsContent value="trial-balance">
              <div className="grid grid-cols-1 gap-6">
                <Card>
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row justify-between">
                      <div>
                        <CardTitle>Trial Balance</CardTitle>
                        <CardDescription>
                          As of {format(new Date(), "MMMM d, yyyy")}
                        </CardDescription>
                        <div>
                          <Button variant="outline" className="mt-2">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            Select Date
                          </Button>
                        </div>
                      </div>
                      {accountBalances && !accountsLoading && (
                        <div className="mt-2 sm:mt-0">
                          <ExportMenu
                            onExportCSV={() => {
                              const filename = generateFilename('trial_balance');
                              exportAccountBalancesToCSV(accountBalances, `${filename}.csv`);
                            }}
                            onExportPDF={() => {
                              const filename = generateFilename('trial_balance');
                              exportAccountBalancesToPDF(accountBalances, `${filename}.pdf`);
                            }}
                            label="Export"
                          />
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {accountsLoading ? (
                      <div className="text-center py-6">Loading trial balance data...</div>
                    ) : accountBalances && accountBalances.length > 0 ? (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Account Code</TableHead>
                              <TableHead>Account Name</TableHead>
                              <TableHead className="text-right">Debit</TableHead>
                              <TableHead className="text-right">Credit</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {accountBalances.map(({ account, balance }, index) => {
                              // For trial balance:
                              // - Assets and Expenses have debit balances (positive in our system)
                              // - Liabilities, Equity, and Income have credit balances (negative in our system)
                              const isDebitAccount = 
                                account.type === 'accounts_receivable' || 
                                account.type === 'current_assets' || 
                                account.type === 'bank' || 
                                account.type === 'property_plant_equipment' || 
                                account.type === 'long_term_assets' ||
                                account.type === 'expenses' || 
                                account.type === 'cost_of_goods_sold' ||
                                account.type === 'other_expense';
                              
                              // Display absolute values in the appropriate columns
                              const debitAmount = isDebitAccount ? Math.abs(balance) : 0;
                              const creditAmount = !isDebitAccount ? Math.abs(balance) : 0;
                              
                              return (
                                <TableRow key={index}>
                                  <TableCell>{account.code}</TableCell>
                                  <TableCell>{account.name}</TableCell>
                                  <TableCell className="text-right">
                                    {debitAmount > 0 ? new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(debitAmount) : ''}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {creditAmount > 0 ? new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(creditAmount) : ''}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                            
                            {/* Calculate totals */}
                            {(() => {
                              let totalDebit = 0;
                              let totalCredit = 0;
                              
                              if (accountBalances) {
                                accountBalances.forEach(({ account, balance }) => {
                                  const isDebitAccount = 
                                    account.type === 'accounts_receivable' || 
                                    account.type === 'current_assets' || 
                                    account.type === 'bank' || 
                                    account.type === 'property_plant_equipment' || 
                                    account.type === 'long_term_assets' ||
                                    account.type === 'expenses' || 
                                    account.type === 'cost_of_goods_sold' ||
                                    account.type === 'other_expense';
                                  
                                  if (isDebitAccount) {
                                    totalDebit += Math.abs(balance);
                                  } else {
                                    totalCredit += Math.abs(balance);
                                  }
                                });
                              }
                              
                              return (
                                <TableRow className="font-bold">
                                  <TableCell colSpan={2} className="text-right">Total</TableCell>
                                  <TableCell className="text-right">
                                    {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(totalDebit)}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(totalCredit)}
                                  </TableCell>
                                </TableRow>
                              );
                            })()}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="text-center py-6">No accounts found to generate a trial balance</div>
                    )}
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>About the Trial Balance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <p>
                        The trial balance is a worksheet with two columns, "debit" and "credit," that lists 
                        all the accounts with their balances before the financial statements are prepared.
                      </p>
                      <p>
                        <strong>Purpose:</strong> To verify that the total debits equal the total credits. 
                        This ensures that the accounting equation (Assets = Liabilities + Equity) is in balance.
                      </p>
                      <p>
                        <strong>Important:</strong> A balanced trial balance does not guarantee that there are no errors in
                        the individual ledger entries. It only confirms that the total debits equal the total credits.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            {/* Expense Analysis */}
            <TabsContent value="expense-analysis">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader className="flex flex-col sm:flex-row justify-between">
                    <div>
                      <CardTitle>Expense Distribution</CardTitle>
                      <CardDescription>Breakdown of expenses by category</CardDescription>
                    </div>
                    {expenseAccounts && expenseAccounts.length > 0 && (
                      <div className="mt-2 sm:mt-0">
                        <ExportMenu
                          onExportCSV={() => {
                            const filename = generateFilename('expense_analysis');
                            const data = expenseAccounts.map(account => ({
                              Account: account.name,
                              Amount: account.value,
                              Percentage: ((account.value / (incomeStatement?.expenses || 1)) * 100).toFixed(1) + '%'
                            }));
                            
                            const csv = Papa.unparse({
                              fields: ['Account', 'Amount', 'Percentage'],
                              data
                            });
                            
                            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                            const url = URL.createObjectURL(blob);
                            const link = document.createElement('a');
                            link.setAttribute('href', url);
                            link.setAttribute('download', `${filename}.csv`);
                            link.style.visibility = 'hidden';
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                          }}
                          onExportPDF={() => {
                            const filename = generateFilename('expense_analysis');
                            const doc = new jsPDF();
                            
                            // Add title
                            doc.setFontSize(18);
                            doc.text('Expense Analysis', 14, 22);
                            
                            // Add date
                            doc.setFontSize(11);
                            doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
                            
                            const tableRows = expenseAccounts.map(account => [
                              account.name,
                              new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(account.value),
                              ((account.value / (incomeStatement?.expenses || 1)) * 100).toFixed(1) + '%'
                            ]);
                            
                            (doc as any).autoTable({
                              head: [['Expense Account', 'Amount', 'Percentage']],
                              body: tableRows,
                              startY: 40,
                              theme: 'grid'
                            });
                            
                            doc.save(`${filename}.pdf`);
                          }}
                          label="Export"
                        />
                      </div>
                    )}
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
                            label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                            {expenseAccounts.map((entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: any) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value))} />
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
                          expenseAccounts.map((item: any, index: number) => (
                            <TableRow key={index}>
                              <TableCell>{item.name}</TableCell>
                              <TableCell className="text-right">
                                {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(item.value)}
                              </TableCell>
                              <TableCell className="text-right">
                                {((item.value / (incomeStatement?.expenses || 1)) * 100).toFixed(1)}%
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
                  <CardHeader className="flex flex-col sm:flex-row justify-between">
                    <div>
                      <CardTitle>Revenue Distribution</CardTitle>
                      <CardDescription>Breakdown of revenue by source</CardDescription>
                    </div>
                    {revenueAccounts && revenueAccounts.length > 0 && (
                      <div className="mt-2 sm:mt-0">
                        <ExportMenu
                          onExportCSV={() => {
                            const filename = generateFilename('revenue_analysis');
                            const data = revenueAccounts.map(account => ({
                              Account: account.name,
                              Amount: account.value,
                              Percentage: ((account.value / (incomeStatement?.revenues || 1)) * 100).toFixed(1) + '%'
                            }));
                            
                            const csv = Papa.unparse({
                              fields: ['Account', 'Amount', 'Percentage'],
                              data
                            });
                            
                            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                            const url = URL.createObjectURL(blob);
                            const link = document.createElement('a');
                            link.setAttribute('href', url);
                            link.setAttribute('download', `${filename}.csv`);
                            link.style.visibility = 'hidden';
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                          }}
                          onExportPDF={() => {
                            const filename = generateFilename('revenue_analysis');
                            const doc = new jsPDF();
                            
                            // Add title
                            doc.setFontSize(18);
                            doc.text('Revenue Analysis', 14, 22);
                            
                            // Add date
                            doc.setFontSize(11);
                            doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
                            
                            const tableRows = revenueAccounts.map(account => [
                              account.name,
                              new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(account.value),
                              ((account.value / (incomeStatement?.revenues || 1)) * 100).toFixed(1) + '%'
                            ]);
                            
                            (doc as any).autoTable({
                              head: [['Revenue Account', 'Amount', 'Percentage']],
                              body: tableRows,
                              startY: 40,
                              theme: 'grid'
                            });
                            
                            doc.save(`${filename}.pdf`);
                          }}
                          label="Export"
                        />
                      </div>
                    )}
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
                            label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                            {revenueAccounts.map((entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: any) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value))} />
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
                          revenueAccounts.map((item: any, index: number) => (
                            <TableRow key={index}>
                              <TableCell>{item.name}</TableCell>
                              <TableCell className="text-right">
                                {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(item.value)}
                              </TableCell>
                              <TableCell className="text-right">
                                {((item.value / (incomeStatement?.revenues || 1)) * 100).toFixed(1)}%
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