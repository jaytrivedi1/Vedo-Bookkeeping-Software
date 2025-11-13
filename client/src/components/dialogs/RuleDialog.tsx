import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect, type SearchableSelectItem } from "@/components/ui/searchable-select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface RuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule?: any | null;
}

interface GLAccount {
  id: number;
  name: string;
  code: string;
  type: string;
}

interface Contact {
  id: number;
  name: string;
  type: string;
}

interface SalesTax {
  id: number;
  name: string;
  rate: number;
  isActive: boolean;
  parentId: number | null;
}

export function RuleDialog({ open, onOpenChange, rule }: RuleDialogProps) {
  const { toast } = useToast();
  
  // Form state
  const [name, setName] = useState("");
  const [descriptionContains, setDescriptionContains] = useState("");
  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");
  const [accountId, setAccountId] = useState<string>("");
  const [salesTaxId, setSalesTaxId] = useState<string>("");
  const [contactName, setContactName] = useState("");
  const [memo, setMemo] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [removeAttachment, setRemoveAttachment] = useState(false);

  // Fetch accounts
  const { data: accounts = [] } = useQuery<GLAccount[]>({
    queryKey: ['/api/accounts'],
  });

  // Fetch contacts
  const { data: contacts = [] } = useQuery<Contact[]>({
    queryKey: ['/api/contacts'],
  });

  // Fetch sales taxes
  const { data: salesTaxes = [] } = useQuery<SalesTax[]>({
    queryKey: ['/api/sales-taxes'],
  });

  // Filter accounts to only expense/income accounts for categorization
  const categorizeableAccounts = accounts.filter(
    acc => {
      const type = acc.type.toLowerCase();
      return type === 'expense' || 
             type === 'expenses' ||
             type === 'revenue' || 
             type === 'income' ||
             type === 'other_expense' || 
             type === 'other_income';
    }
  );

  // Transform contacts for SearchableSelect
  const contactItems: SearchableSelectItem[] = contacts.map(contact => ({
    value: contact.name,
    label: contact.name,
    subtitle: `· ${contact.type}`
  }));

  // Initialize form when editing
  useEffect(() => {
    if (rule) {
      setName(rule.name || "");
      setDescriptionContains(rule.conditions?.descriptionContains || "");
      setAmountMin(rule.conditions?.amountMin?.toString() || "");
      setAmountMax(rule.conditions?.amountMax?.toString() || "");
      setAccountId(rule.actions?.accountId?.toString() || "");
      setSalesTaxId(rule.salesTaxId?.toString() || "");
      setContactName(rule.actions?.contactName || "");
      setMemo(rule.actions?.memo || "");
      setSelectedFile(null);
      setRemoveAttachment(false);
    } else {
      // Reset form for new rule
      setName("");
      setDescriptionContains("");
      setAmountMin("");
      setAmountMax("");
      setAccountId("");
      setSalesTaxId("");
      setContactName("");
      setMemo("");
      setSelectedFile(null);
      setRemoveAttachment(false);
    }
  }, [rule, open]);

  // Create/update rule mutation
  const saveRuleMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const url = rule?.id ? `/api/categorization-rules/${rule.id}` : '/api/categorization-rules';
      const method = rule?.id ? 'PATCH' : 'POST';
      
      const response = await fetch(url, {
        method,
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `Failed to ${method === 'POST' ? 'create' : 'update'} rule`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/categorization-rules'] });
      toast({
        title: "Success",
        description: rule?.id ? "Rule updated successfully" : "Rule created successfully",
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save rule",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    // Validate
    if (!name.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a rule name",
        variant: "destructive",
      });
      return;
    }

    if (!descriptionContains.trim() && !amountMin && !amountMax) {
      toast({
        title: "Validation Error",
        description: "Please add at least one condition",
        variant: "destructive",
      });
      return;
    }

    if (!accountId) {
      toast({
        title: "Validation Error",
        description: "Please select an account to categorize to",
        variant: "destructive",
      });
      return;
    }

    // Build conditions
    const conditions: any = {};
    if (descriptionContains.trim()) {
      conditions.descriptionContains = descriptionContains.trim();
    }
    if (amountMin) {
      conditions.amountMin = parseFloat(amountMin);
    }
    if (amountMax) {
      conditions.amountMax = parseFloat(amountMax);
    }

    // Build actions
    const actions: any = {
      accountId: parseInt(accountId),
    };
    if (contactName.trim()) {
      actions.contactName = contactName.trim();
    }
    if (memo.trim()) {
      actions.memo = memo.trim();
    }

    // Create FormData
    const formData = new FormData();
    formData.append('name', name.trim());
    formData.append('conditions', JSON.stringify(conditions));
    formData.append('actions', JSON.stringify(actions));
    
    // Preserve existing values for isEnabled and priority when editing, or use defaults for new rules
    const isEnabled = rule?.isEnabled !== undefined ? rule.isEnabled : true;
    const priority = rule?.priority !== undefined ? rule.priority : 0;
    formData.append('isEnabled', JSON.stringify(isEnabled));
    formData.append('priority', String(priority));
    
    if (salesTaxId) {
      formData.append('salesTaxId', salesTaxId);
    }
    
    // Add file if selected
    if (selectedFile) {
      formData.append('attachment', selectedFile);
    }
    
    // Remove attachment if requested
    if (removeAttachment && rule?.attachmentPath) {
      formData.append('attachmentPath', '');
    }

    saveRuleMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{rule?.id ? 'Edit Rule' : 'Create Rule'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Rule Name */}
          <div className="space-y-2">
            <Label htmlFor="rule-name">Rule Name *</Label>
            <Input
              id="rule-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., 'Office Supplies from Staples'"
              data-testid="input-rule-name"
            />
          </div>

          {/* Conditions Section */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-medium mb-4">Conditions (When these match...)</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="description-contains">Description Contains</Label>
                  <Input
                    id="description-contains"
                    value={descriptionContains}
                    onChange={(e) => setDescriptionContains(e.target.value)}
                    placeholder="e.g., 'STAPLES' or 'AMAZON'"
                    data-testid="input-description-contains"
                  />
                  <p className="text-xs text-gray-500">
                    Case-insensitive. The transaction description must contain this text.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount-min">Minimum Amount</Label>
                    <Input
                      id="amount-min"
                      type="number"
                      step="0.01"
                      value={amountMin}
                      onChange={(e) => setAmountMin(e.target.value)}
                      placeholder="0.00"
                      data-testid="input-amount-min"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="amount-max">Maximum Amount</Label>
                    <Input
                      id="amount-max"
                      type="number"
                      step="0.01"
                      value={amountMax}
                      onChange={(e) => setAmountMax(e.target.value)}
                      placeholder="0.00"
                      data-testid="input-amount-max"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions Section */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-medium mb-4">Actions (Do this...)</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Categorize to Account *</Label>
                  <SearchableSelect
                    items={categorizeableAccounts.map((account) => ({
                      value: account.id.toString(),
                      label: `${account.code} - ${account.name}`,
                    }))}
                    value={accountId}
                    onValueChange={setAccountId}
                    placeholder="Select account..."
                    data-testid="select-account"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Sales Tax (Optional)</Label>
                  <SearchableSelect
                    items={salesTaxes
                      .filter(tax => tax.isActive && !tax.parentId)
                      .map((tax) => ({
                        value: tax.id.toString(),
                        label: `${tax.name} (${tax.rate}%)`,
                      }))}
                    value={salesTaxId}
                    onValueChange={setSalesTaxId}
                    placeholder="Select sales tax..."
                    data-testid="select-sales-tax"
                  />
                  <p className="text-xs text-gray-500">
                    Automatically apply this tax to categorized transactions
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Contact Name (Optional)</Label>
                  <SearchableSelect
                    items={contactItems}
                    value={contactName}
                    onValueChange={setContactName}
                    placeholder="Select contact..."
                    searchPlaceholder="Search contacts..."
                    emptyText="No contacts found"
                    data-testid="select-contact-name"
                  />
                  <p className="text-xs text-gray-500">
                    This will be saved in the transaction's Name field
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="memo">Memo (Optional)</Label>
                  <Input
                    id="memo"
                    value={memo}
                    onChange={(e) => setMemo(e.target.value)}
                    placeholder="e.g., 'Monthly office supplies'"
                    data-testid="input-memo"
                  />
                  <p className="text-xs text-gray-500">
                    This will be saved in the transaction's description
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="attachment">Document Attachment (Optional)</Label>
                  
                  {/* Show existing attachment if present and not being removed */}
                  {rule?.attachmentPath && !removeAttachment && !selectedFile && (
                    <div className="flex items-center gap-2 p-2 border rounded">
                      <span className="text-sm flex-1 truncate">{rule.attachmentPath.split('/').pop()}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          window.open(`/api/categorization-rules/${rule.id}/attachment`, '_blank');
                        }}
                        data-testid="button-view-attachment"
                      >
                        View
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          setRemoveAttachment(true);
                          setSelectedFile(null);
                        }}
                        data-testid="button-remove-attachment"
                      >
                        Remove
                      </Button>
                    </div>
                  )}
                  
                  {/* Show file input if no existing attachment or removing it */}
                  {(!rule?.attachmentPath || removeAttachment) && (
                    <Input
                      id="attachment"
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.csv,.docx"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setSelectedFile(file);
                          setRemoveAttachment(false);
                        }
                      }}
                      data-testid="input-attachment"
                    />
                  )}
                  
                  {/* Show selected file name */}
                  {selectedFile && (
                    <div className="flex items-center gap-2 p-2 border rounded bg-muted">
                      <span className="text-sm flex-1 truncate">{selectedFile.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedFile(null)}
                        data-testid="button-clear-file"
                      >
                        Clear
                      </Button>
                    </div>
                  )}
                  
                  <p className="text-xs text-gray-500">
                    Attach supporting documents (PDF, PNG, JPG, CSV, DOCX, max 10MB)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            data-testid="button-cancel"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={saveRuleMutation.isPending}
            data-testid="button-save-rule"
          >
            {saveRuleMutation.isPending ? 'Saving...' : (rule?.id ? 'Update Rule' : 'Create Rule')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
