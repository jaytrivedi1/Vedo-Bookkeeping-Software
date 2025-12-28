/**
 * Feedback Recording Service
 *
 * Records user categorization decisions for learning and improvement.
 * Integrates with pattern learning to update merchant patterns and
 * generate AI rules when appropriate.
 */

import { normalizeMerchantName } from './merchant-normalizer';
import {
  updateMerchantPattern,
  generateAiRuleFromPattern,
  type PatternLearningStorage
} from './pattern-learning-service';
import type {
  CategorizationFeedback,
  InsertCategorizationFeedback,
  Preferences,
  CategorizationRule
} from '../../shared/schema';
import type { SuggestionSource } from './categorization-service';

/**
 * Parameters for recording categorization feedback
 */
export interface RecordFeedbackParams {
  companyId: number; // Company-specific feedback for data isolation
  importedTransactionId: number;
  merchantName: string;
  transactionAmount: number;
  transactionDate: Date;
  suggestionSource: SuggestionSource;
  suggestedAccountId?: number | null;
  suggestedContactId?: number | null;
  suggestedTaxId?: number | null;
  aiConfidence?: string | null;
  chosenAccountId: number;
  chosenContactId?: number | null;
  chosenTaxId?: number | null;
  chosenTransactionType: string;
}

/**
 * Result of recording feedback
 */
export interface FeedbackResult {
  feedback: CategorizationFeedback;
  patternUpdated: boolean;
  ruleGenerated: boolean;
  generatedRule?: CategorizationRule;
}

/**
 * Extended storage interface for feedback operations
 */
export interface FeedbackStorage extends PatternLearningStorage {
  // Categorization Feedback
  createCategorizationFeedback(feedback: InsertCategorizationFeedback): Promise<CategorizationFeedback>;

  // Preferences
  getPreferences(): Promise<Preferences | null>;
}

/**
 * Records categorization feedback and updates patterns.
 * This is the main entry point for learning from user decisions.
 */
export async function recordCategorizationFeedback(
  storage: FeedbackStorage,
  params: RecordFeedbackParams
): Promise<FeedbackResult> {
  const normalizedMerchant = normalizeMerchantName(params.merchantName);
  const wasSuggestionAccepted = params.suggestedAccountId === params.chosenAccountId;

  console.log('[FeedbackService] Recording feedback:', {
    companyId: params.companyId,
    merchantName: params.merchantName,
    normalizedMerchant,
    chosenAccountId: params.chosenAccountId,
    chosenTransactionType: params.chosenTransactionType,
  });

  // 1. Store feedback record (company-scoped)
  const feedback = await storage.createCategorizationFeedback({
    companyId: params.companyId, // Company-specific feedback
    importedTransactionId: params.importedTransactionId,
    merchantName: params.merchantName,
    merchantNameNormalized: normalizedMerchant,
    transactionAmount: params.transactionAmount.toString(),
    transactionDate: params.transactionDate.toISOString().split('T')[0],
    suggestionSource: params.suggestionSource,
    suggestedAccountId: params.suggestedAccountId,
    suggestedContactId: params.suggestedContactId,
    suggestedTaxId: params.suggestedTaxId,
    aiConfidence: params.aiConfidence,
    chosenAccountId: params.chosenAccountId,
    chosenContactId: params.chosenContactId,
    chosenTaxId: params.chosenTaxId,
    wasSuggestionAccepted,
  });

  let patternUpdated = false;
  let ruleGenerated = false;
  let generatedRule: CategorizationRule | undefined;

  // 2. Update merchant pattern (if merchant name exists) - company-scoped
  if (normalizedMerchant) {
    try {
      const patternResult = await updateMerchantPattern(storage, {
        companyId: params.companyId, // Company-specific pattern
        merchantName: params.merchantName,
        chosenAccountId: params.chosenAccountId,
        chosenContactId: params.chosenContactId,
        chosenSalesTaxId: params.chosenTaxId,
        chosenTransactionType: params.chosenTransactionType,
        previousSuggestedAccountId: params.suggestedAccountId,
      });

      console.log('[FeedbackService] Pattern update result:', {
        companyId: params.companyId,
        patternId: patternResult.pattern.id,
        isNew: patternResult.isNew,
        totalOccurrences: patternResult.pattern.totalOccurrences,
        userConfirmations: patternResult.pattern.userConfirmations,
        confidenceScore: patternResult.pattern.confidenceScore,
        shouldGenerateRule: patternResult.shouldGenerateRule,
      });

      patternUpdated = true;

      // 3. Check if we should generate an AI rule (company-scoped)
      const prefs = await storage.getPreferences();
      // Default to true if aiRuleGenerationEnabled is null/undefined (for backwards compatibility)
      const aiRuleGenerationEnabled = prefs?.aiRuleGenerationEnabled ?? true;
      console.log('[FeedbackService] AI rule generation check:', {
        companyId: params.companyId,
        aiRuleGenerationEnabled,
        shouldGenerateRule: patternResult.shouldGenerateRule,
        willGenerate: aiRuleGenerationEnabled && patternResult.shouldGenerateRule,
      });
      if (aiRuleGenerationEnabled && patternResult.shouldGenerateRule) {
        const rule = await generateAiRuleFromPattern(storage, normalizedMerchant, params.companyId);
        console.log('[FeedbackService] AI rule generated:', rule ? { ruleId: rule.id, ruleName: rule.name, companyId: params.companyId } : null);
        if (rule) {
          ruleGenerated = true;
          generatedRule = rule;
        }
      }
    } catch (error) {
      console.error('[FeedbackService] Error updating merchant pattern:', error);
      // Continue even if pattern update fails - feedback is still recorded
    }
  }

  return {
    feedback,
    patternUpdated,
    ruleGenerated,
    generatedRule,
  };
}

/**
 * Gets categorization statistics for reporting.
 */
export interface CategorizationStats {
  totalFeedback: number;
  acceptanceRate: number;
  patternCount: number;
  manualRuleCount: number;
  aiRuleCount: number;
  topMerchants: Array<{
    merchant: string;
    count: number;
    confidence: number;
  }>;
}

/**
 * Storage interface for stats
 */
export interface StatsStorage {
  getCategorizationFeedbackCount(): Promise<number>;
  getAcceptedFeedbackCount(): Promise<number>;
  getMerchantPatternCount(): Promise<number>;
  getRuleCountByType(type: 'manual' | 'ai'): Promise<number>;
  getTopMerchantPatterns(limit: number): Promise<Array<{
    merchantNameNormalized: string;
    totalOccurrences: number;
    confidenceScore: string;
  }>>;
}

/**
 * Gets categorization statistics for the dashboard.
 */
export async function getCategorizationStats(
  storage: StatsStorage
): Promise<CategorizationStats> {
  const [
    totalFeedback,
    acceptedCount,
    patternCount,
    manualRuleCount,
    aiRuleCount,
    topPatterns,
  ] = await Promise.all([
    storage.getCategorizationFeedbackCount(),
    storage.getAcceptedFeedbackCount(),
    storage.getMerchantPatternCount(),
    storage.getRuleCountByType('manual'),
    storage.getRuleCountByType('ai'),
    storage.getTopMerchantPatterns(10),
  ]);

  const acceptanceRate = totalFeedback > 0 ? acceptedCount / totalFeedback : 0;

  const topMerchants = topPatterns.map(p => ({
    merchant: p.merchantNameNormalized,
    count: p.totalOccurrences,
    confidence: parseFloat(p.confidenceScore),
  }));

  return {
    totalFeedback,
    acceptanceRate,
    patternCount,
    manualRuleCount,
    aiRuleCount,
    topMerchants,
  };
}
