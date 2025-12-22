import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { format } from "date-fns";
import {
  Search,
  Plus,
  FileText,
  Eye,
  Send,
  FileCheck,
  Loader2,
  ChevronDown,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/currencyUtils";
import { cn } from "@/lib/utils";
import { Transaction } from "@shared/schema";

interface QuotationsTabProps {
  customerId: number;
  homeCurrency: string;
}

type QuotationStatus = "all" | "pending" | "expired";

export default function QuotationsTab({
  customerId,
  homeCurrency,
}: QuotationsTabProps) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<QuotationStatus>("all");
  const [quotationToConvert, setQuotationToConvert] =
    useState<Transaction | null>(null);

  // Fetch all transactions
  const { data: transactions = [], isLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
  });

  // Filter quotations for this customer
  const customerQuotations = transactions.filter(
    (t) => t.contactId === customerId && t.status === "quotation"
  );

  // Apply search filter
  const filteredQuotations = customerQuotations.filter((q) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      q.reference?.toLowerCase().includes(query) ||
      q.description?.toLowerCase().includes(query) ||
      q.memo?.toLowerCase().includes(query)
    );
  });

  // Apply status filter
  const displayQuotations = filteredQuotations.filter((q) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "expired") {
      // Consider expired if due date has passed
      if (q.dueDate) {
        return new Date(q.dueDate) < new Date();
      }
      return false;
    }
    if (statusFilter === "pending") {
      // Pending = not expired
      if (q.dueDate) {
        return new Date(q.dueDate) >= new Date();
      }
      return true;
    }
    return true;
  });

  // Convert quotation mutation
  const convertMutation = useMutation({
    mutationFn: async (quotationId: number) => {
      return await apiRequest(`/api/quotations/${quotationId}/convert`, "POST");
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Quotation converted to invoice successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      setQuotationToConvert(null);
      navigate("/invoices");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to convert quotation",
        variant: "destructive",
      });
    },
  });

  // Calculate stats
  const totalQuoted = displayQuotations.reduce((sum, q) => sum + q.amount, 0);
  const pendingCount = displayQuotations.length;

  // Check if quotation is expired
  const isExpired = (quotation: Transaction) => {
    if (!quotation.dueDate) return false;
    return new Date(quotation.dueDate) < new Date();
  };

  const statusOptions = [
    { value: "all", label: "All" },
    { value: "pending", label: "Pending" },
    { value: "expired", label: "Expired" },
  ];

  return (
    <Card className="border-0 shadow-sm rounded-2xl">
      <CardContent className="p-0">
        {/* Header with stats and actions */}
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-800">
                Quotations
              </h3>
              <p className="text-sm text-slate-500">
                {pendingCount} quotation{pendingCount !== 1 ? "s" : ""} totaling{" "}
                {formatCurrency(totalQuoted, homeCurrency, homeCurrency)}
              </p>
            </div>
            <Button
              onClick={() =>
                navigate(`/quotations/new?customerId=${customerId}`)
              }
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Quotation
            </Button>
          </div>

          {/* Filter Bar */}
          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search quotations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-sm bg-white border-slate-200"
              />
            </div>

            {/* Status Filter */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-9 px-3 rounded-lg text-sm font-medium transition-all border",
                    statusFilter !== "all"
                      ? "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  )}
                >
                  Status:{" "}
                  {statusOptions.find((s) => s.value === statusFilter)?.label}
                  <ChevronDown className="h-3.5 w-3.5 ml-1.5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-36 p-2" align="start">
                {statusOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() =>
                      setStatusFilter(option.value as QuotationStatus)
                    }
                    className={cn(
                      "w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md transition-colors",
                      statusFilter === option.value
                        ? "bg-indigo-50 text-indigo-700"
                        : "hover:bg-slate-50 text-slate-600"
                    )}
                  >
                    {statusFilter === option.value && (
                      <Check className="h-3.5 w-3.5" />
                    )}
                    <span
                      className={statusFilter === option.value ? "" : "ml-5"}
                    >
                      {option.label}
                    </span>
                  </button>
                ))}
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Quotations List */}
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : displayQuotations.length === 0 ? (
          <div className="text-center py-12 px-6">
            <div className="mx-auto w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <FileText className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-base font-semibold text-slate-700 mb-1">
              {customerQuotations.length === 0
                ? "No quotations yet"
                : "No matching quotations"}
            </h3>
            <p className="text-sm text-slate-500 max-w-xs mx-auto">
              {customerQuotations.length === 0
                ? "Create a quotation to send a price estimate to this customer."
                : "Try adjusting your search or filter criteria."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {displayQuotations.map((quotation) => (
              <div
                key={quotation.id}
                className="group flex items-center justify-between px-4 py-3 hover:bg-slate-50 cursor-pointer transition-colors"
                onClick={() => navigate(`/invoices/${quotation.id}`)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-800">
                        #{quotation.reference}
                      </span>
                      {isExpired(quotation) ? (
                        <Badge
                          variant="secondary"
                          className="bg-red-100 text-red-700 text-[10px]"
                        >
                          Expired
                        </Badge>
                      ) : (
                        <Badge
                          variant="secondary"
                          className="bg-blue-100 text-blue-700 text-[10px]"
                        >
                          Pending
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {format(new Date(quotation.date), "MMM d, yyyy")}
                      {quotation.dueDate && (
                        <span>
                          {" "}
                          · Valid until{" "}
                          {format(new Date(quotation.dueDate), "MMM d, yyyy")}
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-sm font-semibold text-slate-800">
                    {formatCurrency(
                      quotation.amount,
                      quotation.currency || homeCurrency,
                      homeCurrency
                    )}
                  </span>

                  {/* Action buttons - visible on hover */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/invoices/${quotation.id}`);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        // TODO: Send quotation email
                      }}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        setQuotationToConvert(quotation);
                      }}
                    >
                      <FileCheck className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Convert to Invoice Dialog */}
        <AlertDialog
          open={!!quotationToConvert}
          onOpenChange={(open) => !open && setQuotationToConvert(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Convert to Invoice?</AlertDialogTitle>
              <AlertDialogDescription>
                This will convert quotation{" "}
                <strong>#{quotationToConvert?.reference}</strong> to an invoice.
                The quotation will be updated and appear in your invoices list.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() =>
                  quotationToConvert &&
                  convertMutation.mutate(quotationToConvert.id)
                }
                className="bg-emerald-600 hover:bg-emerald-700"
                disabled={convertMutation.isPending}
              >
                {convertMutation.isPending
                  ? "Converting..."
                  : "Convert to Invoice"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
