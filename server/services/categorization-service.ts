/**
 * Categorization Service
 *
 * Multi-layer categorization engine that provides smart suggestions
 * for bank transaction categorization. Uses a priority-based approach:
 *
 * Layer 1: Merchant Patterns (learned from user behavior) - fastest, highest confidence
 * Layer 2: Categorization Rules (manual first, then AI rules)
 * Layer 3: OpenAI Suggestions (for new/unknown merchants) - slowest, requires approval
 */

import { normalizeMerchantName } from './merchant-normalizer';
import type {
  ImportedTransaction,
  MerchantPattern,
  CategorizationRule,
  Account,
  Preferences
} from '../../shared/schema';

/**
 * Source of the categorization suggestion
 */
export type SuggestionSource = 'pattern' | 'rule' | 'ai' | 'none';

/**
 * Categorization suggestion returned to the frontend
 */
export interface CategorizationSuggestion {
  source: SuggestionSource;
  confidence: number; // 0.0 to 1.0
  transactionType?: string;
  accountId?: number;
  accountName?: string;
  contactId?: number;
  contactName?: string;
  salesTaxId?: number;
  reasoning?: string;
  requiresApproval: boolean; // True = user must confirm, False = can auto-post
  ruleId?: number; // If matched by a rule
  patternId?: number; // If matched by a pattern
}

/**
 * Condition set for categorization rules
 */
interface RuleConditions {
  descriptionContains?: string;
  amountMin?: number;
  amountMax?: number;
}

/**
 * Actions for categorization rules
 */
interface RuleActions {
  accountId?: number;
  contactName?: string;
  memo?: string;
}

/**
 * Storage interface for categorization operations
 */
export interface CategorizationStorage {
  // Merchant Patterns (company-scoped)
  getMerchantPatternByName(merchantNameNormalized: string, companyId?: number): Promise<MerchantPattern | null | undefined>;

  // Categorization Rules (company-scoped)
  getEnabledCategorizationRules(companyId?: number): Promise<CategorizationRule[]>;

  // Accounts
  getAccount(id: number): Promise<Account | null | undefined>;
  getAccounts(): Promise<Account[]>;

  // Contacts
  getContact(id: number): Promise<{ id: number; name: string } | null | undefined>;
  getContacts(): Promise<Array<{ id: number; name: string; type: string }>>;

  // Preferences
  getPreferences(): Promise<Preferences | null>;
}

/**
 * Gets a categorization suggestion for a bank transaction.
 * Uses multi-layer approach for best accuracy.
 * Patterns and rules are company-specific for data isolation.
 */
export async function getCategorization(
  storage: CategorizationStorage,
  transaction: ImportedTransaction,
  preferences?: Preferences | null,
  companyId?: number
): Promise<CategorizationSuggestion> {
  const merchantName = transaction.merchantName || transaction.name;
  const normalizedMerchant = normalizeMerchantName(merchantName);

  // Get preferences if not provided
  const prefs = preferences || await storage.getPreferences();
  const aiAutoPostEnabled = prefs?.aiAutoPostEnabled || false;
  const aiAutoPostMinConfidence = parseFloat(prefs?.aiAutoPostMinConfidence?.toString() || '0.95');

  // Layer 1: Check merchant patterns (local, fastest, company-scoped)
  if (normalizedMerchant) {
    const pattern = await storage.getMerchantPatternByName(normalizedMerchant, companyId);

    if (pattern && pattern.defaultAccountId) {
      const confidence = parseFloat(pattern.confidenceScore?.toString() || '0.5');
      const account = await storage.getAccount(pattern.defaultAccountId);
      const contact = pattern.defaultContactId
        ? await storage.getContact(pattern.defaultContactId)
        : null;

      // Determine if auto-post is allowed based on settings and confidence
      const canAutoPost = aiAutoPostEnabled && confidence >= aiAutoPostMinConfidence;

      return {
        source: 'pattern',
        confidence,
        transactionType: pattern.defaultTransactionType || 'expense',
        accountId: pattern.defaultAccountId,
        accountName: account?.name,
        contactId: pattern.defaultContactId ?? undefined,
        contactName: contact?.name,
        salesTaxId: pattern.defaultSalesTaxId ?? undefined,
        reasoning: `Matched learned pattern "${normalizedMerchant}" (${pattern.totalOccurrences} occurrences, ${Math.round(confidence * 100)}% confidence)`,
        requiresApproval: !canAutoPost,
        patternId: pattern.id,
      };
    }
  }

  // Layer 2: Check categorization rules (manual rules first, then AI rules, company-scoped)
  const rules = await storage.getEnabledCategorizationRules(companyId);
  const sortedRules = rules.sort((a, b) => a.priority - b.priority);

  for (const rule of sortedRules) {
    if (matchesRule(transaction, rule)) {
      const actions = rule.actions as RuleActions;
      const account = actions.accountId ? await storage.getAccount(actions.accountId) : null;

      const isManualRule = rule.ruleType === 'manual';
      const ruleConfidence = isManualRule ? 0.95 : parseFloat(rule.confidenceScore?.toString() || '0.85');

      // Manual rules can auto-post if enabled, AI rules require approval
      const canAutoPost = isManualRule && aiAutoPostEnabled && ruleConfidence >= aiAutoPostMinConfidence;

      return {
        source: 'rule',
        confidence: ruleConfidence,
        transactionType: 'expense',
        accountId: actions.accountId,
        accountName: account?.name,
        contactName: actions.contactName ?? undefined,
        salesTaxId: rule.salesTaxId ?? undefined,
        reasoning: `Matched ${rule.ruleType} rule: "${rule.name}"`,
        requiresApproval: !canAutoPost,
        ruleId: rule.id,
      };
    }
  }

  // Layer 3: No local match found - AI suggestion will be fetched separately
  // Return a 'none' suggestion to indicate AI should be called
  return {
    source: 'none',
    confidence: 0,
    requiresApproval: true,
    reasoning: 'No matching pattern or rule found. AI suggestion available.',
  };
}

/**
 * Checks if a transaction matches a categorization rule.
 */
function matchesRule(transaction: ImportedTransaction, rule: CategorizationRule): boolean {
  const conditions = rule.conditions as RuleConditions;

  // Check description contains condition
  if (conditions.descriptionContains) {
    const searchTerm = conditions.descriptionContains.toLowerCase();
    const description = (transaction.name || '').toLowerCase();
    const merchantName = (transaction.merchantName || '').toLowerCase();
    const normalizedName = normalizeMerchantName(transaction.merchantName || transaction.name).toLowerCase();

    if (
      !description.includes(searchTerm) &&
      !merchantName.includes(searchTerm) &&
      !normalizedName.includes(searchTerm)
    ) {
      return false;
    }
  }

  // Check amount range conditions (only if they are meaningful values > 0)
  const txAmount = Math.abs(transaction.amount);

  if (conditions.amountMin != null && conditions.amountMin > 0) {
    if (txAmount < conditions.amountMin) {
      return false;
    }
  }

  if (conditions.amountMax != null && conditions.amountMax > 0) {
    if (txAmount > conditions.amountMax) {
      return false;
    }
  }

  return true;
}

/**
 * Gets an AI categorization suggestion from OpenAI.
 * IMPORTANT: Only the merchant name is sent to OpenAI for privacy.
 */
export async function getAiCategorizationSuggestion(
  storage: CategorizationStorage,
  merchantName: string,
  amount: number
): Promise<CategorizationSuggestion | null> {
  // Check if AI categorization is enabled
  const prefs = await storage.getPreferences();
  if (!prefs?.aiCategorizationEnabled) {
    return null;
  }

  try {
    const OpenAI = (await import('openai')).default;
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
      baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
    });

    // Get company's chart of accounts for matching
    const accounts = await storage.getAccounts();
    const expenseAccounts = accounts
      .filter(a => ['expenses', 'cost_of_goods_sold', 'other_expense'].includes(a.type))
      .slice(0, 30)
      .map(a => ({ id: a.id, name: a.name, type: a.type }));

    const incomeAccounts = accounts
      .filter(a => ['income', 'other_income'].includes(a.type))
      .slice(0, 15)
      .map(a => ({ id: a.id, name: a.name, type: a.type }));

    const isExpense = amount < 0;
    const relevantAccounts = isExpense ? expenseAccounts : incomeAccounts;

    // PRIVACY: Only merchant name sent to OpenAI
    const prompt = `You are a bookkeeping assistant. Based ONLY on the merchant name, suggest the best category.

Merchant: "${merchantName}"
Transaction type: ${isExpense ? 'Expense/Payment' : 'Income/Deposit'}

Available ${isExpense ? 'expense' : 'income'} accounts:
${relevantAccounts.map(a => `- ID ${a.id}: ${a.name}`).join('\n')}

Respond with JSON only (no markdown):
{
  "accountId": <number>,
  "accountName": "<string>",
  "confidence": "High" | "Medium" | "Low",
  "reasoning": "<brief explanation, max 50 words>"
}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a bookkeeping assistant. Respond only with valid JSON, no markdown formatting.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 200,
    });

    const responseText = completion.choices[0].message.content || '{}';
    // Remove markdown code blocks if present
    const cleanedResponse = responseText.replace(/```json\n?|\n?```/g, '').trim();
    const response = JSON.parse(cleanedResponse);

    const confidenceMap: Record<string, number> = {
      'High': 0.85,
      'Medium': 0.70,
      'Low': 0.50,
    };

    return {
      source: 'ai',
      confidence: confidenceMap[response.confidence] || 0.50,
      transactionType: isExpense ? 'expense' : 'deposit',
      accountId: response.accountId,
      accountName: response.accountName,
      reasoning: response.reasoning,
      requiresApproval: true, // AI suggestions ALWAYS require approval
    };
  } catch (error) {
    console.error('AI categorization failed:', error);
    return null;
  }
}

/**
 * Gets a complete categorization suggestion, including AI fallback if needed.
 * Patterns and rules are company-specific for data isolation.
 */
export async function getFullCategorization(
  storage: CategorizationStorage,
  transaction: ImportedTransaction,
  companyId?: number
): Promise<CategorizationSuggestion> {
  // First try local sources (patterns and rules, company-scoped)
  const localSuggestion = await getCategorization(storage, transaction, null, companyId);

  // If we have a local match, return it
  if (localSuggestion.source !== 'none') {
    return localSuggestion;
  }

  // Try AI suggestion for unknown merchants
  const merchantName = transaction.merchantName || transaction.name;
  const aiSuggestion = await getAiCategorizationSuggestion(
    storage,
    merchantName,
    transaction.amount
  );

  if (aiSuggestion) {
    return aiSuggestion;
  }

  // No suggestion available
  return {
    source: 'none',
    confidence: 0,
    requiresApproval: true,
    reasoning: 'No suggestion available. Please categorize manually.',
  };
}
