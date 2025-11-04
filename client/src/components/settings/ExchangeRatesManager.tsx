import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
import { SearchableSelect, SearchableSelectItem } from "@/components/ui/searchable-select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Edit, Trash2, Calendar as CalendarIcon, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ExchangeRate, Currency } from "@shared/schema";

const exchangeRateFormSchema = z.object({
  fromCurrency: z.string().min(3, "From currency is required"),
  toCurrency: z.string().min(3, "To currency is required"),
  rate: z.string().min(1, "Exchange rate is required").refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: "Rate must be a positive number"
  }),
  effectiveDate: z.date({
    required_error: "Effective date is required",
  }),
  isManual: z.boolean().default(true),
});

type ExchangeRateFormValues = z.infer<typeof exchangeRateFormSchema>;

interface ExchangeRatesManagerProps {
  homeCurrency: string;
}

export default function ExchangeRatesManager({ homeCurrency }: ExchangeRatesManagerProps) {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedRate, setSelectedRate] = useState<ExchangeRate | null>(null);
  const [filterCurrency, setFilterCurrency] = useState<string>("");

  const exchangeRatesQuery = useQuery<ExchangeRate[]>({
    queryKey: ['/api/exchange-rates'],
  });

  const currenciesQuery = useQuery<Currency[]>({
    queryKey: ['/api/currencies'],
  });

  const addForm = useForm<ExchangeRateFormValues>({
    resolver: zodResolver(exchangeRateFormSchema),
    defaultValues: {
      fromCurrency: homeCurrency,
      toCurrency: "",
      rate: "",
      effectiveDate: new Date(),
      isManual: true,
    },
  });

  const editForm = useForm<ExchangeRateFormValues>({
    resolver: zodResolver(exchangeRateFormSchema),
  });

  const createMutation = useMutation({
    mutationFn: async (data: ExchangeRateFormValues) => {
      return await apiRequest('/api/exchange-rates', 'POST', {
        fromCurrency: data.fromCurrency,
        toCurrency: data.toCurrency,
        rate: data.rate,
        effectiveDate: format(data.effectiveDate, 'yyyy-MM-dd'),
        isManual: data.isManual,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/exchange-rates'] });
      toast({
        title: "Success",
        description: "Exchange rate added successfully",
      });
      setIsAddDialogOpen(false);
      addForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add exchange rate",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: ExchangeRateFormValues }) => {
      return await apiRequest(`/api/exchange-rates/${id}`, 'PUT', {
        fromCurrency: data.fromCurrency,
        toCurrency: data.toCurrency,
        rate: data.rate,
        effectiveDate: format(data.effectiveDate, 'yyyy-MM-dd'),
        isManual: data.isManual,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/exchange-rates'] });
      toast({
        title: "Success",
        description: "Exchange rate updated successfully",
      });
      setIsEditDialogOpen(false);
      setSelectedRate(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update exchange rate",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/exchange-rates/${id}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/exchange-rates'] });
      toast({
        title: "Success",
        description: "Exchange rate deleted successfully",
      });
      setIsDeleteDialogOpen(false);
      setSelectedRate(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete exchange rate",
        variant: "destructive",
      });
    },
  });

  const handleAdd = (data: ExchangeRateFormValues) => {
    createMutation.mutate(data);
  };

  const handleEdit = (rate: ExchangeRate) => {
    setSelectedRate(rate);
    editForm.reset({
      fromCurrency: rate.fromCurrency,
      toCurrency: rate.toCurrency,
      rate: rate.rate,
      effectiveDate: new Date(rate.effectiveDate),
      isManual: rate.isManual,
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = (data: ExchangeRateFormValues) => {
    if (selectedRate) {
      updateMutation.mutate({ id: selectedRate.id, data });
    }
  };

  const handleDelete = (rate: ExchangeRate) => {
    setSelectedRate(rate);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedRate) {
      deleteMutation.mutate(selectedRate.id);
    }
  };

  const currencies = currenciesQuery.data || [];
  const currencyItems: SearchableSelectItem[] = currencies.map((currency) => ({
    value: currency.code,
    label: `${currency.code} - ${currency.name}`,
  }));

  const exchangeRates = exchangeRatesQuery.data || [];
  const filteredRates = filterCurrency
    ? exchangeRates.filter(
        (rate) =>
          rate.fromCurrency === filterCurrency || rate.toCurrency === filterCurrency
      )
    : exchangeRates;

  // Sort by effective date (most recent first)
  const sortedRates = [...filteredRates].sort((a, b) => 
    new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime()
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 max-w-xs">
          <SearchableSelect
            items={[{ value: "", label: "All Currencies" }, ...currencyItems]}
            value={filterCurrency}
            onValueChange={setFilterCurrency}
            placeholder="Filter by currency"
            searchPlaceholder="Search currencies..."
            emptyText="No currencies found"
            data-testid="filter-currency"
          />
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)} data-testid="button-add-rate">
          <Plus className="h-4 w-4 mr-2" />
          Add Exchange Rate
        </Button>
      </div>

      {exchangeRatesQuery.isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading exchange rates...</div>
      ) : sortedRates.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          {filterCurrency
            ? `No exchange rates found for ${filterCurrency}`
            : "No exchange rates configured. Add your first rate to get started."}
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>From</TableHead>
                <TableHead className="text-center">→</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>Effective Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedRates.map((rate) => (
                <TableRow key={rate.id} data-testid={`row-rate-${rate.id}`}>
                  <TableCell className="font-medium">{rate.fromCurrency}</TableCell>
                  <TableCell className="text-center">
                    <ArrowRight className="h-4 w-4 mx-auto text-muted-foreground" />
                  </TableCell>
                  <TableCell className="font-medium">{rate.toCurrency}</TableCell>
                  <TableCell>{parseFloat(rate.rate).toFixed(6)}</TableCell>
                  <TableCell>{format(new Date(rate.effectiveDate), 'MMM d, yyyy')}</TableCell>
                  <TableCell>
                    <span className={cn(
                      "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
                      rate.isManual
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                        : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                    )}>
                      {rate.isManual ? "Manual" : "Automatic"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(rate)}
                        data-testid={`button-edit-rate-${rate.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(rate)}
                        data-testid={`button-delete-rate-${rate.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add Rate Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent data-testid="dialog-add-rate">
          <DialogHeader>
            <DialogTitle>Add Exchange Rate</DialogTitle>
            <DialogDescription>
              Add a new exchange rate for a currency pair effective on a specific date
            </DialogDescription>
          </DialogHeader>
          <Form {...addForm}>
            <form onSubmit={addForm.handleSubmit(handleAdd)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={addForm.control}
                  name="fromCurrency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>From Currency</FormLabel>
                      <FormControl>
                        <SearchableSelect
                          items={currencyItems}
                          value={field.value}
                          onValueChange={field.onChange}
                          placeholder="Select currency"
                          searchPlaceholder="Search currencies..."
                          emptyText="No currencies found"
                          data-testid="select-from-currency"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={addForm.control}
                  name="toCurrency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>To Currency</FormLabel>
                      <FormControl>
                        <SearchableSelect
                          items={currencyItems}
                          value={field.value}
                          onValueChange={field.onChange}
                          placeholder="Select currency"
                          searchPlaceholder="Search currencies..."
                          emptyText="No currencies found"
                          data-testid="select-to-currency"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={addForm.control}
                name="rate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Exchange Rate</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="1.250000"
                        type="text"
                        step="0.000001"
                        data-testid="input-rate"
                      />
                    </FormControl>
                    <p className="text-sm text-muted-foreground">
                      How many units of the "To" currency equals 1 unit of the "From" currency
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={addForm.control}
                name="effectiveDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Effective Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                            data-testid="button-select-date"
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(false)}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit">
                  {createMutation.isPending ? "Adding..." : "Add Rate"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Rate Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent data-testid="dialog-edit-rate">
          <DialogHeader>
            <DialogTitle>Edit Exchange Rate</DialogTitle>
            <DialogDescription>
              Update the exchange rate for this currency pair
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleUpdate)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="fromCurrency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>From Currency</FormLabel>
                      <FormControl>
                        <SearchableSelect
                          items={currencyItems}
                          value={field.value}
                          onValueChange={field.onChange}
                          placeholder="Select currency"
                          searchPlaceholder="Search currencies..."
                          emptyText="No currencies found"
                          disabled
                          data-testid="select-edit-from-currency"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="toCurrency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>To Currency</FormLabel>
                      <FormControl>
                        <SearchableSelect
                          items={currencyItems}
                          value={field.value}
                          onValueChange={field.onChange}
                          placeholder="Select currency"
                          searchPlaceholder="Search currencies..."
                          emptyText="No currencies found"
                          disabled
                          data-testid="select-edit-to-currency"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={editForm.control}
                name="rate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Exchange Rate</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="1.250000"
                        type="text"
                        step="0.000001"
                        data-testid="input-edit-rate"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="effectiveDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Effective Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                            disabled
                            data-testid="button-edit-select-date"
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                    </Popover>
                    <p className="text-sm text-muted-foreground">
                      Effective date cannot be changed after creation
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                  data-testid="button-cancel-edit"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={updateMutation.isPending} data-testid="button-submit-edit">
                  {updateMutation.isPending ? "Updating..." : "Update Rate"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent data-testid="dialog-delete-rate">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Exchange Rate</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this exchange rate? This action cannot be undone.
              {selectedRate && (
                <div className="mt-4 p-3 bg-muted rounded-md">
                  <div className="text-sm font-medium text-foreground">
                    {selectedRate.fromCurrency} → {selectedRate.toCurrency}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Rate: {parseFloat(selectedRate.rate).toFixed(6)} | 
                    Date: {format(new Date(selectedRate.effectiveDate), 'MMM d, yyyy')}
                  </div>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
