import { useCallback, useEffect, useState } from "react";
import { useLocation } from "wouter";

/**
 * Hook to sync tab state with URL query parameters
 * Usage: /customers/123?tab=notes opens the notes tab directly
 */
export function useTabFromUrl(defaultTab: string) {
  const [location, setLocation] = useLocation();
  const [activeTab, setActiveTabState] = useState(defaultTab);

  // Parse tab from URL on mount and when location changes
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl) {
      setActiveTabState(tabFromUrl);
    } else {
      setActiveTabState(defaultTab);
    }
  }, [location, defaultTab]);

  // Set tab and update URL
  const setActiveTab = useCallback((newTab: string) => {
    setActiveTabState(newTab);

    // Update URL with new tab parameter
    const url = new URL(window.location.href);
    if (newTab === defaultTab) {
      // Remove tab param if it's the default
      url.searchParams.delete('tab');
    } else {
      url.searchParams.set('tab', newTab);
    }

    // Use history.replaceState to avoid adding to browser history for tab changes
    window.history.replaceState({}, '', url.pathname + url.search);
  }, [defaultTab]);

  return [activeTab, setActiveTab] as const;
}
