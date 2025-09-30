import { addMonths, startOfMonth, endOfMonth, format, isBefore, isAfter, startOfYear, addYears } from 'date-fns';

/**
 * Get the fiscal year bounds (start and end dates) for a given date and fiscal year start month
 * @param date - The reference date
 * @param fiscalYearStartMonth - Month when fiscal year starts (1=January, 12=December)
 * @returns Object with fiscalYearStart and fiscalYearEnd dates
 */
export function getFiscalYearBounds(date: Date, fiscalYearStartMonth: number = 1): {
  fiscalYearStart: Date;
  fiscalYearEnd: Date;
} {
  const currentMonth = date.getMonth() + 1; // JavaScript months are 0-indexed
  const currentYear = date.getFullYear();
  
  let fiscalYearStartDate: Date;
  
  if (currentMonth >= fiscalYearStartMonth) {
    // We're in the fiscal year that started this calendar year
    fiscalYearStartDate = new Date(currentYear, fiscalYearStartMonth - 1, 1);
  } else {
    // We're in the fiscal year that started last calendar year
    fiscalYearStartDate = new Date(currentYear - 1, fiscalYearStartMonth - 1, 1);
  }
  
  // Fiscal year ends 12 months after it starts, on the last day of the month before it starts again
  const fiscalYearEndDate = endOfMonth(addMonths(fiscalYearStartDate, 11));
  
  return {
    fiscalYearStart: startOfMonth(fiscalYearStartDate),
    fiscalYearEnd: fiscalYearEndDate,
  };
}

/**
 * Get a formatted fiscal year label
 * @param date - The reference date
 * @param fiscalYearStartMonth - Month when fiscal year starts (1=January, 12=December)
 * @returns Formatted label like "FY 2024" or "FY 2024-2025"
 */
export function getFiscalYearLabel(date: Date, fiscalYearStartMonth: number = 1): string {
  const { fiscalYearStart, fiscalYearEnd } = getFiscalYearBounds(date, fiscalYearStartMonth);
  
  const startYear = fiscalYearStart.getFullYear();
  const endYear = fiscalYearEnd.getFullYear();
  
  if (startYear === endYear) {
    // Fiscal year is within a single calendar year (starts in January)
    return `FY ${startYear}`;
  } else {
    // Fiscal year spans two calendar years
    return `FY ${startYear}-${endYear}`;
  }
}

/**
 * Get the fiscal year number for a given date
 * @param date - The reference date
 * @param fiscalYearStartMonth - Month when fiscal year starts (1=January, 12=December)
 * @returns The fiscal year number (the year when the fiscal year starts)
 */
export function getFiscalYear(date: Date, fiscalYearStartMonth: number = 1): number {
  const { fiscalYearStart } = getFiscalYearBounds(date, fiscalYearStartMonth);
  return fiscalYearStart.getFullYear();
}

/**
 * Get month names for dropdown selection
 */
export const MONTH_OPTIONS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

/**
 * Check if a date falls within a fiscal year
 * @param date - The date to check
 * @param fiscalYearStartMonth - Month when fiscal year starts
 * @param referenceDate - The reference date to determine which fiscal year (defaults to today)
 * @returns True if the date is in the fiscal year containing the reference date
 */
export function isInFiscalYear(
  date: Date,
  fiscalYearStartMonth: number = 1,
  referenceDate: Date = new Date()
): boolean {
  const { fiscalYearStart, fiscalYearEnd } = getFiscalYearBounds(referenceDate, fiscalYearStartMonth);
  
  return !isBefore(date, fiscalYearStart) && !isAfter(date, fiscalYearEnd);
}
