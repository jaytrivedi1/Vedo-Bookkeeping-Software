import { useState, useRef, ChangeEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Upload, 
  FileTextIcon, 
  PlusCircleIcon, 
  CheckCircleIcon, 
  XCircleIcon, 
  BuildingIcon,
  CreditCardIcon,
  PercentIcon
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface BankTransaction {
  id: string;
  date: string;
  chequeNo?: string;
  description: string;
  payment: number;
  deposit: number;
  accountId?: number;
  salesTax?: number;
  status: 'unclassified' | 'classified';
  transactionId?: number;
}

interface AccountOption {
  id: number;
  name: string;
  code: string;
  type: string;
}

interface BankAccountTile {
  id: string;
  type: 'bank' | 'credit-card' | 'line-of-credit';
  name: string;
  icon: React.ReactNode;
  description: string;
}

export default function Banking() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedAccount, setSelectedAccount] = useState<BankAccountTile | null>(null);
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showExampleData, setShowExampleData] = useState(false);

  // Fetch accounts for the dropdown selection
  const { data: accounts, isLoading: accountsLoading } = useQuery<AccountOption[]>({
    queryKey: ['/api/accounts'],
  });
  
  // Example transaction data to show the format
  const exampleTransactions: BankTransaction[] = [
    {
      id: 'example-1',
      date: '2025-04-01',
      chequeNo: '1234',
      description: 'Office Supplies Purchase',
      payment: 235.67,
      deposit: 0,
      salesTax: 23.57,
      status: 'classified',
      accountId: 6300
    },
    {
      id: 'example-2',
      date: '2025-04-05',
      description: 'Client Payment - ABC Corp',
      payment: 0,
      deposit: 1500.00,
      status: 'classified',
      accountId: 4000
    },
    {
      id: 'example-3',
      date: '2025-04-07',
      chequeNo: '1235',
      description: 'Monthly Rent Payment',
      payment: 1200.00,
      deposit: 0,
      status: 'unclassified'
    },
    {
      id: 'example-4',
      date: '2025-04-10',
      description: 'Utilities - Electricity',
      payment: 145.30,
      deposit: 0,
      salesTax: 7.27,
      status: 'classified',
      accountId: 6200
    },
    {
      id: 'example-5',
      date: '2025-04-15',
      description: 'Consulting Revenue - XYZ Ltd',
      payment: 0,
      deposit: 3500.00,
      status: 'unclassified'
    }
  ];

  // Define bank account tiles
  const bankAccounts: BankAccountTile[] = [
    {
      id: "checking",
      type: "bank",
      name: "Checking Account",
      icon: <BuildingIcon className="h-10 w-10 text-primary" />,
      description: "Primary business checking account"
    },
    {
      id: "savings",
      type: "bank",
      name: "Savings Account",
      icon: <BuildingIcon className="h-10 w-10 text-blue-500" />,
      description: "Business savings account"
    },
    {
      id: "visa",
      type: "credit-card",
      name: "Business Visa",
      icon: <CreditCardIcon className="h-10 w-10 text-red-500" />,
      description: "Business credit card"
    },
    {
      id: "mastercard",
      type: "credit-card",
      name: "Business Mastercard",
      icon: <CreditCardIcon className="h-10 w-10 text-orange-500" />,
      description: "Executive credit card"
    },
    {
      id: "line-of-credit",
      type: "line-of-credit",
      name: "Business Line of Credit",
      icon: <PercentIcon className="h-10 w-10 text-green-500" />,
      description: "Revolving line of credit"
    }
  ];

  // Upload handler for CSV file
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  // Triggered when a user clicks the upload button
  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Parse the CSV file and convert to transactions
  const handleParseCSV = () => {
    if (!selectedFile) {
      toast({
        title: "No file selected",
        description: "Please select a CSV file to upload",
        variant: "destructive",
      });
      return;
    }

    if (!selectedAccount) {
      toast({
        title: "No account selected",
        description: "Please select an account first",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        if (event.target && typeof event.target.result === 'string') {
          const csvContent = event.target.result;
          const lines = csvContent.split('\n');
          
          // Skip header row and parse the rest
          const parsedTransactions: BankTransaction[] = [];
          
          for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line) {
              const columns = line.split(',');
              
              // Adjust this based on your CSV format - assuming Date, Description, Amount
              if (columns.length >= 3) {
                const date = columns[0];
                const description = columns[1];
                const amount = parseFloat(columns[2]);
                const chequeNo = columns.length > 3 ? columns[3] : '';
                
                parsedTransactions.push({
                  id: `temp-${i}`,
                  date,
                  description,
                  chequeNo: chequeNo || undefined,
                  payment: amount < 0 ? Math.abs(amount) : 0,
                  deposit: amount > 0 ? amount : 0,
                  status: 'unclassified'
                });
              }
            }
          }
          
          setTransactions(parsedTransactions);
          toast({
            title: "CSV Imported Successfully",
            description: `Imported ${parsedTransactions.length} transactions`,
          });
        }
      } catch (error) {
        toast({
          title: "Error parsing CSV",
          description: "The file format is invalid or corrupted",
          variant: "destructive",
        });
      }
    };
    
    reader.readAsText(selectedFile);
  };

  // Handle tile selection
  const handleAccountTileSelect = (account: BankAccountTile) => {
    setSelectedAccount(account);
    // Show example transactions to demonstrate format
    setTransactions(exampleTransactions);
  };

  // Handle account selection for a transaction
  const handleAccountSelect = (transactionId: string, accountId: string) => {
    setTransactions(prev => 
      prev.map(t => 
        t.id === transactionId 
          ? { ...t, accountId: parseInt(accountId), status: 'classified' } 
          : t
      )
    );
  };

  // Handle sales tax input for a transaction
  const handleSalesTaxChange = (transactionId: string, taxAmount: string) => {
    const taxValue = parseFloat(taxAmount);
    if (!isNaN(taxValue)) {
      setTransactions(prev => 
        prev.map(t => 
          t.id === transactionId 
            ? { ...t, salesTax: taxValue } 
            : t
        )
      );
    }
  };

  // Mutation to save classified transactions
  const { mutate: saveTransactions, isPending: isSaving } = useMutation({
    mutationFn: async (classifiedTransactions: BankTransaction[]) => {
      return await apiRequest(
        'POST',
        '/api/banking/classify', 
        { 
          transactions: classifiedTransactions,
          accountType: selectedAccount?.type,
          accountId: selectedAccount?.id
        }
      );
    },
    onSuccess: () => {
      toast({
        title: "Transactions Classified",
        description: "All transactions have been successfully classified",
      });
      
      // Clear the current transactions
      setTransactions([]);
      setSelectedFile(null);
      
      // Refresh relevant data
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ledger-entries'] });
    },
    onError: (error) => {
      toast({
        title: "Classification Failed",
        description: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      });
    }
  });

  // Handle saving all classified transactions
  const handleSaveTransactions = () => {
    const classifiedTransactions = transactions.filter(t => t.status === 'classified');
    
    if (classifiedTransactions.length === 0) {
      toast({
        title: "No Classified Transactions",
        description: "Please classify at least one transaction before saving",
        variant: "destructive",
      });
      return;
    }
    
    saveTransactions(classifiedTransactions);
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex flex-col space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Banking</h1>
        </div>
        
        {/* Account Tiles */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {bankAccounts.map((account) => (
            <Card 
              key={account.id}
              className={`cursor-pointer hover:border-primary transition-colors ${
                selectedAccount?.id === account.id ? 'border-primary border-2' : ''
              }`}
              onClick={() => handleAccountTileSelect(account)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{account.name}</CardTitle>
                  <div>{account.icon}</div>
                </div>
                <CardDescription>{account.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
        
        {selectedAccount && (
          <Card>
            <CardHeader>
              <CardTitle>Transactions - {selectedAccount.name}</CardTitle>
              <CardDescription>
                Import and classify transactions for {selectedAccount.name}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* File Upload Section */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".csv"
                  className="hidden"
                />
                <div className="flex flex-col items-center space-y-3">
                  <Upload className="h-10 w-10 text-gray-400" />
                  <h3 className="text-lg font-medium">
                    {selectedFile 
                      ? `Selected: ${selectedFile.name}` 
                      : "Drag and drop your CSV file, or click to browse"}
                  </h3>
                  <p className="text-sm text-gray-500">
                    Supported formats: CSV
                  </p>
                  <Button 
                    onClick={handleUploadClick} 
                    variant="outline"
                    className="mt-2"
                  >
                    <FileTextIcon className="mr-2 h-4 w-4" />
                    Browse Files
                  </Button>
                  {selectedFile && (
                    <Button 
                      onClick={handleParseCSV}
                      className="mt-2" 
                    >
                      <PlusCircleIcon className="mr-2 h-4 w-4" />
                      Import Transactions
                    </Button>
                  )}
                </div>
              </div>
              
              {/* Transaction Classification Table */}
              {transactions.length > 0 && (
                <div className="mt-6 space-y-4">
                  <h3 className="text-lg font-medium">Classify Transactions</h3>
                  <div className="border rounded-md overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Cheque No.</TableHead>
                          <TableHead>Bank Text</TableHead>
                          <TableHead>Payment</TableHead>
                          <TableHead>Deposit</TableHead>
                          <TableHead>Account</TableHead>
                          <TableHead>Sales Tax</TableHead>
                          <TableHead className="w-16">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transactions.map((transaction) => (
                          <TableRow key={transaction.id}>
                            <TableCell>{transaction.date}</TableCell>
                            <TableCell>{transaction.chequeNo || '-'}</TableCell>
                            <TableCell>{transaction.description}</TableCell>
                            <TableCell>
                              {transaction.payment > 0 ? `$${transaction.payment.toFixed(2)}` : '-'}
                            </TableCell>
                            <TableCell>
                              {transaction.deposit > 0 ? `$${transaction.deposit.toFixed(2)}` : '-'}
                            </TableCell>
                            <TableCell>
                              <Select 
                                onValueChange={(value) => handleAccountSelect(transaction.id, value)}
                                defaultValue={transaction.accountId?.toString()}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select an account" />
                                </SelectTrigger>
                                <SelectContent>
                                  {accountsLoading ? (
                                    <SelectItem value="loading" disabled>Loading accounts...</SelectItem>
                                  ) : accounts && accounts.length > 0 ? (
                                    accounts.map(account => (
                                      <SelectItem key={account.id} value={account.id.toString()}>
                                        {account.code} - {account.name}
                                      </SelectItem>
                                    ))
                                  ) : (
                                    <SelectItem value="none" disabled>No accounts found</SelectItem>
                                  )}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                placeholder="0.00"
                                value={transaction.salesTax?.toString() || ''}
                                onChange={(e) => handleSalesTaxChange(transaction.id, e.target.value)}
                                className="w-20"
                              />
                            </TableCell>
                            <TableCell>
                              {transaction.status === 'classified' ? (
                                <CheckCircleIcon className="h-5 w-5 text-green-500" />
                              ) : (
                                <XCircleIcon className="h-5 w-5 text-gray-300" />
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  
                  <div className="flex justify-end mt-4">
                    <Button 
                      onClick={handleSaveTransactions}
                      disabled={isSaving || transactions.every(t => t.status === 'unclassified')}
                    >
                      {isSaving ? 'Saving...' : 'Save Classifications'}
                    </Button>
                  </div>

                  <Alert>
                    <AlertTitle>Classification Guidelines</AlertTitle>
                    <AlertDescription>
                      <ul className="list-disc pl-5 space-y-1 mt-2">
                        <li>Assign each transaction to the correct account in the Chart of Accounts</li>
                        <li>Income and deposits should be assigned to appropriate revenue or asset accounts</li>
                        <li>Expenses should be assigned to the specific expense accounts</li>
                        <li>Enter sales tax amounts if applicable</li>
                        <li>Transactions will be automatically balanced against this bank account</li>
                      </ul>
                    </AlertDescription>
                  </Alert>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}