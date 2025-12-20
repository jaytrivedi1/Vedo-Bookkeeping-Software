import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, ChevronDown, Building2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { apiRequest } from '@/lib/queryClient';
import { Skeleton } from '@/components/ui/skeleton';

type Company = {
  id: number;
  name: string;
  logoUrl?: string;
  isDefault: boolean;
}

export function CompanySelector() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: companies, isLoading } = useQuery({ 
    queryKey: ['/api/companies'], 
    queryFn: () => apiRequest('/api/companies')
  });

  const { data: defaultCompany } = useQuery({ 
    queryKey: ['/api/companies/default'], 
    queryFn: () => apiRequest('/api/companies/default')
  });

  const setDefaultMutation = useMutation({
    mutationFn: (companyId: number) => 
      apiRequest(`/api/companies/${companyId}/set-default`, 'POST'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/companies'] });
      queryClient.invalidateQueries({ queryKey: ['/api/companies/default'] });
      // Add other queries to invalidate as needed, like account data
      queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
    }
  });

  const handleCompanySelect = (companyId: number) => {
    setDefaultMutation.mutate(companyId);
    setOpen(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center w-full">
        <Skeleton className="h-10 w-full rounded-md bg-slate-800/50" />
      </div>
    );
  }

  const currentCompany = defaultCompany || 
    (companies && companies.length > 0 ? companies[0] : null);

  if (!currentCompany) {
    return null;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700 text-white h-10"
        >
          <div className="flex items-center gap-2 truncate">
            <Building2 className="h-4 w-4 text-slate-400 flex-shrink-0" />
            <span className="truncate text-sm">{currentCompany.name}</span>
          </div>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 text-slate-400" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[250px] p-0">
        <Command>
          <CommandInput placeholder="Search company..." />
          <CommandEmpty>No company found.</CommandEmpty>
          <CommandGroup>
            {companies?.map((company: Company) => (
              <CommandItem
                key={company.id}
                value={company.name}
                onSelect={() => handleCompanySelect(company.id)}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    company.id === currentCompany.id 
                      ? "opacity-100" 
                      : "opacity-0"
                  )}
                />
                {company.name}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}