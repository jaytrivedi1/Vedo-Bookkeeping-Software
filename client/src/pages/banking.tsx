import { useState, useRef, ChangeEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import MainLayout from "@/components/layout/MainLayout";

interface BankTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'credit' | 'debit';
  status: 'unclassified' | 'classified';
  accountId?: number;
  transactionId?: number;
}

interface AccountOption {
  id: number;
  name: string;
  code: string;
  type: string;
}

export default function Banking() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState("bank");
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Fetch accounts for the dropdown selection
  const { data: accounts, isLoading: accountsLoading } = useQuery<AccountOption[]>({
    queryKey: ['/api/accounts'],
  });

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
              
              // Adjust this based on your CSV format
              if (columns.length >= 3) {
                const date = columns[0];
                const description = columns[1];
                const amount = parseFloat(columns[2]);
                
                parsedTransactions.push({
                  id: `temp-${i}`,
                  date,
                  description,
                  amount: Math.abs(amount),
                  type: amount < 0 ? 'debit' : 'credit',
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

  // Mutation to save classified transactions
  const { mutate: saveTransactions, isPending: isSaving } = useMutation({
    mutationFn: async (classifiedTransactions: BankTransaction[]) => {
      return await apiRequest('/api/banking/classify', {
        method: 'POST',
        body: JSON.stringify({ transactions: classifiedTransactions }),
      });
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
    <MainLayout>
      <div className="container mx-auto py-6">
        <div className="flex flex-col space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold">Banking</h1>
          </div>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid grid-cols-3 w-[400px]">
              <TabsTrigger value="bank">
                <BuildingIcon className="w-4 h-4 mr-2" />
                Bank Accounts
              </TabsTrigger>
              <TabsTrigger value="credit-card">
                <CreditCardIcon className="w-4 h-4 mr-2" />
                Credit Cards
              </TabsTrigger>
              <TabsTrigger value="line-of-credit">
                <PercentIcon className="w-4 h-4 mr-2" />
                Lines of Credit
              </TabsTrigger>
            </TabsList>
            
            {/* Bank Account Tab */}
            <TabsContent value="bank" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Import Bank Transactions</CardTitle>
                  <CardDescription>
                    Upload CSV files from your bank to import transactions
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
                              <TableHead>Description</TableHead>
                              <TableHead>Amount</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Account Classification</TableHead>
                              <TableHead className="w-16">Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {transactions.map((transaction) => (
                              <TableRow key={transaction.id}>
                                <TableCell>{transaction.date}</TableCell>
                                <TableCell>{transaction.description}</TableCell>
                                <TableCell>${transaction.amount.toFixed(2)}</TableCell>
                                <TableCell>
                                  <span className={transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'}>
                                    {transaction.type === 'credit' ? 'Credit' : 'Debit'}
                                  </span>
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
                            <li>Transfers between accounts should be properly classified</li>
                          </ul>
                        </AlertDescription>
                      </Alert>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Credit Card Tab */}
            <TabsContent value="credit-card" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Import Credit Card Transactions</CardTitle>
                  <CardDescription>
                    Upload CSV files from your credit card provider to import transactions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <div className="flex flex-col items-center space-y-3">
                      <CreditCardIcon className="h-10 w-10 text-gray-400" />
                      <h3 className="text-lg font-medium">
                        Credit Card CSV Import
                      </h3>
                      <p className="text-sm text-gray-500">
                        Coming soon: Import your credit card statements directly from CSV files
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Line of Credit Tab */}
            <TabsContent value="line-of-credit" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Import Line of Credit Transactions</CardTitle>
                  <CardDescription>
                    Upload CSV files from your line of credit provider to import transactions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <div className="flex flex-col items-center space-y-3">
                      <PercentIcon className="h-10 w-10 text-gray-400" />
                      <h3 className="text-lg font-medium">
                        Line of Credit CSV Import
                      </h3>
                      <p className="text-sm text-gray-500">
                        Coming soon: Import your line of credit statements directly from CSV files
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </MainLayout>
  );
}