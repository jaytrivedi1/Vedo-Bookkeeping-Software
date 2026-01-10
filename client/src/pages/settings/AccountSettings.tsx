import { useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { User, Lock } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, { message: "Current password is required" }),
  newPassword: z.string().min(6, { message: "Password must be at least 6 characters" }),
  confirmPassword: z.string().min(1, { message: "Please confirm your password" }),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const profileUpdateSchema = z.object({
  username: z.string().min(1, { message: "Username is required" }),
  email: z.union([
    z.string().email({ message: "Please enter a valid email address." }),
    z.literal("")
  ]).optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

export default function AccountSettings() {
  const { toast } = useToast();

  const userQuery = useQuery({
    queryKey: ['/api/user'],
  });

  const passwordForm = useForm<z.infer<typeof passwordChangeSchema>>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const profileForm = useForm<z.infer<typeof profileUpdateSchema>>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: {
      username: "",
      email: "",
      firstName: "",
      lastName: "",
    },
  });

  useEffect(() => {
    if (userQuery.data && Object.keys(userQuery.data).length > 0) {
      const data = userQuery.data as any;
      profileForm.reset({
        username: data.username || "",
        email: data.email || "",
        firstName: data.firstName || "",
        lastName: data.lastName || "",
      });
    }
  }, [userQuery.data, profileForm]);

  const changePassword = useMutation({
    mutationFn: async (values: z.infer<typeof passwordChangeSchema>) => {
      return await apiRequest('/api/user/change-password', 'POST', {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
    },
    onSuccess: () => {
      passwordForm.reset();
      toast({
        title: "Password changed",
        description: "Your password has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error changing password",
        description: error?.message || "There was a problem changing your password.",
        variant: "destructive",
      });
    }
  });

  const updateProfile = useMutation({
    mutationFn: async (values: z.infer<typeof profileUpdateSchema>) => {
      return await apiRequest('/api/user/profile', 'PATCH', values);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['/api/user'], data);
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      toast({
        title: "Profile updated",
        description: "Your account information has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error updating profile",
        description: error?.message || "There was a problem updating your profile.",
        variant: "destructive",
      });
    }
  });

  if (userQuery.isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Account Settings</h2>
        <p className="text-sm text-slate-500 mt-1">Manage your password and profile information</p>
      </div>

      {/* Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile Information
          </CardTitle>
          <CardDescription>Update your account details</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...profileForm}>
            <form onSubmit={profileForm.handleSubmit((values) => updateProfile.mutate(values))} className="space-y-4">
              <FormField
                control={profileForm.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={profileForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={profileForm.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={profileForm.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <Button type="submit" disabled={updateProfile.isPending} className="w-full">
                {updateProfile.isPending ? "Updating..." : "Update Profile"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Password Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Change Password
          </CardTitle>
          <CardDescription>Update your password to keep your account secure</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...passwordForm}>
            <form onSubmit={passwordForm.handleSubmit((values) => changePassword.mutate(values))} className="space-y-4">
              <FormField
                control={passwordForm.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={passwordForm.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={passwordForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm New Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={changePassword.isPending} className="w-full">
                {changePassword.isPending ? "Changing..." : "Change Password"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
