import { useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Upload, FileText, CheckCircle2, AlertCircle } from "lucide-react";

interface CSVUploadWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preSelectedAccountId: number;
  onComplete?: () => void;
}

interface ParsedCSV {
  columns: string[];
  preview: any[];
  rowCount: number;
}

interface ColumnMapping {
  date: string;
  description: string;
  amount?: string;
  credit?: string;
  debit?: string;
}

type UploadStep = 'upload' | 'mapping' | 'preview' | 'importing';

export default function CSVUploadWizard({ 
  open, 
  onOpenChange, 
  preSelectedAccountId,
  onComplete 
}: CSVUploadWizardProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<UploadStep>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [parsedCSV, setParsedCSV] = useState<ParsedCSV | null>(null);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    date: '',
    description: '',
  });
  const [importedCount, setImportedCount] = useState(0);
  const [importErrors, setImportErrors] = useState<any[]>([]);

  // Parse CSV mutation
  const parseCSVMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/csv/parse-preview', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to parse CSV');
      }

      return response.json();
    },
    onSuccess: (data) => {
      setParsedCSV(data);
      
      // Auto-detect column mapping
      const headers = data.columns.map((h: string) => h.toLowerCase());
      const mapping: ColumnMapping = {
        date: '',
        description: '',
      };

      // Auto-detect date column
      const dateIndex = headers.findIndex((h: string) => 
        h.includes('date') || h.includes('posted') || h.includes('transaction date')
      );
      if (dateIndex >= 0) mapping.date = data.columns[dateIndex];

      // Auto-detect description column
      const descIndex = headers.findIndex((h: string) => 
        h.includes('desc') || h.includes('detail') || h.includes('memo') || h.includes('payee')
      );
      if (descIndex >= 0) mapping.description = data.columns[descIndex];

      // Auto-detect amount/credit/debit columns
      const amountIndex = headers.findIndex((h: string) => h.includes('amount'));
      const creditIndex = headers.findIndex((h: string) => h.includes('credit') || h.includes('deposit'));
      const debitIndex = headers.findIndex((h: string) => h.includes('debit') || h.includes('withdrawal'));

      if (amountIndex >= 0) {
        mapping.amount = data.columns[amountIndex];
      } else if (creditIndex >= 0 && debitIndex >= 0) {
        mapping.credit = data.columns[creditIndex];
        mapping.debit = data.columns[debitIndex];
      }

      setColumnMapping(mapping);
      setStep('mapping');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to parse CSV file",
        variant: "destructive",
      });
    },
  });

  // Import CSV mutation
  const importCSVMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('Missing file');

      const formData = new FormData();
      formData.append('file', file);
      formData.append('accountId', preSelectedAccountId.toString());
      formData.append('columnMapping', JSON.stringify(columnMapping));

      const response = await fetch('/api/csv/import', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to import CSV');
      }

      return response.json();
    },
    onSuccess: (data) => {
      setImportedCount(data.imported);
      setImportErrors(data.errors || []);
      queryClient.invalidateQueries({ queryKey: ['/api/plaid/imported-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
      
      const hasErrors = data.errors && data.errors.length > 0;
      toast({
        title: hasErrors ? "Import Completed with Errors" : "Success",
        description: hasErrors 
          ? `Imported ${data.imported} transactions, ${data.errors.length} rows failed`
          : `Imported ${data.imported} transactions`,
      });

      if (onComplete) {
        onComplete();
      } else {
        handleClose();
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to import transactions",
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.csv')) {
        toast({
          title: "Invalid file type",
          description: "Please select a CSV file",
          variant: "destructive",
        });
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleFileDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      if (!droppedFile.name.endsWith('.csv')) {
        toast({
          title: "Invalid file type",
          description: "Please select a CSV file",
          variant: "destructive",
        });
        return;
      }
      setFile(droppedFile);
    }
  }, [toast]);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleNext = () => {
    if (step === 'upload' && file) {
      parseCSVMutation.mutate(file);
    } else if (step === 'mapping') {
      // Validate mapping
      if (!columnMapping.date || !columnMapping.description) {
        toast({
          title: "Incomplete mapping",
          description: "Please map Date and Description columns",
          variant: "destructive",
        });
        return;
      }
      if (!columnMapping.amount && !(columnMapping.credit && columnMapping.debit)) {
        toast({
          title: "Incomplete mapping",
          description: "Please map either Amount or both Credit and Debit columns",
          variant: "destructive",
        });
        return;
      }
      setStep('preview');
    } else if (step === 'preview') {
      setStep('importing');
      importCSVMutation.mutate();
    }
  };

  const handleBack = () => {
    if (step === 'mapping') setStep('upload');
    else if (step === 'preview') setStep('mapping');
  };

  const handleClose = () => {
    setStep('upload');
    setFile(null);
    setParsedCSV(null);
    setColumnMapping({ date: '', description: '' });
    setImportedCount(0);
    setImportErrors([]);
    onOpenChange(false);
  };

  const getPreviewRows = () => {
    if (!parsedCSV) return [];
    return parsedCSV.preview.slice(0, 5);
  };

  const getStepProgress = () => {
    const steps = ['upload', 'mapping', 'preview', 'importing'];
    const currentIndex = steps.indexOf(step);
    return ((currentIndex + 1) / steps.length) * 100;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Bank Statement (CSV)</DialogTitle>
          <DialogDescription>
            Import transactions from a CSV file exported from your bank
          </DialogDescription>
        </DialogHeader>

        <Progress value={getStepProgress()} className="mb-4" />

        {/* Step 1: File Upload */}
        {step === 'upload' && (
          <div className="space-y-4">
            <div
              onDrop={handleFileDrop}
              onDragOver={handleDragOver}
              className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-primary transition-colors cursor-pointer"
            >
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-sm text-gray-600">
                Drag and drop your CSV file here, or click to browse
              </p>
              <Input
                id="csv-file"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <Label htmlFor="csv-file" className="cursor-pointer">
                <Button variant="outline" className="mt-4" asChild>
                  <span>Select CSV File</span>
                </Button>
              </Label>
            </div>

            {file && (
              <Alert>
                <FileText className="h-4 w-4" />
                <AlertTitle>File selected</AlertTitle>
                <AlertDescription>{file.name} ({(file.size / 1024).toFixed(2)} KB)</AlertDescription>
              </Alert>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">Supported CSV Formats</h4>
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>3-column format: Date, Description, Amount</li>
                <li>4-column format: Date, Description, Credit, Debit</li>
                <li>Date formats: YYYY-MM-DD, MM/DD/YYYY, DD/MM/YYYY</li>
              </ul>
            </div>
          </div>
        )}

        {/* Step 2: Column Mapping */}
        {step === 'mapping' && parsedCSV && (
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Map CSV Columns</AlertTitle>
              <AlertDescription>
                Match your CSV columns to the required transaction fields
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="date-column">Date Column *</Label>
                <Select value={columnMapping.date} onValueChange={(value) => setColumnMapping({ ...columnMapping, date: value })}>
                  <SelectTrigger id="date-column" data-testid="select-date-column">
                    <SelectValue placeholder="Select date column..." />
                  </SelectTrigger>
                  <SelectContent>
                    {parsedCSV.columns.map((header) => (
                      <SelectItem key={header} value={header}>{header}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="description-column">Description Column *</Label>
                <Select value={columnMapping.description} onValueChange={(value) => setColumnMapping({ ...columnMapping, description: value })}>
                  <SelectTrigger id="description-column" data-testid="select-description-column">
                    <SelectValue placeholder="Select description column..." />
                  </SelectTrigger>
                  <SelectContent>
                    {parsedCSV.columns.map((header) => (
                      <SelectItem key={header} value={header}>{header}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="amount-column">Amount Column</Label>
                <Select value={columnMapping.amount || '__none__'} onValueChange={(value) => setColumnMapping({ ...columnMapping, amount: value === '__none__' ? undefined : value, credit: undefined, debit: undefined })}>
                  <SelectTrigger id="amount-column" data-testid="select-amount-column">
                    <SelectValue placeholder="Select amount column..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {parsedCSV.columns.map((header) => (
                      <SelectItem key={header} value={header}>{header}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">Use if your CSV has a single Amount column</p>
              </div>

              <div className="space-y-2">
                <div>
                  <Label htmlFor="credit-column">Credit Column</Label>
                  <Select value={columnMapping.credit || '__none__'} onValueChange={(value) => setColumnMapping({ ...columnMapping, credit: value === '__none__' ? undefined : value, amount: undefined })}>
                    <SelectTrigger id="credit-column" data-testid="select-credit-column">
                      <SelectValue placeholder="Select credit column..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {parsedCSV.columns.map((header) => (
                        <SelectItem key={header} value={header}>{header}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="debit-column">Debit Column</Label>
                  <Select value={columnMapping.debit || '__none__'} onValueChange={(value) => setColumnMapping({ ...columnMapping, debit: value === '__none__' ? undefined : value, amount: undefined })}>
                    <SelectTrigger id="debit-column" data-testid="select-debit-column">
                      <SelectValue placeholder="Select debit column..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {parsedCSV.columns.map((header) => (
                        <SelectItem key={header} value={header}>{header}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-gray-500">Use if your CSV has separate Credit/Debit columns</p>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Preview */}
        {step === 'preview' && parsedCSV && (
          <div className="space-y-4">
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>Preview Transactions</AlertTitle>
              <AlertDescription>
                Review the first 5 transactions before importing
              </AlertDescription>
            </Alert>

            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getPreviewRows().map((row, index) => {
                    let amount = 0;

                    if (columnMapping.amount) {
                      amount = parseFloat(row[columnMapping.amount]) || 0;
                    } else if (columnMapping.credit && columnMapping.debit) {
                      const credit = parseFloat(row[columnMapping.credit]) || 0;
                      const debit = parseFloat(row[columnMapping.debit]) || 0;
                      amount = credit - debit;
                    }

                    return (
                      <TableRow key={index}>
                        <TableCell>{row[columnMapping.date]}</TableCell>
                        <TableCell>{row[columnMapping.description]}</TableCell>
                        <TableCell className={`text-right ${amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ${Math.abs(amount).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <p className="text-sm text-gray-500 text-center">
              {parsedCSV.rowCount} total transactions will be imported
            </p>
          </div>
        )}

        {/* Step 4: Importing */}
        {step === 'importing' && (
          <div className="text-center py-8">
            {importCSVMutation.isPending ? (
              <>
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
                <h3 className="text-lg font-semibold mb-2">Importing Transactions...</h3>
                <p className="text-gray-600">Please wait while we process your CSV file</p>
              </>
            ) : (
              <div className="space-y-4">
                <div className="text-center">
                  <CheckCircle2 className="mx-auto h-16 w-16 text-green-500 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Import Complete!</h3>
                  <p className="text-gray-600">
                    Successfully imported {importedCount} transactions
                  </p>
                </div>

                {importErrors.length > 0 && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Import Errors ({importErrors.length})</AlertTitle>
                    <AlertDescription>
                      <div className="mt-2 max-h-48 overflow-y-auto">
                        <div className="space-y-2 text-sm">
                          {importErrors.slice(0, 10).map((error, index) => (
                            <div key={index} className="border-l-2 border-red-300 pl-2">
                              <div className="font-medium">Row {error.row}:</div>
                              <div className="text-red-700">{error.error}</div>
                            </div>
                          ))}
                          {importErrors.length > 10 && (
                            <p className="text-gray-600 italic">
                              ... and {importErrors.length - 10} more errors
                            </p>
                          )}
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={step === 'importing' && !importCSVMutation.isPending ? handleClose : handleBack}
            disabled={
              step === 'upload' || 
              parseCSVMutation.isPending || 
              importCSVMutation.isPending
            }
            data-testid="button-back"
          >
            {step === 'importing' && !importCSVMutation.isPending ? 'Close' : 'Back'}
          </Button>

          {step !== 'importing' && (
            <Button
              onClick={handleNext}
              disabled={
                (step === 'upload' && !file) ||
                parseCSVMutation.isPending ||
                importCSVMutation.isPending
              }
              data-testid="button-next"
            >
              {parseCSVMutation.isPending || importCSVMutation.isPending ? 'Processing...' : 
               step === 'preview' ? 'Import Transactions' : 'Next'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
