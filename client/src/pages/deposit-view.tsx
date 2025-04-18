import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { z } from "zod";
import { 
  ArrowLeft, Edit, Save, X, PlusCircle, Trash2, Receipt, DollarSign
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import DepositForm from "@/components/forms/DepositForm";
import { Account, Contact, SalesTax, Transaction } from "@shared/schema";

// Transaction response type
interface DepositResponse {
  transaction: Transaction;
  ledgerEntries: any[];
}

export default function DepositView() {
  const [, navigate] = useLocation();
  const params = useParams();
  const depositId = params.id;
  const [isEditing, setIsEditing] = useState(false);
  const queryClient = useQueryClient();
  
  // Toast notifications
  const { toast } = useToast();
  
  // Fetch deposit data
  const { data, isLoading, error } = useQuery<DepositResponse>({
    queryKey: ['/api/transactions', depositId],
    queryFn: async () => {
      const response = await apiRequest(`/api/transactions/${depositId}`, 'GET');
      return response;
    },
  });
  
  // Fetch related data
  const { data: contacts } = useQuery<Contact[]>({ queryKey: ['/api/contacts'] });
  const { data: accounts } = useQuery<Account[]>({ queryKey: ['/api/accounts'] });
  const { data: salesTaxes } = useQuery<SalesTax[]>({ queryKey: ['/api/sales-taxes'] });
  
  // Delete deposit mutation
  const deleteDepositMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/transactions/${depositId}`, 'DELETE');
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Deposit has been deleted successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ledger-entries'] });
      navigate('/dashboard');
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to delete deposit: ${error}`,
        variant: 'destructive',
      });
    },
  });

  // Handle delete confirmation
  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this deposit? This action cannot be undone.')) {
      deleteDepositMutation.mutate();
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"/>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-destructive">
        <p className="text-lg">Error loading deposit: {String(error)}</p>
        <Button className="mt-4" onClick={() => navigate("/dashboard")}>
          Back to Dashboard
        </Button>
      </div>
    );
  }

  // If the transaction is not a deposit, redirect to dashboard
  if (data?.transaction?.type !== 'deposit') {
    navigate("/dashboard");
    return null;
  }

  // Get relevant data for the UI
  const deposit = data.transaction;
  const contact = deposit.contactId ? contacts?.find(c => c.id === deposit.contactId) : undefined;
  const sourceAccount = data.ledgerEntries?.find(entry => entry.credit > 0)?.accountId;
  const destinationAccount = data.ledgerEntries?.find(entry => entry.debit > 0)?.accountId;
  
  // When editing is toggled on, show the deposit form
  if (isEditing) {
    return (
      <div className="py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setIsEditing(false)}
                className="mr-4"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <h1 className="text-2xl font-semibold text-gray-900">Edit Deposit</h1>
            </div>
          </div>
          
          {/* Use the existing DepositForm component with the deposit data */}
          <DepositForm 
            initialData={deposit} 
            ledgerEntries={data.ledgerEntries} 
            isEditing={true}
            onSuccess={() => {
              setIsEditing(false);
              // Reload the data
              queryClient.invalidateQueries({ queryKey: ['/api/transactions', depositId] });
            }}
          />
        </div>
      </div>
    );
  }

  // Get human-readable deposit account and source account
  const depositAccount = accounts?.find(a => a.id === destinationAccount);
  const sourceAccountData = accounts?.find(a => a.id === sourceAccount);

  return (
    <div className="py-6">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => window.history.back()}
              className="mr-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-2xl font-semibold text-gray-900">Deposit Details</h1>
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              className="mr-2"
              onClick={() => setIsEditing(true)}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteDepositMutation.isPending}
            >
              {deleteDepositMutation.isPending ? (
                <>
                  <span className="animate-spin mr-2">⟳</span> 
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          {/* Basic Information */}
          <Card className="shadow-sm">
            <CardHeader className="bg-muted/50 pb-3">
              <CardTitle className="text-xl font-bold flex items-center">
                <DollarSign className="h-6 w-6 mr-2 text-primary" />
                <span>Deposit {deposit.reference || `#${deposit.id}`}</span>
              </CardTitle>
              <CardDescription>
                {deposit.description || 'Funds deposited into your account'}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Deposit Account</h3>
                  <p className="text-base">
                    {depositAccount ? `${depositAccount.name} ${depositAccount.code ? `(${depositAccount.code})` : ''}` : 'Unknown Account'}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Reference #</h3>
                  <p className="text-base">{deposit.reference || `DEP-${deposit.id}`}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Date</h3>
                  <p className="text-base">{format(new Date(deposit.date), 'MMMM dd, yyyy')}</p>
                </div>
              </div>

              {/* Additional Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Source Account</h3>
                  <p className="text-base">
                    {sourceAccountData ? `${sourceAccountData.name} ${sourceAccountData.code ? `(${sourceAccountData.code})` : ''}` : 'Unknown Account'}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Amount</h3>
                  <p className="text-base font-semibold">{new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD'
                  }).format(deposit.amount)}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Status</h3>
                  <p className="text-base capitalize">{deposit.status}</p>
                </div>
              </div>

              {/* Contact Information (if exists) */}
              {contact && (
                <div className="mt-6 border-t pt-6">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Associated Contact</h3>
                  <p className="text-base">{contact.name}</p>
                  {contact.email && (
                    <p className="text-sm text-gray-500">{contact.email}</p>
                  )}
                </div>
              )}

              {/* Memo (if exists) */}
              {deposit.description && (
                <div className="mt-6 border-t pt-6">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Notes</h3>
                  <p className="text-base">{deposit.description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Ledger Entries */}
          <Card className="shadow-sm">
            <CardHeader className="bg-muted/50 pb-3">
              <CardTitle className="text-lg">Ledger Entries</CardTitle>
              <CardDescription>
                Double-entry accounting records for this deposit
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-muted/50 border-t border-b">
                      <th className="px-4 py-3 text-left">Account</th>
                      <th className="px-4 py-3 text-left">Description</th>
                      <th className="px-4 py-3 text-right">Debit</th>
                      <th className="px-4 py-3 text-right">Credit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.ledgerEntries?.map((entry) => {
                      const entryAccount = accounts?.find(a => a.id === entry.accountId);
                      return (
                        <tr key={entry.id} className="border-b">
                          <td className="px-4 py-3">
                            {entryAccount 
                              ? `${entryAccount.name} ${entryAccount.code ? `(${entryAccount.code})` : ''}`
                              : `Account #${entry.accountId}`
                            }
                          </td>
                          <td className="px-4 py-3">{entry.description}</td>
                          <td className="px-4 py-3 text-right">
                            {entry.debit 
                              ? new Intl.NumberFormat('en-US', { 
                                  style: 'currency', 
                                  currency: 'USD' 
                                }).format(entry.debit)
                              : '-'
                            }
                          </td>
                          <td className="px-4 py-3 text-right">
                            {entry.credit
                              ? new Intl.NumberFormat('en-US', { 
                                  style: 'currency', 
                                  currency: 'USD' 
                                }).format(entry.credit)
                              : '-'
                            }
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-muted/30">
                      <td colSpan={2} className="px-4 py-3 text-right font-semibold">Total</td>
                      <td className="px-4 py-3 text-right font-semibold">
                        {new Intl.NumberFormat('en-US', { 
                          style: 'currency', 
                          currency: 'USD' 
                        }).format(
                          data.ledgerEntries?.reduce((sum, entry) => sum + (entry.debit || 0), 0) || 0
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">
                        {new Intl.NumberFormat('en-US', { 
                          style: 'currency', 
                          currency: 'USD' 
                        }).format(
                          data.ledgerEntries?.reduce((sum, entry) => sum + (entry.credit || 0), 0) || 0
                        )}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}