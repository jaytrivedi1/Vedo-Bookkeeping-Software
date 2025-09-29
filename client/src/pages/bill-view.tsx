import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useLocation, useRoute } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";

import { Bill, Contact, billSchema, Account, SalesTax, Transaction } from "@shared/schema";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { DatePicker } from "@/components/ui/date-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Plus, Trash2, Edit, Eye, Save, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function BillView() {
  const [match, params] = useRoute('/bills/:id');
  const billId = params?.id;
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [isEditMode, setIsEditMode] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  const [vendors, setVendors] = useState<Contact[]>([]);
  const [expenseAccounts, setExpenseAccounts] = useState<Account[]>([]);

  // Fetch the bill data (includes transaction, lineItems, and ledgerEntries)
  const { data: billData, isLoading: isLoadingBill, refetch: refetchBill } = useQuery({
    queryKey: ['/api/transactions', billId],
    queryFn: async () => {
      const response = await fetch(`/api/transactions/${billId}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch bill');
      }
      return response.json();
    },
    enabled: !!billId,
  });

  const bill = billData?.transaction;
  const lineItems = billData?.lineItems || [];

  // Fetch vendors (contacts of type "vendor")
  const { data: allContacts, isLoading: isLoadingContacts } = useQuery({
    queryKey: ["/api/contacts"],
    select: (data: Contact[]) => data,
  });

  // Fetch all accounts
  const { data: allAccounts, isLoading: isLoadingAccounts } = useQuery({
    queryKey: ["/api/accounts"],
    select: (data: Account[]) => data,
  });

  // Fetch sales tax options
  const { data: salesTaxes, isLoading: isLoadingSalesTaxes } = useQuery<SalesTax[]>({
    queryKey: ["/api/sales-taxes"],
  });

  // Line items are now part of the bill data response

  useEffect(() => {
    if (allContacts) {
      // Filter contacts to only include vendors
      const vendorContacts = allContacts.filter(
        (contact) => contact.type === "vendor" || contact.type === "both"
      );
      setVendors(vendorContacts);
    }
  }, [allContacts]);

  useEffect(() => {
    if (allAccounts) {
      // Filter accounts to exclude Accounts Payable and Accounts Receivable
      const filteredAccounts = allAccounts.filter(
        (account) => account.type !== "accounts_payable" && account.type !== "accounts_receivable"
      );
      setExpenseAccounts(filteredAccounts);
    }
  }, [allAccounts]);

  // Set up form with default values
  const form = useForm<Bill>({
    resolver: zodResolver(billSchema),
    defaultValues: {
      date: new Date(),
      contactId: 0,
      reference: "",
      description: "",
      status: "open",
      lineItems: [
        {
          description: "",
          quantity: 1,
          unitPrice: 0,
          amount: 0,
          accountId: undefined,
          salesTaxId: null,
        },
      ],
      dueDate: new Date(),
      paymentTerms: "30",
      attachment: "",
    },
  });

  // Helper function to safely create date
  const safeDate = (dateValue: any): Date => {
    if (!dateValue) return new Date();
    const date = new Date(dateValue);
    return isNaN(date.getTime()) ? new Date() : date;
  };

  // Helper function to safely format date
  const safeFormatDate = (dateValue: any, formatString: string = 'MMM dd, yyyy'): string => {
    const date = safeDate(dateValue);
    try {
      return format(date, formatString);
    } catch {
      return 'Invalid date';
    }
  };

  // Helper function to calculate due date from bill date and payment terms
  const calculateDueDate = useCallback((billDate: Date, paymentTerms: string): Date => {
    const date = safeDate(billDate);
    const days = parseInt(paymentTerms) || 30;
    const dueDate = new Date(date);
    dueDate.setDate(dueDate.getDate() + days);
    return dueDate;
  }, []);

  // Track initialization to prevent re-running
  const [initialized, setInitialized] = useState(false);

  // Load bill data into form when all data is available
  useEffect(() => {
    if (bill && lineItems && allAccounts && salesTaxes && !initialized) {
      // Calculate totals from line items
      const subTotal = lineItems.reduce((sum: number, item: any) => sum + Number(item.amount), 0);
      
      let totalTaxAmount = 0;
      lineItems.forEach((item: any) => {
        if (item.salesTaxId) {
          const salesTax = salesTaxes?.find(tax => tax.id === item.salesTaxId);
          if (salesTax) {
            if (salesTax.isComposite) {
              const components = salesTaxes?.filter(tax => tax.parentId === salesTax.id) || [];
              const totalRate = components.reduce((sum, component) => sum + component.rate, 0);
              const taxAmount = (item.amount * totalRate) / 100;
              totalTaxAmount += taxAmount;
            } else {
              const taxAmount = (item.amount * salesTax.rate) / 100;
              totalTaxAmount += taxAmount;
            }
          }
        }
      });

      form.reset({
        date: safeDate(bill.date),
        contactId: bill.contactId || 0,
        reference: bill.reference || "",
        description: bill.description || "",
        status: bill.status as "open" | "paid" | "overdue" | "partial" | undefined,
        dueDate: calculateDueDate(bill.date, "30"), // Calculate due date from bill date + payment terms
        paymentTerms: "30", // Default value, could be stored separately
        attachment: "",
        lineItems: lineItems.map((item: any) => ({
          description: item.description || "",
          quantity: Number(item.quantity) || 1,
          unitPrice: Number(item.unitPrice) || 0,
          amount: Number(item.amount) || 0,
          accountId: Number(item.accountId) || Number(item.expenseAccountId) || Number(item.account_id) || undefined,
          salesTaxId: item.salesTaxId || item.taxId || item.sales_tax_id || null,
        })),
        subTotal,
        taxAmount: totalTaxAmount,
        totalAmount: subTotal + totalTaxAmount,
      });
      
      setInitialized(true);
    }
  }, [bill, lineItems, allAccounts, salesTaxes, initialized, form, calculateDueDate]);

  // Update mutation for editing the bill
  const updateBill = useMutation({
    mutationFn: async (data: Bill) => {
      return await apiRequest(`/api/bills/${billId}`, "PUT", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Bill updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      setIsEditMode(false);
      refetchBill();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update amount when quantity or unit price changes
  const updateLineItemAmount = (index: number) => {
    const lineItems = form.getValues("lineItems");
    const quantity = Number(lineItems[index].quantity);
    const unitPrice = Number(lineItems[index].unitPrice);
    const amount = quantity * unitPrice;
    
    form.setValue(`lineItems.${index}.amount`, amount);
    updateTotals();
  };

  // Update subtotal and total when line items change
  const updateTotals = useCallback(() => {
    const lineItems = form.getValues("lineItems");
    
    // Calculate subtotal from quantity * unitPrice and update amounts
    let subTotal = 0;
    let totalTaxAmount = 0;
    
    const updatedLineItems = lineItems.map((item) => {
      const lineAmount = Number(item.quantity) * Number(item.unitPrice);
      subTotal += lineAmount;
      
      // Calculate tax for this line item
      if (item.salesTaxId) {
        const salesTax = salesTaxes?.find(tax => tax.id === item.salesTaxId);
        if (salesTax) {
          if (salesTax.isComposite) {
            const components = salesTaxes?.filter(tax => tax.parentId === salesTax.id) || [];
            const totalRate = components.reduce((sum, component) => sum + component.rate, 0);
            totalTaxAmount += (lineAmount * totalRate) / 100;
          } else {
            totalTaxAmount += (lineAmount * salesTax.rate) / 100;
          }
        }
      }
      
      return { ...item, amount: lineAmount };
    });
    
    // Update form values
    form.setValue("lineItems", updatedLineItems);
    form.setValue("subTotal", subTotal);
    form.setValue("taxAmount", totalTaxAmount);
    form.setValue("totalAmount", subTotal + totalTaxAmount);
  }, [form, salesTaxes]);

  // Recalculate totals when line items change (after updateTotals is defined)
  useEffect(() => {
    if (initialized && salesTaxes && updateTotals) {
      updateTotals();
    }
  }, [form.watch("lineItems"), initialized, salesTaxes, updateTotals]);

  // Add a new line item
  const addLineItem = () => {
    const lineItems = form.getValues("lineItems");
    lineItems.push({
      description: "",
      quantity: 1,
      unitPrice: 0,
      amount: 0,
    });
    form.setValue("lineItems", lineItems);
  };

  // Remove a line item
  const removeLineItem = (index: number) => {
    const lineItems = form.getValues("lineItems");
    if (lineItems.length === 1) {
      toast({
        title: "Cannot remove",
        description: "At least one line item is required",
        variant: "destructive",
      });
      return;
    }
    
    lineItems.splice(index, 1);
    form.setValue("lineItems", lineItems);
    updateTotals();
  };

  // Handle form submission
  const onSubmit = (data: Bill) => {
    updateBill.mutate(data);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Completed</Badge>;
      case 'open':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Open</Badge>;
      case 'overdue':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Overdue</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (isLoadingBill || isLoadingContacts || isLoadingAccounts) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!bill) {
    return (
      <div className="container mx-auto py-6">
        <Alert variant="destructive">
          <AlertTitle>Bill Not Found</AlertTitle>
          <AlertDescription>
            The bill you're looking for doesn't exist or has been deleted.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">
            {isEditMode ? "Edit Bill" : "View Bill"} - {bill.reference}
          </h1>
          <div className="flex items-center gap-2 mt-2">
            {getStatusBadge(bill.status)}
            <span className="text-sm text-muted-foreground">
              Balance: {formatCurrency(bill.balance || 0)}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/transactions")}>
            Back to Transactions
          </Button>
          {isEditMode ? (
            <>
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsEditMode(false);
                  // Reset form to original data
                  refetchBill();
                }}
              >
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button 
                type="submit" 
                onClick={form.handleSubmit(onSubmit)}
                disabled={updateBill.isPending}
              >
                {updateBill.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </>
          ) : (
            <Button onClick={() => setIsEditMode(true)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Bill
            </Button>
          )}
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Tabs defaultValue="details" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="details">Bill Details</TabsTrigger>
            </TabsList>

            <Card>
              <CardContent className="p-6">
                <TabsContent value="details" className="space-y-6 mt-0">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <Label htmlFor="vendor">Vendor</Label>
                      {isEditMode ? (
                        <Select
                          value={form.watch("contactId") > 0 ? form.watch("contactId").toString() : ""}
                          onValueChange={(value) => {
                            const contactId = parseInt(value, 10);
                            if (!isNaN(contactId)) {
                              form.setValue("contactId", contactId);
                              form.trigger("contactId");
                            }
                          }}
                        >
                          <SelectTrigger 
                            id="vendor" 
                            className={form.formState.errors.contactId ? "border-destructive" : ""}
                          >
                            <SelectValue placeholder="Select vendor" />
                          </SelectTrigger>
                          <SelectContent>
                            {vendors.map((vendor) => (
                              <SelectItem key={vendor.id} value={vendor.id.toString()}>
                                {vendor.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          value={vendors.find(v => v.id === bill.contactId)?.name || 'Unknown Vendor'}
                          readOnly
                          className="bg-muted"
                        />
                      )}
                      {form.formState.errors.contactId && (
                        <p className="text-sm text-destructive mt-1">
                          {form.formState.errors.contactId.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="reference">Bill Number</Label>
                      <Input
                        id="reference"
                        {...form.register("reference")}
                        readOnly={!isEditMode}
                        className={`${form.formState.errors.reference ? "border-destructive" : ""} ${!isEditMode ? "bg-muted" : ""}`}
                      />
                      {form.formState.errors.reference && (
                        <p className="text-sm text-destructive mt-1">
                          {form.formState.errors.reference.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="date">Bill Date</Label>
                      {isEditMode ? (
                        <DatePicker
                          date={form.watch("date")}
                          setDate={(date) => form.setValue("date", date)}
                        />
                      ) : (
                        <Input
                          value={safeFormatDate(bill.date)}
                          readOnly
                          className="bg-muted"
                        />
                      )}
                    </div>

                    <div>
                      <Label htmlFor="dueDate">Due Date</Label>
                      {isEditMode ? (
                        <DatePicker
                          date={form.watch("dueDate") || new Date()}
                          setDate={(date) => form.setValue("dueDate", date)}
                        />
                      ) : (
                        <Input
                          value={safeFormatDate(calculateDueDate(bill.date, "30"))}
                          readOnly
                          className="bg-muted"
                        />
                      )}
                    </div>

                    <div>
                      <Label htmlFor="paymentTerms">Payment Terms</Label>
                      {isEditMode ? (
                        <Select
                          value={form.watch("paymentTerms")?.toString()}
                          onValueChange={(value) => {
                            form.setValue("paymentTerms", value);
                            const newDueDate = new Date(form.getValues("date"));
                            const days = parseInt(value) || 0;
                            newDueDate.setDate(newDueDate.getDate() + days);
                            form.setValue("dueDate", newDueDate);
                          }}
                        >
                          <SelectTrigger id="paymentTerms">
                            <SelectValue placeholder="Select payment terms" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">Due on receipt</SelectItem>
                            <SelectItem value="7">Net 7</SelectItem>
                            <SelectItem value="15">Net 15</SelectItem>
                            <SelectItem value="30">Net 30</SelectItem>
                            <SelectItem value="60">Net 60</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          value="Net 30"
                          readOnly
                          className="bg-muted"
                        />
                      )}
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold">Line Items</h3>
                      {isEditMode && (
                        <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Item
                        </Button>
                      )}
                    </div>

                    <div className="space-y-4">
                      {form.watch("lineItems").map((_, index) => (
                        <div key={index} className="grid grid-cols-12 gap-2 items-end">
                          <div className="col-span-3">
                            <Label>Description</Label>
                            <Input
                              {...form.register(`lineItems.${index}.description`)}
                              placeholder="Item description"
                              readOnly={!isEditMode}
                              className={!isEditMode ? "bg-muted" : ""}
                            />
                          </div>
                          <div className="col-span-1">
                            <Label>Quantity</Label>
                            <Input
                              type="number"
                              step="0.01"
                              {...form.register(`lineItems.${index}.quantity`, {
                                valueAsNumber: true,
                                onChange: () => updateLineItemAmount(index)
                              })}
                              readOnly={!isEditMode}
                              className={!isEditMode ? "bg-muted" : ""}
                            />
                          </div>
                          <div className="col-span-1">
                            <Label>Unit Price</Label>
                            <Input
                              type="number"
                              step="0.01"
                              {...form.register(`lineItems.${index}.unitPrice`, {
                                valueAsNumber: true,
                                onChange: () => updateLineItemAmount(index)
                              })}
                              readOnly={!isEditMode}
                              className={!isEditMode ? "bg-muted" : ""}
                            />
                          </div>
                          <div className="col-span-1">
                            <Label>Amount</Label>
                            <Input
                              type="number"
                              step="0.01"
                              {...form.register(`lineItems.${index}.amount`, {
                                valueAsNumber: true
                              })}
                              readOnly
                              className="bg-muted"
                            />
                          </div>
                          <div className="col-span-2">
                            <Label>Account</Label>
                            {isEditMode ? (
                              <Select
                                value={form.watch(`lineItems.${index}.accountId`)?.toString() || ""}
                                onValueChange={(value) => {
                                  const accountId = parseInt(value, 10);
                                  if (!isNaN(accountId)) {
                                    form.setValue(`lineItems.${index}.accountId`, accountId);
                                  }
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Account" />
                                </SelectTrigger>
                                <SelectContent>
                                  {expenseAccounts.map((account) => (
                                    <SelectItem key={account.id} value={account.id.toString()}>
                                      {account.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <Input
                                value={
                                  allAccounts?.find(a => a.id === form.watch(`lineItems.${index}.accountId`))?.name || 
                                  expenseAccounts.find(a => a.id === form.watch(`lineItems.${index}.accountId`))?.name || 'N/A'
                                }
                                readOnly
                                className="bg-muted text-xs"
                              />
                            )}
                          </div>
                          <div className="col-span-2">
                            <Label>Tax</Label>
                            {isEditMode ? (
                              <Select
                                value={form.watch(`lineItems.${index}.salesTaxId`)?.toString() || ""}
                                onValueChange={(value) => {
                                  const salesTaxId = value === "" ? null : parseInt(value, 10);
                                  form.setValue(`lineItems.${index}.salesTaxId`, salesTaxId);
                                  updateTotals();
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="None" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="">None</SelectItem>
                                  {salesTaxes?.map((tax) => (
                                    <SelectItem key={tax.id} value={tax.id.toString()}>
                                      {tax.name} ({tax.rate}%)
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <Input
                                value={
                                  form.watch(`lineItems.${index}.salesTaxId`) 
                                    ? salesTaxes?.find(t => t.id === form.watch(`lineItems.${index}.salesTaxId`))?.name + ` (${salesTaxes?.find(t => t.id === form.watch(`lineItems.${index}.salesTaxId`))?.rate}%)` || 'N/A'
                                    : 'None'
                                }
                                readOnly
                                className="bg-muted text-xs"
                              />
                            )}
                          </div>
                          <div className="col-span-1">
                            {isEditMode && form.watch("lineItems").length > 1 && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => removeLineItem(index)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="description">Notes</Label>
                        <Textarea
                          id="description"
                          {...form.register("description")}
                          placeholder="Additional notes or comments"
                          readOnly={!isEditMode}
                          className={!isEditMode ? "bg-muted" : ""}
                        />
                      </div>
                      {isEditMode && (
                        <div>
                          <Label htmlFor="attachment">Attachment</Label>
                          <Input
                            id="attachment"
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx"
                            placeholder="Choose file..."
                          />
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span className="font-semibold">
                          {formatCurrency(form.watch("subTotal") || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tax:</span>
                        <span className="font-semibold">
                          {formatCurrency(form.watch("taxAmount") || 0)}
                        </span>
                      </div>
                      <Separator />
                      <div className="flex justify-between text-lg font-bold">
                        <span>Total:</span>
                        <span>{formatCurrency(form.watch("totalAmount") || 0)}</span>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </CardContent>
            </Card>
          </Tabs>
        </form>
      </Form>
    </div>
  );
}