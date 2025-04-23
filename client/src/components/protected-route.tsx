import { ReactNode } from "react";
import { Redirect, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: "admin" | "accountant" | "bookkeeper" | "viewer";
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If not authenticated, redirect to auth page
  if (!user) {
    return <Redirect to="/auth" />;
  }

  // If role is required and user doesn't have the required role
  if (requiredRole && user.role !== requiredRole && user.role !== "admin") {
    // Admin can access everything, others need specific role
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold text-destructive mb-2">Access Denied</h1>
        <p className="text-muted-foreground mb-4 text-center">
          You don't have the necessary permissions to access this page.
        </p>
        <button
          onClick={() => navigate("/")}
          className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
        >
          Go to Dashboard
        </button>
      </div>
    );
  }

  return <>{children}</>;
}