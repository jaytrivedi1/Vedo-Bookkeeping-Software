/**
 * Merchant Name Normalizer Service
 *
 * Normalizes merchant names for consistent pattern matching.
 * Handles variations in merchant names from bank feeds to enable
 * accurate categorization learning.
 */

/**
 * Normalizes a merchant name for pattern matching.
 *
 * Examples:
 * - "STARBUCKS COFFEE #12345 NYC" → "STARBUCKS COFFEE"
 * - "Amazon.com*M12345" → "AMAZON COM"
 * - "UBER *TRIP HELP.UBER.COM" → "UBER TRIP"
 * - "SQ *COFFEE SHOP" → "SQ COFFEE SHOP"
 * - "PAYPAL *NETFLIX" → "PAYPAL NETFLIX"
 * - "Tim Hortons 14385jha" → "TIM HORTONS"
 * - "Tim Hortons Toronto 545jt" → "TIM HORTONS"
 * - "*Tim Hortons Halton 4tfg3" → "TIM HORTONS"
 *
 * @param name - Original merchant name from bank feed
 * @returns Normalized merchant name for pattern matching
 */
export function normalizeMerchantName(name: string | null | undefined): string {
  if (!name) return '';

  let normalized = name
    .toUpperCase()
    // Remove URLs and domains
    .replace(/HTTPS?:\/\/[^\s]+/gi, '')
    .replace(/[A-Z0-9.-]+\.(COM|NET|ORG|IO|CO|CA|UK)/gi, '')
    // Remove special characters except spaces and asterisks (temporarily)
    .replace(/[^A-Z0-9\s*]/g, ' ')
    // Handle payment processor prefixes with asterisks
    .replace(/\s*\*\s*/g, ' ')
    // Remove common business suffixes
    .replace(/\b(LLC|INC|CORP|CORPORATION|LTD|LIMITED|CO|COMPANY|ENTERPRISES?|HOLDINGS?|GROUP)\b/gi, '')
    // Remove store/location identifiers
    .replace(/\b(STORE|LOC|LOCATION|BRANCH|UNIT|STE|SUITE)\s*#?\s*\d+\b/gi, '')
    .replace(/\s*#\s*\d+\b/g, '')
    // Remove city/state abbreviations at end (common in bank feeds)
    .replace(/\s+[A-Z]{2}\s*$/g, '')
    // Remove transaction IDs (common patterns)
    .replace(/\*[A-Z0-9]+/g, '')
    .replace(/\b[A-Z]{2,3}\d{6,}\b/g, '')
    // Remove standalone numbers (likely store IDs)
    .replace(/\b\d{4,}\b/g, '')
    // Remove reference numbers
    .replace(/\bREF\s*#?\s*\d+\b/gi, '')
    .replace(/\bORDER\s*#?\s*\d+\b/gi, '')
    // Remove alphanumeric location/transaction codes (e.g., "14385JHA", "545JT", "4TFG3", "5475YH")
    // Pattern: digits followed by letters, or letters followed by digits (mixed alphanumeric)
    .replace(/\b\d+[A-Z]+[A-Z0-9]*\b/g, '')  // Matches: 14385JHA, 545JT, 5475YH
    .replace(/\b[A-Z]+\d+[A-Z0-9]*\b/g, '')  // Matches: 4TFG3, ABC123
    // Remove trailing codes that have no vowels (likely random codes like "KKSLKT", "XJKFT")
    // Real words have vowels: DEPOT, BUY, TIRE, STATION, etc.
    .replace(/\s+[BCDFGHJKLMNPQRSTVWXYZ]{3,}$/g, '')  // Only consonants, 3+ chars at end
    // Remove common Canadian city names that appear after merchant names
    .replace(/\b(TORONTO|MISSISSAUGA|MILTON|HALTON|BRAMPTON|VAUGHAN|MARKHAM|SCARBOROUGH|ETOBICOKE|NORTH YORK|OTTAWA|VANCOUVER|CALGARY|EDMONTON|WINNIPEG|MONTREAL|QUEBEC|HALIFAX|VICTORIA)\b/gi, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();

  // If the result is too short (less than 2 chars), return original uppercase
  if (normalized.length < 2) {
    return name.toUpperCase().replace(/[^A-Z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  return normalized;
}

/**
 * Extract merchant name variants for fuzzy matching.
 * Stores both the original name and normalized versions for matching.
 *
 * @param originalName - Original merchant name from bank feed
 * @param existingVariants - Previously seen variants
 * @returns Array of unique name variants
 */
export function extractMerchantVariants(
  originalName: string,
  existingVariants: string[] = []
): string[] {
  const variants = new Set<string>(existingVariants);

  // Add original name
  if (originalName) {
    variants.add(originalName);
  }

  // Add normalized version
  const normalized = normalizeMerchantName(originalName);
  if (normalized && normalized !== originalName) {
    variants.add(normalized);
  }

  // Add first word (often the brand name)
  const firstWord = normalized.split(' ')[0];
  if (firstWord && firstWord.length > 2) {
    variants.add(firstWord);
  }

  // Add first two words (for compound brand names like "WHOLE FOODS")
  const words = normalized.split(' ');
  if (words.length >= 2) {
    const firstTwo = words.slice(0, 2).join(' ');
    if (firstTwo.length > 4) {
      variants.add(firstTwo);
    }
  }

  return Array.from(variants);
}

/**
 * Check if two merchant names are likely the same merchant.
 * Uses normalized comparison with fuzzy matching.
 *
 * @param name1 - First merchant name
 * @param name2 - Second merchant name
 * @returns True if merchants are likely the same
 */
export function isSameMerchant(name1: string, name2: string): boolean {
  const normalized1 = normalizeMerchantName(name1);
  const normalized2 = normalizeMerchantName(name2);

  // Exact match after normalization
  if (normalized1 === normalized2) {
    return true;
  }

  // One is a prefix of the other
  if (normalized1.startsWith(normalized2) || normalized2.startsWith(normalized1)) {
    return true;
  }

  // First word matches (brand name match)
  const word1 = normalized1.split(' ')[0];
  const word2 = normalized2.split(' ')[0];
  if (word1.length > 3 && word1 === word2) {
    return true;
  }

  return false;
}

/**
 * Extract the primary brand name from a merchant name.
 * Useful for grouping similar merchants.
 *
 * @param name - Merchant name
 * @returns Primary brand name
 */
export function extractBrandName(name: string): string {
  const normalized = normalizeMerchantName(name);
  const words = normalized.split(' ');

  // Common payment processors - look for the actual merchant after
  const processors = ['SQ', 'SQUARE', 'PAYPAL', 'STRIPE', 'VENMO', 'ZELLE', 'CASHAPP'];
  if (words.length > 1 && processors.includes(words[0])) {
    return words.slice(1).join(' ') || words[0];
  }

  // Return first word or two as brand name
  if (words.length >= 2 && words[0].length <= 3) {
    return words.slice(0, 2).join(' ');
  }

  return words[0] || normalized;
}
