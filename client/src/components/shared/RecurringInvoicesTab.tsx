import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { format } from "date-fns";
import {
  Search,
  Plus,
  Clock,
  Play,
  Pause,
  Edit,
  Trash2,
  Loader2,
  ChevronDown,
  Check,
  RefreshCw,
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

interface RecurringTemplate {
  id: number;
  customerId: number;
  templateName: string;
  currency: string;
  frequency: string;
  nextRunAt: string;
  status: string;
  totalAmount: number;
  customerName?: string;
}

interface RecurringInvoicesTabProps {
  customerId: number;
  homeCurrency: string;
}

type StatusFilter = "all" | "active" | "paused";

export default function RecurringInvoicesTab({
  customerId,
  homeCurrency,
}: RecurringInvoicesTabProps) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [templateToDelete, setTemplateToDelete] =
    useState<RecurringTemplate | null>(null);

  // Fetch recurring templates
  const { data: templates = [], isLoading } = useQuery<RecurringTemplate[]>({
    queryKey: ["/api/recurring"],
  });

  // Filter templates for this customer
  const customerTemplates = templates.filter(
    (t) => t.customerId === customerId
  );

  // Apply search filter
  const filteredTemplates = customerTemplates.filter((t) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return t.templateName.toLowerCase().includes(query);
  });

  // Apply status filter
  const displayTemplates = filteredTemplates.filter((t) => {
    if (statusFilter === "all") return true;
    return t.status === statusFilter;
  });

  // Mutations
  const pauseMutation = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/recurring/${id}/pause`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recurring"] });
      toast({ title: "Template paused" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to pause template",
        variant: "destructive",
      });
    },
  });

  const resumeMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest("POST", `/api/recurring/${id}/resume`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recurring"] });
      toast({ title: "Template resumed" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to resume template",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/recurring/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recurring"] });
      setTemplateToDelete(null);
      toast({ title: "Template deleted" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete template",
        variant: "destructive",
      });
    },
  });

  const runNowMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest("POST", `/api/recurring/${id}/run-now`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recurring"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      toast({ title: "Invoice generated successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate invoice",
        variant: "destructive",
      });
    },
  });

  // Calculate stats
  const activeCount = displayTemplates.filter(
    (t) => t.status === "active"
  ).length;
  const totalMonthlyValue = displayTemplates
    .filter((t) => t.status === "active")
    .reduce((sum, t) => {
      // Rough monthly equivalent
      let monthlyAmount = t.totalAmount;
      switch (t.frequency) {
        case "daily":
          monthlyAmount = t.totalAmount * 30;
          break;
        case "weekly":
          monthlyAmount = t.totalAmount * 4;
          break;
        case "biweekly":
          monthlyAmount = t.totalAmount * 2;
          break;
        case "quarterly":
          monthlyAmount = t.totalAmount / 3;
          break;
        case "yearly":
          monthlyAmount = t.totalAmount / 12;
          break;
      }
      return sum + monthlyAmount;
    }, 0);

  const formatFrequency = (frequency: string) => {
    const map: Record<string, string> = {
      daily: "Daily",
      weekly: "Weekly",
      biweekly: "Bi-weekly",
      monthly: "Monthly",
      quarterly: "Quarterly",
      yearly: "Yearly",
    };
    return map[frequency] || frequency;
  };

  const statusOptions = [
    { value: "all", label: "All" },
    { value: "active", label: "Active" },
    { value: "paused", label: "Paused" },
  ];

  return (
    <Card className="border-0 shadow-sm rounded-2xl">
      <CardContent className="p-0">
        {/* Compact Header: Stats + Actions + Filters */}
        <div className="px-4 pt-4 pb-3 border-b border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-slate-600">
              <span className="font-medium">{activeCount}</span> active template{activeCount !== 1 ? "s" : ""}
              {activeCount > 0 && (
                <span> · ~{formatCurrency(totalMonthlyValue, homeCurrency, homeCurrency)}/mo</span>
              )}
            </p>
            <Button
              onClick={() =>
                navigate(`/recurring-invoices/new?customerId=${customerId}`)
              }
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 h-8"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              New Template
            </Button>
          </div>

          {/* Filter Bar */}
          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search templates..."
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
                      setStatusFilter(option.value as StatusFilter)
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

        {/* Templates List */}
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : displayTemplates.length === 0 ? (
          <div className="text-center py-12 px-6">
            <div className="mx-auto w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <RefreshCw className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-base font-semibold text-slate-700 mb-1">
              {customerTemplates.length === 0
                ? "No recurring invoices"
                : "No matching templates"}
            </h3>
            <p className="text-sm text-slate-500 max-w-xs mx-auto">
              {customerTemplates.length === 0
                ? "Set up automated invoicing to bill this customer on a schedule."
                : "Try adjusting your search or filter criteria."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {displayTemplates.map((template) => (
              <div
                key={template.id}
                className="group flex items-center justify-between px-4 py-3 hover:bg-slate-50 cursor-pointer transition-colors"
                onClick={() => navigate(`/recurring-invoices/${template.id}`)}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center",
                      template.status === "active"
                        ? "bg-emerald-100"
                        : "bg-slate-100"
                    )}
                  >
                    <Clock
                      className={cn(
                        "h-5 w-5",
                        template.status === "active"
                          ? "text-emerald-600"
                          : "text-slate-400"
                      )}
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-800">
                        {template.templateName}
                      </span>
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-[10px]",
                          template.status === "active"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-600"
                        )}
                      >
                        {template.status === "active" ? "Active" : "Paused"}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {formatFrequency(template.frequency)} ·{" "}
                      {formatCurrency(
                        template.totalAmount,
                        template.currency || homeCurrency,
                        homeCurrency
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Next run</p>
                    <p className="text-sm font-medium text-slate-700">
                      {format(new Date(template.nextRunAt), "MMM d, yyyy")}
                    </p>
                  </div>

                  {/* Action buttons - visible on hover */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {template.status === "active" ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          pauseMutation.mutate(template.id);
                        }}
                        disabled={pauseMutation.isPending}
                        title="Pause"
                      >
                        <Pause className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          resumeMutation.mutate(template.id);
                        }}
                        disabled={resumeMutation.isPending}
                        title="Resume"
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        runNowMutation.mutate(template.id);
                      }}
                      disabled={runNowMutation.isPending}
                      title="Generate Now"
                    >
                      <RefreshCw
                        className={cn(
                          "h-4 w-4",
                          runNowMutation.isPending && "animate-spin"
                        )}
                      />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/recurring-invoices/${template.id}/edit`);
                      }}
                      title="Edit"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        setTemplateToDelete(template);
                      }}
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog
          open={!!templateToDelete}
          onOpenChange={(open) => !open && setTemplateToDelete(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Template?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete the recurring invoice template "
                {templateToDelete?.templateName}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() =>
                  templateToDelete && deleteMutation.mutate(templateToDelete.id)
                }
                className="bg-red-600 hover:bg-red-700"
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
