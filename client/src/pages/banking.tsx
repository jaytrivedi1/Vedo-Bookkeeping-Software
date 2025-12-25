import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableSelect, SearchableSelectItem } from "@/components/ui/searchable-select";
// Force complete module rebuild - v3 - clear cache
import { AddAccountDialog } from "@/components/dialogs/AddAccountDialog";
import { AttachmentDialog } from "@/components/dialogs/AttachmentDialog";
import { PayBillsDialog } from "@/components/dialogs/PayBillsDialog";
import { ReceivePaymentsDialog } from "@/components/dialogs/ReceivePaymentsDialog";
import { RuleDialog } from "@/components/dialogs/RuleDialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Building2,
  RefreshCw,
  Trash2,
  AlertCircle,
  Link as LinkIcon,
  Upload,
  Plus,
  CheckCircle2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Paperclip,
  Send,
  GripVertical,
  Search,
  Filter,
  X,
  Brain,
  Hand,
  Sparkles,
  ArrowUpRight,
  Zap
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { BankAccount, ImportedTransaction } from "@shared/schema";
import BankFeedSetupDialog from "@/components/bank-feed-setup-dialog";
import CategorizeTransactionDialog from "@/components/bank-feed-categorization-dialog";
import { formatCurrency, formatContactName } from "@/lib/currencyUtils";

interface Preferences {
  homeCurrency?: string;
}

interface GLAccount {
  id: number;
  name: string;
  code: string;
  type: string;
  balance: number;
}

interface MatchSuggestion {
  transactionId: number;
  transactionType: string; // 'invoice', 'bill', 'expense', 'deposit', 'payment', 'cheque'
  confidence: number;
  amount: number;
  date: string;
  description?: string;
  contactName?: string;
  referenceNumber?: string;
  reference?: string | null;
  contactId?: number | null;
  balance?: number | null;
  matchType?: string;
  matchReason?: string;
}

interface TransactionMatch {
  transactionId: number;
  suggestions: MatchSuggestion[];
  topMatch: MatchSuggestion | null;
}

type SortField = 'date' | 'description' | null;
type SortDirection = 'asc' | 'desc';

interface ColumnWidths {
  checkbox: number;
  date: number;
  description: number;
  name: number;
  payments: number;
  deposits: number;
  account: number;
  tax: number;
  matchCategorize: number;
  docs: number;
  action: number;
}

const DEFAULT_COLUMN_WIDTHS: ColumnWidths = {
  checkbox: 48,
  date: 120,
  description: 250,
  name: 200,
  payments: 120,
  deposits: 120,
  account: 200,
  tax: 150,
  matchCategorize: 180,
  docs: 60,
  action: 100,
};

// Categorization memory helper functions
const saveCategorization = (merchantName: string, accountId: number, contactName: string | null, salesTaxId: number | null) => {
  try {
    const existing = localStorage.getItem('bank_feed_categorizations');
    const categorizations = existing ? JSON.parse(existing) : {};
    categorizations[merchantName] = {
      accountId,
      contactName,
      salesTaxId,
      lastUsed: Date.now()
    };
    localStorage.setItem('bank_feed_categorizations', JSON.stringify(categorizations));
  } catch (error) {
    console.error('Failed to save categorization:', error);
  }
};

const getCategorization = (merchantName: string): { accountId: number, contactName: string | null, salesTaxId: number | null } | null => {
  try {
    const existing = localStorage.getItem('bank_feed_categorizations');
    if (!existing) return null;
    const categorizations = JSON.parse(existing);
    return categorizations[merchantName] || null;
  } catch (error) {
    console.error('Failed to get categorization:', error);
    return null;
  }
};

// Rules Management Tab Component
function RulesManagementTab() {
  const { toast } = useToast();
  const [editingRule, setEditingRule] = useState<any | null>(null);
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [activeRuleType, setActiveRuleType] = useState<'manual' | 'ai'>('manual');

  // Fetch preferences for home currency
  const { data: preferences } = useQuery<Preferences>({
    queryKey: ['/api/settings/preferences'],
  });

  const homeCurrency = preferences?.homeCurrency || 'CAD';

  // Fetch manual rules
  const { data: manualRules = [], isLoading: manualLoading } = useQuery<any[]>({
    queryKey: ['/api/categorization-rules/type/manual'],
  });

  // Fetch AI rules
  const { data: aiRules = [], isLoading: aiLoading } = useQuery<any[]>({
    queryKey: ['/api/categorization-rules/type/ai'],
  });

  // Fetch accounts for display
  const { data: accounts = [] } = useQuery<GLAccount[]>({
    queryKey: ['/api/accounts'],
  });

  // Fetch AI settings for auto-post toggle
  const { data: aiSettings } = useQuery<{
    aiCategorizationEnabled: boolean;
    aiAutoPostEnabled: boolean;
    aiAutoPostMinConfidence: string;
    aiRuleGenerationEnabled: boolean;
  }>({
    queryKey: ['/api/settings/categorization'],
  });

  // Update AI auto-post setting
  const updateAutoPost = useMutation({
    mutationFn: async (enabled: boolean) => {
      return await apiRequest('/api/settings/categorization', 'PATCH', { aiAutoPostEnabled: enabled });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings/categorization'] });
      toast({
        title: "Settings updated",
        description: `Auto-post ${aiSettings?.aiAutoPostEnabled ? 'disabled' : 'enabled'}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update setting",
        variant: "destructive",
      });
    },
  });

  // Generate AI rules from existing patterns (retroactive)
  const generateRulesFromPatterns = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/categorization-rules/generate-from-patterns', 'POST');
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/categorization-rules/type/ai'] });
      if (data.rulesCreated > 0) {
        toast({
          title: "AI Rules Generated",
          description: `Created ${data.rulesCreated} rule(s) from learned patterns`,
        });
      } else {
        toast({
          title: "No New Rules",
          description: data.eligiblePatterns === 0
            ? "No patterns with enough data yet. Categorize more transactions to build patterns."
            : "All eligible patterns already have rules created.",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate rules from patterns",
        variant: "destructive",
      });
    },
  });

  const rules = activeRuleType === 'manual' ? manualRules : aiRules;
  const rulesLoading = activeRuleType === 'manual' ? manualLoading : aiLoading;

  // Apply rules mutation
  const applyRulesMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/categorization-rules/apply', 'POST');
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/plaid/imported-transactions'] });
      toast({
        title: "Rules Applied",
        description: `Categorized ${data.categorizedCount} of ${data.totalUncategorized} uncategorized transactions`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to apply rules",
        variant: "destructive",
      });
    },
  });

  // Toggle rule enabled/disabled
  const toggleRuleMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: number; enabled: boolean }) => {
      return await apiRequest(`/api/categorization-rules/${id}`, 'PATCH', { enabled });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/categorization-rules'] });
      queryClient.invalidateQueries({ queryKey: ['/api/categorization-rules/type/manual'] });
      queryClient.invalidateQueries({ queryKey: ['/api/categorization-rules/type/ai'] });
      toast({
        title: "Success",
        description: "Rule updated",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update rule",
        variant: "destructive",
      });
    },
  });

  // Delete rule
  const deleteRuleMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/categorization-rules/${id}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/categorization-rules'] });
      queryClient.invalidateQueries({ queryKey: ['/api/categorization-rules/type/manual'] });
      queryClient.invalidateQueries({ queryKey: ['/api/categorization-rules/type/ai'] });
      toast({
        title: "Success",
        description: "Rule deleted",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete rule",
        variant: "destructive",
      });
    },
  });

  // Update rule priority
  const updatePriorityMutation = useMutation({
    mutationFn: async ({ id, priority }: { id: number; priority: number }) => {
      return await apiRequest(`/api/categorization-rules/${id}`, 'PATCH', { priority });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/categorization-rules'] });
      queryClient.invalidateQueries({ queryKey: ['/api/categorization-rules/type/manual'] });
      queryClient.invalidateQueries({ queryKey: ['/api/categorization-rules/type/ai'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update priority",
        variant: "destructive",
      });
    },
  });

  // Promote AI rule to manual
  const promoteRuleMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/categorization-rules/${id}/promote`, 'POST');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/categorization-rules'] });
      queryClient.invalidateQueries({ queryKey: ['/api/categorization-rules/type/manual'] });
      queryClient.invalidateQueries({ queryKey: ['/api/categorization-rules/type/ai'] });
      toast({
        title: "Success",
        description: "AI rule promoted to manual rule",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to promote rule",
        variant: "destructive",
      });
    },
  });

  // Promote all AI rules
  const promoteAllMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/categorization-rules/ai/promote-all', 'POST');
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/categorization-rules'] });
      queryClient.invalidateQueries({ queryKey: ['/api/categorization-rules/type/manual'] });
      queryClient.invalidateQueries({ queryKey: ['/api/categorization-rules/type/ai'] });
      toast({
        title: "Success",
        description: `Promoted ${data.promotedCount} AI rules to manual rules`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to promote rules",
        variant: "destructive",
      });
    },
  });

  const getAccountName = (accountId: number | null) => {
    if (!accountId) return 'None';
    const account = accounts.find(a => a.id === accountId);
    return account ? `${account.code} - ${account.name}` : 'Unknown';
  };

  const formatConditions = (conditions: any) => {
    const parts = [];
    if (conditions.descriptionContains) {
      parts.push(`Description contains "${conditions.descriptionContains}"`);
    }
    // Only show amount conditions if they are actual numbers (not null, undefined, or 0)
    const hasAmountMin = conditions.amountMin != null && conditions.amountMin !== 0;
    const hasAmountMax = conditions.amountMax != null && conditions.amountMax !== 0;
    if (hasAmountMin || hasAmountMax) {
      if (hasAmountMin && hasAmountMax) {
        parts.push(`Amount between ${formatCurrency(conditions.amountMin, homeCurrency, homeCurrency)} and ${formatCurrency(conditions.amountMax, homeCurrency, homeCurrency)}`);
      } else if (hasAmountMin) {
        parts.push(`Amount ≥ ${formatCurrency(conditions.amountMin, homeCurrency, homeCurrency)}`);
      } else {
        parts.push(`Amount ≤ ${formatCurrency(conditions.amountMax, homeCurrency, homeCurrency)}`);
      }
    }
    return parts.join(' AND ');
  };

  const formatConfidence = (confidence: string | number | null) => {
    if (!confidence) return null;
    const value = typeof confidence === 'string' ? parseFloat(confidence) : confidence;
    return Math.round(value * 100);
  };

  const renderRulesTable = (rulesList: any[], isAiRules: boolean) => {
    if (rulesLoading) {
      return <div className="text-center py-12 text-gray-500">Loading rules...</div>;
    }

    if (rulesList.length === 0) {
      return (
        <div className="text-center py-12 text-gray-500">
          {isAiRules ? (
            <>
              <Brain className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No AI Rules Yet</h3>
              <p className="text-sm mb-4">
                AI rules are automatically created when you categorize the same merchant 3+ times consistently.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => generateRulesFromPatterns.mutate()}
                disabled={generateRulesFromPatterns.isPending}
                className="mt-2"
              >
                {generateRulesFromPatterns.isPending ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                Generate from Learned Patterns
              </Button>
            </>
          ) : (
            <>
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Manual Rules Created Yet</h3>
              <p className="text-sm mb-4">
                Create rules to automatically categorize transactions based on description, amount, or other criteria.
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setEditingRule(null);
                  setRuleDialogOpen(true);
                }}
                data-testid="button-create-first-rule"
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Rule
              </Button>
            </>
          )}
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12"></TableHead>
            <TableHead>Rule Name</TableHead>
            <TableHead>Conditions</TableHead>
            <TableHead>Account</TableHead>
            {isAiRules && <TableHead>Confidence</TableHead>}
            {isAiRules && <TableHead>Uses</TableHead>}
            <TableHead>Priority</TableHead>
            <TableHead className="w-20">Enabled</TableHead>
            <TableHead className="w-32">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rulesList.map((rule: any, index: number) => (
            <TableRow key={rule.id}>
              <TableCell>
                <GripVertical className="h-4 w-4 text-gray-400" />
              </TableCell>
              <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                  {isAiRules && <Brain className="h-4 w-4 text-purple-500" />}
                  {rule.name}
                </div>
              </TableCell>
              <TableCell className="text-sm text-gray-600">
                {formatConditions(rule.conditions)}
              </TableCell>
              <TableCell className="text-sm">
                {getAccountName(rule.actions?.accountId)}
              </TableCell>
              {isAiRules && (
                <TableCell>
                  {rule.confidenceScore && (
                    <Badge variant={formatConfidence(rule.confidenceScore)! >= 80 ? "default" : "secondary"}>
                      {formatConfidence(rule.confidenceScore)}%
                    </Badge>
                  )}
                </TableCell>
              )}
              {isAiRules && (
                <TableCell className="text-sm text-gray-600">
                  {rule.occurrenceCount || 0}
                </TableCell>
              )}
              <TableCell>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (index > 0) {
                        updatePriorityMutation.mutate({
                          id: rule.id,
                          priority: rule.priority - 1
                        });
                      }
                    }}
                    disabled={index === 0}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <span className="text-sm">{rule.priority}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (index < rulesList.length - 1) {
                        updatePriorityMutation.mutate({
                          id: rule.id,
                          priority: rule.priority + 1
                        });
                      }
                    }}
                    disabled={index === rulesList.length - 1}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
              <TableCell>
                <Checkbox
                  checked={rule.enabled}
                  onCheckedChange={(checked) => {
                    toggleRuleMutation.mutate({
                      id: rule.id,
                      enabled: !!checked
                    });
                  }}
                  data-testid={`checkbox-rule-enabled-${rule.id}`}
                />
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  {isAiRules && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => promoteRuleMutation.mutate(rule.id)}
                            disabled={promoteRuleMutation.isPending}
                            data-testid={`button-promote-rule-${rule.id}`}
                          >
                            <ArrowUpRight className="h-4 w-4 text-green-600" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Promote to Manual Rule</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingRule(rule);
                      setRuleDialogOpen(true);
                    }}
                    data-testid={`button-edit-rule-${rule.id}`}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteRuleMutation.mutate(rule.id)}
                    data-testid={`button-delete-rule-${rule.id}`}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-lg font-medium text-gray-900">Categorization Rules</h2>
          <p className="text-sm text-gray-500">Automatically categorize imported transactions based on conditions</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => applyRulesMutation.mutate()}
            disabled={applyRulesMutation.isPending || (manualRules.length === 0 && aiRules.length === 0)}
            data-testid="button-apply-rules"
          >
            {applyRulesMutation.isPending ? 'Applying...' : 'Apply Rules to Existing'}
          </Button>
          {activeRuleType === 'ai' && aiRules.length > 0 && (
            <Button
              variant="outline"
              onClick={() => promoteAllMutation.mutate()}
              disabled={promoteAllMutation.isPending}
              data-testid="button-promote-all"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              {promoteAllMutation.isPending ? 'Promoting...' : 'Accept All AI Rules'}
            </Button>
          )}
          {activeRuleType === 'manual' && (
            <Button
              onClick={() => {
                setEditingRule(null);
                setRuleDialogOpen(true);
              }}
              data-testid="button-create-rule"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Rule
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Tabs value={activeRuleType} onValueChange={(value) => setActiveRuleType(value as 'manual' | 'ai')}>
            <TabsList className="mb-4">
              <TabsTrigger value="manual" className="flex items-center gap-2">
                <Hand className="h-4 w-4" />
                Manual Rules
                {manualRules.length > 0 && (
                  <Badge variant="secondary" className="ml-1">{manualRules.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="ai" className="flex items-center gap-2">
                <Brain className="h-4 w-4" />
                AI Rules
                {aiRules.length > 0 && (
                  <Badge variant="secondary" className="ml-1">{aiRules.length}</Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="manual">
              {renderRulesTable(manualRules, false)}
            </TabsContent>

            <TabsContent value="ai">
              <div className="mb-4 p-4 bg-purple-50 rounded-lg border border-purple-100 space-y-3">
                <p className="text-sm text-purple-800">
                  <Brain className="h-4 w-4 inline mr-1" />
                  AI rules are automatically learned from your categorization decisions.
                  After categorizing a merchant 3+ times with 80%+ consistency, an AI rule is created.
                  Promote rules to manual to give them higher priority.
                </p>
                <div className="flex items-center justify-between pt-2 border-t border-purple-200">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-amber-500" />
                    <Label className="text-sm font-medium text-purple-900">
                      Auto-Post High Confidence Matches
                    </Label>
                    {aiSettings?.aiAutoPostEnabled && (
                      <Badge variant="secondary" className="text-xs">
                        {Math.round(parseFloat(aiSettings?.aiAutoPostMinConfidence || "0.95") * 100)}% threshold
                      </Badge>
                    )}
                  </div>
                  <Switch
                    checked={aiSettings?.aiAutoPostEnabled ?? false}
                    onCheckedChange={(checked) => updateAutoPost.mutate(checked)}
                    disabled={updateAutoPost.isPending}
                  />
                </div>
              </div>
              {renderRulesTable(aiRules, true)}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Rule Dialog */}
      <RuleDialog
        open={ruleDialogOpen}
        onOpenChange={setRuleDialogOpen}
        rule={editingRule}
      />
    </div>
  );
}

export default function Banking() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showBankFeedSetup, setShowBankFeedSetup] = useState(false);
  const [showAddAccountDialog, setShowAddAccountDialog] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'uncategorized' | 'categorized' | 'deleted'>('uncategorized');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [selectedTransactions, setSelectedTransactions] = useState<Set<number>>(new Set());
  const [transactionNames, setTransactionNames] = useState<Map<number, string>>(new Map());
  const [transactionAccounts, setTransactionAccounts] = useState<Map<number, number | null>>(new Map());
  const [transactionTaxes, setTransactionTaxes] = useState<Map<number, number | null>>(new Map());
  const [transactionMode, setTransactionMode] = useState<Map<number, 'match' | 'categorize'>>(new Map());
  const [currentTransactionId, setCurrentTransactionId] = useState<number | null>(null);
  const [attachmentDialogOpen, setAttachmentDialogOpen] = useState(false);
  const [selectedAttachmentTransactionId, setSelectedAttachmentTransactionId] = useState<number | null>(null);
  
  // Categorization dialog state
  const [selectedTransaction, setSelectedTransaction] = useState<ImportedTransaction | null>(null);
  const [categorizationDialogOpen, setCategorizationDialogOpen] = useState(false);
  
  // Multi-match dialogs state
  const [payBillsDialogOpen, setPayBillsDialogOpen] = useState(false);
  const [receivePaymentsDialogOpen, setReceivePaymentsDialogOpen] = useState(false);
  const [matchingTransaction, setMatchingTransaction] = useState<ImportedTransaction | null>(null);
  const [expandedMultiMatches, setExpandedMultiMatches] = useState<Set<number>>(new Set());
  const [multiMatchBreakdowns, setMultiMatchBreakdowns] = useState<Map<number, any[]>>(new Map());
  
  // Match suggestions state
  const [matchSuggestions, setMatchSuggestions] = useState<Map<number, TransactionMatch>>(new Map());
  const [loadingMatches, setLoadingMatches] = useState(false);
  
  // Delete confirmation dialog state
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [amountMin, setAmountMin] = useState('');
  const [amountMax, setAmountMax] = useState('');

  // Reconciliation state
  const [reconcileAccountId, setReconcileAccountId] = useState<number | null>(null);
  const [reconcileStatementDate, setReconcileStatementDate] = useState('');
  const [reconcileStatementBalance, setReconcileStatementBalance] = useState('');
  const [activeReconciliationId, setActiveReconciliationId] = useState<number | null>(null);
  const [clearedEntries, setClearedEntries] = useState<Set<number>>(new Set());

  // Column widths state with localStorage persistence
  const [columnWidths, setColumnWidths] = useState<ColumnWidths>(() => {
    try {
      const saved = localStorage.getItem('banking-column-widths');
      return saved ? JSON.parse(saved) : DEFAULT_COLUMN_WIDTHS;
    } catch {
      return DEFAULT_COLUMN_WIDTHS;
    }
  });

  const [resizing, setResizing] = useState<{
    column: keyof ColumnWidths;
    startX: number;
    startWidth: number;
  } | null>(null);

  // Save column widths to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('banking-column-widths', JSON.stringify(columnWidths));
  }, [columnWidths]);

  // Handle resize start
  const handleResizeStart = (column: keyof ColumnWidths, e: React.MouseEvent) => {
    e.preventDefault();
    setResizing({
      column,
      startX: e.clientX,
      startWidth: columnWidths[column],
    });
  };

  // Handle resize move
  useEffect(() => {
    if (!resizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const diff = e.clientX - resizing.startX;
      const newWidth = Math.max(50, resizing.startWidth + diff); // Minimum 50px
      setColumnWidths(prev => ({
        ...prev,
        [resizing.column]: newWidth,
      }));
    };

    const handleMouseUp = () => {
      setResizing(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizing]);

  // Fetch preferences for home currency
  const { data: preferences } = useQuery<Preferences>({
    queryKey: ['/api/settings/preferences'],
  });
  
  const homeCurrency = preferences?.homeCurrency || 'CAD';

  // Fetch GL accounts eligible for bank feeds
  const { data: glAccounts = [], isLoading: glAccountsLoading } = useQuery<GLAccount[]>({
    queryKey: ['/api/accounts'],
    select: (data: GLAccount[]) => {
      // Filter accounts that can have bank feeds:
      // Cash, Bank Accounts, Investment Accounts, Credit Cards, Line of Credit, Loans
      const eligibleTypes = [
        'current_assets',           // Cash and current investment accounts
        'bank',                     // Bank accounts
        'long_term_assets',         // Long-term investment accounts
        'credit_card',              // Credit card accounts
        'other_current_liabilities', // Line of credit and short-term loans
        'long_term_liabilities'     // Long-term loans
      ];
      return data.filter(acc => eligibleTypes.includes(acc.type));
    },
  });

  // Fetch bank accounts (Plaid connections)
  const { data: bankAccounts = [], isLoading: bankAccountsLoading } = useQuery<BankAccount[]>({
    queryKey: ['/api/plaid/accounts'],
  });

  // Fetch all GL accounts for categorization dropdown
  const { data: allAccounts = [] } = useQuery<GLAccount[]>({
    queryKey: ['/api/accounts'],
  });

  // Fetch contacts for Name dropdown
  const { data: contacts = [] } = useQuery<any[]>({
    queryKey: ['/api/contacts'],
  });

  // Transform contacts for SearchableSelect
  const contactItems: SearchableSelectItem[] = contacts.map(contact => ({
    value: contact.name,
    label: formatContactName(contact.name, contact.currency, homeCurrency),
    subtitle: `· ${contact.type}`
  }));

  // Transform accounts for SearchableSelect
  const accountItems: SearchableSelectItem[] = allAccounts.map(acc => ({
    value: acc.id.toString(),
    label: `${acc.code} - ${acc.name}`,
    subtitle: undefined
  }));

  // Fetch sales tax rates (filter out composite tax components)
  const { data: salesTaxes = [] } = useQuery<any[]>({
    queryKey: ['/api/sales-taxes'],
    select: (data: any[]) => {
      // Only show main taxes, not composite tax components (those with parent_id)
      return data.filter(tax => !tax.parentId);
    },
  });

  // Transform sales taxes for SearchableSelect
  const taxItems: SearchableSelectItem[] = salesTaxes.map(tax => ({
    value: tax.id.toString(),
    label: tax.name,
    subtitle: tax.rate ? `· ${tax.rate}%` : undefined
  }));

  // Transform page size options for SearchableSelect
  const pageSizeItems: SearchableSelectItem[] = [
    { value: "25", label: "25 per page", subtitle: undefined },
    { value: "50", label: "50 per page", subtitle: undefined },
    { value: "100", label: "100 per page", subtitle: undefined }
  ];

  // Fetch ALL imported transactions (for determining which accounts have feeds)
  const { data: allImportedTransactions = [] } = useQuery<ImportedTransaction[]>({
    queryKey: ['/api/plaid/imported-transactions/all'],
    queryFn: async () => {
      const response = await fetch('/api/plaid/imported-transactions');
      if (!response.ok) throw new Error('Failed to fetch all transactions');
      return response.json();
    },
  });

  // Fetch imported transactions based on active tab (for displaying in table)
  const { data: importedTransactions = [], isLoading: transactionsLoading } = useQuery<ImportedTransaction[]>({
    queryKey: ['/api/plaid/imported-transactions', activeTab],
    queryFn: async () => {
      let status = 'unmatched';
      if (activeTab === 'categorized') status = 'matched';
      if (activeTab === 'deleted') status = 'deleted';
      
      const response = await fetch(`/api/plaid/imported-transactions?status=${status}`);
      if (!response.ok) throw new Error('Failed to fetch transactions');
      return response.json();
    },
  });

  // Fetch matched transaction details for categorized transactions
  const matchedTransactionIds = importedTransactions
    .filter(tx => tx.matchedTransactionId)
    .map(tx => tx.matchedTransactionId);

  const { data: matchedTransactions = [] } = useQuery({
    queryKey: ['/api/transactions/batch', matchedTransactionIds],
    queryFn: async () => {
      if (matchedTransactionIds.length === 0) return [];
      
      const transactions = await Promise.all(
        matchedTransactionIds.map(async (id) => {
          try {
            const response = await fetch(`/api/transactions/${id}`);
            if (!response.ok) return null;
            return response.json();
          } catch {
            return null;
          }
        })
      );
      return transactions.filter(t => t !== null);
    },
    enabled: activeTab === 'categorized' && matchedTransactionIds.length > 0,
  });

  // Sync transactions mutation
  const syncTransactionsMutation = useMutation({
    mutationFn: async (bankAccountId: number) => {
      return await apiRequest(`/api/plaid/sync-transactions/${bankAccountId}`, 'POST');
    },
    onSuccess: (data) => {
      // Invalidate both tab-filtered and all-transactions queries
      queryClient.invalidateQueries({ queryKey: ['/api/plaid/imported-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/plaid/imported-transactions/all'] });
      queryClient.invalidateQueries({ queryKey: ['/api/plaid/accounts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
      toast({
        title: "Success",
        description: `Synced ${data.synced} new transactions`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to sync transactions",
        variant: "destructive",
      });
    },
  });

  // Delete bank account mutation
  const deleteBankAccountMutation = useMutation({
    mutationFn: async (bankAccountId: number) => {
      return await apiRequest(`/api/plaid/accounts/${bankAccountId}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/plaid/accounts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
      toast({
        title: "Success",
        description: "Bank feed disconnected",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to disconnect bank feed",
        variant: "destructive",
      });
    },
  });

  // Categorize transaction mutation
  const categorizeTransactionMutation = useMutation({
    mutationFn: async ({ 
      transactionId, 
      accountId, 
      contactName, 
      salesTaxId, 
      description 
    }: { 
      transactionId: number; 
      accountId: number | null; 
      contactName: string; 
      salesTaxId: number | null; 
      description?: string;
    }) => {
      return await apiRequest(`/api/plaid/categorize-transaction/${transactionId}`, 'POST', {
        accountId,
        contactName,
        salesTaxId,
        description,
      });
    },
    onSuccess: (data) => {
      // Invalidate both tab-filtered and all-transactions queries
      queryClient.invalidateQueries({ queryKey: ['/api/plaid/imported-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/plaid/imported-transactions/all'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ledger-entries'] });
      queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
      toast({
        title: "Success",
        description: `Transaction categorized as ${data.type}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to categorize transaction",
        variant: "destructive",
      });
    },
  });

  // Delete imported transaction mutation
  const deleteTransactionMutation = useMutation({
    mutationFn: async (transactionId: number) => {
      return await apiRequest(`/api/plaid/imported-transactions/${transactionId}`, 'DELETE');
    },
    onSuccess: () => {
      // Invalidate both tab-filtered and all-transactions queries
      queryClient.invalidateQueries({ queryKey: ['/api/plaid/imported-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/plaid/imported-transactions/all'] });
      toast({
        title: "Success",
        description: "Transaction deleted",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete transaction",
        variant: "destructive",
      });
    },
  });

  // Restore deleted transaction mutation
  const restoreTransactionMutation = useMutation({
    mutationFn: async (transactionId: number) => {
      return await apiRequest(`/api/plaid/imported-transactions/${transactionId}/restore`, 'POST');
    },
    onSuccess: () => {
      // Invalidate both tab-filtered and all-transactions queries
      queryClient.invalidateQueries({ queryKey: ['/api/plaid/imported-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/plaid/imported-transactions/all'] });
      toast({
        title: "Success",
        description: "Transaction restored to uncategorized",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to restore transaction",
        variant: "destructive",
      });
    },
  });

  // Undo transaction categorization mutation
  const undoCategorizationMutation = useMutation({
    mutationFn: async (transactionId: number) => {
      return await apiRequest(`/api/plaid/imported-transactions/${transactionId}/undo`, 'POST');
    },
    onSuccess: () => {
      // Invalidate both tab-filtered and all-transactions queries
      queryClient.invalidateQueries({ queryKey: ['/api/plaid/imported-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/plaid/imported-transactions/all'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ledger-entries'] });
      queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
      toast({
        title: "Success",
        description: "Transaction moved back to uncategorized and ledger entries deleted",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to undo categorization",
        variant: "destructive",
      });
    },
  });

  // Match to invoice mutation
  const matchToInvoiceMutation = useMutation({
    mutationFn: async ({ transactionId, invoiceId }: { transactionId: number, invoiceId: number }) => {
      return await apiRequest(`/api/bank-feeds/${transactionId}/match-invoice`, 'POST', { invoiceId });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/plaid/imported-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/plaid/imported-transactions/all'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ledger-entries'] });
      queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
      toast({
        title: "Success",
        description: `Matched to invoice and created payment`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to match to invoice",
        variant: "destructive",
      });
    },
  });

  // Match to bill mutation
  const matchToBillMutation = useMutation({
    mutationFn: async ({ transactionId, billId }: { transactionId: number, billId: number }) => {
      return await apiRequest(`/api/bank-feeds/${transactionId}/match-bill`, 'POST', { billId });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/plaid/imported-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/plaid/imported-transactions/all'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/bills'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ledger-entries'] });
      queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
      toast({
        title: "Success",
        description: `Matched to bill and created payment`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to match to bill",
        variant: "destructive",
      });
    },
  });

  // Link to manual entry mutation
  const linkToManualEntryMutation = useMutation({
    mutationFn: async ({ transactionId, manualTransactionId }: { transactionId: number, manualTransactionId: number }) => {
      return await apiRequest(`/api/bank-feeds/${transactionId}/link-manual`, 'POST', { manualTransactionId });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/plaid/imported-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/plaid/imported-transactions/all'] });
      toast({
        title: "Success",
        description: `Linked to existing entry`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to link to manual entry",
        variant: "destructive",
      });
    },
  });

  // Match multiple bills mutation
  const matchMultipleBillsMutation = useMutation({
    mutationFn: async ({ transactionId, data }: { 
      transactionId: number, 
      data: { 
        selectedBills: { billId: number; amountToApply: number }[];
        difference?: { accountId: number; amount: number; description: string };
      } 
    }) => {
      return await apiRequest(`/api/bank-feeds/${transactionId}/match-multiple-bills`, 'POST', data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/plaid/imported-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/plaid/imported-transactions/all'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ledger-entries'] });
      queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
      setPayBillsDialogOpen(false);
      setMatchingTransaction(null);
      toast({
        title: "Success",
        description: `Matched to ${data.matchCount || 0} bill(s) and created payment(s)`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to match to bills",
        variant: "destructive",
      });
    },
  });

  // Match multiple invoices mutation
  const matchMultipleInvoicesMutation = useMutation({
    mutationFn: async ({ transactionId, data }: { 
      transactionId: number, 
      data: { 
        selectedInvoices: { invoiceId: number; amountToApply: number }[];
        difference?: { accountId: number; amount: number; description: string };
      } 
    }) => {
      return await apiRequest(`/api/bank-feeds/${transactionId}/match-multiple-invoices`, 'POST', data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/plaid/imported-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/plaid/imported-transactions/all'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ledger-entries'] });
      queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
      setReceivePaymentsDialogOpen(false);
      setMatchingTransaction(null);
      toast({
        title: "Success",
        description: `Matched to ${data.matchCount || 0} invoice(s) and created payment(s)`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to match to invoices",
        variant: "destructive",
      });
    },
  });

  // Unmatch transaction mutation
  const unmatchTransactionMutation = useMutation({
    mutationFn: async (transactionId: number) => {
      return await apiRequest(`/api/bank-feeds/${transactionId}/unmatch`, 'DELETE');
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/plaid/imported-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/plaid/imported-transactions/all'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      queryClient.invalidateQueries({ queryKey: ['/api/bills'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ledger-entries'] });
      queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
      toast({
        title: "Success",
        description: `Unmatched and ${data.deleted ? 'deleted auto-created transaction' : 'unlinked manual entry'}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to unmatch transaction",
        variant: "destructive",
      });
    },
  });

  // Cleanup unmatched Plaid transactions mutation
  const cleanupUnmatchedMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/plaid/cleanup-unmatched', 'POST');
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/plaid/imported-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/plaid/imported-transactions/all'] });
      toast({
        title: "Success",
        description: data.message || "Unmatched transactions cleaned up",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to cleanup transactions",
        variant: "destructive",
      });
    },
  });

  // Create reconciliation mutation
  const createReconciliationMutation = useMutation({
    mutationFn: async (data: { accountId: number; statementDate: string; statementEndingBalance: number }) => {
      return await apiRequest('/api/reconciliations', 'POST', data);
    },
    onSuccess: (data) => {
      setActiveReconciliationId(data.id);
      queryClient.invalidateQueries({ queryKey: ['/api/reconciliations'] });
      toast({
        title: "Success",
        description: "Reconciliation started",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to start reconciliation",
        variant: "destructive",
      });
    },
  });

  // Fetch active reconciliation details
  const { data: activeReconciliation, isLoading: reconciliationLoading } = useQuery({
    queryKey: ['/api/reconciliations', activeReconciliationId],
    queryFn: async () => {
      if (!activeReconciliationId) return null;
      const response = await fetch(`/api/reconciliations/${activeReconciliationId}`);
      if (!response.ok) throw new Error('Failed to fetch reconciliation');
      return response.json();
    },
    enabled: !!activeReconciliationId,
  });

  // Fetch ledger entries for reconciliation
  const { data: reconciliationLedgerEntries = [], isLoading: ledgerEntriesLoading } = useQuery({
    queryKey: ['/api/reconciliations', activeReconciliationId, 'ledger-entries'],
    queryFn: async () => {
      if (!activeReconciliationId) return [];
      const response = await fetch(`/api/reconciliations/${activeReconciliationId}/ledger-entries`);
      if (!response.ok) throw new Error('Failed to fetch ledger entries');
      return response.json();
    },
    enabled: !!activeReconciliationId,
  });

  // Update reconciliation items mutation
  const updateReconciliationItemsMutation = useMutation({
    mutationFn: async ({ reconciliationId, ledgerEntryIds, isCleared }: { reconciliationId: number; ledgerEntryIds: number[]; isCleared: boolean }) => {
      return await apiRequest(`/api/reconciliations/${reconciliationId}/items`, 'PATCH', { ledgerEntryIds, isCleared });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reconciliations', activeReconciliationId] });
      queryClient.invalidateQueries({ queryKey: ['/api/reconciliations', activeReconciliationId, 'ledger-entries'] });
    },
    onError: (error: any, variables, context) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update reconciliation items",
        variant: "destructive",
      });
    },
  });

  // Complete reconciliation mutation
  const completeReconciliationMutation = useMutation({
    mutationFn: async (reconciliationId: number) => {
      return await apiRequest(`/api/reconciliations/${reconciliationId}/complete`, 'PATCH');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reconciliations'] });
      setActiveReconciliationId(null);
      setReconcileAccountId(null);
      setReconcileStatementDate('');
      setReconcileStatementBalance('');
      setClearedEntries(new Set());
      toast({
        title: "Success",
        description: "Reconciliation completed",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to complete reconciliation",
        variant: "destructive",
      });
    },
  });


  // Calculate total table width for fixed table layout
  const totalTableWidth = Object.values(columnWidths).reduce((sum, width) => sum + width, 0);

  // Helper function to get matched transaction details
  const getMatchedTransaction = (importedTx: ImportedTransaction) => {
    if (!importedTx.matchedTransactionId) return null;
    return matchedTransactions.find((mt: any) => mt?.transaction?.id === importedTx.matchedTransactionId);
  };

  // Fetch match suggestions for uncategorized transactions
  useEffect(() => {
    if (activeTab !== 'uncategorized' || importedTransactions.length === 0) {
      setMatchSuggestions(new Map());
      return;
    }

    const fetchMatchSuggestions = async () => {
      setLoadingMatches(true);
      const newSuggestions = new Map<number, TransactionMatch>();

      try {
        await Promise.all(
          importedTransactions.map(async (tx) => {
            try {
              const response = await fetch(`/api/bank-feeds/${tx.id}/suggestions`, {
                cache: 'no-cache',
                headers: {
                  'Cache-Control': 'no-cache',
                  'Pragma': 'no-cache'
                }
              });
              if (!response.ok) return;
              
              const data = await response.json();
              const suggestions: MatchSuggestion[] = data.suggestions || [];
              const topMatch = suggestions.length > 0 ? suggestions[0] : null;
              
              newSuggestions.set(tx.id, {
                transactionId: tx.id,
                suggestions,
                topMatch
              });
            } catch (error) {
              console.error(`Failed to fetch suggestions for transaction ${tx.id}:`, error);
            }
          })
        );

        setMatchSuggestions(newSuggestions);
        
        // Automatically set transaction mode based on match confidence (only update if changed)
        setTransactionMode(prevModes => {
          const newModes = new Map(prevModes);
          let hasChanges = false;
          
          newSuggestions.forEach((matchData, txId) => {
            const hasHighConfidenceMatch = matchData.topMatch && matchData.topMatch.confidence > 80;
            const newMode = hasHighConfidenceMatch ? 'match' : 'categorize';
            const currentMode = newModes.get(txId);
            
            if (currentMode !== newMode) {
              newModes.set(txId, newMode);
              hasChanges = true;
            }
          });
          
          return hasChanges ? newModes : prevModes;
        });
      } catch (error) {
        console.error('Failed to fetch match suggestions:', error);
      } finally {
        setLoadingMatches(false);
      }
    };

    fetchMatchSuggestions();
  }, [importedTransactions, activeTab]);

  // Toggle transaction mode between match and categorize
  const handleModeToggle = (txId: number) => {
    setTransactionMode(prev => {
      const newModes = new Map(prev);
      const currentMode = newModes.get(txId) || 'categorize';
      newModes.set(txId, currentMode === 'match' ? 'categorize' : 'match');
      return newModes;
    });
  };

  // Toggle multi-match breakdown expansion
  const handleToggleMultiMatchBreakdown = async (txId: number) => {
    const isExpanded = expandedMultiMatches.has(txId);
    
    if (isExpanded) {
      // Collapse
      setExpandedMultiMatches(prev => {
        const newSet = new Set(prev);
        newSet.delete(txId);
        return newSet;
      });
    } else {
      // Expand and fetch breakdown if not already loaded
      setExpandedMultiMatches(prev => new Set(prev).add(txId));
      
      if (!multiMatchBreakdowns.has(txId)) {
        try {
          const response = await fetch(`/api/bank-feeds/${txId}/matched-breakdown`);
          if (response.ok) {
            const data = await response.json();
            setMultiMatchBreakdowns(prev => new Map(prev).set(txId, data.matches || []));
          }
        } catch (error) {
          console.error('Failed to fetch multi-match breakdown:', error);
        }
      }
    }
  };

  // Group GL accounts with their bank feed status - only show accounts with feeds
  const accountsWithFeedStatus = glAccounts
    .map(glAccount => {
      const bankAccount = bankAccounts.find(ba => ba.linkedAccountId === glAccount.id);
      // Check ALL imported transactions (not just current tab) to determine if CSV imports exist
      const csvImports = allImportedTransactions.filter(tx => 
        tx.source === 'csv' && tx.accountId === glAccount.id
      );
      
      return {
        ...glAccount,
        bankAccount,
        hasCSVImports: csvImports.length > 0,
        feedType: bankAccount ? 'plaid' : csvImports.length > 0 ? 'csv' : null
      };
    })
    .filter(account => account.feedType !== null); // Only show accounts with bank feeds connected

  // Filter transactions by selected account
  let filteredTransactions = selectedAccountId 
    ? importedTransactions.filter(tx => tx.accountId === selectedAccountId)
    : importedTransactions;

  // Apply search and filters
  filteredTransactions = filteredTransactions.filter(tx => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesDescription = tx.name.toLowerCase().includes(query);
      const matchesMerchant = tx.merchantName?.toLowerCase().includes(query);
      if (!matchesDescription && !matchesMerchant) return false;
    }

    // Date range filter
    if (dateFrom) {
      const txDate = new Date(tx.date);
      const fromDate = new Date(dateFrom);
      if (txDate < fromDate) return false;
    }
    if (dateTo) {
      const txDate = new Date(tx.date);
      const toDate = new Date(dateTo);
      if (txDate > toDate) return false;
    }

    // Amount range filter
    const absAmount = Math.abs(Number(tx.amount));
    if (amountMin && absAmount < Number(amountMin)) return false;
    if (amountMax && absAmount > Number(amountMax)) return false;

    return true;
  });

  // Sort transactions
  if (sortField) {
    filteredTransactions = [...filteredTransactions].sort((a, b) => {
      let comparison = 0;
      
      if (sortField === 'date') {
        comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
      } else if (sortField === 'description') {
        comparison = a.name.localeCompare(b.name);
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedTransactions = filteredTransactions.slice(startIndex, endIndex);

  // Clamp currentPage when totalPages changes (e.g., transactions removed or account switched)
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(Math.max(1, totalPages));
    }
  }, [totalPages, currentPage]);

  // Auto-select the first account when there's only one account with feeds
  useEffect(() => {
    if (accountsWithFeedStatus.length === 1 && selectedAccountId === null) {
      setSelectedAccountId(accountsWithFeedStatus[0].id);
    }
  }, [accountsWithFeedStatus, selectedAccountId]);

  // Reset to page 1 when account selection changes
  const handleAccountSelect = (accountId: number) => {
    setSelectedAccountId(accountId);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      // Select all transactions in the filtered set (not just current page)
      setSelectedTransactions(new Set(filteredTransactions.map(tx => tx.id)));
    } else {
      setSelectedTransactions(new Set());
    }
  };

  const handleSelectTransaction = (id: number, checked: boolean) => {
    const newSelected = new Set(selectedTransactions);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedTransactions(newSelected);
  };

  const handleNameChange = (txId: number, name: string) => {
    const newMap = new Map(transactionNames);
    newMap.set(txId, name);
    
    // Auto-populate if transaction is selected and all selected are same side
    if (selectedTransactions.has(txId) && selectedTransactions.size > 1) {
      const currentTx = filteredTransactions.find(tx => tx.id === txId);
      if (currentTx) {
        const isPayment = Number(currentTx.amount) < 0;
        const selectedTxs = filteredTransactions.filter(tx => selectedTransactions.has(tx.id));
        const allSameSide = selectedTxs.every(tx => 
          isPayment ? Number(tx.amount) < 0 : Number(tx.amount) > 0
        );
        
        if (allSameSide) {
          selectedTxs.forEach(tx => {
            newMap.set(tx.id, name);
          });
        }
      }
    }
    
    setTransactionNames(newMap);
  };

  const handleAccountChange = (txId: number, accountId: number | null) => {
    const newMap = new Map(transactionAccounts);
    newMap.set(txId, accountId);
    
    // Auto-populate if transaction is selected and all selected are same side
    if (selectedTransactions.has(txId) && selectedTransactions.size > 1) {
      const currentTx = filteredTransactions.find(tx => tx.id === txId);
      if (currentTx) {
        const isPayment = Number(currentTx.amount) < 0;
        const selectedTxs = filteredTransactions.filter(tx => selectedTransactions.has(tx.id));
        const allSameSide = selectedTxs.every(tx => 
          isPayment ? Number(tx.amount) < 0 : Number(tx.amount) > 0
        );
        
        if (allSameSide) {
          selectedTxs.forEach(tx => {
            newMap.set(tx.id, accountId);
          });
        }
      }
    }
    
    setTransactionAccounts(newMap);
  };

  const handleTaxChange = (txId: number, taxId: number | null) => {
    const newMap = new Map(transactionTaxes);
    newMap.set(txId, taxId);
    
    // Auto-populate if transaction is selected and all selected are same side
    if (selectedTransactions.has(txId) && selectedTransactions.size > 1) {
      const currentTx = filteredTransactions.find(tx => tx.id === txId);
      if (currentTx) {
        const isPayment = Number(currentTx.amount) < 0;
        const selectedTxs = filteredTransactions.filter(tx => selectedTransactions.has(tx.id));
        const allSameSide = selectedTxs.every(tx => 
          isPayment ? Number(tx.amount) < 0 : Number(tx.amount) > 0
        );
        
        if (allSameSide) {
          selectedTxs.forEach(tx => {
            newMap.set(tx.id, taxId);
          });
        }
      }
    }
    
    setTransactionTaxes(newMap);
  };

  const handlePostTransaction = (tx: any) => {
    const accountId = transactionAccounts.get(tx.id);
    const contactName = transactionNames.get(tx.id) || '';
    const salesTaxId = transactionTaxes.get(tx.id) || null;

    // Validate required fields
    if (!accountId) {
      toast({
        title: "Error",
        description: "Please select an account to categorize this transaction",
        variant: "destructive",
      });
      return;
    }

    // Categorize the transaction
    categorizeTransactionMutation.mutate({
      transactionId: tx.id,
      accountId,
      contactName,
      salesTaxId,
      description: tx.name,
    }, {
      onSuccess: () => {
        // Save categorization to memory
        const merchantName = tx.merchantName || tx.name;
        saveCategorization(merchantName, accountId, contactName || null, salesTaxId);
      }
    });
  };

  const handleBulkPost = () => {
    if (selectedTransactions.size === 0) return;
    
    // Only allow bulk post in uncategorized tab
    if (activeTab !== 'uncategorized') {
      toast({
        title: "Error",
        description: "Bulk post is only available for uncategorized transactions",
        variant: "destructive",
      });
      return;
    }

    // Get selected transactions
    const selectedTxs = filteredTransactions.filter(tx => selectedTransactions.has(tx.id));
    
    // Validate all have required fields
    const missingFields: string[] = [];
    selectedTxs.forEach(tx => {
      const accountId = transactionAccounts.get(tx.id);
      if (!accountId) {
        missingFields.push(`Transaction #${tx.id} (${tx.name}) is missing an account`);
      }
    });

    if (missingFields.length > 0) {
      toast({
        title: "Missing Required Fields",
        description: missingFields.join('; '),
        variant: "destructive",
      });
      return;
    }

    // Post all selected transactions
    let successCount = 0;
    const totalCount = selectedTxs.length;

    selectedTxs.forEach((tx, index) => {
      const accountId = transactionAccounts.get(tx.id)!;
      const contactName = transactionNames.get(tx.id) || '';
      const salesTaxId = transactionTaxes.get(tx.id) || null;

      categorizeTransactionMutation.mutate({
        transactionId: tx.id,
        accountId,
        contactName,
        salesTaxId,
        description: tx.name,
      }, {
        onSuccess: () => {
          successCount++;
          // Save categorization to memory
          const merchantName = tx.merchantName || tx.name;
          saveCategorization(merchantName, accountId, contactName || null, salesTaxId);
          
          // Clear selection and show success toast after last transaction
          if (index === totalCount - 1) {
            setSelectedTransactions(new Set());
            toast({
              title: "Success",
              description: `Successfully posted ${successCount} transaction${successCount !== 1 ? 's' : ''}`,
            });
          }
        },
        onError: () => {
          // Show error toast after last transaction
          if (index === totalCount - 1 && successCount > 0) {
            setSelectedTransactions(new Set());
            toast({
              title: "Partial Success",
              description: `Posted ${successCount} of ${totalCount} transactions. Some transactions failed.`,
              variant: "destructive",
            });
          }
        }
      });
    });
  };

  const handleBulkDelete = () => {
    if (selectedTransactions.size === 0) return;
    setDeleteConfirmationOpen(true);
  };

  const confirmBulkDelete = () => {
    const selectedTxs = filteredTransactions.filter(tx => selectedTransactions.has(tx.id));
    let successCount = 0;
    const totalCount = selectedTxs.length;

    selectedTxs.forEach((tx, index) => {
      deleteTransactionMutation.mutate(tx.id, {
        onSuccess: () => {
          successCount++;
          // Clear selection and show success toast after last transaction
          if (index === totalCount - 1) {
            setSelectedTransactions(new Set());
            toast({
              title: "Success",
              description: `Successfully deleted ${successCount} transaction${successCount !== 1 ? 's' : ''}`,
            });
          }
        },
        onError: () => {
          // Show error toast after last transaction
          if (index === totalCount - 1 && successCount > 0) {
            setSelectedTransactions(new Set());
            toast({
              title: "Partial Success",
              description: `Deleted ${successCount} of ${totalCount} transactions. Some transactions failed.`,
              variant: "destructive",
            });
          }
        }
      });
    });
    
    setDeleteConfirmationOpen(false);
  };

  const handleBulkRestore = async () => {
    if (selectedTransactions.size === 0) return;

    const selectedTxs = filteredTransactions.filter(tx => selectedTransactions.has(tx.id));
    const totalCount = selectedTxs.length;

    // Create array of promises for all restore operations
    const restorePromises = selectedTxs.map(tx => 
      apiRequest(`/api/plaid/imported-transactions/${tx.id}/restore`, 'POST')
        .then(() => ({ success: true, id: tx.id }))
        .catch(() => ({ success: false, id: tx.id }))
    );

    // Wait for all operations to complete
    const results = await Promise.allSettled(restorePromises);
    
    // Count successes
    const successCount = results.filter(
      r => r.status === 'fulfilled' && r.value.success
    ).length;

    // Invalidate queries after all operations complete
    queryClient.invalidateQueries({ queryKey: ['/api/plaid/imported-transactions'] });
    queryClient.invalidateQueries({ queryKey: ['/api/plaid/imported-transactions/all'] });

    // Clear selection
    setSelectedTransactions(new Set());

    // Show appropriate toast based on results
    if (successCount === totalCount) {
      toast({
        title: "Success",
        description: `Successfully restored ${successCount} transaction${successCount !== 1 ? 's' : ''}`,
      });
    } else if (successCount > 0) {
      toast({
        title: "Partial Success",
        description: `Restored ${successCount} of ${totalCount} transactions. Some transactions failed.`,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to restore transactions",
        variant: "destructive",
      });
    }
  };

  const allSelected = paginatedTransactions.length > 0 && 
    paginatedTransactions.every(tx => selectedTransactions.has(tx.id));

  // Determine if the selected account is AP or AR type
  const selectedAccount = accountsWithFeedStatus.find(a => a.id === selectedAccountId);

  // Handle starting reconciliation
  const handleStartReconciliation = () => {
    if (!reconcileAccountId) {
      toast({
        title: "Error",
        description: "Please select an account to reconcile",
        variant: "destructive",
      });
      return;
    }
    if (!reconcileStatementDate) {
      toast({
        title: "Error",
        description: "Please enter the statement ending date",
        variant: "destructive",
      });
      return;
    }
    if (!reconcileStatementBalance) {
      toast({
        title: "Error",
        description: "Please enter the statement ending balance",
        variant: "destructive",
      });
      return;
    }

    createReconciliationMutation.mutate({
      accountId: reconcileAccountId,
      statementDate: reconcileStatementDate,
      statementEndingBalance: parseFloat(reconcileStatementBalance),
    });
  };

  // Handle toggling cleared status of a ledger entry
  const handleToggleCleared = (entryId: number, isCleared: boolean) => {
    const newClearedEntries = new Set(clearedEntries);
    if (isCleared) {
      newClearedEntries.add(entryId);
    } else {
      newClearedEntries.delete(entryId);
    }
    setClearedEntries(newClearedEntries);
    
    if (activeReconciliationId) {
      updateReconciliationItemsMutation.mutate({
        reconciliationId: activeReconciliationId,
        ledgerEntryIds: [entryId],
        isCleared,
      });
    }
  };

  // Handle canceling reconciliation
  const handleCancelReconciliation = () => {
    setActiveReconciliationId(null);
    setReconcileAccountId(null);
    setReconcileStatementDate('');
    setReconcileStatementBalance('');
    setClearedEntries(new Set());
  };

  // Sync cleared entries from reconciliation data
  useEffect(() => {
    if (activeReconciliation && activeReconciliation.items) {
      const clearedIds = activeReconciliation.items
        .filter((item: any) => item.isCleared)
        .map((item: any) => item.ledgerEntryId);
      setClearedEntries(new Set(clearedIds));
    }
  }, [activeReconciliation]);

  // Auto-suggest categorizations from memory when transactions load
  useEffect(() => {
    if (activeTab === 'uncategorized' && importedTransactions.length > 0) {
      const newAccounts = new Map(transactionAccounts);
      const newNames = new Map(transactionNames);
      const newTaxes = new Map(transactionTaxes);
      let hasChanges = false;

      importedTransactions.forEach(tx => {
        // Skip if already has values set
        if (transactionAccounts.has(tx.id)) return;
        
        // Try to get categorization from memory
        const merchantName = tx.merchantName || tx.name;
        const savedCategorization = getCategorization(merchantName);
        
        if (savedCategorization) {
          newAccounts.set(tx.id, savedCategorization.accountId);
          if (savedCategorization.contactName) {
            newNames.set(tx.id, savedCategorization.contactName);
          }
          if (savedCategorization.salesTaxId) {
            newTaxes.set(tx.id, savedCategorization.salesTaxId);
          }
          hasChanges = true;
        }
      });

      if (hasChanges) {
        setTransactionAccounts(newAccounts);
        setTransactionNames(newNames);
        setTransactionTaxes(newTaxes);
      }
    }
  }, [activeTab, importedTransactions]);

  return (
    <TooltipProvider>
    <div className="py-4">
      <div className="px-4">
        <div className="mb-3">
          <h1 className="text-xl font-semibold text-gray-900">Banking</h1>
          <p className="text-xs text-gray-500">
            Manage bank feeds and reconcile accounts
          </p>
        </div>
        
        <Tabs defaultValue="bank-feeds" className="w-full">
          <div className="flex items-center justify-between mb-4">
            <TabsList>
              <TabsTrigger value="bank-feeds" data-testid="tab-bank-feeds">Bank Feeds</TabsTrigger>
              <TabsTrigger value="reconciliation" data-testid="tab-reconciliation">Reconciliation</TabsTrigger>
              <TabsTrigger value="rules" data-testid="tab-rules">Rules</TabsTrigger>
            </TabsList>
            <Button
              onClick={() => setShowBankFeedSetup(true)}
              data-testid="button-setup-bank-feed"
              size="sm"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Set Up Bank Feed
            </Button>
          </div>

          <TabsContent value="bank-feeds" className="mt-0">
            {/* Compact Bank Account Tiles */}
            <div className="bg-slate-50/70 rounded-lg px-3 py-2 mb-3">
              {glAccountsLoading || bankAccountsLoading ? (
                <div className="text-center py-4 text-gray-500 text-sm">Loading...</div>
              ) : accountsWithFeedStatus.length === 0 ? (
                <div className="flex items-center gap-2 py-2 text-sm text-gray-600">
                  <AlertCircle className="h-4 w-4 text-gray-400" />
                  <span>No bank feeds connected yet. Click "Set Up Bank Feed" to connect.</span>
                </div>
              ) : (
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
                  {accountsWithFeedStatus.map((account) => (
                    <div
                      key={account.id}
                      onClick={() => handleAccountSelect(account.id)}
                      className={`group relative flex-shrink-0 flex items-center gap-3 border rounded-md px-3 py-2 cursor-pointer transition-all min-w-[280px] max-w-[320px] ${
                        selectedAccountId === account.id
                          ? 'border-primary bg-white shadow-sm'
                          : 'border-gray-200 bg-white hover:border-primary/50'
                      }`}
                      data-testid={`tile-account-${account.id}`}
                    >
                      {/* Left: Icon + Name */}
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Building2 className={`h-4 w-4 flex-shrink-0 ${selectedAccountId === account.id ? 'text-primary' : 'text-gray-400'}`} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-sm truncate">{account.name}</span>
                            {account.feedType && (
                              <Badge variant={account.feedType === 'plaid' ? 'default' : 'secondary'} className="h-4 text-[10px] px-1">
                                {account.feedType === 'plaid' ? 'Plaid' : 'CSV'}
                              </Badge>
                            )}
                          </div>
                          <span className="text-[10px] text-gray-400">({account.code})</span>
                        </div>
                      </div>

                      {/* Right: Balances */}
                      <div className="flex-shrink-0 text-right text-xs">
                        {account.bankAccount && (
                          <div className="flex items-center justify-end gap-1">
                            <span className="text-gray-400">Bank:</span>
                            <span className="font-medium w-20 text-right">{formatCurrency(account.bankAccount.currentBalance || 0, homeCurrency, homeCurrency)}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-end gap-1">
                          <span className="text-gray-400">Books:</span>
                          <span className="font-medium w-20 text-right">{formatCurrency(account.balance, homeCurrency, homeCurrency)}</span>
                        </div>
                      </div>

                      {/* Hover Actions - appears on hover */}
                      {account.bankAccount ? (
                        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 rounded px-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  syncTransactionsMutation.mutate(account.bankAccount!.id);
                                }}
                                disabled={syncTransactionsMutation.isPending}
                                data-testid={`button-sync-${account.id}`}
                              >
                                <RefreshCw className={`h-3 w-3 ${syncTransactionsMutation.isPending ? 'animate-spin' : ''}`} />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Refresh</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowBankFeedSetup(true);
                                }}
                                data-testid={`button-upload-csv-${account.id}`}
                              >
                                <Upload className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Upload CSV</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteBankAccountMutation.mutate(account.bankAccount!.id);
                                }}
                                disabled={deleteBankAccountMutation.isPending}
                                data-testid={`button-disconnect-${account.id}`}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Disconnect</TooltipContent>
                          </Tooltip>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowBankFeedSetup(true);
                          }}
                          data-testid={`button-connect-${account.id}`}
                        >
                          <Plus className="h-3 w-3 mr-0.5" />
                          Connect
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Imported Transactions */}
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'uncategorized' | 'categorized' | 'deleted')}>
              {/* Progress Stats Bar */}
              {(() => {
                // Only count transactions from accounts with active bank feeds
                const activeFeedAccountIds = new Set(accountsWithFeedStatus.map(a => a.id));
                const relevantTransactions = allImportedTransactions.filter(tx =>
                  tx.accountId && activeFeedAccountIds.has(tx.accountId)
                );

                // Use the same status field that the server uses for filtering
                const uncategorizedCount = relevantTransactions.filter(tx => tx.status === 'unmatched').length;
                const categorizedCount = relevantTransactions.filter(tx => tx.status === 'matched').length;
                const totalActive = uncategorizedCount + categorizedCount;
                const progressPercent = totalActive > 0 ? Math.round((categorizedCount / totalActive) * 100) : 0;

                return totalActive > 0 ? (
                  <div className="flex items-center gap-4 mb-3 p-3 bg-gradient-to-r from-slate-50 to-slate-100/50 rounded-lg border border-slate-200/60">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-medium text-slate-600">Categorization Progress</span>
                        <span className="text-xs font-semibold text-slate-700">{progressPercent}%</span>
                      </div>
                      <Progress
                        value={progressPercent}
                        className="h-2 bg-slate-200"
                      />
                    </div>
                    <div className="flex gap-3 text-xs">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                        <span className="text-slate-600"><span className="font-semibold text-slate-800">{uncategorizedCount}</span> pending</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                        <span className="text-slate-600"><span className="font-semibold text-slate-800">{categorizedCount}</span> done</span>
                      </div>
                    </div>
                  </div>
                ) : null;
              })()}

              <div className="flex items-center justify-between mb-2">
                <TabsList>
                  <TabsTrigger value="uncategorized" data-testid="tab-uncategorized">Uncategorized</TabsTrigger>
                  <TabsTrigger value="categorized" data-testid="tab-categorized">Categorized</TabsTrigger>
                  <TabsTrigger value="deleted" data-testid="tab-deleted">Deleted</TabsTrigger>
                </TabsList>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Show:</span>
                  <SearchableSelect
                    items={pageSizeItems}
                    value={pageSize.toString()}
                    onValueChange={(value) => handlePageSizeChange(Number(value))}
                    placeholder="Select page size"
                    searchPlaceholder="Search..."
                    emptyText="No options found"
                    data-testid="select-page-size"
                  />
                </div>
              </div>

              <TabsContent value={activeTab} className="mt-0">
                <Card className="border-0 shadow-none">
                  <CardHeader className="px-0 py-2">
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle className="text-base">
                          {activeTab === 'uncategorized' && 'Uncategorized Transactions'}
                          {activeTab === 'categorized' && 'Categorized Transactions'}
                          {activeTab === 'deleted' && 'Deleted Transactions'}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {activeTab === 'uncategorized' && `${filteredTransactions.length} transactions waiting to be categorized`}
                          {activeTab === 'categorized' && `${filteredTransactions.length} transactions have been categorized`}
                          {activeTab === 'deleted' && `${filteredTransactions.length} deleted transactions`}
                          {selectedAccountId && ` for ${accountsWithFeedStatus.find(a => a.id === selectedAccountId)?.name}`}
                        </CardDescription>
                      </div>
                    </div>

                    {/* Search and Filter Controls - Compact */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2 mt-2">
                  <div className="lg:col-span-2 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search description or name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                      data-testid="input-search"
                    />
                  </div>
                  <div>
                    <Input
                      type="date"
                      placeholder="From date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      data-testid="input-date-from"
                    />
                  </div>
                  <div>
                    <Input
                      type="date"
                      placeholder="To date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      data-testid="input-date-to"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Min $"
                      value={amountMin}
                      onChange={(e) => setAmountMin(e.target.value)}
                      className="w-1/2"
                      data-testid="input-amount-min"
                    />
                    <Input
                      type="number"
                      placeholder="Max $"
                      value={amountMax}
                      onChange={(e) => setAmountMax(e.target.value)}
                      className="w-1/2"
                      data-testid="input-amount-max"
                    />
                  </div>
                </div>
                
                {/* Clear Filters Button */}
                {(searchQuery || dateFrom || dateTo || amountMin || amountMax) && (
                  <div className="mt-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSearchQuery('');
                        setDateFrom('');
                        setDateTo('');
                        setAmountMin('');
                        setAmountMax('');
                      }}
                      data-testid="button-clear-filters"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Clear Filters
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {filteredTransactions.length === 0 ? (
                  <Alert>
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertTitle>
                      {activeTab === 'uncategorized' && 'No uncategorized transactions'}
                      {activeTab === 'categorized' && 'No categorized transactions'}
                      {activeTab === 'deleted' && 'No deleted transactions'}
                    </AlertTitle>
                    <AlertDescription>
                      {activeTab === 'uncategorized' && (selectedAccountId 
                        ? `All transactions for ${accountsWithFeedStatus.find(a => a.id === selectedAccountId)?.name} have been categorized or there are no imports yet.`
                        : 'All transactions have been categorized or there are no imports yet.')}
                      {activeTab === 'categorized' && (selectedAccountId 
                        ? `No transactions have been categorized for ${accountsWithFeedStatus.find(a => a.id === selectedAccountId)?.name} yet.`
                        : 'No transactions have been categorized yet.')}
                      {activeTab === 'deleted' && (selectedAccountId 
                        ? `No deleted transactions for ${accountsWithFeedStatus.find(a => a.id === selectedAccountId)?.name}.`
                        : 'No deleted transactions.')}
                    </AlertDescription>
                  </Alert>
                ) : (
                  <>
                    {/* Bulk Action Buttons */}
                    {selectedTransactions.size > 0 && (
                      <div className="mb-4 p-4 bg-primary/5 border border-primary/20 rounded-lg flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="font-semibold">
                            {selectedTransactions.size} transaction{selectedTransactions.size !== 1 ? 's' : ''} selected
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedTransactions(new Set())}
                            data-testid="button-clear-selection"
                          >
                            <X className="h-4 w-4 mr-1" />
                            Clear Selection
                          </Button>
                        </div>
                        {activeTab === 'uncategorized' && (
                          <div className="flex items-center gap-2">
                            <Button
                              variant="default"
                              onClick={handleBulkPost}
                              disabled={categorizeTransactionMutation.isPending}
                              data-testid="button-bulk-post"
                            >
                              <Send className="h-4 w-4 mr-2" />
                              Post Selected
                            </Button>
                            <Button
                              variant="destructive"
                              onClick={handleBulkDelete}
                              disabled={deleteTransactionMutation.isPending}
                              data-testid="button-bulk-delete"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Selected
                            </Button>
                          </div>
                        )}
                        {activeTab === 'deleted' && (
                          <div className="flex items-center gap-2">
                            <Button
                              variant="default"
                              onClick={handleBulkRestore}
                              disabled={restoreTransactionMutation.isPending}
                              data-testid="button-bulk-restore"
                            >
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Restore Selected
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Table container with fixed height and bottom scrollbar always visible */}
                    <div 
                      className="relative"
                      style={{ height: '500px' }}
                    >
                      {/* Horizontal scroll wrapper that contains both header and body */}
                      <div 
                        className="absolute inset-0 overflow-x-auto overflow-y-hidden"
                        id="table-scroll-container"
                      >
                        <div style={{ minWidth: `${totalTableWidth}px` }}>
                          {/* Fixed header */}
                          <div className="sticky top-0 z-10 bg-white border-b">
                            <Table style={{ tableLayout: 'fixed', width: `${totalTableWidth}px` }}>
                              <TableHeader>
                                <TableRow>
                            <TableHead style={{ width: `${columnWidths.checkbox}px`, minWidth: `${columnWidths.checkbox}px` }} className="relative">
                              <Checkbox 
                                checked={allSelected}
                                onCheckedChange={handleSelectAll}
                                data-testid="checkbox-select-all"
                              />
                              <div
                                className="absolute top-0 right-0 w-8 h-full cursor-col-resize hover:bg-primary/20 transition-colors group z-20"
                                onMouseDown={(e) => handleResizeStart('checkbox', e)}
                              >
                                <GripVertical className="h-4 w-4 opacity-0 group-hover:opacity-100 absolute top-1/2 -translate-y-1/2 right-2 transition-opacity" />
                              </div>
                            </TableHead>
                            <TableHead style={{ width: `${columnWidths.date}px`, minWidth: `${columnWidths.date}px` }} className="relative">
                              <div className="flex items-center gap-1 cursor-pointer pr-10" onClick={() => handleSort('date')}>
                                Date
                                {sortField === 'date' ? (
                                  sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                                ) : (
                                  <ArrowUpDown className="h-3 w-3 opacity-50" />
                                )}
                              </div>
                              <div
                                className="absolute top-0 right-0 w-8 h-full cursor-col-resize hover:bg-primary/20 transition-colors group z-20"
                                onMouseDown={(e) => handleResizeStart('date', e)}
                              >
                                <GripVertical className="h-4 w-4 opacity-0 group-hover:opacity-100 absolute top-1/2 -translate-y-1/2 right-2 transition-opacity" />
                              </div>
                            </TableHead>
                            <TableHead style={{ width: `${columnWidths.description}px`, minWidth: `${columnWidths.description}px` }} className="relative">
                              <div className="flex items-center gap-1 cursor-pointer pr-10" onClick={() => handleSort('description')}>
                                Description
                                {sortField === 'description' ? (
                                  sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                                ) : (
                                  <ArrowUpDown className="h-3 w-3 opacity-50" />
                                )}
                              </div>
                              <div
                                className="absolute top-0 right-0 w-8 h-full cursor-col-resize hover:bg-primary/20 transition-colors group z-20"
                                onMouseDown={(e) => handleResizeStart('description', e)}
                              >
                                <GripVertical className="h-4 w-4 opacity-0 group-hover:opacity-100 absolute top-1/2 -translate-y-1/2 right-2 transition-opacity" />
                              </div>
                            </TableHead>
                            <TableHead style={{ width: `${columnWidths.payments}px`, minWidth: `${columnWidths.payments}px` }} className="text-right relative pr-10">
                              <span className="text-rose-600 font-medium">Payments</span>
                              <div
                                className="absolute top-0 right-0 w-8 h-full cursor-col-resize hover:bg-primary/20 transition-colors group z-20"
                                onMouseDown={(e) => handleResizeStart('payments', e)}
                              >
                                <GripVertical className="h-4 w-4 opacity-0 group-hover:opacity-100 absolute top-1/2 -translate-y-1/2 right-2 transition-opacity" />
                              </div>
                            </TableHead>
                            <TableHead style={{ width: `${columnWidths.deposits}px`, minWidth: `${columnWidths.deposits}px` }} className="text-right relative pr-10">
                              <span className="text-emerald-600 font-medium">Deposits</span>
                              <div
                                className="absolute top-0 right-0 w-8 h-full cursor-col-resize hover:bg-primary/20 transition-colors group z-20"
                                onMouseDown={(e) => handleResizeStart('deposits', e)}
                              >
                                <GripVertical className="h-4 w-4 opacity-0 group-hover:opacity-100 absolute top-1/2 -translate-y-1/2 right-2 transition-opacity" />
                              </div>
                            </TableHead>
                            <TableHead style={{ width: `${columnWidths.name}px`, minWidth: `${columnWidths.name}px` }} className="relative pr-10">
                              Name
                              <div
                                className="absolute top-0 right-0 w-8 h-full cursor-col-resize hover:bg-primary/20 transition-colors group z-20"
                                onMouseDown={(e) => handleResizeStart('name', e)}
                              >
                                <GripVertical className="h-4 w-4 opacity-0 group-hover:opacity-100 absolute top-1/2 -translate-y-1/2 right-2 transition-opacity" />
                              </div>
                            </TableHead>
                            <TableHead style={{ width: `${columnWidths.account}px`, minWidth: `${columnWidths.account}px` }} className="relative pr-10">
                              Account
                              <div
                                className="absolute top-0 right-0 w-8 h-full cursor-col-resize hover:bg-primary/20 transition-colors group z-20"
                                onMouseDown={(e) => handleResizeStart('account', e)}
                              >
                                <GripVertical className="h-4 w-4 opacity-0 group-hover:opacity-100 absolute top-1/2 -translate-y-1/2 right-2 transition-opacity" />
                              </div>
                            </TableHead>
                            <TableHead style={{ width: `${columnWidths.tax}px`, minWidth: `${columnWidths.tax}px` }} className="relative pr-10">
                              Tax
                              <div
                                className="absolute top-0 right-0 w-8 h-full cursor-col-resize hover:bg-primary/20 transition-colors group z-20"
                                onMouseDown={(e) => handleResizeStart('tax', e)}
                              >
                                <GripVertical className="h-4 w-4 opacity-0 group-hover:opacity-100 absolute top-1/2 -translate-y-1/2 right-2 transition-opacity" />
                              </div>
                            </TableHead>
                            <TableHead style={{ width: `${columnWidths.matchCategorize}px`, minWidth: `${columnWidths.matchCategorize}px` }} className="relative pr-10">
                              Match/Categorize
                              <div
                                className="absolute top-0 right-0 w-8 h-full cursor-col-resize hover:bg-primary/20 transition-colors group z-20"
                                onMouseDown={(e) => handleResizeStart('matchCategorize', e)}
                              >
                                <GripVertical className="h-4 w-4 opacity-0 group-hover:opacity-100 absolute top-1/2 -translate-y-1/2 right-2 transition-opacity" />
                              </div>
                            </TableHead>
                            <TableHead style={{ width: `${columnWidths.docs}px`, minWidth: `${columnWidths.docs}px` }} className="relative pr-10">
                              Docs
                              <div
                                className="absolute top-0 right-0 w-8 h-full cursor-col-resize hover:bg-primary/20 transition-colors group z-20"
                                onMouseDown={(e) => handleResizeStart('docs', e)}
                              >
                                <GripVertical className="h-4 w-4 opacity-0 group-hover:opacity-100 absolute top-1/2 -translate-y-1/2 right-2 transition-opacity" />
                              </div>
                            </TableHead>
                            <TableHead style={{ width: `${columnWidths.action}px`, minWidth: `${columnWidths.action}px` }} className="relative">
                              Action
                            </TableHead>
                                </TableRow>
                              </TableHeader>
                            </Table>
                          </div>
                          
                          {/* Scrollable body */}
                          <div className="overflow-y-auto" style={{ maxHeight: '450px' }}>
                            <Table style={{ tableLayout: 'fixed', width: `${totalTableWidth}px` }}>
                              <TableBody>
                          {paginatedTransactions.map((tx) => (
                            <TableRow
                              key={tx.id}
                              className={`h-12 transition-all duration-150 ${
                                selectedTransactions.has(tx.id)
                                  ? 'bg-primary/5 border-l-2 border-l-primary'
                                  : 'hover:bg-slate-50/80'
                              } ${
                                activeTab === 'uncategorized' && !tx.matchedTransactionId
                                  ? 'cursor-pointer hover:shadow-sm'
                                  : ''
                              }`}
                              onClick={() => {
                                if (activeTab === 'uncategorized' && !tx.matchedTransactionId) {
                                  setSelectedTransaction(tx);
                                  setCategorizationDialogOpen(true);
                                }
                              }}
                              data-testid={`row-transaction-${tx.id}`}
                            >
                              <TableCell 
                                style={{ width: `${columnWidths.checkbox}px`, minWidth: `${columnWidths.checkbox}px` }} 
                                className="py-2 overflow-hidden"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Checkbox 
                                  checked={selectedTransactions.has(tx.id)}
                                  onCheckedChange={(checked) => handleSelectTransaction(tx.id, checked as boolean)}
                                  data-testid={`checkbox-transaction-${tx.id}`}
                                />
                              </TableCell>
                              <TableCell style={{ width: `${columnWidths.date}px`, minWidth: `${columnWidths.date}px` }} className="py-2 overflow-hidden truncate">{format(new Date(tx.date), 'PP')}</TableCell>
                              <TableCell style={{ width: `${columnWidths.description}px`, minWidth: `${columnWidths.description}px` }} className="py-2 overflow-hidden">
                                {tx.matchedTransactionId ? (
                                  <div 
                                    className="truncate cursor-pointer hover:text-primary transition-colors"
                                    onClick={() => {
                                      const txType = Number(tx.amount) < 0 ? 'expenses' : 'deposits';
                                      setLocation(`/${txType}/${tx.matchedTransactionId}`);
                                    }}
                                    data-testid={`link-transaction-${tx.id}`}
                                  >
                                    <p className="font-medium truncate text-primary underline">{tx.name}</p>
                                    {tx.merchantName && (
                                      <p className="text-sm text-gray-500 truncate">{tx.merchantName}</p>
                                    )}
                                  </div>
                                ) : (
                                  <div className="truncate">
                                    <p className="font-medium truncate">{tx.name}</p>
                                    {tx.merchantName && (
                                      <p className="text-sm text-gray-500 truncate">{tx.merchantName}</p>
                                    )}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell style={{ width: `${columnWidths.payments}px`, minWidth: `${columnWidths.payments}px` }} className="text-right font-medium py-2 overflow-hidden truncate">
                                {Number(tx.amount) < 0 ? (
                                  <span className="text-rose-600 font-semibold">{formatCurrency(Math.abs(Number(tx.amount)), homeCurrency, homeCurrency)}</span>
                                ) : (
                                  <span className="text-gray-300">-</span>
                                )}
                              </TableCell>
                              <TableCell style={{ width: `${columnWidths.deposits}px`, minWidth: `${columnWidths.deposits}px` }} className="text-right font-medium py-2 overflow-hidden truncate">
                                {Number(tx.amount) > 0 ? (
                                  <span className="text-emerald-600 font-semibold">{formatCurrency(Number(tx.amount), homeCurrency, homeCurrency)}</span>
                                ) : (
                                  <span className="text-gray-300">-</span>
                                )}
                              </TableCell>
                              <TableCell 
                                style={{ width: `${columnWidths.name}px`, minWidth: `${columnWidths.name}px` }} 
                                className="py-2 overflow-hidden"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {activeTab === 'uncategorized' && transactionMode.get(tx.id) === 'categorize' ? (
                                  <SearchableSelect
                                    items={contactItems}
                                    value={transactionNames.get(tx.id) || ''}
                                    onValueChange={(value) => handleNameChange(tx.id, value)}
                                    placeholder="Select vendor/customer"
                                    searchPlaceholder="Search contacts..."
                                    emptyText="No contacts found."
                                    data-testid={`select-name-${tx.id}`}
                                  />
                                ) : activeTab === 'uncategorized' && transactionMode.get(tx.id) === 'match' ? (
                                  <span className="text-sm text-gray-500">-</span>
                                ) : (
                                  <span className="text-sm text-gray-700">
                                    {(() => {
                                      const matched = getMatchedTransaction(tx);
                                      if (!matched) return '-';
                                      const contact = contacts.find(c => c.id === matched.transaction.contactId);
                                      return contact ? contact.name : '-';
                                    })()}
                                  </span>
                                )}
                              </TableCell>
                              <TableCell 
                                style={{ width: `${columnWidths.account}px`, minWidth: `${columnWidths.account}px` }} 
                                className="py-2 overflow-hidden"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {activeTab === 'uncategorized' && transactionMode.get(tx.id) === 'categorize' ? (
                                  <SearchableSelect
                                    items={accountItems}
                                    value={transactionAccounts.get(tx.id)?.toString() || ''}
                                    onValueChange={(value) => handleAccountChange(tx.id, value ? Number(value) : null)}
                                    placeholder="Select account"
                                    searchPlaceholder="Search accounts..."
                                    emptyText="No accounts found."
                                    data-testid={`select-account-${tx.id}`}
                                    onAddNew={() => {
                                      setCurrentTransactionId(tx.id);
                                      setShowAddAccountDialog(true);
                                    }}
                                    addNewText="Add New Account"
                                  />
                                ) : activeTab === 'uncategorized' && transactionMode.get(tx.id) === 'match' ? (
                                  <span className="text-sm text-gray-500">-</span>
                                ) : (
                                  <span className="text-sm text-gray-700">
                                    {(() => {
                                      const matched = getMatchedTransaction(tx);
                                      if (!matched || !matched.lineItems || matched.lineItems.length === 0) return '-';
                                      const lineItem = matched.lineItems[0];
                                      const account = glAccounts.find(a => a.id === lineItem.accountId);
                                      return account ? account.name : '-';
                                    })()}
                                  </span>
                                )}
                              </TableCell>
                              <TableCell 
                                style={{ width: `${columnWidths.tax}px`, minWidth: `${columnWidths.tax}px` }} 
                                className="py-2 overflow-hidden"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {activeTab === 'uncategorized' && transactionMode.get(tx.id) === 'categorize' ? (
                                  <SearchableSelect
                                    items={taxItems}
                                    value={transactionTaxes.get(tx.id)?.toString() || ''}
                                    onValueChange={(value) => handleTaxChange(tx.id, value ? Number(value) : null)}
                                    placeholder="Select Tax"
                                    searchPlaceholder="Search taxes..."
                                    emptyText="No taxes found."
                                    data-testid={`select-tax-${tx.id}`}
                                  />
                                ) : activeTab === 'uncategorized' && transactionMode.get(tx.id) === 'match' ? (
                                  <span className="text-sm text-gray-500">-</span>
                                ) : (
                                  <span className="text-sm text-gray-700">
                                    {(() => {
                                      const matched = getMatchedTransaction(tx);
                                      if (!matched || !matched.lineItems || matched.lineItems.length === 0) return '-';
                                      const lineItem = matched.lineItems[0];
                                      if (!lineItem.salesTaxId) return 'No tax';
                                      const tax = salesTaxes.find(t => t.id === lineItem.salesTaxId);
                                      return tax ? `${tax.name} (${tax.rate}%)` : '-';
                                    })()}
                                  </span>
                                )}
                              </TableCell>
                              {activeTab === 'uncategorized' && (
                                <>
                                  <TableCell 
                                    style={{ width: `${columnWidths.matchCategorize}px`, minWidth: `${columnWidths.matchCategorize}px` }} 
                                    className="py-2 overflow-hidden"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {(() => {
                                      const matchData = matchSuggestions.get(tx.id);
                                      const topMatch = matchData?.topMatch;
                                      const mode = transactionMode.get(tx.id) || 'categorize';
                                      const hasHighConfidenceMatch = topMatch && topMatch.confidence > 80;
                                      
                                      if (loadingMatches) {
                                        return <span className="text-xs text-gray-400">Checking...</span>;
                                      }
                                      
                                      return (
                                        <div className="flex flex-col gap-1.5">
                                          <div className="flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5">
                                            <Button
                                              variant={mode === 'match' ? 'default' : 'ghost'}
                                              size="sm"
                                              className={`text-[11px] px-2 h-6 flex-1 rounded-md transition-all ${
                                                mode === 'match'
                                                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm'
                                                  : 'hover:bg-slate-200'
                                              }`}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                if (mode !== 'match') handleModeToggle(tx.id);
                                              }}
                                              data-testid={`button-mode-match-${tx.id}`}
                                            >
                                              Match
                                            </Button>
                                            <Button
                                              variant={mode === 'categorize' ? 'default' : 'ghost'}
                                              size="sm"
                                              className={`text-[11px] px-2 h-6 flex-1 rounded-md transition-all ${
                                                mode === 'categorize'
                                                  ? 'bg-gradient-to-r from-violet-500 to-violet-600 text-white shadow-sm'
                                                  : 'hover:bg-slate-200'
                                              }`}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                if (mode !== 'categorize') handleModeToggle(tx.id);
                                              }}
                                              data-testid={`button-mode-categorize-${tx.id}`}
                                            >
                                              Categorize
                                            </Button>
                                          </div>
                                          {mode === 'match' && hasHighConfidenceMatch && (
                                            <div className="text-[10px] space-y-0.5 bg-blue-50 rounded-md p-1.5 border border-blue-100">
                                              <div className="flex items-center gap-1">
                                                <span className="font-medium text-blue-900">
                                                  {(() => {
                                                    const contact = contacts.find((c: any) => c.id === topMatch.contactId);
                                                    const contactName = topMatch.contactName || 'Unknown';
                                                    return formatContactName(contactName, contact?.currency, homeCurrency);
                                                  })()}
                                                </span>
                                                <Badge className={`text-[9px] px-1.5 py-0 h-4 ${
                                                  topMatch.confidence >= 90 ? 'bg-emerald-500' :
                                                  topMatch.confidence >= 80 ? 'bg-blue-500' :
                                                  'bg-amber-500'
                                                }`}>
                                                  {topMatch.confidence}%
                                                </Badge>
                                              </div>
                                              <div className="text-blue-600">
                                                {formatCurrency(topMatch.amount, homeCurrency, homeCurrency)} • {format(new Date(topMatch.date), 'PP')}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })()}
                                  </TableCell>
                                  <TableCell 
                                    style={{ width: `${columnWidths.docs}px`, minWidth: `${columnWidths.docs}px` }} 
                                    className="py-2 overflow-hidden"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      onClick={() => {
                                        setSelectedAttachmentTransactionId(tx.id);
                                        setAttachmentDialogOpen(true);
                                      }}
                                      data-testid={`button-attach-${tx.id}`}
                                    >
                                      <Paperclip className="h-4 w-4" />
                                    </Button>
                                  </TableCell>
                                </>
                              )}
                              {activeTab === 'categorized' && (
                                <>
                                  <TableCell style={{ width: `${columnWidths.matchCategorize}px`, minWidth: `${columnWidths.matchCategorize}px` }} className="py-2 overflow-hidden">
                                    {tx.isMultiMatch ? (
                                      <div className="space-y-1">
                                        <Badge 
                                          variant="outline" 
                                          className="text-xs cursor-pointer hover:bg-gray-100"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleToggleMultiMatchBreakdown(tx.id);
                                          }}
                                          data-testid={`badge-multi-match-${tx.id}`}
                                        >
                                          🔀 Various {expandedMultiMatches.has(tx.id) ? '▼' : '▶'}
                                        </Badge>
                                        {expandedMultiMatches.has(tx.id) && (
                                          <div className="text-[10px] text-gray-600 space-y-0.5 mt-1 pl-2 border-l-2 border-gray-300">
                                            {multiMatchBreakdowns.get(tx.id)?.map((match: any, idx: number) => (
                                              <div key={idx} className="flex items-center gap-1">
                                                <span className="font-medium">{match.transactionType === 'bill' ? '📄' : '💰'}</span>
                                                <span>{match.reference || match.description}</span>
                                                <span className="text-gray-500">• ${match.amount.toFixed(2)}</span>
                                              </div>
                                            )) || <span className="text-gray-400">Loading...</span>}
                                          </div>
                                        )}
                                      </div>
                                    ) : tx.matchedTransactionType ? (
                                      <Badge variant="outline" className="text-xs">
                                        {tx.matchedTransactionType === 'invoice' && '📄 Invoice Match'}
                                        {tx.matchedTransactionType === 'bill' && '📄 Bill Match'}
                                        {tx.matchedTransactionType === 'payment' && '💰 Payment'}
                                        {tx.matchedTransactionType === 'deposit' && '💰 Deposit'}
                                        {tx.matchedTransactionType === 'expense' && '💸 Expense'}
                                        {tx.matchedTransactionType === 'manual_entry' && '✏️ Manual Entry'}
                                        {!['invoice', 'bill', 'payment', 'deposit', 'expense', 'manual_entry'].includes(tx.matchedTransactionType) && '✓ Categorized'}
                                      </Badge>
                                    ) : (
                                      <Badge variant="secondary" className="text-xs">✓ Categorized</Badge>
                                    )}
                                  </TableCell>
                                  <TableCell style={{ width: `${columnWidths.docs}px`, minWidth: `${columnWidths.docs}px` }} className="py-2 overflow-hidden">
                                    <span className="text-sm text-gray-500">-</span>
                                  </TableCell>
                                </>
                              )}
                              {activeTab === 'deleted' && (
                                <>
                                  <TableCell style={{ width: `${columnWidths.matchCategorize}px`, minWidth: `${columnWidths.matchCategorize}px` }} className="py-2 overflow-hidden">
                                    <span className="text-sm text-gray-500">-</span>
                                  </TableCell>
                                  <TableCell style={{ width: `${columnWidths.docs}px`, minWidth: `${columnWidths.docs}px` }} className="py-2 overflow-hidden">
                                    <span className="text-sm text-gray-500">-</span>
                                  </TableCell>
                                </>
                              )}
                              <TableCell 
                                style={{ width: `${columnWidths.action}px`, minWidth: `${columnWidths.action}px` }} 
                                className="py-2 overflow-hidden"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="flex gap-1">
                                  {activeTab === 'uncategorized' && (
                                    <>
                                      {transactionMode.get(tx.id) === 'match' ? (
                                        <Button 
                                          variant="default" 
                                          size="sm"
                                          className="gap-1"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setMatchingTransaction(tx);
                                            if (Number(tx.amount) < 0) {
                                              setPayBillsDialogOpen(true);
                                            } else {
                                              setReceivePaymentsDialogOpen(true);
                                            }
                                          }}
                                          data-testid={`button-match-${tx.id}`}
                                        >
                                          <Send className="h-4 w-4" />
                                          {Number(tx.amount) < 0 ? 'Pay Bills' : 'Receive Payments'}
                                        </Button>
                                      ) : (
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button 
                                              variant="outline" 
                                              size="sm"
                                              onClick={() => handlePostTransaction(tx)}
                                              disabled={categorizeTransactionMutation.isPending}
                                              data-testid={`button-post-${tx.id}`}
                                            >
                                              <Send className="h-4 w-4" />
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            <p>Post</p>
                                          </TooltipContent>
                                        </Tooltip>
                                      )}
                                      <Button 
                                        variant="ghost" 
                                        size="sm"
                                        onClick={() => deleteTransactionMutation.mutate(tx.id)}
                                        disabled={deleteTransactionMutation.isPending}
                                        data-testid={`button-delete-${tx.id}`}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </>
                                  )}
                                  {activeTab === 'categorized' && (
                                    <>
                                      {tx.matchedTransactionId && (
                                        <Button 
                                          variant="outline" 
                                          size="sm"
                                          onClick={() => {
                                            const txType = Number(tx.amount) < 0 ? 'expenses' : 'deposits';
                                            setLocation(`/${txType}/${tx.matchedTransactionId}`);
                                          }}
                                          data-testid={`button-view-${tx.id}`}
                                        >
                                          View
                                        </Button>
                                      )}
                                      {tx.matchedTransactionType && ['invoice', 'bill', 'manual_entry'].includes(tx.matchedTransactionType) ? (
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button 
                                              variant="ghost" 
                                              size="sm"
                                              onClick={() => unmatchTransactionMutation.mutate(tx.id)}
                                              disabled={unmatchTransactionMutation.isPending}
                                              data-testid={`button-unmatch-${tx.id}`}
                                            >
                                              <X className="h-4 w-4" />
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            <p>Unmatch</p>
                                          </TooltipContent>
                                        </Tooltip>
                                      ) : (
                                        <Button 
                                          variant="ghost" 
                                          size="sm"
                                          onClick={() => undoCategorizationMutation.mutate(tx.id)}
                                          disabled={undoCategorizationMutation.isPending}
                                          data-testid={`button-undo-${tx.id}`}
                                        >
                                          Undo
                                        </Button>
                                      )}
                                    </>
                                  )}
                                  {activeTab === 'deleted' && (
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      onClick={() => restoreTransactionMutation.mutate(tx.id)}
                                      disabled={restoreTransactionMutation.isPending}
                                      data-testid={`button-restore-${tx.id}`}
                                    >
                                      <RefreshCw className="h-4 w-4 mr-1" />
                                      Restore
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Pagination Controls */}
                    <div className="mt-4 flex items-center justify-between sticky bottom-0 bg-white py-3 border-t -mx-6 px-6 shadow-[0_-2px_8px_rgba(0,0,0,0.05)]">
                      <p className="text-sm text-gray-500">
                        Showing {startIndex + 1} to {Math.min(endIndex, filteredTransactions.length)} of {filteredTransactions.length} transactions
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                          data-testid="button-previous-page"
                        >
                          Previous
                        </Button>
                        <span className="text-sm text-gray-600">
                          Page {currentPage} of {totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          disabled={currentPage === totalPages}
                          data-testid="button-next-page"
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
            </Tabs>
          </TabsContent>
          
          <TabsContent value="reconciliation">
            <div className="space-y-6">
              {/* Reconciliation Header */}
              {!activeReconciliationId && (
                <Card>
                  <CardHeader>
                    <CardTitle>Reconcile Account</CardTitle>
                    <CardDescription>
                      Match your book transactions with your bank statement
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Account Selection */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Account</label>
                        <Select value={reconcileAccountId?.toString() || ''} onValueChange={(value) => setReconcileAccountId(Number(value))}>
                          <SelectTrigger data-testid="select-reconcile-account">
                            <SelectValue placeholder="Select account to reconcile" />
                          </SelectTrigger>
                          <SelectContent>
                            {glAccounts
                              .filter(acc => ['bank', 'credit_card', 'current_assets'].includes(acc.type))
                              .map(acc => (
                                <SelectItem key={acc.id} value={acc.id.toString()}>
                                  {acc.code} - {acc.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Statement Ending Date</label>
                        <Input 
                          type="date" 
                          value={reconcileStatementDate}
                          onChange={(e) => setReconcileStatementDate(e.target.value)}
                          data-testid="input-statement-date"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Statement Ending Balance</label>
                        <Input 
                          type="number" 
                          step="0.01" 
                          placeholder="0.00"
                          value={reconcileStatementBalance}
                          onChange={(e) => setReconcileStatementBalance(e.target.value)}
                          data-testid="input-statement-balance"
                        />
                      </div>
                    </div>

                    <Button 
                      className="w-full md:w-auto" 
                      onClick={handleStartReconciliation}
                      disabled={createReconciliationMutation.isPending}
                      data-testid="button-start-reconciliation"
                    >
                      {createReconciliationMutation.isPending ? 'Starting...' : 'Start Reconciliation'}
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Reconciliation Summary */}
              {activeReconciliationId && activeReconciliation && (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle>Reconciliation Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {reconciliationLoading ? (
                        <div className="text-center py-8 text-gray-500">Loading...</div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div>
                            <p className="text-sm text-gray-500">Statement Balance</p>
                            <p className="text-xl font-semibold">{formatCurrency(activeReconciliation.statementEndingBalance, homeCurrency, homeCurrency)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Cleared Balance</p>
                            <p className="text-xl font-semibold">{formatCurrency(activeReconciliation.clearedBalance || 0, homeCurrency, homeCurrency)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Difference</p>
                            <p className={`text-xl font-semibold ${activeReconciliation.difference === 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatCurrency(activeReconciliation.difference || 0, homeCurrency, homeCurrency)}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Status</p>
                            <Badge variant={activeReconciliation.status === 'completed' ? 'default' : 'secondary'}>
                              {activeReconciliation.status === 'in_progress' ? 'In Progress' : activeReconciliation.status}
                            </Badge>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Transactions to Reconcile */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Transactions</CardTitle>
                      <CardDescription>
                        Check off transactions that appear on your bank statement
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {ledgerEntriesLoading ? (
                        <div className="text-center py-12 text-gray-500">Loading transactions...</div>
                      ) : reconciliationLedgerEntries.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                          <p>No transactions found for this reconciliation period</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-12">Cleared</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Reference</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead className="text-right">Debit</TableHead>
                                <TableHead className="text-right">Credit</TableHead>
                                <TableHead className="text-right">Balance</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {reconciliationLedgerEntries.map((entry: any, index: number) => {
                                const runningBalance = reconciliationLedgerEntries
                                  .slice(0, index + 1)
                                  .reduce((sum: number, e: any) => sum + (e.debit || 0) - (e.credit || 0), 0);
                                
                                return (
                                  <TableRow key={entry.id}>
                                    <TableCell>
                                      <Checkbox
                                        checked={clearedEntries.has(entry.id)}
                                        onCheckedChange={(checked) => handleToggleCleared(entry.id, checked as boolean)}
                                        data-testid={`checkbox-entry-${entry.id}`}
                                      />
                                    </TableCell>
                                    <TableCell>{format(new Date(entry.date), 'MMM dd, yyyy')}</TableCell>
                                    <TableCell className="capitalize">{entry.transactionType?.replace('_', ' ')}</TableCell>
                                    <TableCell>{entry.reference || '-'}</TableCell>
                                    <TableCell>{entry.description || '-'}</TableCell>
                                    <TableCell className="text-right">
                                      {entry.debit ? formatCurrency(entry.debit, homeCurrency, homeCurrency) : '-'}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      {entry.credit ? formatCurrency(entry.credit, homeCurrency, homeCurrency) : '-'}
                                    </TableCell>
                                    <TableCell className="text-right font-medium">
                                      {formatCurrency(runningBalance, homeCurrency, homeCurrency)}
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      )}

                      {/* Action Buttons */}
                      {reconciliationLedgerEntries.length > 0 && (
                        <div className="mt-6 flex gap-3 justify-end">
                          <Button
                            variant="outline"
                            onClick={handleCancelReconciliation}
                            data-testid="button-cancel-reconciliation"
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              toast({
                                title: "Saved",
                                description: "Your reconciliation progress has been saved",
                              });
                            }}
                            data-testid="button-save-reconciliation"
                          >
                            Save
                          </Button>
                          <Button
                            onClick={() => completeReconciliationMutation.mutate(activeReconciliationId)}
                            disabled={activeReconciliation?.difference !== 0 || completeReconciliationMutation.isPending}
                            data-testid="button-complete-reconciliation"
                          >
                            {completeReconciliationMutation.isPending ? 'Completing...' : 'Complete'}
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          </TabsContent>

          <TabsContent value="rules">
            <RulesManagementTab />
          </TabsContent>
        </Tabs>
      </div>

      {/* Bank Feed Setup Dialog */}
      <BankFeedSetupDialog 
        open={showBankFeedSetup} 
        onOpenChange={setShowBankFeedSetup}
      />

      {/* Add Account Dialog */}
      <AddAccountDialog
        open={showAddAccountDialog}
        onOpenChange={setShowAddAccountDialog}
        onAccountCreated={(accountId) => {
          // Auto-select the newly created account for the current transaction
          if (currentTransactionId !== null) {
            handleAccountChange(currentTransactionId, accountId);
          }
          setCurrentTransactionId(null);
        }}
      />

      {/* Attachment Dialog */}
      {selectedAttachmentTransactionId && (
        <AttachmentDialog
          open={attachmentDialogOpen}
          onOpenChange={setAttachmentDialogOpen}
          transactionId={selectedAttachmentTransactionId}
        />
      )}

      {/* Categorization Dialog */}
      <CategorizeTransactionDialog
        open={categorizationDialogOpen}
        onOpenChange={setCategorizationDialogOpen}
        transaction={selectedTransaction}
      />

      {/* Pay Bills Dialog */}
      {matchingTransaction && (
        <PayBillsDialog
          open={payBillsDialogOpen}
          onOpenChange={setPayBillsDialogOpen}
          bankTransactionAmount={Math.abs(Number(matchingTransaction.amount))}
          onConfirm={(data) => {
            matchMultipleBillsMutation.mutate({
              transactionId: matchingTransaction.id,
              data,
            });
          }}
        />
      )}

      {/* Receive Payments Dialog */}
      {matchingTransaction && (
        <ReceivePaymentsDialog
          open={receivePaymentsDialogOpen}
          onOpenChange={setReceivePaymentsDialogOpen}
          bankTransactionAmount={Number(matchingTransaction.amount)}
          onConfirm={(data) => {
            matchMultipleInvoicesMutation.mutate({
              transactionId: matchingTransaction.id,
              data,
            });
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmationOpen} onOpenChange={setDeleteConfirmationOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transactions</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedTransactions.size} transaction{selectedTransactions.size !== 1 ? 's' : ''}? You can restore deleted transactions from the Deleted tab.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </TooltipProvider>
  );
}
