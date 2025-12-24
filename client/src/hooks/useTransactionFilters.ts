import { useState, useMemo, useCallback } from 'react';
import { Transaction } from '@shared/schema';
import { startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, isWithinInterval, format } from 'date-fns';

export type TransactionType = 'invoice' | 'payment' | 'deposit' | 'cheque' | 'sales_receipt' | 'transfer' | 'bill' | 'expense' | 'customer_credit' | 'vendor_credit';
export type TransactionStatus = 'all' | 'open' | 'overdue' | 'paid' | 'voided' | 'unapplied_credit';
export type DatePreset = 'all' | 'today' | 'this_week' | 'this_month' | 'last_30_days' | 'last_90_days' | 'this_year' | 'custom';

export interface DateRange {
  from: Date | null;
  to: Date | null;
}

export interface TransactionFilters {
  searchQuery: string;
  selectedTypes: TransactionType[];
  selectedStatus: TransactionStatus;
  datePreset: DatePreset;
  customDateRange: DateRange;
}

export interface UseTransactionFiltersOptions {
  contactType: 'customer' | 'vendor';
  transactions: Transaction[];
}

export interface UseTransactionFiltersReturn {
  // Filter state
  filters: TransactionFilters;

  // Filter setters
  setSearchQuery: (query: string) => void;
  toggleType: (type: TransactionType) => void;
  setSelectedTypes: (types: TransactionType[]) => void;
  setSelectedStatus: (status: TransactionStatus) => void;
  setDatePreset: (preset: DatePreset) => void;
  setCustomDateRange: (range: DateRange) => void;
  clearAllFilters: () => void;

  // Computed values
  filteredTransactions: Transaction[];
  hasActiveFilters: boolean;
  availableTypes: { value: TransactionType; label: string }[];

  // Date range helpers
  getDateRangeFromPreset: (preset: DatePreset) => DateRange;
  formatDatePresetLabel: (preset: DatePreset, customRange?: DateRange) => string;
}

const CUSTOMER_TYPES: { value: TransactionType; label: string }[] = [
  { value: 'invoice', label: 'Invoices' },
  { value: 'payment', label: 'Payments' },
  { value: 'deposit', label: 'Deposits' },
  { value: 'customer_credit', label: 'Credit Memos' },
  { value: 'sales_receipt', label: 'Sales Receipts' },
];

const VENDOR_TYPES: { value: TransactionType; label: string }[] = [
  { value: 'bill', label: 'Bills' },
  { value: 'payment', label: 'Payments' },
  { value: 'cheque', label: 'Cheques' },
  { value: 'expense', label: 'Expenses' },
  { value: 'vendor_credit', label: 'Credit Memos' },
];

const STATUS_OPTIONS: { value: TransactionStatus; label: string }[] = [
  { value: 'all', label: 'All Status' },
  { value: 'open', label: 'Open' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'paid', label: 'Paid' },
  { value: 'unapplied_credit', label: 'Unapplied Credit' },
];

const DEFAULT_FILTERS: TransactionFilters = {
  searchQuery: '',
  selectedTypes: [],
  selectedStatus: 'all',
  datePreset: 'all',
  customDateRange: { from: null, to: null },
};

export function useTransactionFilters({
  contactType,
  transactions,
}: UseTransactionFiltersOptions): UseTransactionFiltersReturn {
  const [filters, setFilters] = useState<TransactionFilters>(DEFAULT_FILTERS);

  const availableTypes = contactType === 'customer' ? CUSTOMER_TYPES : VENDOR_TYPES;

  const getDateRangeFromPreset = useCallback((preset: DatePreset): DateRange => {
    const today = new Date();

    switch (preset) {
      case 'today':
        return { from: startOfDay(today), to: endOfDay(today) };
      case 'this_week':
        return { from: startOfWeek(today, { weekStartsOn: 0 }), to: endOfWeek(today, { weekStartsOn: 0 }) };
      case 'this_month':
        return { from: startOfMonth(today), to: endOfMonth(today) };
      case 'last_30_days':
        return { from: startOfDay(subDays(today, 30)), to: endOfDay(today) };
      case 'last_90_days':
        return { from: startOfDay(subDays(today, 90)), to: endOfDay(today) };
      case 'this_year':
        return { from: startOfYear(today), to: endOfDay(today) };
      case 'all':
      case 'custom':
      default:
        return { from: null, to: null };
    }
  }, []);

  const formatDatePresetLabel = useCallback((preset: DatePreset, customRange?: DateRange): string => {
    switch (preset) {
      case 'today': return 'Today';
      case 'this_week': return 'This Week';
      case 'this_month': return 'This Month';
      case 'last_30_days': return 'Last 30 Days';
      case 'last_90_days': return 'Last 90 Days';
      case 'this_year': return 'This Year';
      case 'custom':
        if (customRange?.from && customRange?.to) {
          return `${format(customRange.from, 'MMM d')} - ${format(customRange.to, 'MMM d')}`;
        }
        return 'Custom Range';
      case 'all':
      default: return 'All Time';
    }
  }, []);

  const setSearchQuery = useCallback((query: string) => {
    setFilters(prev => ({ ...prev, searchQuery: query }));
  }, []);

  const toggleType = useCallback((type: TransactionType) => {
    setFilters(prev => {
      const isSelected = prev.selectedTypes.includes(type);
      return {
        ...prev,
        selectedTypes: isSelected
          ? prev.selectedTypes.filter(t => t !== type)
          : [...prev.selectedTypes, type],
      };
    });
  }, []);

  const setSelectedTypes = useCallback((types: TransactionType[]) => {
    setFilters(prev => ({ ...prev, selectedTypes: types }));
  }, []);

  const setSelectedStatus = useCallback((status: TransactionStatus) => {
    setFilters(prev => ({ ...prev, selectedStatus: status }));
  }, []);

  const setDatePreset = useCallback((preset: DatePreset) => {
    setFilters(prev => ({ ...prev, datePreset: preset }));
  }, []);

  const setCustomDateRange = useCallback((range: DateRange) => {
    setFilters(prev => ({ ...prev, datePreset: 'custom', customDateRange: range }));
  }, []);

  const clearAllFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  const hasActiveFilters = useMemo(() => {
    return (
      filters.searchQuery !== '' ||
      filters.selectedTypes.length > 0 ||
      filters.selectedStatus !== 'all' ||
      filters.datePreset !== 'all'
    );
  }, [filters]);

  const filteredTransactions = useMemo(() => {
    let result = [...transactions];

    // Search filter
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      result = result.filter(t =>
        t.reference?.toLowerCase().includes(query) ||
        t.description?.toLowerCase().includes(query) ||
        t.memo?.toLowerCase().includes(query) ||
        t.amount.toString().includes(query)
      );
    }

    // Type filter
    if (filters.selectedTypes.length > 0) {
      result = result.filter(t => filters.selectedTypes.includes(t.type as TransactionType));
    }

    // Status filter
    if (filters.selectedStatus !== 'all') {
      result = result.filter(t => {
        switch (filters.selectedStatus) {
          case 'open':
            return t.status === 'open' || t.status === 'draft';
          case 'overdue': {
            // Check if transaction is actually overdue based on due date
            if (!t.dueDate) return false;
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const dueDate = new Date(t.dueDate);
            dueDate.setHours(0, 0, 0, 0);
            if (dueDate >= today) return false;
            // Must have unpaid balance
            const balance = t.balance ?? t.amount;
            if (balance <= 0) return false;
            // Exclude paid, completed, cancelled, quotation statuses
            const nonOverdueStatuses = ['paid', 'completed', 'cancelled', 'quotation'];
            if (nonOverdueStatuses.includes(t.status)) return false;
            return true;
          }
          case 'paid':
            return t.status === 'paid' || t.status === 'completed';
          case 'unapplied_credit':
            return t.status === 'unapplied_credit';
          default:
            return true;
        }
      });
    }

    // Date filter
    const dateRange = filters.datePreset === 'custom'
      ? filters.customDateRange
      : getDateRangeFromPreset(filters.datePreset);

    if (dateRange.from && dateRange.to) {
      result = result.filter(t => {
        const transactionDate = new Date(t.date);
        return isWithinInterval(transactionDate, { start: dateRange.from!, end: dateRange.to! });
      });
    }

    return result;
  }, [transactions, filters, getDateRangeFromPreset]);

  return {
    filters,
    setSearchQuery,
    toggleType,
    setSelectedTypes,
    setSelectedStatus,
    setDatePreset,
    setCustomDateRange,
    clearAllFilters,
    filteredTransactions,
    hasActiveFilters,
    availableTypes,
    getDateRangeFromPreset,
    formatDatePresetLabel,
  };
}

export { STATUS_OPTIONS };
