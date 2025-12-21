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
  Wallet,
  Clock,
  Plus,
  DollarSign
} from "lucide-react";
import ContactEditForm from "@/components/forms/ContactEditForm";
import TransactionList from "@/components/shared/TransactionList";
import NotesCard from "@/components/shared/NotesCard";
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

  // Open invoices (balance > 0)
  const openInvoices = customerInvoices.filter(inv =>
    (inv.balance !== null && inv.balance !== undefined && inv.balance > 0) ||
    (inv.status === 'open' || inv.status === 'draft')
  );

  const outstandingBalance = openInvoices.reduce((sum, invoice) => {
    const balance = (invoice.balance !== null && invoice.balance !== undefined)
      ? invoice.balance
      : invoice.amount;
    return sum + balance;
  }, 0);

  // Overdue invoices calculation
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const overdueInvoices = openInvoices.filter(inv => {
    if (inv.status === 'overdue') return true;
    if (inv.dueDate) {
      const dueDate = new Date(inv.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate < today && (inv.balance === undefined || inv.balance === null || inv.balance > 0);
    }
    return false;
  });

  const overdueAmount = overdueInvoices.reduce((sum, inv) => {
    const balance = (inv.balance !== null && inv.balance !== undefined)
      ? inv.balance
      : inv.amount;
    return sum + balance;
  }, 0);

  const overdueCount = overdueInvoices.length;

  // Calculate oldest overdue days
  const oldestOverdueDays = overdueInvoices.length > 0
    ? Math.max(...overdueInvoices.map(inv => {
        if (!inv.dueDate) return 0;
        const dueDate = new Date(inv.dueDate);
        return Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      }))
    : 0;

  const totalPaid = customerInvoices.reduce((sum, invoice) => {
    const paid = invoice.amount - ((invoice.balance !== null && invoice.balance !== undefined) ? invoice.balance : invoice.amount);
    return sum + paid;
  }, 0);

  const openInvoiceCount = openInvoices.length;

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

  const handleReceivePayment = () => {
    navigate(`/payment-receive?customerId=${customerId}`);
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

        {/* Contact Info, Address, and Notes Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
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

          {/* Internal Notes */}
          <NotesCard
            contactId={customerId}
            initialNotes={customer.notes}
            contactType="customer"
          />
        </div>

        {/* Account Summary Banner */}
        <Card className="border-0 shadow-sm rounded-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-slate-50 to-slate-100 border border-slate-200">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_auto] divide-y lg:divide-y-0 lg:divide-x divide-slate-200">

              {/* Balance Due Section */}
              <div className="relative p-6 overflow-hidden">
                {/* Background Icon */}
                <Wallet className="absolute -right-4 -bottom-4 h-32 w-32 text-slate-200 opacity-50" />

                <div className="relative">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Balance Due
                  </p>
                  <p className="text-3xl font-black text-slate-800 mb-2">
                    {formatCurrency(outstandingBalance, homeCurrency, homeCurrency)}
                  </p>
                  <p className="text-sm text-slate-500">
                    {openInvoiceCount > 0
                      ? `Across ${openInvoiceCount} open invoice${openInvoiceCount !== 1 ? 's' : ''}`
                      : 'No outstanding invoices'
                    }
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Lifetime paid: {formatCurrency(totalPaid, homeCurrency, homeCurrency)}
                  </p>
                </div>
              </div>

              {/* Overdue Section */}
              <div className={`relative p-6 overflow-hidden ${overdueAmount > 0 ? 'bg-red-50/50' : ''}`}>
                {/* Background Icon */}
                <Clock className={`absolute -right-4 -bottom-4 h-32 w-32 opacity-50 ${
                  overdueAmount > 0 ? 'text-red-200' : 'text-slate-200'
                }`} />

                <div className="relative">
                  <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${
                    overdueAmount > 0 ? 'text-red-500' : 'text-slate-400'
                  }`}>
                    Overdue
                  </p>
                  <p className={`text-3xl font-black mb-2 ${
                    overdueAmount > 0 ? 'text-red-600' : 'text-slate-400'
                  }`}>
                    {formatCurrency(overdueAmount, homeCurrency, homeCurrency)}
                  </p>
                  {overdueAmount > 0 ? (
                    <>
                      <p className="text-sm text-red-600">
                        {overdueCount} invoice{overdueCount !== 1 ? 's' : ''} past due
                      </p>
                      <p className="text-xs text-red-500 mt-1">
                        Oldest: {oldestOverdueDays} day{oldestOverdueDays !== 1 ? 's' : ''} overdue
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-slate-500">
                        No overdue invoices
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        All payments on track
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Actions Section */}
              <div className="p-6 flex flex-col justify-center gap-3 min-w-[180px]">
                <Button
                  onClick={handleReceivePayment}
                  className="bg-emerald-600 hover:bg-emerald-700 w-full"
                  disabled={outstandingBalance <= 0}
                >
                  <DollarSign className="h-4 w-4 mr-2" />
                  Receive Payment
                </Button>
                <Button
                  onClick={handleCreateInvoice}
                  variant="outline"
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Invoice
                </Button>
              </div>
            </div>
          </div>
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
