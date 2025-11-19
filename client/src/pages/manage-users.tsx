import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { hasPermission } from "@shared/permissions";
import { format } from "date-fns";
import {
  UserPlus,
  Edit,
  Trash2,
  Copy,
  Link2,
  MoreHorizontal,
  UserX,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Types
interface User {
  id: number;
  username: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: "admin" | "staff" | "read_only" | "accountant";
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string;
}

interface Invitation {
  id: number;
  email: string;
  token: string;
  role: "admin" | "staff" | "read_only" | "accountant";
  invitedBy: number;
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
  inviterName?: string;
}

// Schemas
const inviteUserSchema = z.object({
  email: z.string().email("Invalid email address"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  role: z.enum(["admin", "staff", "read_only", "accountant"], {
    required_error: "Please select a role",
  }),
});

const editUserSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  role: z.enum(["admin", "staff", "read_only", "accountant"], {
    required_error: "Please select a role",
  }),
  isActive: z.boolean(),
});

type InviteUserFormData = z.infer<typeof inviteUserSchema>;
type EditUserFormData = z.infer<typeof editUserSchema>;

// InviteUserDialog Component
function InviteUserDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const [invitationLink, setInvitationLink] = useState<string | null>(null);
  const [showLinkDialog, setShowLinkDialog] = useState(false);

  const form = useForm<InviteUserFormData>({
    resolver: zodResolver(inviteUserSchema),
    defaultValues: {
      email: "",
      firstName: "",
      lastName: "",
      role: "read_only",
    },
  });

  const inviteMutation = useMutation({
    mutationFn: async (data: InviteUserFormData) => {
      return await apiRequest("/api/invitations", "POST", data);
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["/api/invitations"] });
      const link = `${window.location.origin}/accept-invitation/${response.token}`;
      setInvitationLink(link);
      setShowLinkDialog(true);
      onOpenChange(false);
      form.reset();
      toast({
        title: "Invitation created",
        description: "The invitation link has been generated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create invitation",
        variant: "destructive",
      });
    },
  });

  const handleCopyLink = async () => {
    if (invitationLink) {
      try {
        await navigator.clipboard.writeText(invitationLink);
        toast({
          title: "Link copied",
          description: "The invitation link has been copied to your clipboard.",
        });
      } catch (error) {
        toast({
          title: "Failed to copy",
          description: "Please copy the link manually.",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent data-testid="dialog-invite-user">
          <DialogHeader>
            <DialogTitle>Invite User</DialogTitle>
            <DialogDescription>
              Send an invitation to a new user to join your organization.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((data) => inviteMutation.mutate(data))}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        placeholder="user@example.com"
                        data-testid="input-email"
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
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="John"
                        data-testid="input-firstName"
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
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Doe"
                        data-testid="input-lastName"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-role">
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="admin" data-testid="option-admin">
                          Admin
                        </SelectItem>
                        <SelectItem value="staff" data-testid="option-staff">
                          Staff
                        </SelectItem>
                        <SelectItem
                          value="read_only"
                          data-testid="option-read_only"
                        >
                          Read Only
                        </SelectItem>
                        <SelectItem
                          value="accountant"
                          data-testid="option-accountant"
                        >
                          Accountant
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={inviteMutation.isPending}
                  data-testid="button-send-invitation"
                >
                  {inviteMutation.isPending ? "Creating..." : "Send Invitation"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Invitation Link Dialog */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent data-testid="dialog-invitation-link">
          <DialogHeader>
            <DialogTitle>Invitation Link Created</DialogTitle>
            <DialogDescription>
              Share this link with the user to complete their registration.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Input
                value={invitationLink || ""}
                readOnly
                data-testid="input-invitation-link"
              />
              <Button
                onClick={handleCopyLink}
                size="icon"
                variant="outline"
                data-testid="button-copy-link"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              The invitation link will expire in 7 days.
            </p>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setShowLinkDialog(false)}
              data-testid="button-close"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// EditUserDialog Component
function EditUserDialog({
  open,
  onOpenChange,
  user,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
}) {
  const { toast } = useToast();

  const form = useForm<EditUserFormData>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      role: user?.role || "read_only",
      isActive: user?.isActive ?? true,
    },
  });

  // Reset form when user changes
  useState(() => {
    if (user) {
      form.reset({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        role: user.role,
        isActive: user.isActive,
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (data: EditUserFormData) => {
      if (!user) return;
      return await apiRequest(`/api/users/${user.id}`, "PUT", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      onOpenChange(false);
      toast({
        title: "User updated",
        description: "The user has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user",
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="dialog-edit-user">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>
            Update the user's information and permissions.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((data) => updateMutation.mutate(data))}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First Name</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="John"
                      data-testid="input-edit-firstName"
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
                  <FormLabel>Last Name</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Doe"
                      data-testid="input-edit-lastName"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-edit-role">
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="admin" data-testid="option-edit-admin">
                        Admin
                      </SelectItem>
                      <SelectItem value="staff" data-testid="option-edit-staff">
                        Staff
                      </SelectItem>
                      <SelectItem
                        value="read_only"
                        data-testid="option-edit-read_only"
                      >
                        Read Only
                      </SelectItem>
                      <SelectItem
                        value="accountant"
                        data-testid="option-edit-accountant"
                      >
                        Accountant
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                data-testid="button-edit-cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateMutation.isPending}
                data-testid="button-edit-save"
              >
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// Main ManageUsers Component
export default function ManageUsers() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [deactivateUserId, setDeactivateUserId] = useState<number | null>(null);
  const [deleteInvitationId, setDeleteInvitationId] = useState<number | null>(
    null
  );

  // Permission check
  if (!user || !hasPermission(user.role as any, "users:read")) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Access Denied
          </h2>
          <p className="text-gray-500">
            You don't have permission to access this page.
          </p>
        </div>
      </div>
    );
  }

  const canCreate = hasPermission(user.role as any, "users:create");
  const canUpdate = hasPermission(user.role as any, "users:update");
  const canDelete = hasPermission(user.role as any, "users:delete");

  // Fetch users
  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  // Fetch invitations
  const { data: invitations = [], isLoading: invitationsLoading } = useQuery<
    Invitation[]
  >({
    queryKey: ["/api/invitations"],
    queryFn: async () => {
      const res = await fetch("/api/invitations?pending=true", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch invitations");
      return res.json();
    },
  });

  // Deactivate user mutation
  const deactivateMutation = useMutation({
    mutationFn: async (userId: number) => {
      return await apiRequest(`/api/users/${userId}`, "PUT", {
        isActive: false,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setDeactivateUserId(null);
      toast({
        title: "User deactivated",
        description: "The user has been deactivated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to deactivate user",
        variant: "destructive",
      });
    },
  });

  // Delete invitation mutation
  const deleteInvitationMutation = useMutation({
    mutationFn: async (invitationId: number) => {
      return await apiRequest(`/api/invitations/${invitationId}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invitations"] });
      setDeleteInvitationId(null);
      toast({
        title: "Invitation deleted",
        description: "The invitation has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete invitation",
        variant: "destructive",
      });
    },
  });

  // Copy invitation link
  const handleCopyInvitationLink = async (token: string) => {
    const link = `${window.location.origin}/accept-invitation/${token}`;
    try {
      await navigator.clipboard.writeText(link);
      toast({
        title: "Link copied",
        description: "The invitation link has been copied to your clipboard.",
      });
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Please copy the link manually.",
        variant: "destructive",
      });
    }
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setEditDialogOpen(true);
  };

  const getRoleLabel = (role: string) => {
    const roleLabels: Record<string, string> = {
      admin: "Admin",
      staff: "Staff",
      read_only: "Read Only",
      accountant: "Accountant",
    };
    return roleLabels[role] || role;
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold" data-testid="heading-manage-users">
            Manage Users
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage user accounts and invitations
          </p>
        </div>
        {canCreate && (
          <Button
            onClick={() => setInviteDialogOpen(true)}
            data-testid="button-invite-user"
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Invite User
          </Button>
        )}
      </div>

      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active" data-testid="tab-active-users">
            Active Users
          </TabsTrigger>
          <TabsTrigger value="invitations" data-testid="tab-pending-invitations">
            Pending Invitations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {usersLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : users.length === 0 ? (
            <div
              className="text-center py-12 border rounded-lg"
              data-testid="empty-users"
            >
              <UserX className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No users found</h3>
              <p className="text-muted-foreground mt-2">
                Get started by inviting your first user.
              </p>
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead data-testid="header-name">Name</TableHead>
                    <TableHead data-testid="header-email">Email</TableHead>
                    <TableHead data-testid="header-role">Role</TableHead>
                    <TableHead data-testid="header-status">Status</TableHead>
                    <TableHead data-testid="header-actions">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((userItem) => (
                    <TableRow key={userItem.id} data-testid={`row-user-${userItem.id}`}>
                      <TableCell data-testid={`text-name-${userItem.id}`}>
                        {userItem.firstName && userItem.lastName
                          ? `${userItem.firstName} ${userItem.lastName}`
                          : userItem.username}
                      </TableCell>
                      <TableCell data-testid={`text-email-${userItem.id}`}>
                        {userItem.email}
                      </TableCell>
                      <TableCell data-testid={`text-role-${userItem.id}`}>
                        <Badge variant="outline">
                          {getRoleLabel(userItem.role)}
                        </Badge>
                      </TableCell>
                      <TableCell data-testid={`text-status-${userItem.id}`}>
                        <Badge
                          variant={userItem.isActive ? "default" : "secondary"}
                        >
                          {userItem.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              data-testid={`button-actions-${userItem.id}`}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {canUpdate && (
                              <DropdownMenuItem
                                onClick={() => handleEditUser(userItem)}
                                data-testid={`button-edit-${userItem.id}`}
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                            )}
                            {canDelete && userItem.isActive && (
                              <DropdownMenuItem
                                onClick={() => setDeactivateUserId(userItem.id)}
                                className="text-destructive"
                                data-testid={`button-deactivate-${userItem.id}`}
                              >
                                <UserX className="mr-2 h-4 w-4" />
                                Deactivate
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="invitations" className="space-y-4">
          {invitationsLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : invitations.length === 0 ? (
            <div
              className="text-center py-12 border rounded-lg"
              data-testid="empty-invitations"
            >
              <Link2 className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">
                No pending invitations
              </h3>
              <p className="text-muted-foreground mt-2">
                Invitations you send will appear here.
              </p>
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead data-testid="header-inv-email">Email</TableHead>
                    <TableHead data-testid="header-inv-role">Role</TableHead>
                    <TableHead data-testid="header-inv-invited-by">
                      Invited By
                    </TableHead>
                    <TableHead data-testid="header-inv-expires">
                      Expires
                    </TableHead>
                    <TableHead data-testid="header-inv-actions">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invitations.map((invitation) => (
                    <TableRow
                      key={invitation.id}
                      data-testid={`row-invitation-${invitation.id}`}
                    >
                      <TableCell data-testid={`text-inv-email-${invitation.id}`}>
                        {invitation.email}
                      </TableCell>
                      <TableCell data-testid={`text-inv-role-${invitation.id}`}>
                        <Badge variant="outline">
                          {getRoleLabel(invitation.role)}
                        </Badge>
                      </TableCell>
                      <TableCell data-testid={`text-inv-inviter-${invitation.id}`}>
                        {invitation.inviterName || `User #${invitation.invitedBy}`}
                      </TableCell>
                      <TableCell data-testid={`text-inv-expires-${invitation.id}`}>
                        {format(new Date(invitation.expiresAt), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              handleCopyInvitationLink(invitation.token)
                            }
                            data-testid={`button-copy-${invitation.id}`}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteInvitationId(invitation.id)}
                              data-testid={`button-delete-${invitation.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <InviteUserDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
      />
      <EditUserDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        user={selectedUser}
      />

      {/* Deactivate User Confirmation */}
      <AlertDialog
        open={deactivateUserId !== null}
        onOpenChange={(open) => !open && setDeactivateUserId(null)}
      >
        <AlertDialogContent data-testid="dialog-deactivate-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate this user? They will no longer
              be able to access the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-deactivate-cancel">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deactivateUserId && deactivateMutation.mutate(deactivateUserId)
              }
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-deactivate-confirm"
            >
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Invitation Confirmation */}
      <AlertDialog
        open={deleteInvitationId !== null}
        onOpenChange={(open) => !open && setDeleteInvitationId(null)}
      >
        <AlertDialogContent data-testid="dialog-delete-invitation-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invitation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this invitation? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-delete-invitation-cancel">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deleteInvitationId &&
                deleteInvitationMutation.mutate(deleteInvitationId)
              }
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-delete-invitation-confirm"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
