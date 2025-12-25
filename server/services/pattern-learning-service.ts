/**
 * Pattern Learning Service
 *
 * Handles learning from user categorization decisions to improve
 * future suggestions. Updates merchant patterns and generates
 * AI rules when patterns are detected.
 */

import { normalizeMerchantName, extractMerchantVariants } from './merchant-normalizer';
import type { MerchantPattern, InsertMerchantPattern, CategorizationRule, InsertCategorizationRule } from '../../shared/schema';

// Thresholds for AI rule generation
const MIN_OCCURRENCES_FOR_RULE = 3; // Minimum times same categorization before creating rule
const MIN_CONFIDENCE_FOR_RULE = 0.80; // 80% minimum confidence

// Priority ranges
const MANUAL_RULE_PRIORITY_MAX = 499;
const AI_RULE_PRIORITY_START = 500;

export interface PatternUpdateParams {
  merchantName: string;
  chosenAccountId: number;
  chosenContactId?: number | null;
  chosenSalesTaxId?: number | null;
  chosenTransactionType: string;
  previousSuggestedAccountId?: number | null;
}

export interface PatternUpdateResult {
  pattern: MerchantPattern;
  isNew: boolean;
  shouldGenerateRule: boolean;
}

/**
 * Storage interface for pattern learning operations.
 * This interface allows the service to work with any storage implementation.
 */
export interface PatternLearningStorage {
  // Merchant Patterns
  getMerchantPatternByName(merchantNameNormalized: string): Promise<MerchantPattern | null>;
  createMerchantPattern(pattern: InsertMerchantPattern): Promise<MerchantPattern>;
  updateMerchantPattern(id: number, updates: Partial<MerchantPattern>): Promise<MerchantPattern>;

  // Categorization Rules
  getAiRuleByMerchant(merchantNameNormalized: string): Promise<CategorizationRule | null>;
  createCategorizationRule(rule: InsertCategorizationRule): Promise<CategorizationRule>;
  updateCategorizationRule(id: number, updates: Partial<CategorizationRule>): Promise<CategorizationRule | undefined>;

  // Accounts (for rule creation)
  getAccount(id: number): Promise<{ id: number; name: string } | null>;
  getContact(id: number): Promise<{ id: number; name: string } | null>;
}

/**
 * Updates merchant pattern based on user categorization.
 * Called whenever a user categorizes a bank transaction.
 */
export async function updateMerchantPattern(
  storage: PatternLearningStorage,
  params: PatternUpdateParams
): Promise<PatternUpdateResult> {
  const normalizedName = normalizeMerchantName(params.merchantName);

  if (!normalizedName) {
    throw new Error('Cannot update pattern: merchant name is empty after normalization');
  }

  const existingPattern = await storage.getMerchantPatternByName(normalizedName);

  if (existingPattern) {
    // Update existing pattern
    const isConfirmation = existingPattern.defaultAccountId === params.chosenAccountId;
    const newConfirmations = existingPattern.userConfirmations + (isConfirmation ? 1 : 0);
    const newCorrections = existingPattern.userCorrections + (isConfirmation ? 0 : 1);
    const totalActions = newConfirmations + newCorrections;

    // Calculate confidence: confirmations / total, capped at 0.99
    const newConfidence = totalActions > 0
      ? Math.min(0.99, newConfirmations / totalActions)
      : 0.5;

    // Update variants with new name if different
    const updatedVariants = extractMerchantVariants(
      params.merchantName,
      (existingPattern.merchantNameVariants as string[]) || []
    );

    const updatedPattern = await storage.updateMerchantPattern(existingPattern.id, {
      defaultAccountId: params.chosenAccountId,
      defaultContactId: params.chosenContactId ?? existingPattern.defaultContactId,
      defaultSalesTaxId: params.chosenSalesTaxId ?? existingPattern.defaultSalesTaxId,
      defaultTransactionType: params.chosenTransactionType,
      totalOccurrences: existingPattern.totalOccurrences + 1,
      userConfirmations: newConfirmations,
      userCorrections: newCorrections,
      confidenceScore: newConfidence.toFixed(4),
      merchantNameVariants: updatedVariants,
      lastSeenAt: new Date(),
      updatedAt: new Date(),
    });

    // Check if we should generate an AI rule
    const shouldGenerateRule = await shouldGenerateAiRule(
      storage,
      normalizedName,
      updatedPattern
    );

    return {
      pattern: updatedPattern,
      isNew: false,
      shouldGenerateRule,
    };
  } else {
    // Create new pattern
    const newPattern = await storage.createMerchantPattern({
      merchantNameNormalized: normalizedName,
      merchantNameVariants: extractMerchantVariants(params.merchantName),
      defaultAccountId: params.chosenAccountId,
      defaultContactId: params.chosenContactId,
      defaultSalesTaxId: params.chosenSalesTaxId,
      defaultTransactionType: params.chosenTransactionType,
      totalOccurrences: 1,
      userConfirmations: 1,
      userCorrections: 0,
      confidenceScore: '0.5000', // Start at 50%
      lastSeenAt: new Date(),
    });

    return {
      pattern: newPattern,
      isNew: true,
      shouldGenerateRule: false, // New patterns need more data
    };
  }
}

/**
 * Determines if an AI rule should be generated for a merchant pattern.
 */
async function shouldGenerateAiRule(
  storage: PatternLearningStorage,
  merchantNameNormalized: string,
  pattern: MerchantPattern
): Promise<boolean> {
  // Check thresholds
  const hasEnoughOccurrences = pattern.totalOccurrences >= MIN_OCCURRENCES_FOR_RULE;
  const confidence = parseFloat(pattern.confidenceScore?.toString() || '0');
  const hasHighConfidence = confidence >= MIN_CONFIDENCE_FOR_RULE;

  console.log('[PatternLearning] shouldGenerateAiRule check:', {
    merchantNameNormalized,
    totalOccurrences: pattern.totalOccurrences,
    minOccurrences: MIN_OCCURRENCES_FOR_RULE,
    hasEnoughOccurrences,
    confidence,
    minConfidence: MIN_CONFIDENCE_FOR_RULE,
    hasHighConfidence,
  });

  if (!hasEnoughOccurrences || !hasHighConfidence) {
    console.log('[PatternLearning] Thresholds not met - no rule generation');
    return false;
  }

  // Check if AI rule already exists for this merchant
  const existingRule = await storage.getAiRuleByMerchant(merchantNameNormalized);
  console.log('[PatternLearning] Existing rule check:', existingRule ? { ruleId: existingRule.id } : 'none');
  if (existingRule) {
    return false;
  }

  console.log('[PatternLearning] All checks passed - will generate rule');
  return true;
}

/**
 * Generates an AI rule from a merchant pattern.
 * Called when pattern reaches threshold for automatic rule creation.
 */
export async function generateAiRuleFromPattern(
  storage: PatternLearningStorage,
  merchantNameNormalized: string
): Promise<CategorizationRule | null> {
  const pattern = await storage.getMerchantPatternByName(merchantNameNormalized);

  if (!pattern || !pattern.defaultAccountId) {
    return null;
  }

  const account = await storage.getAccount(pattern.defaultAccountId);
  const contact = pattern.defaultContactId
    ? await storage.getContact(pattern.defaultContactId)
    : null;

  const ruleData = {
    name: `Auto: ${merchantNameNormalized}`,
    ruleType: 'ai' as const,
    isEnabled: true,
    priority: AI_RULE_PRIORITY_START, // AI rules have lower priority than manual
    conditions: {
      descriptionContains: merchantNameNormalized,
    },
    actions: {
      accountId: pattern.defaultAccountId,
      contactName: contact?.name || null,
    },
    salesTaxId: pattern.defaultSalesTaxId,
    sourceMerchantPattern: merchantNameNormalized,
    autoGeneratedAt: new Date(),
    occurrenceCount: pattern.totalOccurrences,
    confidenceScore: pattern.confidenceScore,
  };

  console.log('[PatternLearning] Creating AI rule with data:', JSON.stringify(ruleData, null, 2));

  const rule = await storage.createCategorizationRule(ruleData);

  console.log('[PatternLearning] Created rule:', { id: rule.id, name: rule.name, isEnabled: rule.isEnabled });

  // Ensure the rule is enabled (workaround for potential DB default issue)
  if (!rule.isEnabled) {
    console.log('[PatternLearning] Rule was created disabled, enabling it now...');
    const updatedRule = await storage.updateCategorizationRule(rule.id, { isEnabled: true });
    if (updatedRule) {
      console.log('[PatternLearning] Rule enabled successfully');
      return updatedRule;
    }
  }

  return rule;
}

/**
 * Promotes an AI rule to a manual rule.
 * Called when user edits or explicitly promotes an AI rule.
 */
export function getPromotedRuleUpdates(rule: CategorizationRule): Partial<CategorizationRule> {
  return {
    ruleType: 'manual',
    priority: Math.min(rule.priority, MANUAL_RULE_PRIORITY_MAX),
    promotedToManualAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Calculates confidence score for a pattern.
 * Confidence = confirmations / total occurrences
 */
export function calculateConfidence(confirmations: number, corrections: number): number {
  const total = confirmations + corrections;
  if (total === 0) return 0.5;
  return Math.min(0.99, confirmations / total);
}

/**
 * Determines the next priority for a new AI rule.
 */
export function getNextAiRulePriority(existingAiRules: CategorizationRule[]): number {
  if (existingAiRules.length === 0) {
    return AI_RULE_PRIORITY_START;
  }

  const maxPriority = Math.max(...existingAiRules.map(r => r.priority));
  return maxPriority + 1;
}
