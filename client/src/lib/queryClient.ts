import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  url: string,
  method: string = 'GET',
  data?: unknown | undefined,
): Promise<any> {
  try {
    console.log(`API Request to ${url} (${method}):`, data);
    
    const res = await fetch(url, {
      method: method,
      headers: data ? { "Content-Type": "application/json" } : {},
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });
    
    // Log the response status
    console.log(`API Response from ${url} (${method}):`, {
      status: res.status,
      statusText: res.statusText
    });
    
    // Clone the response to read it twice
    const resClone = res.clone();
    
    try {
      // Try to parse the response as JSON
      const responseData = await resClone.json();
      console.log(`API Response data from ${url}:`, responseData);
      
      if (!res.ok) {
        console.error(`API Error (${res.status}) from ${url}:`, responseData);
        throw new Error(responseData.message || 'Something went wrong');
      }
      
      // For successful response, await throwIfResNotOk to maintain compatibility
      await throwIfResNotOk(res);
      return responseData;
    } catch (jsonError) {
      // If JSON parsing fails, handle as text
      const textResponse = await res.text();
      console.log(`Non-JSON response from ${url}:`, textResponse);
      
      if (!res.ok) {
        throw new Error(`${res.status}: ${textResponse || res.statusText}`);
      }
      
      return textResponse;
    }
  } catch (error) {
    console.error(`API Request Error (${url}):`, error);
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
