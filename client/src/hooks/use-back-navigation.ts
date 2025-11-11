import { useMemo } from 'react';
import { useLocation, useSearch } from 'wouter';

/**
 * Hook to handle contextual back navigation
 * Reads back URL and label from query parameters and provides navigation helpers
 * Falls back to default path and label if no context is provided
 * 
 * @param defaultPath - Default path to navigate to if no back parameter exists
 * @param defaultLabel - Default label for the back button if no backLabel parameter exists
 * @returns Object with backUrl, backLabel, and handleBack function
 */
export function useBackNavigation(defaultPath: string, defaultLabel: string) {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  
  const { backUrl, backLabel } = useMemo(() => {
    const queryParams = new URLSearchParams(searchString);
    const back = queryParams.get('back');
    const label = queryParams.get('backLabel');
    
    return {
      backUrl: back ? decodeURIComponent(back) : defaultPath,
      backLabel: label ? decodeURIComponent(label) : defaultLabel,
    };
  }, [searchString, defaultPath, defaultLabel]);

  const handleBack = () => {
    setLocation(backUrl);
  };

  return {
    backUrl,
    backLabel,
    handleBack,
  };
}
