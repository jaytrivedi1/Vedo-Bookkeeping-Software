import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Account } from "@shared/schema";

interface AccountBalanceItem {
  account: Account;
  balance: number;
}

export default function AccountBalances() {
  const { data: accountBalances, isLoading } = useQuery<AccountBalanceItem[]>({
    queryKey: ['/api/reports/account-balances'],
  });
  
  // Filter for main bank accounts
  const bankAccounts = accountBalances?.filter(
    item => item.account.type === 'asset' && 
    (item.account.name.includes('Bank') || item.account.name.includes('Cash'))
  ) || [];

  // Calculate total balance
  const totalBalance = bankAccounts.reduce((sum, item) => sum + item.balance, 0);

  const formatAccountNumber = (accountCode: string) => {
    return '**** ' + accountCode.slice(-4);
  };

  if (isLoading) {
    return (
      <div className="bg-white shadow-sm rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Account Balances</h3>
        </div>
        <div className="space-y-4">
          <div className="animate-pulse">
            <div className="h-5 bg-gray-200 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded w-1/4 mt-1"></div>
            <div className="h-5 bg-gray-200 rounded w-1/4 mt-2 ml-auto"></div>
          </div>
          <div className="animate-pulse">
            <div className="h-5 bg-gray-200 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded w-1/4 mt-1"></div>
            <div className="h-5 bg-gray-200 rounded w-1/4 mt-2 ml-auto"></div>
          </div>
          <div className="animate-pulse">
            <div className="h-5 bg-gray-200 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded w-1/4 mt-1"></div>
            <div className="h-5 bg-gray-200 rounded w-1/4 mt-2 ml-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-sm rounded-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-900">Account Balances</h3>
        <Link href="/chart-of-accounts" className="text-sm text-primary hover:text-primary/90">
          View All
        </Link>
      </div>
      
      {bankAccounts.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-gray-500">No bank accounts found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {bankAccounts.map((item) => (
            <div key={item.account.id} className="flex justify-between items-center pb-3 border-b border-gray-200">
              <div>
                <p className="text-sm font-medium text-gray-900">{item.account.name}</p>
                <p className="text-xs text-gray-500">{formatAccountNumber(item.account.code)}</p>
              </div>
              <span className="text-base font-medium text-gray-900">
                {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(item.balance)}
              </span>
            </div>
          ))}
          
          <div className="mt-5 pt-4 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-500">Total</span>
              <span className="text-base font-semibold text-gray-900">
                {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(totalBalance)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
