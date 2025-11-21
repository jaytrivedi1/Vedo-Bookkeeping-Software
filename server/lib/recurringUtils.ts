import { addDays, addMonths, addWeeks, addYears, addQuarters, getDayOfMonth, isLastDayOfMonth, format, startOfMonth, endOfMonth } from "date-fns";
import { RecurringTemplate } from "@shared/schema";

export type FrequencyType = "daily" | "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly" | "custom";

export function calculateNextRunDate(template: RecurringTemplate): Date {
  let nextDate = new Date(template.nextRunAt || template.startDate);

  switch (template.frequency) {
    case "daily":
      nextDate = addDays(nextDate, 1);
      break;
    case "weekly":
      nextDate = addWeeks(nextDate, 1);
      break;
    case "biweekly":
      nextDate = addWeeks(nextDate, 2);
      break;
    case "monthly":
      if (template.dayOfMonth === -1) {
        // Last business day of month
        const nextMonth = addMonths(nextDate, 1);
        const lastDay = endOfMonth(nextMonth);
        // Get last business day (Friday if month ends on weekend)
        let date = new Date(lastDay);
        while (date.getDay() === 0 || date.getDay() === 6) {
          date = addDays(date, -1);
        }
        nextDate = date;
      } else if (template.dayOfMonth) {
        // Specific day of month
        const nextMonth = addMonths(nextDate, 1);
        const year = nextMonth.getFullYear();
        const month = nextMonth.getMonth();
        const day = Math.min(template.dayOfMonth, getDayOfMonth(endOfMonth(new Date(year, month))));
        nextDate = new Date(year, month, day);
      } else {
        nextDate = addMonths(nextDate, 1);
      }
      break;
    case "quarterly":
      nextDate = addQuarters(nextDate, 1);
      break;
    case "yearly":
      nextDate = addYears(nextDate, 1);
      break;
    case "custom":
      if (template.frequencyValue && template.frequencyUnit) {
        switch (template.frequencyUnit) {
          case "days":
            nextDate = addDays(nextDate, template.frequencyValue);
            break;
          case "weeks":
            nextDate = addWeeks(nextDate, template.frequencyValue);
            break;
          case "months":
            nextDate = addMonths(nextDate, template.frequencyValue);
            break;
          default:
            nextDate = addDays(nextDate, template.frequencyValue);
        }
      }
      break;
  }

  // Apply end date constraint
  if (template.endDate && nextDate > new Date(template.endDate)) {
    return new Date(0); // Invalid date to indicate no more runs
  }

  // Apply max occurrences constraint
  if (template.maxOccurrences && template.currentOccurrences >= template.maxOccurrences) {
    return new Date(0);
  }

  return nextDate;
}

export function shouldRunRecurringTemplate(template: RecurringTemplate): boolean {
  const now = new Date();
  const nextRunAt = new Date(template.nextRunAt);

  // Check if it's time to run
  if (nextRunAt > now) {
    return false;
  }

  // Check if status is active
  if (template.status !== "active") {
    return false;
  }

  // Check if max occurrences reached
  if (template.maxOccurrences && template.currentOccurrences >= template.maxOccurrences) {
    return false;
  }

  // Check if end date has passed
  if (template.endDate && now > new Date(template.endDate)) {
    return false;
  }

  return true;
}

export function formatFrequency(frequency: FrequencyType, frequencyValue?: number, frequencyUnit?: string): string {
  switch (frequency) {
    case "daily":
      return "Daily";
    case "weekly":
      return "Weekly";
    case "biweekly":
      return "Every 2 weeks";
    case "monthly":
      return "Monthly";
    case "quarterly":
      return "Quarterly";
    case "yearly":
      return "Yearly";
    case "custom":
      return `Every ${frequencyValue} ${frequencyUnit}`;
    default:
      return frequency;
  }
}
