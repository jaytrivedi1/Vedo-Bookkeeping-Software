import { useQuery } from "@tanstack/react-query";

interface Preferences {
  id?: number;
  invoiceTemplate?: string;
  darkMode?: boolean;
  multiCurrencyEnabled?: boolean;
  homeCurrency?: string;
}

export function useInvoiceTemplate() {
  const { data: preferences } = useQuery<Preferences>({
    queryKey: ["/api/settings/preferences"],
  });

  return {
    template: preferences?.invoiceTemplate || 'classic',
    isLoading: !preferences,
  };
}
