/**
 * Rules Engine - Clean, simple rule handling with raw SQL
 *
 * This module handles all categorization rule operations:
 * - Creating rules (guaranteed enabled by default)
 * - Fetching rules
 * - Matching transactions against rules
 * - Applying rules to uncategorized transactions
 */

import { db } from "./db";
import { sql } from "drizzle-orm";

// ============= Types =============

export interface RuleConditions {
  descriptionContains?: string;
  amountMin?: number;
  amountMax?: number;
}

export interface RuleActions {
  accountId: number;
  contactName?: string;
  memo?: string;
}

export interface Rule {
  id: number;
  name: string;
  isEnabled: boolean;
  autoApply: boolean;
  priority: number;
  conditions: RuleConditions;
  actions: RuleActions;
  salesTaxId: number | null;
  ruleType: 'manual' | 'ai';
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateRuleInput {
  name: string;
  conditions: RuleConditions;
  actions: RuleActions;
  salesTaxId?: number | null;
  priority?: number;
  ruleType?: 'manual' | 'ai';
  isEnabled?: boolean;
  autoApply?: boolean;
}

export interface UpdateRuleInput {
  name?: string;
  conditions?: RuleConditions;
  actions?: RuleActions;
  salesTaxId?: number | null;
  priority?: number;
  isEnabled?: boolean;
  autoApply?: boolean;
  ruleType?: 'manual' | 'ai';
}

export interface Transaction {
  id: number;
  name: string;
  merchantName?: string | null;
  amount: number;
}

export interface MatchResult {
  ruleId: number;
  ruleName: string;
  accountId: number;
  contactName?: string;
  memo?: string;
  salesTaxId?: number | null;
  autoApply: boolean;
}

// ============= Helper Functions =============

/**
 * Convert database row (snake_case) to Rule object (camelCase)
 */
function rowToRule(row: any): Rule {
  return {
    id: row.id,
    name: row.name,
    isEnabled: row.is_enabled === true || row.is_enabled === 't' || row.is_enabled === 1,
    autoApply: row.auto_apply === true || row.auto_apply === 't' || row.auto_apply === 1 || row.auto_apply === undefined,
    priority: row.priority,
    conditions: typeof row.conditions === 'string' ? JSON.parse(row.conditions) : row.conditions,
    actions: typeof row.actions === 'string' ? JSON.parse(row.actions) : row.actions,
    salesTaxId: row.sales_tax_id,
    ruleType: row.rule_type || 'manual',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ============= Core Functions =============

/**
 * Create a new rule using raw SQL
 * Rules are ALWAYS created as enabled unless explicitly set to false
 */
export async function createRule(input: CreateRuleInput): Promise<Rule> {
  const {
    name,
    conditions,
    actions,
    salesTaxId = null,
    priority = 0,
    ruleType = 'manual',
    isEnabled = true,
    autoApply = true,
  } = input;

  // Validate required fields
  if (!name || !name.trim()) {
    throw new Error('Rule name is required');
  }
  if (!actions || !actions.accountId) {
    throw new Error('Rule must have an accountId in actions');
  }

  // Clean conditions - remove zero values for amount filters
  const cleanConditions: RuleConditions = {};
  if (conditions.descriptionContains && conditions.descriptionContains.trim()) {
    cleanConditions.descriptionContains = conditions.descriptionContains.trim();
  }
  if (conditions.amountMin && conditions.amountMin > 0) {
    cleanConditions.amountMin = conditions.amountMin;
  }
  if (conditions.amountMax && conditions.amountMax > 0) {
    cleanConditions.amountMax = conditions.amountMax;
  }

  console.log('[RulesEngine] Creating rule:', { name, conditions: cleanConditions, actions, isEnabled, autoApply });

  const result = await db.execute(sql`
    INSERT INTO categorization_rules (
      name, is_enabled, auto_apply, priority, conditions, actions,
      sales_tax_id, rule_type, created_at, updated_at
    ) VALUES (
      ${name.trim()},
      ${isEnabled},
      ${autoApply},
      ${priority},
      ${JSON.stringify(cleanConditions)}::json,
      ${JSON.stringify(actions)}::json,
      ${salesTaxId},
      ${ruleType},
      NOW(),
      NOW()
    ) RETURNING *
  `);

  const rule = rowToRule(result.rows[0]);
  console.log('[RulesEngine] Created rule:', { id: rule.id, name: rule.name, isEnabled: rule.isEnabled });

  return rule;
}

/**
 * Get all rules ordered by priority
 */
export async function getAllRules(): Promise<Rule[]> {
  const result = await db.execute(sql`
    SELECT * FROM categorization_rules
    ORDER BY priority ASC, id ASC
  `);

  return result.rows.map(rowToRule);
}

/**
 * Get only enabled rules ordered by priority
 */
export async function getEnabledRules(): Promise<Rule[]> {
  const result = await db.execute(sql`
    SELECT * FROM categorization_rules
    WHERE is_enabled = true
    ORDER BY priority ASC, id ASC
  `);

  console.log('[RulesEngine] Found', result.rows.length, 'enabled rules');
  return result.rows.map(rowToRule);
}

/**
 * Get a single rule by ID
 */
export async function getRule(id: number): Promise<Rule | null> {
  const result = await db.execute(sql`
    SELECT * FROM categorization_rules WHERE id = ${id}
  `);

  if (result.rows.length === 0) {
    return null;
  }

  return rowToRule(result.rows[0]);
}

/**
 * Update an existing rule
 */
export async function updateRule(id: number, input: UpdateRuleInput): Promise<Rule | null> {
  const existing = await getRule(id);
  if (!existing) {
    return null;
  }

  // Build update fields
  const updates: string[] = [];
  const values: any[] = [];

  if (input.name !== undefined) {
    updates.push('name = $' + (values.length + 1));
    values.push(input.name.trim());
  }
  if (input.isEnabled !== undefined) {
    updates.push('is_enabled = $' + (values.length + 1));
    values.push(input.isEnabled);
  }
  if (input.priority !== undefined) {
    updates.push('priority = $' + (values.length + 1));
    values.push(input.priority);
  }
  if (input.conditions !== undefined) {
    // Clean conditions
    const cleanConditions: RuleConditions = {};
    if (input.conditions.descriptionContains && input.conditions.descriptionContains.trim()) {
      cleanConditions.descriptionContains = input.conditions.descriptionContains.trim();
    }
    if (input.conditions.amountMin && input.conditions.amountMin > 0) {
      cleanConditions.amountMin = input.conditions.amountMin;
    }
    if (input.conditions.amountMax && input.conditions.amountMax > 0) {
      cleanConditions.amountMax = input.conditions.amountMax;
    }
    updates.push('conditions = $' + (values.length + 1) + '::json');
    values.push(JSON.stringify(cleanConditions));
  }
  if (input.actions !== undefined) {
    updates.push('actions = $' + (values.length + 1) + '::json');
    values.push(JSON.stringify(input.actions));
  }
  if (input.salesTaxId !== undefined) {
    updates.push('sales_tax_id = $' + (values.length + 1));
    values.push(input.salesTaxId);
  }
  if (input.ruleType !== undefined) {
    updates.push('rule_type = $' + (values.length + 1));
    values.push(input.ruleType);
  }
  if (input.autoApply !== undefined) {
    updates.push('auto_apply = $' + (values.length + 1));
    values.push(input.autoApply);
  }

  updates.push('updated_at = NOW()');

  if (updates.length === 1) {
    // Only updated_at, nothing else to update
    return existing;
  }

  // Use raw SQL for the update
  const updateQuery = `
    UPDATE categorization_rules
    SET ${updates.join(', ')}
    WHERE id = ${id}
    RETURNING *
  `;

  console.log('[RulesEngine] Updating rule:', { id, updates: input });

  // Execute with parameterized values
  const result = await db.execute(sql.raw(updateQuery.replace(/\$(\d+)/g, (_, num) => {
    const val = values[parseInt(num) - 1];
    if (val === null) return 'NULL';
    if (typeof val === 'boolean') return val ? 'true' : 'false';
    if (typeof val === 'number') return String(val);
    return `'${String(val).replace(/'/g, "''")}'`;
  })));

  return rowToRule(result.rows[0]);
}

/**
 * Delete a rule by ID
 */
export async function deleteRule(id: number): Promise<boolean> {
  const result = await db.execute(sql`
    DELETE FROM categorization_rules WHERE id = ${id}
  `);

  return (result.rowCount ?? 0) > 0;
}

/**
 * Enable a rule by ID
 */
export async function enableRule(id: number): Promise<Rule | null> {
  const result = await db.execute(sql`
    UPDATE categorization_rules
    SET is_enabled = true, updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `);

  if (result.rows.length === 0) {
    return null;
  }

  return rowToRule(result.rows[0]);
}

/**
 * Disable a rule by ID
 */
export async function disableRule(id: number): Promise<Rule | null> {
  const result = await db.execute(sql`
    UPDATE categorization_rules
    SET is_enabled = false, updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `);

  if (result.rows.length === 0) {
    return null;
  }

  return rowToRule(result.rows[0]);
}

/**
 * Match a transaction against all enabled rules
 * Returns the first matching rule's actions, or null if no match
 */
export function matchTransaction(transaction: Transaction, rules: Rule[]): MatchResult | null {
  const txName = (transaction.name || '').toLowerCase();
  const txMerchant = (transaction.merchantName || '').toLowerCase();
  const txAmount = Math.abs(transaction.amount);

  console.log('[RulesEngine] Matching transaction:', {
    id: transaction.id,
    name: txName,
    merchant: txMerchant,
    amount: txAmount,
  });

  for (const rule of rules) {
    let matches = true;
    const conditions = rule.conditions;

    // Check description condition
    if (conditions.descriptionContains) {
      const searchTerm = conditions.descriptionContains.toLowerCase();
      const nameMatches = txName.includes(searchTerm);
      const merchantMatches = txMerchant.includes(searchTerm);

      console.log('[RulesEngine] Rule:', rule.name, '| Search:', searchTerm,
        '| Name match:', nameMatches, '| Merchant match:', merchantMatches);

      if (!nameMatches && !merchantMatches) {
        matches = false;
      }
    }

    // Check amount min condition
    if (matches && conditions.amountMin && conditions.amountMin > 0) {
      if (txAmount < conditions.amountMin) {
        console.log('[RulesEngine] Rule:', rule.name, '| Amount', txAmount, '< min', conditions.amountMin);
        matches = false;
      }
    }

    // Check amount max condition
    if (matches && conditions.amountMax && conditions.amountMax > 0) {
      if (txAmount > conditions.amountMax) {
        console.log('[RulesEngine] Rule:', rule.name, '| Amount', txAmount, '> max', conditions.amountMax);
        matches = false;
      }
    }

    // If all conditions match, return this rule's actions
    if (matches) {
      console.log('[RulesEngine] MATCH! Rule:', rule.name, '-> Account:', rule.actions.accountId, '| AutoApply:', rule.autoApply);
      return {
        ruleId: rule.id,
        ruleName: rule.name,
        accountId: rule.actions.accountId,
        contactName: rule.actions.contactName,
        memo: rule.actions.memo,
        salesTaxId: rule.salesTaxId,
        autoApply: rule.autoApply,
      };
    }
  }

  console.log('[RulesEngine] No match found for transaction:', transaction.id);
  return null;
}

/**
 * Apply rules to a list of transactions
 * Returns array of { transactionId, match } pairs
 */
export async function applyRulesToTransactions(transactions: Transaction[]): Promise<{
  transactionId: number;
  match: MatchResult | null;
}[]> {
  const rules = await getEnabledRules();

  console.log('[RulesEngine] Applying', rules.length, 'enabled rules to', transactions.length, 'transactions');

  return transactions.map(tx => ({
    transactionId: tx.id,
    match: matchTransaction(tx, rules),
  }));
}

/**
 * Get rules by type (manual or ai)
 */
export async function getRulesByType(ruleType: 'manual' | 'ai'): Promise<Rule[]> {
  const result = await db.execute(sql`
    SELECT * FROM categorization_rules
    WHERE rule_type = ${ruleType}
    ORDER BY priority ASC, id ASC
  `);

  return result.rows.map(rowToRule);
}

/**
 * Enable all rules of a specific type
 */
export async function enableAllRulesByType(ruleType: 'manual' | 'ai'): Promise<number> {
  const result = await db.execute(sql`
    UPDATE categorization_rules
    SET is_enabled = true, updated_at = NOW()
    WHERE rule_type = ${ruleType} AND is_enabled = false
  `);

  return result.rowCount ?? 0;
}

/**
 * Debug function - get raw database state
 */
export async function debugGetRawRules(): Promise<any[]> {
  const result = await db.execute(sql`
    SELECT id, name, is_enabled, priority, conditions, actions, rule_type
    FROM categorization_rules
    ORDER BY priority ASC, id ASC
  `);

  return result.rows;
}
