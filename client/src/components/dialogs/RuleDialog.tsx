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
  contactType: string;
}

interface SalesTax {
  id: number;
  name: string;
  rate: number;
  isActive: boolean;
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
    }
  }, [rule, open]);

  // Create/update rule mutation
  const saveRuleMutation = useMutation({
    mutationFn: async (data: any) => {
      if (rule?.id) {
        return await apiRequest(`/api/categorization-rules/${rule.id}`, 'PATCH', data);
      } else {
        return await apiRequest('/api/categorization-rules', 'POST', data);
      }
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

    const ruleData: any = {
      name: name.trim(),
      conditions,
      actions,
    };

    // Add salesTaxId if selected
    if (salesTaxId) {
      ruleData.salesTaxId = parseInt(salesTaxId);
    }

    saveRuleMutation.mutate(ruleData);
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
                    items={[
                      { value: "", label: "+ None" },
                      ...salesTaxes
                        .filter(tax => tax.isActive)
                        .map((tax) => ({
                          value: tax.id.toString(),
                          label: `${tax.name} (${tax.rate}%)`,
                        }))
                    ]}
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
                  <Label htmlFor="contact-name">Contact/Vendor Name (Optional)</Label>
                  <Input
                    id="contact-name"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="e.g., 'ABC Corp' or 'John Doe'"
                    data-testid="input-contact-name"
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
