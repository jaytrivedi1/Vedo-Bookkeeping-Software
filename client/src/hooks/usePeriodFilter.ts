import { useMemo, useState, useCallback } from 'react';
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addMonths,
  format,
  isWithinInterval,
} from 'date-fns';
import { getFiscalYearBounds } from '@shared/fiscalYear';

export type PeriodType =
  | 'today'
  | 'this_week'
  | 'this_month'
  | 'this_quarter'
  | 'this_fiscal_year'
  | 'custom'
  | 'lifetime';

interface PeriodOption {
  value: PeriodType;
  label: string;
}

export const PERIOD_OPTIONS: PeriodOption[] = [
  { value: 'lifetime', label: 'Lifetime' },
  { value: 'today', label: 'Today' },
  { value: 'this_week', label: 'This Week' },
  { value: 'this_month', label: 'This Month' },
  { value: 'this_quarter', label: 'This Quarter' },
  { value: 'this_fiscal_year', label: 'This Fiscal Year' },
  { value: 'custom', label: 'Custom Period' },
];

interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
}

interface UsePeriodFilterOptions {
  fiscalYearStartMonth?: number;
}

interface UsePeriodFilterReturn {
  period: PeriodType;
  setPeriod: (period: PeriodType) => void;
  customRange: DateRange;
  setCustomRange: (range: DateRange) => void;
  dateRange: DateRange;
  periodLabel: string;
  isFiltered: boolean;
  filterByPeriod: <T extends { date: string | Date }>(items: T[]) => T[];
  clearFilter: () => void;
}

/**
 * Get the current fiscal quarter bounds based on fiscal year start month
 */
function getFiscalQuarterBounds(fiscalYearStartMonth: number = 1): { start: Date; end: Date } {
  const today = new Date();
  const currentMonth = today.getMonth() + 1; // 1-indexed
  const currentYear = today.getFullYear();

  // Calculate which quarter we're in based on fiscal year start
  // Fiscal quarters are 3-month periods starting from fiscal year start
  let fiscalYearStart: Date;

  if (currentMonth >= fiscalYearStartMonth) {
    fiscalYearStart = new Date(currentYear, fiscalYearStartMonth - 1, 1);
  } else {
    fiscalYearStart = new Date(currentYear - 1, fiscalYearStartMonth - 1, 1);
  }

  // Calculate months since fiscal year start
  const monthsSinceFiscalStart =
    (today.getFullYear() - fiscalYearStart.getFullYear()) * 12 +
    (today.getMonth() - fiscalYearStart.getMonth());

  // Determine which quarter (0, 1, 2, or 3)
  const quarterIndex = Math.floor(monthsSinceFiscalStart / 3);

  // Calculate quarter start and end
  const quarterStart = addMonths(fiscalYearStart, quarterIndex * 3);
  const quarterEnd = endOfMonth(addMonths(quarterStart, 2));

  return {
    start: startOfMonth(quarterStart),
    end: quarterEnd,
  };
}

export function usePeriodFilter(options: UsePeriodFilterOptions = {}): UsePeriodFilterReturn {
  const { fiscalYearStartMonth = 1 } = options;

  const [period, setPeriod] = useState<PeriodType>('lifetime');
  const [customRange, setCustomRange] = useState<DateRange>({
    startDate: null,
    endDate: null,
  });

  // Calculate the actual date range based on selected period
  const dateRange = useMemo((): DateRange => {
    const today = new Date();

    switch (period) {
      case 'today':
        return {
          startDate: startOfDay(today),
          endDate: endOfDay(today),
        };
      case 'this_week':
        return {
          startDate: startOfWeek(today, { weekStartsOn: 0 }), // Sunday
          endDate: endOfWeek(today, { weekStartsOn: 0 }),
        };
      case 'this_month':
        return {
          startDate: startOfMonth(today),
          endDate: endOfMonth(today),
        };
      case 'this_quarter': {
        const quarterBounds = getFiscalQuarterBounds(fiscalYearStartMonth);
        return {
          startDate: quarterBounds.start,
          endDate: quarterBounds.end,
        };
      }
      case 'this_fiscal_year': {
        const { fiscalYearStart, fiscalYearEnd } = getFiscalYearBounds(today, fiscalYearStartMonth);
        return {
          startDate: fiscalYearStart,
          endDate: fiscalYearEnd,
        };
      }
      case 'custom':
        return customRange;
      case 'lifetime':
      default:
        return { startDate: null, endDate: null };
    }
  }, [period, customRange, fiscalYearStartMonth]);

  // Generate a human-readable label for the current period
  const periodLabel = useMemo((): string => {
    if (period === 'lifetime') {
      return 'All Time';
    }

    const { startDate, endDate } = dateRange;
    if (!startDate || !endDate) {
      return 'Select dates';
    }

    const startFormatted = format(startDate, 'MMM d, yyyy');
    const endFormatted = format(endDate, 'MMM d, yyyy');

    // If same day, show just one date
    if (startFormatted === endFormatted) {
      return startFormatted;
    }

    // If same year, omit year from start date
    if (startDate.getFullYear() === endDate.getFullYear()) {
      return `${format(startDate, 'MMM d')} - ${endFormatted}`;
    }

    return `${startFormatted} - ${endFormatted}`;
  }, [period, dateRange]);

  const isFiltered = period !== 'lifetime';

  // Filter function that can be applied to any array of items with a date field
  const filterByPeriod = useCallback(
    <T extends { date: string | Date }>(items: T[]): T[] => {
      if (!isFiltered || !dateRange.startDate || !dateRange.endDate) {
        return items;
      }

      return items.filter((item) => {
        const itemDate = new Date(item.date);
        return isWithinInterval(itemDate, {
          start: dateRange.startDate!,
          end: dateRange.endDate!,
        });
      });
    },
    [isFiltered, dateRange]
  );

  const clearFilter = useCallback(() => {
    setPeriod('lifetime');
    setCustomRange({ startDate: null, endDate: null });
  }, []);

  return {
    period,
    setPeriod,
    customRange,
    setCustomRange,
    dateRange,
    periodLabel,
    isFiltered,
    filterByPeriod,
    clearFilter,
  };
}
