import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Building2,
  Mail,
  Clock,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Info,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function AccountantSettings() {
  const { toast } = useToast();
  const [firmInviteEmail, setFirmInviteEmail] = useState("");
  const [firmInviteBillingType, setFirmInviteBillingType] = useState<'client_pays' | 'firm_pays'>('client_pays');

  const connectedFirmQuery = useQuery<{
    firm: { id: number; name: string; email: string; phone?: string } | null;
    access: { id: number; billingType: string; createdAt: string } | null;
  }>({
    queryKey: ['/api/company/connected-firm'],
  });

  const firmInvitationsQuery = useQuery<Array<{
    id: number;
    firmEmail: string;
    status: string;
    billingType: string;
    createdAt: string;
    expiresAt: string;
    companyName: string;
    firmName: string | null;
  }>>({
    queryKey: ['/api/firm-invitations'],
  });

  const inviteFirm = useMutation({
    mutationFn: async (data: { firmEmail: string; billingType: string }) => {
      return apiRequest('/api/firm-invitations', 'POST', data);
    },
    onSuccess: () => {
      toast({
        title: "Invitation sent",
        description: "The accounting firm has been invited to access your books.",
      });
      setFirmInviteEmail("");
      queryClient.invalidateQueries({ queryKey: ['/api/firm-invitations'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to send invitation",
        variant: "destructive",
      });
    },
  });

  const cancelInvitation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/firm-invitations/${id}`, 'DELETE');
    },
    onSuccess: () => {
      toast({
        title: "Invitation cancelled",
        description: "The invitation has been cancelled.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/firm-invitations'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to cancel invitation",
        variant: "destructive",
      });
    },
  });

  const disconnectFirm = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/company/connected-firm', 'DELETE');
    },
    onSuccess: () => {
      toast({
        title: "Firm disconnected",
        description: "The accounting firm no longer has access to your books.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/company/connected-firm'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to disconnect firm",
        variant: "destructive",
      });
    },
  });

  if (connectedFirmQuery.isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const pendingInvitations = firmInvitationsQuery.data?.filter(inv => inv.status === 'pending') || [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Accountant Access</h2>
        <p className="text-sm text-slate-500 mt-1">Grant an accounting firm access to manage your books</p>
      </div>

      {/* Connected Firm Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Connected Accounting Firm
          </CardTitle>
          <CardDescription>
            Your accounting firm can view and manage your books
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {connectedFirmQuery.data?.firm ? (
            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-green-900">{connectedFirmQuery.data.firm.name}</p>
                  <p className="text-sm text-green-700">{connectedFirmQuery.data.firm.email}</p>
                  {connectedFirmQuery.data.firm.phone && (
                    <p className="text-sm text-green-700">{connectedFirmQuery.data.firm.phone}</p>
                  )}
                  <p className="text-xs text-green-600 mt-1">
                    Billing: {connectedFirmQuery.data.access?.billingType === 'firm_pays' ? 'Firm pays' : 'You pay'}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => {
                    if (confirm('Are you sure you want to disconnect this accounting firm? They will lose access to your books.')) {
                      disconnectFirm.mutate();
                    }
                  }}
                  disabled={disconnectFirm.isPending}
                >
                  {disconnectFirm.isPending ? 'Disconnecting...' : 'Disconnect'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <AlertCircle className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900">No accounting firm connected</p>
                  <p className="text-sm text-gray-600">
                    Invite an accounting firm to help manage your books
                  </p>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Invite an Accounting Firm</h4>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="firm-email">Firm Email Address</Label>
                    <Input
                      id="firm-email"
                      type="email"
                      placeholder="accountant@firm.com"
                      value={firmInviteEmail}
                      onChange={(e) => setFirmInviteEmail(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter the email address of the accounting firm you want to invite
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Billing Arrangement</Label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="billingType"
                          checked={firmInviteBillingType === 'client_pays'}
                          onChange={() => setFirmInviteBillingType('client_pays')}
                          className="text-primary"
                        />
                        <span className="text-sm">I pay for subscription</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="billingType"
                          checked={firmInviteBillingType === 'firm_pays'}
                          onChange={() => setFirmInviteBillingType('firm_pays')}
                          className="text-primary"
                        />
                        <span className="text-sm">Firm pays for subscription</span>
                      </label>
                    </div>
                  </div>

                  <Button
                    onClick={() => {
                      if (firmInviteEmail) {
                        inviteFirm.mutate({
                          firmEmail: firmInviteEmail,
                          billingType: firmInviteBillingType,
                        });
                      }
                    }}
                    disabled={!firmInviteEmail || inviteFirm.isPending}
                    className="w-full"
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    {inviteFirm.isPending ? 'Sending Invitation...' : 'Send Invitation'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Invitations Section */}
      {pendingInvitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Pending Invitations
            </CardTitle>
            <CardDescription>
              Invitations waiting for firm response
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingInvitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-amber-900">
                      {invitation.firmName || invitation.firmEmail}
                    </p>
                    <p className="text-xs text-amber-700">
                      Sent {new Date(invitation.createdAt).toLocaleDateString()} • Expires {new Date(invitation.expiresAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-amber-700 hover:text-red-600 hover:bg-red-50"
                    onClick={() => cancelInvitation.mutate(invitation.id)}
                    disabled={cancelInvitation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Info className="h-4 w-4" />
            About Accounting Firm Access
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Your accounting firm gets full access to view and manage your books</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>They can create and edit transactions, run reports, and reconcile accounts</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>You can disconnect them at any time from this settings page</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>All actions are logged for accountability</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
