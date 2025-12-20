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
  const vendorExpenses = vendorTransactions.filter(t => t.type === 'expense');

  const outstandingBalance = vendorBills.reduce((sum, bill) => {
    const balance = (bill.balance !== null && bill.balance !== undefined)
      ? bill.balance
      : bill.amount;
    return sum + balance;
  }, 0);

  const totalPaid = vendorBills.reduce((sum, bill) => {
    const paid = bill.amount - ((bill.balance !== null && bill.balance !== undefined) ? bill.balance : bill.amount);
    return sum + paid;
  }, 0);

  const totalBills = vendorBills.length;
  const totalExpenses = vendorExpenses.length;

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

          {/* Billing Address */}
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
              {/* Outstanding Balance (Amount Owed) */}
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                    <DollarSign className="h-4 w-4 text-red-600" />
                  </div>
                  <span className="text-xs text-slate-500">Amount Owed</span>
                </div>
                <p className={`text-xl font-bold ${outstandingBalance > 0 ? 'text-red-600' : 'text-slate-800'}`}>
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

              {/* Total Bills */}
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
                    <FileText className="h-4 w-4 text-violet-600" />
                  </div>
                  <span className="text-xs text-slate-500">Bills</span>
                </div>
                <p className="text-xl font-bold text-slate-800">
                  {totalBills}
                </p>
              </div>

              {/* Total Expenses */}
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center">
                    <CreditCard className="h-4 w-4 text-slate-600" />
                  </div>
                  <span className="text-xs text-slate-500">Expenses</span>
                </div>
                <p className="text-xl font-bold text-slate-800">
                  {totalExpenses}
                </p>
              </div>
            </div>
          </CardContent>
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
