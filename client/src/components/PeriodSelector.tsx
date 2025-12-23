import { useState } from 'react';
import { format } from 'date-fns';
import { CalendarDays, Check, ChevronDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { PeriodType, PERIOD_OPTIONS } from '@/hooks/usePeriodFilter';

interface PeriodSelectorProps {
  period: PeriodType;
  onPeriodChange: (period: PeriodType) => void;
  customRange: { startDate: Date | null; endDate: Date | null };
  onCustomRangeChange: (range: { startDate: Date | null; endDate: Date | null }) => void;
  periodLabel: string;
  isFiltered: boolean;
  onClear: () => void;
}

export function PeriodSelector({
  period,
  onPeriodChange,
  customRange,
  onCustomRangeChange,
  periodLabel,
  isFiltered,
  onClear,
}: PeriodSelectorProps) {
  const [open, setOpen] = useState(false);
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [tempStartDate, setTempStartDate] = useState<Date | undefined>(
    customRange.startDate || undefined
  );
  const [tempEndDate, setTempEndDate] = useState<Date | undefined>(
    customRange.endDate || undefined
  );

  const handlePeriodSelect = (selectedPeriod: PeriodType) => {
    if (selectedPeriod === 'custom') {
      setShowCustomPicker(true);
    } else {
      onPeriodChange(selectedPeriod);
      setShowCustomPicker(false);
      setOpen(false);
    }
  };

  const handleCustomApply = () => {
    if (tempStartDate && tempEndDate) {
      onCustomRangeChange({
        startDate: tempStartDate,
        endDate: tempEndDate,
      });
      onPeriodChange('custom');
      setShowCustomPicker(false);
      setOpen(false);
    }
  };

  const handleCustomCancel = () => {
    setShowCustomPicker(false);
    setTempStartDate(customRange.startDate || undefined);
    setTempEndDate(customRange.endDate || undefined);
  };

  const selectedOption = PERIOD_OPTIONS.find((opt) => opt.value === period);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'h-10 px-3 gap-2 bg-slate-50 border-slate-200 hover:bg-white',
            isFiltered && 'border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-50'
          )}
        >
          <CalendarDays className="h-4 w-4" />
          <span className="hidden sm:inline">{selectedOption?.label || 'Period'}</span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        {!showCustomPicker ? (
          <div className="p-2">
            <div className="px-2 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Select Period
            </div>
            <div className="space-y-0.5">
              {PERIOD_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handlePeriodSelect(option.value)}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors',
                    period === option.value
                      ? 'bg-blue-50 text-blue-700'
                      : 'hover:bg-slate-100 text-slate-700'
                  )}
                >
                  <span>{option.label}</span>
                  {period === option.value && <Check className="h-4 w-4" />}
                </button>
              ))}
            </div>
            {isFiltered && (
              <>
                <div className="my-2 border-t border-slate-200" />
                <button
                  onClick={() => {
                    onClear();
                    setOpen(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="h-4 w-4" />
                  Clear Filter
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-slate-900">Custom Period</h4>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={handleCustomCancel}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4">
              {/* Start Date */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">
                  Start Date
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !tempStartDate && 'text-slate-400'
                      )}
                    >
                      <CalendarDays className="mr-2 h-4 w-4" />
                      {tempStartDate ? format(tempStartDate, 'MMM d, yyyy') : 'Select start'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={tempStartDate}
                      onSelect={setTempStartDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* End Date */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">
                  End Date
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !tempEndDate && 'text-slate-400'
                      )}
                    >
                      <CalendarDays className="mr-2 h-4 w-4" />
                      {tempEndDate ? format(tempEndDate, 'MMM d, yyyy') : 'Select end'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={tempEndDate}
                      onSelect={setTempEndDate}
                      disabled={(date) => tempStartDate ? date < tempStartDate : false}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Apply Button */}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleCustomCancel}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  onClick={handleCustomApply}
                  disabled={!tempStartDate || !tempEndDate}
                >
                  Apply
                </Button>
              </div>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

/**
 * Active Filter Indicator - Shows when a period filter is applied
 */
interface ActiveFilterIndicatorProps {
  periodLabel: string;
  isFiltered: boolean;
  onClear: () => void;
}

export function ActiveFilterIndicator({
  periodLabel,
  isFiltered,
  onClear,
}: ActiveFilterIndicatorProps) {
  if (!isFiltered) return null;

  return (
    <div className="flex items-center justify-between px-6 py-2 bg-blue-50 border-t border-blue-100">
      <div className="flex items-center gap-2 text-sm text-blue-700">
        <CalendarDays className="h-4 w-4" />
        <span>
          Showing: <strong>{periodLabel}</strong>
        </span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-100"
        onClick={onClear}
      >
        <X className="h-3 w-3 mr-1" />
        Clear
      </Button>
    </div>
  );
}
