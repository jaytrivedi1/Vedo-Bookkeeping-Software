import { Link } from "wouter";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, UserPlus, Shield, ExternalLink } from "lucide-react";

export default function UsersSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">User Management</h2>
        <p className="text-sm text-slate-500 mt-1">Manage users, roles, and access permissions for your organization</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Members
          </CardTitle>
          <CardDescription>
            Control who has access to your accounting system and what they can do
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg bg-slate-50">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <UserPlus className="h-5 w-5 text-blue-600" />
                </div>
                <h4 className="font-medium">Invite Users</h4>
              </div>
              <p className="text-sm text-slate-600">
                Add new team members to your organization
              </p>
            </div>

            <div className="p-4 border rounded-lg bg-slate-50">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Shield className="h-5 w-5 text-purple-600" />
                </div>
                <h4 className="font-medium">Manage Roles</h4>
              </div>
              <p className="text-sm text-slate-600">
                Assign roles and permissions to users
              </p>
            </div>

            <div className="p-4 border rounded-lg bg-slate-50">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Users className="h-5 w-5 text-green-600" />
                </div>
                <h4 className="font-medium">View Pending</h4>
              </div>
              <p className="text-sm text-slate-600">
                See pending invitations and their status
              </p>
            </div>
          </div>

          <div className="pt-4 border-t">
            <Link href="/manage-users">
              <Button className="w-full" size="lg">
                <Users className="mr-2 h-5 w-5" />
                Open User Management
                <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <p className="text-xs text-center text-slate-500 mt-3">
              Opens the full user management page with all features
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">About User Roles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-1.5 bg-red-100 rounded">
                <Shield className="h-4 w-4 text-red-600" />
              </div>
              <div>
                <p className="font-medium text-sm">Admin</p>
                <p className="text-xs text-slate-500">Full access to all features, can manage users and settings</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-1.5 bg-blue-100 rounded">
                <Users className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-sm">Staff</p>
                <p className="text-xs text-slate-500">Can create and edit transactions, view reports</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-1.5 bg-slate-100 rounded">
                <Users className="h-4 w-4 text-slate-600" />
              </div>
              <div>
                <p className="font-medium text-sm">Viewer</p>
                <p className="text-xs text-slate-500">Read-only access to view data and reports</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
