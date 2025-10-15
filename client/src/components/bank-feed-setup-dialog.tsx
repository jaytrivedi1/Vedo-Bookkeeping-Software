import { useState, useCallback } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { usePlaidLink } from 'react-plaid-link';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Building2, 
  Upload, 
  Link as LinkIcon, 
  CheckCircle2, 
  AlertCircle 
} from "lucide-react";
import CSVUploadWizard from "@/components/csv-upload-wizard";

interface BankFeedSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Account {
  id: number;
  name: string;
  code: string;
  type: string;
  balance: number;
}

type SetupStep = 'account' | 'method' | 'plaid' | 'csv' | 'complete';
type ConnectionMethod = 'plaid' | 'csv' | null;

export default function BankFeedSetupDialog({ open, onOpenChange }: BankFeedSetupDialogProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<SetupStep>('account');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [connectionMethod, setConnectionMethod] = useState<ConnectionMethod>(null);
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [showCSVUpload, setShowCSVUpload] = useState(false);

  // Fetch accounts eligible for bank feeds from Chart of Accounts
  const { data: accounts = [], isLoading: accountsLoading } = useQuery<Account[]>({
    queryKey: ['/api/accounts'],
    select: (data: Account[]) => {
      // Filter accounts that can have bank feeds:
      // Cash, Bank Accounts, Investment Accounts, Credit Cards, Line of Credit, Loans
      const eligibleTypes = [
        'current_assets',           // Cash and current investment accounts
        'bank',                     // Bank accounts
        'long_term_assets',         // Long-term investment accounts
        'credit_card',              // Credit card accounts
        'other_current_liabilities', // Line of credit and short-term loans
        'long_term_liabilities'     // Long-term loans
      ];
      return data.filter(acc => eligibleTypes.includes(acc.type));
    },
    enabled: open,
  });

  // Create Plaid link token mutation
  const createLinkTokenMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/plaid/link-token', 'POST', {
        accountId: parseInt(selectedAccountId)
      });
    },
    onSuccess: (data) => {
      setLinkToken(data.link_token);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to initialize bank connection",
        variant: "destructive",
      });
    },
  });

  // Exchange Plaid token mutation
  const exchangeTokenMutation = useMutation({
    mutationFn: async (public_token: string) => {
      return await apiRequest('/api/plaid/exchange-token', 'POST', { 
        public_token,
        accountId: parseInt(selectedAccountId)
      });
    },
    onSuccess: () => {
      setStep('complete');
      queryClient.invalidateQueries({ queryKey: ['/api/plaid/connections'] });
      queryClient.invalidateQueries({ queryKey: ['/api/plaid/accounts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
      
      toast({
        title: "Success",
        description: "Bank feed connected successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to connect bank account",
        variant: "destructive",
      });
      setStep('method');
    },
  });

  // Plaid Link configuration
  const onPlaidSuccess = useCallback((public_token: string) => {
    exchangeTokenMutation.mutate(public_token);
  }, [selectedAccountId]);

  const { open: openPlaid, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: onPlaidSuccess,
  });

  // Open Plaid Link when token is ready
  if (linkToken && ready && !exchangeTokenMutation.isPending && step === 'plaid') {
    openPlaid();
    setLinkToken(null);
  }

  const handleNext = () => {
    if (step === 'account' && selectedAccountId) {
      setStep('method');
    } else if (step === 'method' && connectionMethod === 'plaid') {
      setStep('plaid');
      createLinkTokenMutation.mutate();
    } else if (step === 'method' && connectionMethod === 'csv') {
      setStep('csv');
      setShowCSVUpload(true);
    }
  };

  const handleBack = () => {
    if (step === 'method') {
      setStep('account');
      setConnectionMethod(null);
    } else if (step === 'plaid' || step === 'csv') {
      setStep('method');
    }
  };

  const handleClose = () => {
    setStep('account');
    setSelectedAccountId('');
    setConnectionMethod(null);
    setLinkToken(null);
    setShowCSVUpload(false);
    onOpenChange(false);
  };

  const handleCSVComplete = () => {
    setShowCSVUpload(false);
    setStep('complete');
  };

  const getStepProgress = () => {
    const steps = ['account', 'method', 'plaid', 'complete'];
    const currentIndex = steps.indexOf(step);
    return ((currentIndex + 1) / steps.length) * 100;
  };

  const selectedAccount = accounts.find(acc => acc.id === parseInt(selectedAccountId));

  return (
    <>
      <Dialog open={open && !showCSVUpload} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Set Up Bank Feed</DialogTitle>
            <DialogDescription>
              Connect your bank account to automatically import transactions
            </DialogDescription>
          </DialogHeader>

          <Progress value={getStepProgress()} className="mb-4" />

          {/* Step 1: Select Chart of Accounts Account */}
          {step === 'account' && (
            <div className="space-y-4">
              <Alert>
                <Building2 className="h-4 w-4" />
                <AlertTitle>Select Bank Account</AlertTitle>
                <AlertDescription>
                  Choose which account from your Chart of Accounts you want to connect
                </AlertDescription>
              </Alert>

              <div>
                <Label htmlFor="gl-account">Chart of Accounts Account</Label>
                <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                  <SelectTrigger id="gl-account" data-testid="select-gl-account" className="mt-2">
                    <SelectValue placeholder="Select an account..." />
                  </SelectTrigger>
                  <SelectContent>
                    {accountsLoading ? (
                      <SelectItem value="loading" disabled>Loading accounts...</SelectItem>
                    ) : accounts.length === 0 ? (
                      <SelectItem value="none" disabled>No eligible accounts found</SelectItem>
                    ) : (
                      accounts.map((account) => (
                        <SelectItem key={account.id} value={account.id.toString()}>
                          {account.code} - {account.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-2">
                  Eligible: Cash, Bank, Investment, Credit Card, Line of Credit, and Loan accounts
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Choose Connection Method */}
          {step === 'method' && (
            <div className="space-y-4">
              {selectedAccount && (
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertTitle>Selected Account</AlertTitle>
                  <AlertDescription>
                    {selectedAccount.code} - {selectedAccount.name}
                  </AlertDescription>
                </Alert>
              )}

              <div>
                <Label className="mb-3 block">Choose Connection Method</Label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setConnectionMethod('plaid')}
                    className={`p-6 border-2 rounded-lg transition-all hover:border-primary ${
                      connectionMethod === 'plaid' ? 'border-primary bg-primary/5' : 'border-gray-200'
                    }`}
                    data-testid="button-method-plaid"
                  >
                    <LinkIcon className="h-8 w-8 mx-auto mb-3 text-primary" />
                    <h3 className="font-semibold mb-2">Connect Bank</h3>
                    <p className="text-sm text-gray-600">
                      Securely connect via Plaid for automatic transaction sync
                    </p>
                  </button>

                  <button
                    onClick={() => setConnectionMethod('csv')}
                    className={`p-6 border-2 rounded-lg transition-all hover:border-primary ${
                      connectionMethod === 'csv' ? 'border-primary bg-primary/5' : 'border-gray-200'
                    }`}
                    data-testid="button-method-csv"
                  >
                    <Upload className="h-8 w-8 mx-auto mb-3 text-primary" />
                    <h3 className="font-semibold mb-2">Upload CSV</h3>
                    <p className="text-sm text-gray-600">
                      Manually upload bank statements in CSV format
                    </p>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Plaid Connection in Progress */}
          {step === 'plaid' && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
              <h3 className="text-lg font-semibold mb-2">Connecting to Bank...</h3>
              <p className="text-gray-600">
                Please complete the authentication in the Plaid window
              </p>
            </div>
          )}

          {/* Step 4: Complete */}
          {step === 'complete' && (
            <div className="text-center py-8">
              <CheckCircle2 className="mx-auto h-16 w-16 text-green-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Bank Feed Connected!</h3>
              <p className="text-gray-600">
                {selectedAccount?.name} is now connected and ready to sync transactions
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between pt-4 border-t">
            <Button
              variant="outline"
              onClick={step === 'complete' ? handleClose : handleBack}
              disabled={
                step === 'account' || 
                step === 'plaid' || 
                createLinkTokenMutation.isPending || 
                exchangeTokenMutation.isPending
              }
              data-testid="button-back"
            >
              {step === 'complete' ? 'Close' : 'Back'}
            </Button>

            {step !== 'complete' && step !== 'plaid' && step !== 'csv' && (
              <Button
                onClick={handleNext}
                disabled={
                  (step === 'account' && !selectedAccountId) ||
                  (step === 'method' && !connectionMethod) ||
                  createLinkTokenMutation.isPending
                }
                data-testid="button-next"
              >
                {createLinkTokenMutation.isPending ? 'Loading...' : 'Next'}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* CSV Upload Wizard - shown when CSV method is selected */}
      {showCSVUpload && (
        <CSVUploadWizard
          open={showCSVUpload}
          onOpenChange={(open: boolean) => {
            setShowCSVUpload(open);
            if (!open) {
              setStep('method');
            }
          }}
          preSelectedAccountId={parseInt(selectedAccountId)}
          onComplete={handleCSVComplete}
        />
      )}
    </>
  );
}
