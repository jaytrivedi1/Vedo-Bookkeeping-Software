import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

const acceptInvitationSchema = z.object({
  username: z.string().min(3, { message: "Username must be at least 3 characters" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  confirmPassword: z.string().min(1, { message: "Please confirm your password" }),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type AcceptInvitationForm = z.infer<typeof acceptInvitationSchema>;

export default function AcceptInvitation() {
  const { token } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isAccepted, setIsAccepted] = useState(false);

  // Validate invitation token
  const { data: invitation, isLoading: isValidating, error: validationError } = useQuery({
    queryKey: [`/api/invitations/${token}/validate`],
    enabled: !!token,
  });

  const form = useForm<AcceptInvitationForm>({
    resolver: zodResolver(acceptInvitationSchema),
    defaultValues: {
      username: "",
      password: "",
      confirmPassword: "",
      firstName: "",
      lastName: "",
    },
  });

  const acceptMutation = useMutation({
    mutationFn: async (data: AcceptInvitationForm) => {
      return await apiRequest(`/api/invitations/${token}/accept`, 'POST', data);
    },
    onSuccess: () => {
      setIsAccepted(true);
      toast({
        title: "Account created",
        description: "Your account has been successfully created. Redirecting to login...",
      });
      // Redirect to login after 2 seconds
      setTimeout(() => {
        setLocation("/");
      }, 2000);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to create account. Please try again.",
      });
    },
  });

  const onSubmit = (data: AcceptInvitationForm) => {
    acceptMutation.mutate(data);
  };

  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl flex items-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin" />
              Validating invitation...
            </CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (validationError || !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md border-destructive">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl flex items-center gap-2 text-destructive">
              <XCircle className="w-6 h-6" />
              Invalid Invitation
            </CardTitle>
            <CardDescription>
              This invitation link is invalid or has expired. Please contact your administrator for a new invitation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => setLocation("/")}
              className="w-full"
              data-testid="button-back-to-login"
            >
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isAccepted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md border-green-500">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl flex items-center gap-2 text-green-600">
              <CheckCircle2 className="w-6 h-6" />
              Account Created!
            </CardTitle>
            <CardDescription>
              Your account has been successfully created. Redirecting to login...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">Accept Invitation</CardTitle>
          <CardDescription>
            You've been invited to join. Create your account to get started.
          </CardDescription>
          {invitation && (
            <div className="pt-2">
              <p className="text-sm text-muted-foreground">
                Email: <span className="font-medium text-foreground">{invitation.email}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                Role: <span className="font-medium text-foreground capitalize">{invitation.role.replace('_', ' ')}</span>
              </p>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Enter your username"
                        data-testid="input-username"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Enter your first name"
                        data-testid="input-first-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Enter your last name"
                        data-testid="input-last-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="password"
                        placeholder="Create a password"
                        data-testid="input-password"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="password"
                        placeholder="Confirm your password"
                        data-testid="input-confirm-password"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={acceptMutation.isPending}
                data-testid="button-create-account"
              >
                {acceptMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  "Create Account"
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
