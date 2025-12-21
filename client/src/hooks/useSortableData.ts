import { useState, useMemo, useCallback, useEffect } from "react";

export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  key: string;
  direction: SortDirection;
}

interface UseSortableDataOptions<T> {
  defaultSort?: SortConfig;
  resetDependency?: any; // When this changes, reset to default sort
}

/**
 * A reusable hook for client-side table sorting
 * Handles different data types: dates, numbers, strings
 */
export function useSortableData<T extends Record<string, any>>(
  items: T[],
  options: UseSortableDataOptions<T> = {}
) {
  const {
    defaultSort = { key: 'date', direction: 'desc' },
    resetDependency
  } = options;

  const [sortConfig, setSortConfig] = useState<SortConfig>(defaultSort);

  // Reset to default sort when dependency changes (e.g., contactId)
  useEffect(() => {
    if (resetDependency !== undefined) {
      setSortConfig(defaultSort);
    }
  }, [resetDependency, defaultSort.key, defaultSort.direction]);

  // Sort the items based on current config
  const sortedItems = useMemo(() => {
    if (!items || items.length === 0) return items;

    return [...items].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      // Handle null/undefined values - push them to the end
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return 1;
      if (bValue == null) return -1;

      let comparison = 0;

      // Detect and handle different data types
      if (sortConfig.key === 'date' || aValue instanceof Date || isDateString(aValue)) {
        // Date comparison
        const dateA = new Date(aValue).getTime();
        const dateB = new Date(bValue).getTime();
        comparison = dateA - dateB;
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        // Numeric comparison
        comparison = aValue - bValue;
      } else if (sortConfig.key === 'amount' || sortConfig.key === 'balance') {
        // Force numeric comparison for amount/balance fields
        const numA = typeof aValue === 'number' ? aValue : parseFloat(aValue) || 0;
        const numB = typeof bValue === 'number' ? bValue : parseFloat(bValue) || 0;
        comparison = numA - numB;
      } else {
        // String comparison (case-insensitive)
        const strA = String(aValue).toLowerCase();
        const strB = String(bValue).toLowerCase();
        comparison = strA.localeCompare(strB);
      }

      // Apply sort direction
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [items, sortConfig]);

  // Request a sort on a specific column
  const requestSort = useCallback((key: string) => {
    setSortConfig((currentConfig) => {
      // If clicking the same column, toggle direction
      if (currentConfig.key === key) {
        return {
          key,
          direction: currentConfig.direction === 'asc' ? 'desc' : 'asc'
        };
      }
      // New column: default to descending for date/amount, ascending for others
      const defaultDirection: SortDirection =
        (key === 'date' || key === 'amount' || key === 'balance') ? 'desc' : 'asc';
      return { key, direction: defaultDirection };
    });
  }, []);

  // Reset to default sort
  const resetSort = useCallback(() => {
    setSortConfig(defaultSort);
  }, [defaultSort]);

  return {
    sortedItems,
    sortConfig,
    requestSort,
    resetSort
  };
}

// Helper to detect date strings
function isDateString(value: any): boolean {
  if (typeof value !== 'string') return false;
  const date = new Date(value);
  return !isNaN(date.getTime());
}

export default useSortableData;
