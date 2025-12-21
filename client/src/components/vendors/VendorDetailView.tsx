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
  Building2,
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

interface VendorDetailViewProps {
  vendorId: number;
  homeCurrency: string;
}

export default function VendorDetailView({ vendorId, homeCurrency }: VendorDetailViewProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch vendor
  const { data: contacts } = useQuery<Contact[]>({
    queryKey: ['/api/contacts'],
  });

  // Fetch transactions
  const { data: transactions } = useQuery<Transaction[]>({
    queryKey: ['/api/transactions'],
  });

  const vendor = contacts?.find(c => c.id === vendorId);

  // Calculate vendor stats
  const vendorTransactions = transactions?.filter(t => t.contactId === vendorId) || [];
  const vendorBills = vendorTransactions.filter(t => t.type === 'bill');

  // Open bills (balance > 0)
  const openBills = vendorBills.filter(bill =>
    (bill.balance !== null && bill.balance !== undefined && bill.balance > 0) ||
    (bill.status === 'open' || bill.status === 'draft')
  );

  const outstandingBalance = openBills.reduce((sum, bill) => {
    const balance = (bill.balance !== null && bill.balance !== undefined)
      ? bill.balance
      : bill.amount;
    return sum + balance;
  }, 0);

  // Overdue bills calculation
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const overdueBills = openBills.filter(bill => {
    if (bill.status === 'overdue') return true;
    if (bill.dueDate) {
      const dueDate = new Date(bill.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate < today && (bill.balance === undefined || bill.balance === null || bill.balance > 0);
    }
    return false;
  });

  const overdueAmount = overdueBills.reduce((sum, bill) => {
    const balance = (bill.balance !== null && bill.balance !== undefined)
      ? bill.balance
      : bill.amount;
    return sum + balance;
  }, 0);

  const overdueCount = overdueBills.length;

  // Calculate oldest overdue days
  const oldestOverdueDays = overdueBills.length > 0
    ? Math.max(...overdueBills.map(bill => {
        if (!bill.dueDate) return 0;
        const dueDate = new Date(bill.dueDate);
        return Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      }))
    : 0;

  const totalPaid = vendorBills.reduce((sum, bill) => {
    const paid = bill.amount - ((bill.balance !== null && bill.balance !== undefined) ? bill.balance : bill.amount);
    return sum + paid;
  }, 0);

  const openBillCount = openBills.length;

  // Delete vendor mutation
  const deleteVendorMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/contacts/${id}`, 'DELETE');
    },
    onSuccess: () => {
      toast({
        title: "Vendor deleted",
        description: "Vendor has been successfully deleted",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
      navigate('/vendors');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete vendor",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  });

  const handleDeleteVendor = () => {
    if (!vendor) return;

    // Check if vendor has outstanding transactions
    if (vendorTransactions.length > 0) {
      toast({
        title: "Cannot delete vendor",
        description: "This vendor has associated transactions. Delete all transactions first.",
        variant: "destructive",
      });
      setIsDeleteDialogOpen(false);
      return;
    }

    setIsDeleting(true);
    deleteVendorMutation.mutate(vendor.id);
  };

  const handleCreateBill = () => {
    navigate(`/bill-create?vendorId=${vendorId}`);
  };

  const handleMakePayment = () => {
    navigate(`/pay-bill?vendorId=${vendorId}`);
  };

  if (!vendor) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-slate-500">
          <Building2 className="mx-auto h-12 w-12 text-slate-300 mb-3" />
          <p>Select a vendor to view details</p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6">
        {/* Header Card */}
        <Card className="border-0 shadow-sm rounded-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-violet-500 to-purple-500 px-6 py-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">
                    {vendor.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">
                    {formatContactName(vendor.name, vendor.currency, homeCurrency)}
                  </h1>
                  {vendor.contactName && (
                    <p className="text-violet-100 text-sm mt-0.5">{vendor.contactName}</p>
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
              {vendor.email && (
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
                    <Mail className="h-4 w-4 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Email</p>
                    <a
                      href={`mailto:${vendor.email}`}
                      className="text-sm text-violet-600 hover:underline"
                    >
                      {vendor.email}
                    </a>
                  </div>
                </div>
              )}

              {vendor.phone && (
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
                    <Phone className="h-4 w-4 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Phone</p>
                    <a
                      href={`tel:${vendor.phone}`}
                      className="text-sm text-slate-700 hover:text-violet-600"
                    >
                      {vendor.phone}
                    </a>
                  </div>
                </div>
              )}

              {!vendor.email && !vendor.phone && (
                <p className="text-sm text-slate-400 italic">No contact information</p>
              )}
            </CardContent>
          </Card>

          {/* Business Address */}
          <Card className="border-0 shadow-sm rounded-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
                Business Address
              </CardTitle>
            </CardHeader>
            <CardContent>
              {vendor.address ? (
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <MapPin className="h-4 w-4 text-slate-500" />
                  </div>
                  <p className="text-sm text-slate-700 whitespace-pre-line">
                    {vendor.address}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-slate-400 italic">No address on file</p>
              )}
            </CardContent>
          </Card>

          {/* Internal Notes */}
          <NotesCard
            contactId={vendorId}
            initialNotes={vendor.notes}
            contactType="vendor"
          />
        </div>

        {/* Account Summary Banner */}
        <Card className="border-0 shadow-sm rounded-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-slate-50 to-slate-100 border border-slate-200">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_auto] divide-y lg:divide-y-0 lg:divide-x divide-slate-200">

              {/* Amount Owed Section */}
              <div className="relative p-6 overflow-hidden">
                {/* Background Icon */}
                <Wallet className="absolute -right-4 -bottom-4 h-32 w-32 text-slate-200 opacity-50" />

                <div className="relative">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Amount Owed
                  </p>
                  <p className={`text-3xl font-black mb-2 ${outstandingBalance > 0 ? 'text-slate-800' : 'text-slate-400'}`}>
                    {formatCurrency(outstandingBalance, homeCurrency, homeCurrency)}
                  </p>
                  <p className="text-sm text-slate-500">
                    {openBillCount > 0
                      ? `Across ${openBillCount} open bill${openBillCount !== 1 ? 's' : ''}`
                      : 'No outstanding bills'
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
                        {overdueCount} bill{overdueCount !== 1 ? 's' : ''} past due
                      </p>
                      <p className="text-xs text-red-500 mt-1">
                        Oldest: {oldestOverdueDays} day{oldestOverdueDays !== 1 ? 's' : ''} overdue
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-slate-500">
                        No overdue bills
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
                  onClick={handleMakePayment}
                  className="bg-violet-600 hover:bg-violet-700 w-full"
                  disabled={outstandingBalance <= 0}
                >
                  <DollarSign className="h-4 w-4 mr-2" />
                  Make Payment
                </Button>
                <Button
                  onClick={handleCreateBill}
                  variant="outline"
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Bill
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Transaction History */}
        <TransactionList
          contactId={vendorId}
          contactType="vendor"
          homeCurrency={homeCurrency}
          onCreateNew={handleCreateBill}
          maxHeight="500px"
        />
      </div>

      {/* Edit Vendor Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl">Edit Vendor</DialogTitle>
            <DialogDescription>
              Update vendor information below.
            </DialogDescription>
          </DialogHeader>

          <ContactEditForm
            contact={vendor}
            onSuccess={() => {
              setIsEditDialogOpen(false);
              queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
            }}
            onCancel={() => setIsEditDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Vendor Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center text-red-600">
              <AlertTriangle className="h-5 w-5 mr-2" /> Delete Vendor
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {vendor.name}? This action cannot be undone.
              {vendorTransactions.length > 0 && (
                <p className="mt-2 text-red-500 font-medium">
                  This vendor has {vendorTransactions.length} associated transaction(s).
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
                handleDeleteVendor();
              }}
              disabled={isDeleting || vendorTransactions.length > 0}
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
