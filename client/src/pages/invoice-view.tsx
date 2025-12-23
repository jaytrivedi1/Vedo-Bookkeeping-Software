import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { format } from "date-fns";
import {
  ArrowLeft,
  FileText,
  Printer,
  FileDown,
  Edit2,
  Mail,
  HelpCircle,
  RefreshCw,
  Link as LinkIcon,
  Send,
  Eye,
  Check,
  FileEdit,
  AlertCircle,
  Clock,
  XCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useBackNavigation } from "@/hooks/use-back-navigation";
import { useInvoiceTemplate } from "@/hooks/use-invoice-template";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatCurrency, formatContactName } from "@/lib/currencyUtils";
import { Transaction, LineItem, Contact, SalesTax } from "@shared/schema";
import InvoiceForm from "@/components/forms/InvoiceForm";

export default function InvoiceView() {
  const [, navigate] = useLocation();
  const [invoiceId, setInvoiceId] = useState<number | null>(null);
  const { toast } = useToast();
  const { backUrl, backLabel, handleBack } = useBackNavigation('/invoices', 'Invoices');
  const { template } = useInvoiceTemplate();
  
  // Send invoice dialog state
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [emailCC, setEmailCC] = useState("");
  const [emailBCC, setEmailBCC] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [personalMessage, setPersonalMessage] = useState("");
  const [includePdfAttachment, setIncludePdfAttachment] = useState(true);

  // Extract the invoice ID from the URL
  useEffect(() => {
    const path = window.location.pathname;
    const match = path.match(/\/invoices\/(\d+)/);
    if (match && match[1]) {
      setInvoiceId(parseInt(match[1]));
    } else {
      handleBack();
    }

    // Check if we should auto-open the send dialog (from Save & Send button)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('openSendDialog') === 'true') {
      setSendDialogOpen(true);
      // Pre-fill CC/BCC from URL params if provided
      if (urlParams.get('cc')) setEmailCC(urlParams.get('cc') || '');
      if (urlParams.get('bcc')) setEmailBCC(urlParams.get('bcc') || '');
      // Clean up the URL by removing the query param
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [handleBack]);
  
  // Define extended transaction interface with dueDate
  interface InvoiceWithExtras extends Transaction {
    dueDate: Date | null;
  }

  // Define payment history interfaces
  interface PaymentHistoryItem {
    transaction: Transaction;
    amountApplied: number;
    date: string;
    description: string;
  }

  interface PaymentHistory {
    invoice: Transaction;
    payments: PaymentHistoryItem[];
    summary: {
      originalAmount: number;
      totalPaid: number;
      remainingBalance: number;
    }
  }
  
  // Define invoice activity interface
  interface InvoiceActivity {
    id: number;
    invoiceId: number;
    activityType: 'created' | 'sent' | 'viewed' | 'paid' | 'edited' | 'overdue' | 'reminder_sent' | 'cancelled';
    timestamp: string;
    userId?: number;
    metadata?: any;
  }
  
  // Add a mutation for recalculating the invoice balance
  const recalculateBalanceMutation = useMutation({
    mutationFn: async () => {
      if (!invoiceId) {
        throw new Error('No invoice ID available');
      }
      const response = await apiRequest(
        `/api/transactions/${invoiceId}/recalculate`,
        'POST'
      );
      return response;
    },
    onSuccess: () => {
      // Invalidate relevant queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['/api/transactions', invoiceId] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions', invoiceId, 'payment-history'] });
      toast({
        title: "Balance recalculated",
        description: "Invoice balance has been recalculated successfully",
        variant: "default"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to recalculate",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Mutation for sending invoice via email
  const sendInvoiceMutation = useMutation({
    mutationFn: async () => {
      if (!invoiceId) {
        throw new Error('No invoice ID available');
      }
      // Parse CC and BCC into arrays
      const ccArray = emailCC ? emailCC.split(',').map(e => e.trim()).filter(e => e) : [];
      const bccArray = emailBCC ? emailBCC.split(',').map(e => e.trim()).filter(e => e) : [];

      const response = await apiRequest(
        `/api/invoices/${invoiceId}/send-email`,
        'POST',
        {
          recipientEmail,
          recipientName,
          cc: ccArray,
          bcc: bccArray,
          subject: emailSubject,
          message: personalMessage,
          includeAttachment: includePdfAttachment
        }
      );
      return response;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices', invoiceId, 'activities'] });
      toast({
        title: "Invoice sent",
        description: data.publicLink 
          ? `Invoice sent successfully. Public link: ${data.publicLink}` 
          : "Invoice sent successfully",
        variant: "default"
      });
      setSendDialogOpen(false);
      resetSendForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send invoice",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Mutation for generating public token
  const generateTokenMutation = useMutation({
    mutationFn: async () => {
      if (!invoiceId) {
        throw new Error('No invoice ID available');
      }
      const response = await apiRequest(
        `/api/invoices/${invoiceId}/generate-token`,
        'POST'
      );
      return response;
    },
    onSuccess: (data) => {
      const publicLink = data.publicLink || '';
      if (publicLink) {
        navigator.clipboard.writeText(publicLink);
        toast({
          title: "Link copied",
          description: "Public invoice link copied to clipboard",
          variant: "default"
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to generate link",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Fetch invoice details
  const { data: invoiceData, isLoading: invoiceLoading } = useQuery({
    queryKey: ['/api/transactions', invoiceId],
    queryFn: async () => {
      if (!invoiceId) return null;
      const response = await fetch(`/api/transactions/${invoiceId}`);
      if (!response.ok) throw new Error('Failed to fetch invoice');
      return response.json();
    },
    enabled: !!invoiceId
  });
  
  // Extract invoice data for dependent queries
  const invoice: InvoiceWithExtras | undefined = invoiceData?.transaction;
  const lineItems: LineItem[] = invoiceData?.lineItems || [];

  // Fetch only the specific customer for this invoice (not ALL contacts)
  const { data: customer, isLoading: customerLoading } = useQuery<Contact>({
    queryKey: ['/api/contacts', invoice?.contactId],
    queryFn: async () => {
      if (!invoice?.contactId) return null;
      const response = await fetch(`/api/contacts/${invoice.contactId}`);
      if (!response.ok) throw new Error('Failed to fetch customer');
      return response.json();
    },
    enabled: !!invoice?.contactId,
  });

  // Fetch sales taxes for tax names (needed for display)
  const { data: salesTaxes, isLoading: taxesLoading } = useQuery<SalesTax[]>({
    queryKey: ['/api/sales-taxes'],
  });
  
  // Fetch preferences for home currency
  const { data: preferences } = useQuery<{ homeCurrency?: string }>({
    queryKey: ['/api/settings/preferences'],
  });
  
  const homeCurrency = preferences?.homeCurrency || 'CAD';
  
  // Fetch payment history for this invoice
  const { data: paymentHistory, isLoading: paymentsLoading } = useQuery<PaymentHistory>({
    queryKey: ['/api/transactions', invoiceId, 'payment-history'],
    queryFn: async () => {
      if (!invoiceId) return null;
      const response = await fetch(`/api/transactions/${invoiceId}/payment-history`);
      if (!response.ok) throw new Error('Failed to fetch payment history');
      return response.json();
    },
    enabled: !!invoiceId
  });
  
  // Fetch invoice activities
  const { data: activities = [], isLoading: activitiesLoading } = useQuery<InvoiceActivity[]>({
    queryKey: ['/api/invoices', invoiceId, 'activities'],
    enabled: !!invoiceId
  });

  // Get default company for email subject
  const { data: defaultCompany } = useQuery({
    queryKey: ['/api/companies/default'],
    queryFn: () => apiRequest('/api/companies/default'),
  });

  // Helper function to generate default email message
  const generateDefaultMessage = () => {
    if (!invoice) return "";

    const customerName = customer?.name || "Valued Customer";
    const invoiceRef = invoice.reference || `#${invoice.id}`;
    const totalAmount = formatCurrency(invoice.balance ?? invoice.amount ?? 0, homeCurrency);
    const dueDate = invoice.dueDate ? format(new Date(invoice.dueDate), 'MMMM d, yyyy') : 'upon receipt';
    const companyName = defaultCompany?.name || 'Our Company';

    // Generate public link if token exists
    const baseUrl = window.location.origin;
    const publicLink = invoice.secureToken
      ? `${baseUrl}/invoice/public/${invoice.secureToken}`
      : null;

    let message = `Hi ${customerName},

Please find attached Invoice ${invoiceRef} for ${totalAmount}, due on ${dueDate}.`;

    if (publicLink) {
      message += `

You can view and pay your invoice online here:
${publicLink}`;
    }

    message += `

Best regards,
${companyName}`;

    return message;
  };

  // Helper function to reset send form
  const resetSendForm = () => {
    setRecipientEmail(customer?.email || "");
    setRecipientName(customer?.name || "");
    setEmailCC("");
    setEmailBCC("");
    setEmailSubject(invoice ? `Invoice ${invoice.reference || invoice.id} from ${defaultCompany?.name || 'Your Company'}` : "");
    setPersonalMessage(generateDefaultMessage());
    setIncludePdfAttachment(true);
  };

  // Pre-fill customer data when customer changes or send dialog opens
  useEffect(() => {
    if (sendDialogOpen && customer) {
      setRecipientEmail(customer.email || "");
      setRecipientName(customer.name || "");
    }
    if (sendDialogOpen && invoice) {
      setEmailSubject(`Invoice ${invoice.reference || invoice.id} from ${defaultCompany?.name || 'Your Company'}`);
      // Only set default message if it's empty (avoid overwriting user edits)
      if (!personalMessage) {
        setPersonalMessage(generateDefaultMessage());
      }
    }
  }, [sendDialogOpen, customer, invoice, defaultCompany]);
  
  // Helper function to get activity icon
  const getActivityIcon = (activityType: string) => {
    switch (activityType) {
      case 'sent':
      case 'reminder_sent':
        return <Mail className="h-4 w-4" />;
      case 'viewed':
        return <Eye className="h-4 w-4" />;
      case 'paid':
        return <Check className="h-4 w-4" />;
      case 'edited':
      case 'created':
        return <FileEdit className="h-4 w-4" />;
      case 'overdue':
        return <AlertCircle className="h-4 w-4" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };
  
  // Helper function to format activity type
  const formatActivityType = (activityType: string) => {
    return activityType
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };
  
  // Use saved totals from the transaction (respects manual tax overrides)
  // Fallback to calculating from line items if not saved
  const subtotal = invoice?.subTotal ?? lineItems.reduce((sum, item) => sum + item.amount, 0);
  const totalTaxAmount = invoice?.taxAmount ?? lineItems.reduce((sum, item) => {
    if (!item.salesTaxId || !salesTaxes) return sum;
    const tax = salesTaxes.find(tax => tax.id === item.salesTaxId);
    return sum + (tax ? (item.amount * tax.rate / 100) : 0);
  }, 0);
  const total = invoice?.amount ?? (subtotal + totalTaxAmount);
  
  // Get tax names used in this invoice
  const getTaxNames = (): string[] => {
    if (!salesTaxes || !lineItems) return [];
    
    const taxIds = lineItems
      .filter(item => item.salesTaxId !== null)
      .map(item => item.salesTaxId) as number[];
    
    // Create array of unique tax IDs without using Set
    const uniqueTaxIds: number[] = [];
    taxIds.forEach(id => {
      if (!uniqueTaxIds.includes(id)) {
        uniqueTaxIds.push(id);
      }
    });
    
    return uniqueTaxIds
      .map(id => salesTaxes.find(tax => tax.id === id)?.name)
      .filter(name => name !== undefined) as string[];
  };
  
  const taxNames = getTaxNames();
  
  // Get status badge color
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      case 'draft':
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  // Don't block on payment history or activities - they can load asynchronously
  // These are supplementary data that shouldn't delay the main invoice display
  if (invoiceLoading || customerLoading || taxesLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="h-64 bg-gray-200 rounded mb-6"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }
  
  if (!invoice) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">Invoice not found</h1>
        <p className="mb-4">The invoice you are looking for does not exist or has been deleted.</p>
        <Button onClick={handleBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to {backLabel}
        </Button>
      </div>
    );
  }
  
  return (
    <div>
      {/* Invoice Form in Read-Only Mode */}
      <InvoiceForm
        invoice={invoice}
        lineItems={lineItems}
        readOnly={true}
        customer={customer}
        onCancel={handleBack}
        onSendInvoice={() => setSendDialogOpen(true)}
        onCopyLink={() => generateTokenMutation.mutate()}
        onEdit={() => navigate(`/invoices/${invoice.id}/edit`)}
      />

      {/* Activity Timeline - shown below the form */}
      <div className="max-w-5xl mx-auto px-4 md:px-6 pb-6 -mt-4">
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">Activity Timeline</CardTitle>
          <CardDescription>Track all actions performed on this invoice</CardDescription>
        </CardHeader>
        <CardContent>
          {activities.length === 0 ? (
            <div className="text-center py-8 text-gray-500" data-testid="text-no-activity">
              <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No activity yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activities.map((activity, index) => (
                <div 
                  key={activity.id} 
                  className="flex gap-4 items-start"
                  data-testid={`activity-item-${index}`}
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    {getActivityIcon(activity.activityType)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-sm" data-testid={`activity-type-${index}`}>
                        {formatActivityType(activity.activityType)}
                      </p>
                      <p className="text-xs text-gray-500" data-testid={`activity-timestamp-${index}`}>
                        {format(new Date(activity.timestamp), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                    {activity.metadata?.email && (
                      <p className="text-sm text-gray-600 mt-1">
                        Sent to {activity.metadata.email}
                      </p>
                    )}
                    {activity.userId && (
                      <p className="text-xs text-gray-500 mt-1">
                        By user #{activity.userId}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      </div>

      {/* Send Invoice Dialog - Split Pane Layout */}
      <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
        <DialogContent className="max-w-[95vw] lg:max-w-5xl h-[90vh] max-h-[800px] p-0 gap-0" data-testid="dialog-send-invoice" aria-describedby="send-invoice-description">
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="px-6 py-4 border-b">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-blue-600" />
                  Send Invoice Email
                </DialogTitle>
                <DialogDescription id="send-invoice-description">
                  Review and customize the email before sending to your customer
                </DialogDescription>
              </DialogHeader>
            </div>

            {/* Split Pane Content */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-0 overflow-hidden">
              {/* Left Column - Form */}
              <div className="flex flex-col overflow-y-auto border-r border-slate-200">
                <div className="p-6 space-y-4">
                  {/* To Field */}
                  <div className="space-y-2">
                    <Label htmlFor="recipientEmail" className="text-sm font-medium text-slate-700">To *</Label>
                    <div className="flex gap-2">
                      <Input
                        id="recipientEmail"
                        type="email"
                        placeholder="customer@example.com"
                        value={recipientEmail}
                        onChange={(e) => setRecipientEmail(e.target.value)}
                        className="flex-1"
                        data-testid="input-recipient-email"
                      />
                      <Input
                        id="recipientName"
                        type="text"
                        placeholder="Name"
                        value={recipientName}
                        onChange={(e) => setRecipientName(e.target.value)}
                        className="w-28"
                        data-testid="input-recipient-name"
                      />
                    </div>
                  </div>

                  {/* CC Field */}
                  <div className="space-y-2">
                    <Label htmlFor="emailCC" className="text-sm font-medium text-slate-700">CC</Label>
                    <Input
                      id="emailCC"
                      type="text"
                      placeholder="email1@example.com, email2@example.com"
                      value={emailCC}
                      onChange={(e) => setEmailCC(e.target.value)}
                      data-testid="input-email-cc"
                    />
                  </div>

                  {/* BCC Field */}
                  <div className="space-y-2">
                    <Label htmlFor="emailBCC" className="text-sm font-medium text-slate-700">BCC</Label>
                    <Input
                      id="emailBCC"
                      type="text"
                      placeholder="email1@example.com, email2@example.com"
                      value={emailBCC}
                      onChange={(e) => setEmailBCC(e.target.value)}
                      data-testid="input-email-bcc"
                    />
                  </div>

                  <Separator />

                  {/* Subject Field */}
                  <div className="space-y-2">
                    <Label htmlFor="emailSubject" className="text-sm font-medium text-slate-700">Subject</Label>
                    <Input
                      id="emailSubject"
                      type="text"
                      placeholder="Invoice subject..."
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      data-testid="input-email-subject"
                    />
                  </div>

                  {/* Message Field */}
                  <div className="space-y-2">
                    <Label htmlFor="personalMessage" className="text-sm font-medium text-slate-700">Message</Label>
                    <Textarea
                      id="personalMessage"
                      placeholder="Add a personal message to include in the email..."
                      value={personalMessage}
                      onChange={(e) => setPersonalMessage(e.target.value)}
                      rows={8}
                      className="resize-none"
                      data-testid="textarea-personal-message"
                    />
                  </div>

                  <Separator />

                  {/* PDF Attachment Checkbox */}
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="includePdf"
                      checked={includePdfAttachment}
                      onCheckedChange={(checked) => setIncludePdfAttachment(checked === true)}
                      data-testid="checkbox-include-pdf"
                    />
                    <Label htmlFor="includePdf" className="cursor-pointer text-sm font-medium text-slate-700">
                      Include Invoice PDF as attachment
                    </Label>
                  </div>
                </div>
              </div>

              {/* Right Column - PDF Preview (hidden on mobile) */}
              <div className="hidden lg:flex flex-col bg-slate-100">
                <div className="px-4 py-3 border-b bg-slate-50">
                  <p className="text-sm font-medium text-slate-600">Invoice Preview</p>
                </div>
                <div className="flex-1 p-4">
                  <iframe
                    src={`/api/invoices/${invoiceId}/pdf`}
                    className="w-full h-full rounded-lg border border-slate-200 bg-white"
                    title="Invoice PDF Preview"
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t bg-slate-50 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setSendDialogOpen(false)}
                data-testid="button-cancel-send"
              >
                Cancel
              </Button>
              <Button
                onClick={() => sendInvoiceMutation.mutate()}
                disabled={!recipientEmail || sendInvoiceMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
                data-testid="button-submit-send"
              >
                {sendInvoiceMutation.isPending ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Send Email
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}