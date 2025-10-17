import { useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export interface SearchableSelectItem {
  value: string;
  label: string;
  subtitle?: string; // For showing type like "· vendor" or "· customer"
}

interface SearchableSelectProps {
  items: SearchableSelectItem[];
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  emptyText?: string;
  searchPlaceholder?: string;
  className?: string;
  disabled?: boolean;
  'data-testid'?: string;
}

export function SearchableSelect({
  items,
  value,
  onValueChange,
  placeholder = "Select an item...",
  emptyText = "No items found.",
  searchPlaceholder = "Search...",
  className,
  disabled = false,
  'data-testid': testId,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);

  const selectedItem = items.find((item) => item.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between",
            !value && "text-muted-foreground",
            className
          )}
          disabled={disabled}
          data-testid={testId}
        >
          <span className="truncate">
            {selectedItem ? (
              <>
                {selectedItem.label}
                {selectedItem.subtitle && (
                  <span className="text-muted-foreground"> {selectedItem.subtitle}</span>
                )}
              </>
            ) : (
              placeholder
            )}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {items.map((item) => (
                <CommandItem
                  key={item.value}
                  value={item.label}
                  onSelect={() => {
                    // Only change value if selecting a different item
                    // Reselecting the same item just closes the popover
                    if (item.value !== value) {
                      onValueChange(item.value);
                    }
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === item.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {item.label}
                  {item.subtitle && (
                    <span className="text-muted-foreground"> {item.subtitle}</span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
