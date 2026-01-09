import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Building2,
  Search,
  ArrowRight,
  CheckCircle,
  Clock,
  XCircle,
  DollarSign,
  CreditCard,
  CalendarDays,
} from "lucide-react";

interface ClientAccess {
  id: number;
  firmId: number;
  companyId: number;
  isActive: boolean;
  isOwnCompany: boolean;
  billingType: string;
  createdAt: string;
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

export default function FirmClients() {
  const { user, switchCompany } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [switchingTo, setSwitchingTo] = useState<number | null>(null);

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

  // Fetch pending invitations
  const { data: pendingInvitations = [], isLoading: invitationsLoading } = useQuery<PendingInvitation[]>({
    queryKey: ["/api/firm-invitations", "pending"],
    queryFn: async () => {
      const res = await fetch(`/api/firm-invitations?status=pending`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch invitations");
      return res.json();
    },
    enabled: !!user?.firmId,
  });

  // Separate own company from client companies
  const clientCompanies = clientAccess.filter(c => !c.isOwnCompany && c.isActive);

  // Filter clients based on search
  const filteredClients = clientCompanies.filter(client =>
    client.company.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  const getBillingBadge = (billingType: string) => {
    if (billingType === 'firm_pays') {
      return (
        <Badge variant="outline" className="border-purple-200 text-purple-700 bg-purple-50">
          <DollarSign className="w-3 h-3 mr-1" />
          Firm Pays
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="border-slate-200 text-slate-600 bg-slate-50">
        <CreditCard className="w-3 h-3 mr-1" />
        Client Pays
      </Badge>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Clients</h1>
        <p className="text-slate-500 mt-1">
          Manage client companies and invitations
        </p>
      </div>

      {/* Pending Invitations */}
      {!invitationsLoading && pendingInvitations.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Pending Invitations ({pendingInvitations.length})</CardTitle>
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
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-amber-100 rounded-lg">
                      <Building2 className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{invitation.companyName}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <CalendarDays className="w-3 h-3 text-slate-400" />
                        <p className="text-sm text-slate-500">
                          Invited {new Date(invitation.createdAt).toLocaleDateString()}
                        </p>
                        <span className="text-slate-300">•</span>
                        <p className="text-sm text-slate-500">
                          Expires {new Date(invitation.expiresAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {getBillingBadge(invitation.billingType)}
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
                </div>
              ))}
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
                {clientCompanies.length} active client{clientCompanies.length !== 1 ? 's' : ''}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          {clientCompanies.length > 0 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search clients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          )}

          {/* Client List */}
          {clientsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              {clientCompanies.length === 0 ? (
                <>
                  <h3 className="text-lg font-medium text-slate-900 mb-2">
                    No client companies yet
                  </h3>
                  <p className="text-slate-500 max-w-sm mx-auto">
                    When your clients invite you to access their books, they'll appear here.
                  </p>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-medium text-slate-900 mb-2">
                    No matching clients
                  </h3>
                  <p className="text-slate-500 max-w-sm mx-auto">
                    Try adjusting your search term.
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredClients.map(client => (
                <div
                  key={client.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-slate-100 rounded-lg">
                      <Building2 className="h-6 w-6 text-slate-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{client.company.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <CalendarDays className="w-3 h-3 text-slate-400" />
                        <p className="text-sm text-slate-500">
                          Connected {new Date(client.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {getBillingBadge(client.billingType)}
                    <Badge variant="secondary" className="bg-green-100 text-green-700">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Active
                    </Badge>
                    <Button
                      variant="outline"
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
                          View Books
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
