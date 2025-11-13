import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { z } from "zod";

import { Contact, Account, SalesTax } from "@shared/schema";
import {
  Form,
  FormField,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { DatePicker } from "@/components/ui/date-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect, SearchableSelectItem } from "@/components/ui/searchable-select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Trash2 } from "lucide-react";
import AddVendorDialog from "@/components/dialogs/AddVendorDialog";

// Define form schema for vendor credit
const vendorCreditSchema = z.object({
  date: z.date(),
  contactId: z.number().min(1, "Vendor is required"),
  reference: z.string().min(1, "Credit number is required"),
  description: z.string().optional(),
  lineItems: z.array(z.object({
    description: z.string().min(1, "Description is required"),
    quantity: z.number().min(0.01, "Quantity must be at least 0.01"),
    unitPrice: z.number().min(0, "Unit price must be positive"),
    amount: z.number(),
    accountId: z.number().optional(),
    salesTaxId: z.number().nullable().optional(),
  })).min(1, "At least one line item is required"),
  subTotal: z.number().optional(),
  taxAmount: z.number().optional(),
  totalAmount: z.number().optional(),
});

type VendorCreditForm = z.infer<typeof vendorCreditSchema>;

export default function VendorCreditCreate() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("details");
  const [vendors, setVendors] = useState<Contact[]>([]);
  const [expenseAccounts, setExpenseAccounts] = useState<Account[]>([]);
  const [isExclusiveOfTax, setIsExclusiveOfTax] = useState(true);
  const [showAddVendorDialog, setShowAddVendorDialog] = useState(false);

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

  useEffect(() => {
    if (allContacts) {
      const vendorContacts = allContacts.filter(
        (contact) => contact.type === "vendor" || contact.type === "both"
      );
      setVendors(vendorContacts);
    }
  }, [allContacts]);

  useEffect(() => {
    if (allAccounts) {
      const filteredAccounts = allAccounts.filter(
        (account) => account.type === "expenses" || account.type === "other_expense" || account.type === "cost_of_goods_sold"
      );
      setExpenseAccounts(filteredAccounts);
    }
  }, [allAccounts]);

  // Transform expense accounts for SearchableSelect
  const expenseAccountItems: SearchableSelectItem[] = expenseAccounts.map((account) => ({
    value: account.id.toString(),
    label: account.name,
    subtitle: undefined
  }));

  // Transform vendors for SearchableSelect
  const vendorItems: SearchableSelectItem[] = vendors.map((vendor) => ({
    value: vendor.id.toString(),
    label: vendor.name,
    subtitle: undefined
  }));

  // Generate next vendor credit number
  const { data: nextCreditNumber, isLoading: isLoadingCreditNumber } = useQuery({
    queryKey: ["/api/transactions", "vendor-credit-prefix"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/transactions", {
          method: "GET",
          credentials: "include"
        });
        
        if (!response.ok) {
          throw new Error("Failed to fetch transactions");
        }
        
        const transactions = await response.json();
        const credits = transactions.filter((t: any) => t.type === "vendor_credit" && t.reference && t.reference.startsWith("VC-"));
        
        if (credits.length === 0) {
          return "VC-0001";
        }
        
        const creditNumbers = credits.map((credit: any) => {
          const match = credit.reference.match(/VC-(\d+)/);
          return match ? parseInt(match[1], 10) : 0;
        });
        
        const highestNumber = Math.max(0, ...creditNumbers);
        return `VC-${(highestNumber + 1).toString().padStart(4, '0')}`;
      } catch (error) {
        console.error("Error generating credit number:", error);
        return "VC-0001";
      }
    }
  });

  // Set up form with default values
  const form = useForm<VendorCreditForm>({
    resolver: zodResolver(vendorCreditSchema),
    defaultValues: {
      date: new Date(),
      contactId: 0,
      reference: "",
      description: "",
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
    },
  });

  useEffect(() => {
    if (nextCreditNumber) {
      form.setValue("reference", nextCreditNumber);
    }
  }, [nextCreditNumber, form]);

  useEffect(() => {
    if (salesTaxes && salesTaxes.length > 0) {
      updateTotals();
    }
  }, [salesTaxes, isExclusiveOfTax]);

  // Create mutation for saving the vendor credit
  const createVendorCredit = useMutation({
    mutationFn: async (data: VendorCreditForm) => {
      const payload = {
        ...data,
        type: "vendor_credit",
        status: "unapplied_credit",
      };
      return await apiRequest("/api/vendor-credits", "POST", payload);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Vendor credit created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      navigate("/transactions");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateLineItemAmount = (index: number) => {
    const lineItems = form.getValues("lineItems");
    const quantity = Number(lineItems[index].quantity);
    const unitPrice = Number(lineItems[index].unitPrice);
    const amount = quantity * unitPrice;
    
    form.setValue(`lineItems.${index}.amount`, amount);
    updateTotals();
  };

  const updateTotals = () => {
    const lineItems = form.getValues("lineItems");
    const subTotal = lineItems.reduce((sum, item) => sum + Number(item.amount), 0);
    
    let totalTaxAmount = 0;
    
    lineItems.forEach((item) => {
      if (item.salesTaxId) {
        const salesTax = salesTaxes?.find(tax => tax.id === item.salesTaxId);
        if (salesTax) {
          if (salesTax.isComposite) {
            const components = salesTaxes?.filter(tax => tax.parentId === salesTax.id) || [];
            const totalRate = components.reduce((sum, component) => sum + component.rate, 0);
            let taxAmount: number;
            if (isExclusiveOfTax) {
              taxAmount = (item.amount * totalRate) / 100;
            } else {
              taxAmount = item.amount - (item.amount * 100) / (100 + totalRate);
            }
            totalTaxAmount += taxAmount;
          } else {
            let taxAmount: number;
            if (isExclusiveOfTax) {
              taxAmount = (item.amount * salesTax.rate) / 100;
            } else {
              taxAmount = item.amount - (item.amount * 100) / (100 + salesTax.rate);
            }
            totalTaxAmount += taxAmount;
          }
        }
      }
    });
    
    form.setValue("subTotal", subTotal);
    form.setValue("taxAmount", totalTaxAmount);
    form.setValue("totalAmount", isExclusiveOfTax ? subTotal + totalTaxAmount : subTotal);
  };

  const addLineItem = () => {
    const lineItems = form.getValues("lineItems");
    lineItems.push({
      description: "",
      quantity: 1,
      unitPrice: 0,
      amount: 0,
    });
    form.setValue("lineItems", lineItems);
    updateTotals();
  };

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

  const onSubmit = (data: VendorCreditForm) => {
    updateTotals();
    
    const submissionData = {
      ...data,
      subTotal: form.getValues("subTotal") || 0,
      taxAmount: form.getValues("taxAmount") || 0,
      totalAmount: form.getValues("totalAmount") || 0,
    };
    
    createVendorCredit.mutate(submissionData);
  };

  const handleAddVendor = (vendorId: number) => {
    form.setValue("contactId", vendorId);
    setShowAddVendorDialog(false);
    queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
  };

  if (isLoadingContacts || isLoadingAccounts || isLoadingCreditNumber) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold" data-testid="text-page-title">Create Vendor Credit</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.history.back()} data-testid="button-cancel">
            Cancel
          </Button>
          <Button 
            type="submit" 
            onClick={form.handleSubmit(onSubmit)}
            disabled={createVendorCredit.isPending}
            data-testid="button-save"
          >
            {createVendorCredit.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving
              </>
            ) : (
              "Save Credit"
            )}
          </Button>
        </div>
      </div>

      <AddVendorDialog
        open={showAddVendorDialog}
        onOpenChange={setShowAddVendorDialog}
        onSuccess={handleAddVendor}
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Tabs defaultValue="details" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="details">Credit Details</TabsTrigger>
            </TabsList>

            <Card>
              <CardContent className="p-6">
                <TabsContent value="details" className="space-y-6 mt-0">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <Label htmlFor="vendor">Vendor</Label>
                      <SearchableSelect
                        items={vendorItems}
                        value={form.watch("contactId") > 0 ? form.watch("contactId").toString() : ""}
                        onValueChange={(value) => {
                          const contactId = parseInt(value, 10);
                          if (!isNaN(contactId)) {
                            form.setValue("contactId", contactId);
                            form.trigger("contactId");
                          }
                        }}
                        onAddNew={() => setShowAddVendorDialog(true)}
                        addNewText="Add New Vendor"
                        placeholder="Select vendor"
                        searchPlaceholder="Search vendors..."
                        emptyText="No vendors found"
                        className={form.formState.errors.contactId ? "border-destructive" : ""}
                        data-testid="select-vendor"
                      />
                      {form.formState.errors.contactId && (
                        <p className="text-sm text-destructive mt-1">
                          {form.formState.errors.contactId.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="reference">Credit Number</Label>
                      <Input
                        id="reference"
                        {...form.register("reference")}
                        className={form.formState.errors.reference ? "border-destructive" : ""}
                        data-testid="input-reference"
                      />
                      {form.formState.errors.reference && (
                        <p className="text-sm text-destructive mt-1">
                          {form.formState.errors.reference.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="date">Credit Date</Label>
                      <DatePicker
                        date={form.watch("date")}
                        setDate={(date) => form.setValue("date", date)}
                        data-testid="date-picker-date"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="description">Description / Reason</Label>
                    <Textarea
                      id="description"
                      {...form.register("description")}
                      placeholder="e.g., Return to vendor, Price adjustment..."
                      className="h-20"
                      data-testid="textarea-description"
                    />
                  </div>

                  <Separator />

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <div className="font-medium">Line Items</div>
                      <div className="w-full flex justify-end">
                        <div className="flex items-center">
                          <span className="mr-2 text-sm text-muted-foreground">Amounts are</span>
                          <Select
                            value={isExclusiveOfTax ? "exclusive" : "inclusive"}
                            onValueChange={(value) => setIsExclusiveOfTax(value === "exclusive")}
                          >
                            <SelectTrigger className="w-[180px] h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="exclusive">Exclusive of Tax</SelectItem>
                              <SelectItem value="inclusive">Inclusive of Tax</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-md border">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-muted/50">
                            <th className="text-center p-2 w-12">#</th>
                            <th className="text-left p-2 pl-3">Account</th>
                            <th className="text-left p-2">Description</th>
                            <th className="text-right p-2">Quantity</th>
                            <th className="text-right p-2">Unit Price</th>
                            <th className="text-right p-2">Amount</th>
                            <th className="text-left p-2">Sales Tax</th>
                            <th className="w-10 p-2"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {form.getValues("lineItems").map((_, index) => (
                            <tr key={index} className="border-t">
                              <td className="p-2 text-center text-muted-foreground">
                                {index + 1}
                              </td>
                              <td className="p-2 pl-3">
                                <SearchableSelect
                                  items={expenseAccountItems}
                                  value={form.getValues(`lineItems.${index}.accountId`)?.toString()}
                                  onValueChange={(value) => {
                                    form.setValue(`lineItems.${index}.accountId`, parseInt(value));
                                  }}
                                  placeholder="Select account"
                                  searchPlaceholder="Search accounts..."
                                  emptyText="No accounts found."
                                />
                              </td>
                              <td className="p-2">
                                <Input
                                  {...form.register(`lineItems.${index}.description`)}
                                  className={
                                    form.formState.errors.lineItems?.[index]?.description
                                      ? "border-destructive"
                                      : ""
                                  }
                                  data-testid={`input-line-description-${index}`}
                                />
                                {form.formState.errors.lineItems?.[index]?.description && (
                                  <p className="text-xs text-destructive mt-1">
                                    {form.formState.errors.lineItems[index]?.description?.message}
                                  </p>
                                )}
                              </td>
                              <td className="p-2">
                                <Input
                                  type="number"
                                  min="0.01"
                                  step="0.01"
                                  {...form.register(`lineItems.${index}.quantity`, {
                                    onChange: () => updateLineItemAmount(index),
                                    valueAsNumber: true,
                                  })}
                                  className={
                                    form.formState.errors.lineItems?.[index]?.quantity
                                      ? "border-destructive text-right"
                                      : "text-right"
                                  }
                                  data-testid={`input-line-quantity-${index}`}
                                />
                              </td>
                              <td className="p-2">
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  {...form.register(`lineItems.${index}.unitPrice`, {
                                    onChange: () => updateLineItemAmount(index),
                                    valueAsNumber: true,
                                  })}
                                  className={
                                    form.formState.errors.lineItems?.[index]?.unitPrice
                                      ? "border-destructive text-right"
                                      : "text-right"
                                  }
                                  data-testid={`input-line-unitPrice-${index}`}
                                />
                              </td>
                              <td className="p-2">
                                <Input
                                  type="number"
                                  readOnly
                                  value={form.getValues(`lineItems.${index}.amount`).toFixed(2)}
                                  className="text-right bg-muted"
                                  data-testid={`input-line-amount-${index}`}
                                />
                              </td>
                              <td className="p-2">
                                <FormField
                                  control={form.control}
                                  name={`lineItems.${index}.salesTaxId`}
                                  render={({ field }) => (
                                    <Select
                                      value={field.value?.toString() || "0"}
                                      onValueChange={(value) => {
                                        field.onChange(value === "0" ? null : parseInt(value));
                                        updateTotals();
                                      }}
                                    >
                                      <SelectTrigger className="w-[150px]">
                                        <SelectValue placeholder="Select tax" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {salesTaxes?.filter(tax => !tax.parentId).map((tax) => (
                                          <SelectItem key={tax.id} value={tax.id.toString()}>
                                            {tax.name} ({tax.rate}%)
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  )}
                                />
                              </td>
                              <td className="p-2">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeLineItem(index)}
                                  data-testid={`button-remove-line-${index}`}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={addLineItem}
                      data-testid="button-add-line"
                    >
                      <Plus className="h-4 w-4 mr-1" /> Add Line
                    </Button>
                  </div>

                  <Separator />

                  <div className="flex justify-end">
                    <div className="w-full md:w-1/3 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal:</span>
                        <span data-testid="text-subtotal">${(form.watch("subTotal") || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Tax:</span>
                        <span data-testid="text-tax">${(form.watch("taxAmount") || 0).toFixed(2)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between font-bold text-lg">
                        <span>Total Credit:</span>
                        <span data-testid="text-total">${(form.watch("totalAmount") || 0).toFixed(2)}</span>
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
