import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { format } from "date-fns";

import { Bill, Contact, billSchema, Account } from "@shared/schema";
import { Form } from "@/components/ui/form";
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
import { Loader2, Plus, Trash2 } from "lucide-react";

export default function BillCreate() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("details");
  const [vendors, setVendors] = useState<Contact[]>([]);
  const [expenseAccounts, setExpenseAccounts] = useState<Account[]>([]);

  // Fetch vendors (contacts of type "vendor")
  const { data: allContacts, isLoading: isLoadingContacts } = useQuery({
    queryKey: ["/api/contacts"],
    select: (data: Contact[]) => data,
  });

  // Fetch expense accounts
  const { data: allAccounts, isLoading: isLoadingAccounts } = useQuery({
    queryKey: ["/api/accounts"],
    select: (data: Account[]) => data,
  });

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
      // Filter accounts to only include expense-type accounts
      const filteredAccounts = allAccounts.filter(
        (account) => account.type === "expenses" || account.type === "cost_of_goods_sold"
      );
      setExpenseAccounts(filteredAccounts);
    }
  }, [allAccounts]);

  // Generate next bill number
  const { data: nextBillNumber, isLoading: isLoadingBillNumber } = useQuery({
    queryKey: ["/api/transactions/next-reference", "bill"],
    queryFn: async () => {
      const res = await fetch(`/api/transactions/next-reference?type=bill`, {
        method: "GET",
        credentials: "include"
      });
      if (!res.ok) {
        throw new Error("Failed to get next bill number");
      }
      const data = await res.json();
      return data.nextReference;
    },
  });

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
        },
      ],
      dueDate: new Date(new Date().setDate(new Date().getDate() + 30)), // 30 days from now
      paymentTerms: "30",
    },
  });

  // Update reference when next bill number is fetched
  useEffect(() => {
    if (nextBillNumber) {
      form.setValue("reference", nextBillNumber);
    }
  }, [nextBillNumber, form]);

  // Create mutation for saving the bill
  const createBill = useMutation({
    mutationFn: async (data: Bill) => {
      const response = await apiRequest("POST", "/api/bills", data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create bill");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Bill created successfully",
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

  // Update amount when quantity or unit price changes
  const updateLineItemAmount = (index: number) => {
    const lineItems = form.getValues("lineItems");
    const quantity = Number(lineItems[index].quantity);
    const unitPrice = Number(lineItems[index].unitPrice);
    const amount = quantity * unitPrice;
    
    form.setValue(`lineItems.${index}.amount`, amount);
    
    // Also update totals
    updateTotals();
  };

  // Update subtotal and total when line items change
  const updateTotals = () => {
    const lineItems = form.getValues("lineItems");
    const subTotal = lineItems.reduce((sum, item) => sum + Number(item.amount), 0);
    
    form.setValue("subTotal", subTotal);
    form.setValue("totalAmount", subTotal);
  };

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
    createBill.mutate(data);
  };

  if (isLoadingContacts || isLoadingAccounts || isLoadingBillNumber) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Create Bill</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/transactions")}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            onClick={form.handleSubmit(onSubmit)}
            disabled={createBill.isPending}
          >
            {createBill.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving
              </>
            ) : (
              "Save Bill"
            )}
          </Button>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Tabs defaultValue="details" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="details">Bill Details</TabsTrigger>
              <TabsTrigger value="payment">Payment Details</TabsTrigger>
            </TabsList>

            <Card>
              <CardContent className="p-6">
                <TabsContent value="details" className="space-y-6 mt-0">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <Label htmlFor="vendor">Vendor</Label>
                      <Select
                        value={form.getValues("contactId")?.toString()}
                        onValueChange={(value) => form.setValue("contactId", parseInt(value))}
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
                        className={form.formState.errors.reference ? "border-destructive" : ""}
                      />
                      {form.formState.errors.reference && (
                        <p className="text-sm text-destructive mt-1">
                          {form.formState.errors.reference.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="date">Bill Date</Label>
                      <DatePicker
                        date={form.getValues("date")}
                        setDate={(date) => form.setValue("date", date)}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      {...form.register("description")}
                      className="h-20"
                    />
                  </div>

                  <Separator />

                  <div>
                    <div className="font-medium mb-2">Line Items</div>
                    <div className="rounded-md border">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-muted/50">
                            <th className="text-left p-2 pl-3">Description</th>
                            <th className="text-left p-2">Account</th>
                            <th className="text-right p-2">Quantity</th>
                            <th className="text-right p-2">Unit Price</th>
                            <th className="text-right p-2 pr-3">Amount</th>
                            <th className="w-10 p-2"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {form.getValues("lineItems").map((_, index) => (
                            <tr key={index} className="border-t">
                              <td className="p-2 pl-3">
                                <Input
                                  {...form.register(`lineItems.${index}.description`)}
                                  className={
                                    form.formState.errors.lineItems?.[index]?.description
                                      ? "border-destructive"
                                      : ""
                                  }
                                />
                                {form.formState.errors.lineItems?.[index]?.description && (
                                  <p className="text-xs text-destructive mt-1">
                                    {form.formState.errors.lineItems[index]?.description?.message}
                                  </p>
                                )}
                              </td>
                              <td className="p-2">
                                <Select
                                  value={form.getValues(`lineItems.${index}.accountId`)?.toString()}
                                  onValueChange={(value) => {
                                    form.setValue(`lineItems.${index}.accountId`, parseInt(value));
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select account" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {expenseAccounts.map((account) => (
                                      <SelectItem key={account.id} value={account.id.toString()}>
                                        {account.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
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
                                />
                              </td>
                              <td className="p-2 pr-3">
                                <Input
                                  type="number"
                                  readOnly
                                  {...form.register(`lineItems.${index}.amount`)}
                                  className="bg-muted text-right"
                                />
                              </td>
                              <td className="p-2">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeLineItem(index)}
                                >
                                  <Trash2 className="h-4 w-4" />
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
                    >
                      <Plus className="h-4 w-4 mr-2" /> Add Line Item
                    </Button>
                  </div>

                  <div className="flex justify-end">
                    <div className="w-1/3 space-y-2">
                      <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span>${form.getValues("subTotal")?.toFixed(2) || "0.00"}</span>
                      </div>
                      <div className="flex justify-between font-medium">
                        <span>Total:</span>
                        <span>${form.getValues("totalAmount")?.toFixed(2) || "0.00"}</span>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="payment" className="mt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="dueDate">Due Date</Label>
                      <DatePicker
                        date={form.getValues("dueDate") || new Date()}
                        setDate={(date) => form.setValue("dueDate", date)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="paymentTerms">Payment Terms</Label>
                      <Select
                        value={form.getValues("paymentTerms")?.toString()}
                        onValueChange={(value) => {
                          form.setValue("paymentTerms", value);
                          // Update due date based on terms
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