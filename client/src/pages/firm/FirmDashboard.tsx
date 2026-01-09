import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Building2,
  Users,
  BookOpen,
  ArrowRight,
  CheckCircle,
  Clock,
  XCircle,
} from "lucide-react";

interface FirmData {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  isActive: boolean;
}

interface ClientAccess {
  id: number;
  firmId: number;
  companyId: number;
  isActive: boolean;
  isOwnCompany: boolean;
  billingType: string;
  company: {
    id: number;
    name: string;
  };
}

interface PendingInvitation {
  id: number;
  companyId: number;
  companyName: string;
  firmEmail: string;
  token: string;
  status: string;
  billingType: string;
  createdAt: string;
  expiresAt: string;
}

export default function FirmDashboard() {
  const { user, switchCompany } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [switchingTo, setSwitchingTo] = useState<number | null>(null);

  // Fetch firm details
  const { data: firm, isLoading: firmLoading } = useQuery<FirmData>({
    queryKey: ["/api/firms", user?.firmId],
    queryFn: async () => {
      const res = await fetch(`/api/firms/${user?.firmId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch firm");
      return res.json();
    },
    enabled: !!user?.firmId,
  });

  // Fetch client access list
  const { data: clientAccess = [], isLoading: clientsLoading } = useQuery<ClientAccess[]>({
    queryKey: ["/api/firms", user?.firmId, "clients"],
    queryFn: async () => {
      const res = await fetch(`/api/firms/${user?.firmId}/clients`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch clients");
      return res.json();
    },
    enabled: !!user?.firmId,
  });

  // Separate own company from client companies
  const ownCompany = clientAccess.find(c => c.isOwnCompany);
  const clientCompanies = clientAccess.filter(c => !c.isOwnCompany && c.isActive);

  // Fetch pending invitations from companies
  const { data: pendingInvitations = [], isLoading: invitationsLoading } = useQuery<PendingInvitation[]>({
    queryKey: ["/api/firm-invitations", "pending"],
    queryFn: async () => {
      const res = await fetch(`/api/firm-invitations?status=pending`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch invitations");
      return res.json();
    },
    enabled: !!user?.firmId,
  });

  // Accept invitation mutation
  const acceptInvitation = useMutation({
    mutationFn: async (token: string) => {
      return apiRequest(`/api/firm-invitations/${token}/respond`, 'POST', { action: 'accept' });
    },
    onSuccess: () => {
      toast({
        title: "Invitation accepted",
        description: "You now have access to the company's books.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/firm-invitations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/firms", user?.firmId, "clients"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to accept invitation",
        variant: "destructive",
      });
    },
  });

  // Decline invitation mutation
  const declineInvitation = useMutation({
    mutationFn: async (token: string) => {
      return apiRequest(`/api/firm-invitations/${token}/respond`, 'POST', { action: 'decline' });
    },
    onSuccess: () => {
      toast({
        title: "Invitation declined",
        description: "The invitation has been declined.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/firm-invitations"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to decline invitation",
        variant: "destructive",
      });
    },
  });

  const handleViewCompany = async (companyId: number) => {
    try {
      setSwitchingTo(companyId);
      await switchCompany(companyId);
      // Navigate to the main dashboard which will now show the company's data
      setLocation(`/`);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Failed to switch company",
        variant: "destructive",
      });
    } finally {
      setSwitchingTo(null);
    }
  };

  if (firmLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Welcome back, {user?.firstName || "there"}!
          </h1>
          <p className="text-slate-500 mt-1">
            {firm?.name} Dashboard
          </p>
        </div>
        <Button variant="outline" onClick={() => setLocation("/firm/settings")}>
          Firm Settings
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Total Clients
            </CardTitle>
            <Building2 className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clientCompanies.length}</div>
            <p className="text-xs text-slate-500 mt-1">
              Active client companies
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Pending Invitations
            </CardTitle>
            <Clock className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingInvitations.length}</div>
            <p className="text-xs text-slate-500 mt-1">
              Awaiting your response
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Team Members
            </CardTitle>
            <Users className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1</div>
            <p className="text-xs text-slate-500 mt-1">
              Active accountants
            </p>
          </CardContent>
        </Card>
      </div>

      {/* My Firm Books */}
      {ownCompany && (
        <Card className="border-2 border-sky-100 bg-sky-50/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-sky-100 rounded-lg">
                  <BookOpen className="h-5 w-5 text-sky-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">My Firm Books</CardTitle>
                  <CardDescription>
                    Your firm's own bookkeeping (Free)
                  </CardDescription>
                </div>
              </div>
              <Badge variant="secondary" className="bg-sky-100 text-sky-700">
                Free
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-900">{ownCompany.company.name}</p>
                <p className="text-sm text-slate-500">Manage your firm's finances</p>
              </div>
              <Button
                onClick={() => handleViewCompany(ownCompany.companyId)}
                disabled={switchingTo !== null}
              >
                {switchingTo === ownCompany.companyId ? (
                  <>
                    <span className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    Opening...
                  </>
                ) : (
                  <>
                    Open Books
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Client Companies */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Client Companies</CardTitle>
              <CardDescription>
                Companies you have access to manage
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {clientsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : clientCompanies.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">
                No client companies yet
              </h3>
              <p className="text-slate-500 max-w-sm mx-auto">
                When your clients invite you to access their books, they'll appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {clientCompanies.map(client => (
                <div
                  key={client.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100 rounded-lg">
                      <Building2 className="h-5 w-5 text-slate-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{client.company.name}</p>
                      <p className="text-sm text-slate-500">
                        {client.billingType === 'firm_pays' ? 'Firm pays' : 'Client pays'}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewCompany(client.companyId)}
                    disabled={switchingTo !== null}
                  >
                    {switchingTo === client.companyId ? (
                      <>
                        <span className="animate-spin mr-2 h-4 w-4 border-2 border-slate-600 border-t-transparent rounded-full" />
                        Opening...
                      </>
                    ) : (
                      <>
                        View
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      {pendingInvitations.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <CardTitle>Pending Invitations</CardTitle>
                <CardDescription>
                  Companies waiting for you to accept access
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingInvitations.map(invitation => (
                <div
                  key={invitation.id}
                  className="flex items-center justify-between p-4 bg-white border rounded-lg"
                >
                  <div>
                    <p className="font-medium text-slate-900">{invitation.companyName}</p>
                    <p className="text-sm text-slate-500">
                      Invited on {new Date(invitation.createdAt).toLocaleDateString()}
                      {' '}&middot;{' '}
                      {invitation.billingType === 'firm_pays' ? 'Firm pays' : 'Client pays'}
                    </p>
                    <p className="text-xs text-slate-400">
                      Expires {new Date(invitation.expiresAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => declineInvitation.mutate(invitation.token)}
                      disabled={declineInvitation.isPending || acceptInvitation.isPending}
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Decline
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => acceptInvitation.mutate(invitation.token)}
                      disabled={acceptInvitation.isPending || declineInvitation.isPending}
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Accept
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
