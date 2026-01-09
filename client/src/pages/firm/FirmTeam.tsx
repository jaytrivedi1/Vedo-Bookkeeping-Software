import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  UserPlus,
  Mail,
  Shield,
  CheckCircle,
} from "lucide-react";

interface FirmUser {
  id: number;
  username: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
}

interface FirmData {
  id: number;
  name: string;
  email: string | null;
}

export default function FirmTeam() {
  const { user } = useAuth();

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

  // For now, team members list only shows the current user
  // In a full implementation, this would fetch all users associated with the firm
  const teamMembers: FirmUser[] = user ? [
    {
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isActive: user.isActive,
      createdAt: new Date().toISOString(), // Placeholder
    }
  ] : [];

  const isLoading = firmLoading;

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Team</h1>
          <p className="text-slate-500 mt-1">
            Manage your accounting firm's team members
          </p>
        </div>
        <Button disabled>
          <UserPlus className="mr-2 h-4 w-4" />
          Invite Team Member
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Total Members
            </CardTitle>
            <Users className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teamMembers.length}</div>
            <p className="text-xs text-slate-500 mt-1">
              Active team members
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Pending Invites
            </CardTitle>
            <Mail className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-slate-500 mt-1">
              Awaiting response
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Firm Admins
            </CardTitle>
            <Shield className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1</div>
            <p className="text-xs text-slate-500 mt-1">
              With admin access
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Team Members List */}
      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>
            People who have access to manage client accounts
          </CardDescription>
        </CardHeader>
        <CardContent>
          {teamMembers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">
                No team members yet
              </h3>
              <p className="text-slate-500 max-w-sm mx-auto mb-4">
                Invite team members to help manage your clients' books.
              </p>
              <Button disabled>
                <UserPlus className="mr-2 h-4 w-4" />
                Invite First Member
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {teamMembers.map(member => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-semibold text-lg">
                      {member.firstName?.[0] || member.email?.[0]?.toUpperCase() || "U"}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">
                        {member.firstName && member.lastName
                          ? `${member.firstName} ${member.lastName}`
                          : member.email || member.username}
                      </p>
                      {member.email && (
                        <p className="text-sm text-slate-500">{member.email}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                      <Shield className="w-3 h-3 mr-1" />
                      Admin
                    </Badge>
                    <Badge variant="secondary" className="bg-green-100 text-green-700">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Active
                    </Badge>
                    {member.id === user?.id && (
                      <Badge variant="outline">You</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Coming Soon Notice */}
      <Card className="border-dashed border-2 border-slate-200 bg-slate-50/50">
        <CardContent className="py-8 text-center">
          <Users className="h-10 w-10 text-slate-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-slate-700 mb-2">
            Team Features Coming Soon
          </h3>
          <p className="text-slate-500 max-w-md mx-auto">
            Soon you'll be able to invite team members, assign roles, and manage
            access levels for different clients. Stay tuned!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
