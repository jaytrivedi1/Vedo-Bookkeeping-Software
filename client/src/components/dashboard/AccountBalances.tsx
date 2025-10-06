import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Account } from "@shared/schema";
import ExportMenu from "@/components/ExportMenu";
import { 
  exportAccountBalancesToCSV, 
  exportAccountBalancesToPDF,
  generateFilename 
} from "@/lib/exportUtils";

interface AccountBalanceItem {
  account: Account;
  balance: number;
}

export default function AccountBalances() {
  const { data: accountBalances, isLoading } = useQuery<AccountBalanceItem[]>({
    queryKey: ['/api/reports/account-balances'],
  });
  
  const bankAccounts = accountBalances?.filter(
    item => item.account.type === 'asset' && 
    (item.account.name.includes('Bank') || item.account.name.includes('Cash'))
  ) || [];

  const totalBalance = bankAccounts.reduce((sum, item) => sum + item.balance, 0);

  const formatAccountNumber = (accountCode: string) => {
    return '**** ' + accountCode.slice(-4);
  };

  if (isLoading) {
    return (
      <div className="glass-card rounded-xl p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-foreground">Account Balances</h3>
        </div>
        <div className="space-y-4">
          <div className="animate-pulse">
            <div className="h-5 bg-muted rounded w-1/3"></div>
            <div className="h-4 bg-muted/50 rounded w-1/4 mt-1"></div>
            <div className="h-5 bg-muted rounded w-1/4 mt-2 ml-auto"></div>
          </div>
          <div className="animate-pulse">
            <div className="h-5 bg-muted rounded w-1/3"></div>
            <div className="h-4 bg-muted/50 rounded w-1/4 mt-1"></div>
            <div className="h-5 bg-muted rounded w-1/4 mt-2 ml-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  const handleExportCSV = () => {
    if (!accountBalances || accountBalances.length === 0) return;
    
    const filename = generateFilename('account_balances', undefined);
    exportAccountBalancesToCSV(accountBalances, `${filename}.csv`);
  };
  
  const handleExportPDF = () => {
    if (!accountBalances || accountBalances.length === 0) return;
    
    const filename = generateFilename('account_balances', undefined);
    exportAccountBalancesToPDF(accountBalances, `${filename}.pdf`);
  };

  return (
    <div className="glass-card rounded-xl p-6 smooth-transition hover:border-primary/30 hover-lift" data-testid="card-account-balances">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-foreground">Account Balances</h3>
        <div className="flex items-center gap-2">
          {accountBalances && accountBalances.length > 0 && (
            <ExportMenu
              onExportCSV={handleExportCSV}
              onExportPDF={handleExportPDF}
              label="Export"
            />
          )}
          <Link href="/chart-of-accounts">
            <span className="text-sm text-primary hover:text-accent smooth-transition font-medium cursor-pointer" data-testid="link-view-all-accounts">
              View All
            </span>
          </Link>
        </div>
      </div>
      
      {bankAccounts.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-muted-foreground">No bank accounts found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {bankAccounts.map((item) => (
            <div 
              key={item.account.id} 
              className="flex justify-between items-center pb-3 border-b border-border/50 smooth-transition hover:border-primary/30 group"
              data-testid={`account-balance-${item.account.id}`}
            >
              <div>
                <p className="text-sm font-semibold text-foreground group-hover:text-primary smooth-transition">{item.account.name}</p>
                <p className="text-xs text-muted-foreground">{formatAccountNumber(item.account.code)}</p>
              </div>
              <span className="text-base font-bold text-foreground">
                {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(item.balance)}
              </span>
            </div>
          ))}
          
          <div className="mt-6 pt-4 border-t border-primary/20">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-muted-foreground">Total</span>
              <span className="text-lg font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent" data-testid="text-total-balance">
                {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(totalBalance)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
