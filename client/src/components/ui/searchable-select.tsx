import { useState } from 'react';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
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
  onAddNew?: () => void; // Optional callback for adding new items
  addNewText?: string; // Optional custom text for the add new button
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
  onAddNew,
  addNewText = "Add New...",
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const selectedItem = items.find((item) => item.value === value);

  return (
    <Popover 
      open={open} 
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) {
          setSearchQuery("");
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between overflow-hidden",
            !value && "text-muted-foreground",
            className
          )}
          disabled={disabled}
          data-testid={testId}
        >
          <span className="truncate flex-1 text-left">
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
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder={searchPlaceholder}
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            <CommandEmpty>
              <div className="py-6 text-center text-sm">{emptyText}</div>
            </CommandEmpty>
            <CommandGroup>
              {items
                .filter((item) => {
                  if (!searchQuery) return true;
                  const query = searchQuery.toLowerCase();
                  return (
                    item.label.toLowerCase().includes(query) ||
                    item.subtitle?.toLowerCase().includes(query)
                  );
                })
                .map((item) => (
                  <CommandItem
                    key={item.value}
                    value={item.value}
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
            {onAddNew && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    value="__add_new_action__"
                    onSelect={() => {
                      setOpen(false);
                      onAddNew();
                    }}
                    className="text-primary"
                    data-testid={testId ? `${testId}-add-new` : undefined}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {addNewText}
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
