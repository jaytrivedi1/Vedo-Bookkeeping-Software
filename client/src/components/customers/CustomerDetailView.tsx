import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Contact, Transaction } from "@shared/schema";
import {
  Edit,
  Trash2,
  AlertTriangle,
  Mail,
  Phone,
  MapPin,
  User,
  FileText,
  DollarSign,
  CreditCard
} from "lucide-react";
import ContactEditForm from "@/components/forms/ContactEditForm";
import TransactionList from "@/components/shared/TransactionList";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatContactName } from "@/lib/currencyUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface CustomerDetailViewProps {
  customerId: number;
  homeCurrency: string;
}

export default function CustomerDetailView({ customerId, homeCurrency }: CustomerDetailViewProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch customer
  const { data: contacts } = useQuery<Contact[]>({
    queryKey: ['/api/contacts'],
  });

  // Fetch transactions
  const { data: transactions } = useQuery<Transaction[]>({
    queryKey: ['/api/transactions'],
  });

  const customer = contacts?.find(c => c.id === customerId);

  // Calculate customer stats
  const customerTransactions = transactions?.filter(t => t.contactId === customerId) || [];
  const customerInvoices = customerTransactions.filter(t => t.type === 'invoice');

  const outstandingBalance = customerInvoices.reduce((sum, invoice) => {
    const balance = (invoice.balance !== null && invoice.balance !== undefined)
      ? invoice.balance
      : invoice.amount;
    return sum + balance;
  }, 0);

  const totalPaid = customerInvoices.reduce((sum, invoice) => {
    const paid = invoice.amount - ((invoice.balance !== null && invoice.balance !== undefined) ? invoice.balance : invoice.amount);
    return sum + paid;
  }, 0);

  const totalInvoices = customerInvoices.length;

  // Unapplied credits
  const unappliedCredits = customerTransactions
    .filter(t => t.type === 'deposit' && t.status === 'unapplied_credit')
    .reduce((sum, credit) => {
      const creditAmount = (credit.balance !== null && credit.balance !== undefined)
        ? Math.abs(credit.balance)
        : Math.abs(credit.amount);
      return sum + creditAmount;
    }, 0);

  // Delete customer mutation
  const deleteCustomerMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/contacts/${id}`, 'DELETE');
    },
    onSuccess: () => {
      toast({
        title: "Customer deleted",
        description: "Customer has been successfully deleted",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
      navigate('/customers');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete customer",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  });

  const handleDeleteCustomer = () => {
    if (!customer) return;

    // Check if customer has outstanding transactions
    if (customerTransactions.length > 0) {
      toast({
        title: "Cannot delete customer",
        description: "This customer has associated transactions. Delete all transactions first.",
        variant: "destructive",
      });
      setIsDeleteDialogOpen(false);
      return;
    }

    setIsDeleting(true);
    deleteCustomerMutation.mutate(customer.id);
  };

  const handleCreateInvoice = () => {
    navigate(`/invoices/new?customerId=${customerId}`);
  };

  if (!customer) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-slate-500">
          <User className="mx-auto h-12 w-12 text-slate-300 mb-3" />
          <p>Select a customer to view details</p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6">
        {/* Header Card */}
        <Card className="border-0 shadow-sm rounded-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">
                    {customer.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">
                    {formatContactName(customer.name, customer.currency, homeCurrency)}
                  </h1>
                  {customer.contactName && (
                    <p className="text-emerald-100 text-sm mt-0.5">{customer.contactName}</p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="bg-white/20 text-white hover:bg-white/30 border-0"
                  onClick={() => setIsEditDialogOpen(true)}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="bg-white/20 text-white hover:bg-red-500/80 border-0"
                  onClick={() => setIsDeleteDialogOpen(true)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Contact Info and Address Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Contact Info */}
          <Card className="border-0 shadow-sm rounded-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {customer.email && (
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
                    <Mail className="h-4 w-4 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Email</p>
                    <a
                      href={`mailto:${customer.email}`}
                      className="text-sm text-emerald-600 hover:underline"
                    >
                      {customer.email}
                    </a>
                  </div>
                </div>
              )}

              {customer.phone && (
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
                    <Phone className="h-4 w-4 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Phone</p>
                    <a
                      href={`tel:${customer.phone}`}
                      className="text-sm text-slate-700 hover:text-emerald-600"
                    >
                      {customer.phone}
                    </a>
                  </div>
                </div>
              )}

              {!customer.email && !customer.phone && (
                <p className="text-sm text-slate-400 italic">No contact information</p>
              )}
            </CardContent>
          </Card>

          {/* Billing Address */}
          <Card className="border-0 shadow-sm rounded-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
                Billing Address
              </CardTitle>
            </CardHeader>
            <CardContent>
              {customer.address ? (
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <MapPin className="h-4 w-4 text-slate-500" />
                  </div>
                  <p className="text-sm text-slate-700 whitespace-pre-line">
                    {customer.address}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-slate-400 italic">No address on file</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Account Summary */}
        <Card className="border-0 shadow-sm rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
              Account Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Outstanding Balance */}
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                    <DollarSign className="h-4 w-4 text-amber-600" />
                  </div>
                  <span className="text-xs text-slate-500">Balance Due</span>
                </div>
                <p className={`text-xl font-bold ${outstandingBalance > 0 ? 'text-amber-600' : 'text-slate-800'}`}>
                  {formatCurrency(outstandingBalance, homeCurrency, homeCurrency)}
                </p>
              </div>

              {/* Total Paid */}
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <DollarSign className="h-4 w-4 text-emerald-600" />
                  </div>
                  <span className="text-xs text-slate-500">Total Paid</span>
                </div>
                <p className="text-xl font-bold text-emerald-600">
                  {formatCurrency(totalPaid, homeCurrency, homeCurrency)}
                </p>
              </div>

              {/* Unapplied Credits */}
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                    <CreditCard className="h-4 w-4 text-blue-600" />
                  </div>
                  <span className="text-xs text-slate-500">Credits</span>
                </div>
                <p className="text-xl font-bold text-blue-600">
                  {formatCurrency(unappliedCredits, homeCurrency, homeCurrency)}
                </p>
              </div>

              {/* Total Invoices */}
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center">
                    <FileText className="h-4 w-4 text-slate-600" />
                  </div>
                  <span className="text-xs text-slate-500">Invoices</span>
                </div>
                <p className="text-xl font-bold text-slate-800">
                  {totalInvoices}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transaction History */}
        <TransactionList
          contactId={customerId}
          contactType="customer"
          homeCurrency={homeCurrency}
          onCreateNew={handleCreateInvoice}
          maxHeight="500px"
        />
      </div>

      {/* Edit Customer Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl">Edit Customer</DialogTitle>
            <DialogDescription>
              Update customer information below.
            </DialogDescription>
          </DialogHeader>

          <ContactEditForm
            contact={customer}
            onSuccess={() => {
              setIsEditDialogOpen(false);
              queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
            }}
            onCancel={() => setIsEditDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Customer Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center text-red-600">
              <AlertTriangle className="h-5 w-5 mr-2" /> Delete Customer
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {customer.name}? This action cannot be undone.
              {customerTransactions.length > 0 && (
                <p className="mt-2 text-red-500 font-medium">
                  This customer has {customerTransactions.length} associated transaction(s).
                  Please delete all transactions first.
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDeleteCustomer();
              }}
              disabled={isDeleting || customerTransactions.length > 0}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? (
                <>
                  <div className="animate-spin mr-2 h-4 w-4 border-2 border-b-transparent rounded-full"></div>
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ScrollArea>
  );
}
