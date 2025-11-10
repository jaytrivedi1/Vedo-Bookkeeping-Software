import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Building2, Users, MoreVertical, CheckCircle, XCircle, Search } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface UserCompany {
  id: number;
  userId: number;
  companyId: number;
  role: string;
  createdAt: string;
}

interface AdminUser {
  id: number;
  username: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string;
  companies: UserCompany[];
}

interface AdminCompany {
  id: number;
  name: string;
  taxId: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  website: string | null;
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
  userCount: number;
}

export default function AdminDashboard() {
  const { toast } = useToast();
  const [userSearch, setUserSearch] = useState("");
  const [companySearch, setCompanySearch] = useState("");

  // Fetch all users
  const { data: users = [], isLoading: usersLoading } = useQuery<AdminUser[]>({
    queryKey: ["/api/admin/users"],
  });

  // Fetch all companies
  const { data: companies = [], isLoading: companiesLoading } = useQuery<AdminCompany[]>({
    queryKey: ["/api/admin/companies"],
  });

  // Toggle user status
  const toggleUserStatus = async (userId: number, currentStatus: boolean) => {
    try {
      await apiRequest(`/api/admin/users/${userId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !currentStatus }),
        headers: { "Content-Type": "application/json" },
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      
      toast({
        title: "Success",
        description: `User ${!currentStatus ? "activated" : "deactivated"} successfully`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update user status",
        variant: "destructive",
      });
    }
  };

  // Toggle company status
  const toggleCompanyStatus = async (companyId: number, currentStatus: boolean) => {
    try {
      await apiRequest(`/api/admin/companies/${companyId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !currentStatus }),
        headers: { "Content-Type": "application/json" },
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/admin/companies"] });
      
      toast({
        title: "Success",
        description: `Company ${!currentStatus ? "activated" : "deactivated"} successfully`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update company status",
        variant: "destructive",
      });
    }
  };

  // Filter users based on search
  const filteredUsers = users.filter((user) => {
    const searchLower = userSearch.toLowerCase();
    return (
      user.username.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower) ||
      (user.firstName && user.firstName.toLowerCase().includes(searchLower)) ||
      (user.lastName && user.lastName.toLowerCase().includes(searchLower))
    );
  });

  // Filter companies based on search
  const filteredCompanies = companies.filter((company) => {
    const searchLower = companySearch.toLowerCase();
    return (
      company.name.toLowerCase().includes(searchLower) ||
      (company.taxId && company.taxId.toLowerCase().includes(searchLower)) ||
      (company.email && company.email.toLowerCase().includes(searchLower))
    );
  });

  // Calculate statistics
  const stats = {
    totalUsers: users.length,
    activeUsers: users.filter((u) => u.isActive).length,
    totalCompanies: companies.length,
    activeCompanies: companies.filter((c) => c.isActive).length,
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            System Administration
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage companies and users across the system
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Total Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-500" />
                <span className="text-2xl font-bold">{stats.totalUsers}</span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {stats.activeUsers} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Active Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-2xl font-bold">{stats.activeUsers}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Total Companies
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-purple-500" />
                <span className="text-2xl font-bold">{stats.totalCompanies}</span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {stats.activeCompanies} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Active Companies
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-2xl font-bold">{stats.activeCompanies}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="companies" className="space-y-4">
          <TabsList>
            <TabsTrigger value="companies" data-testid="tab-companies">
              <Building2 className="w-4 h-4 mr-2" />
              Companies
            </TabsTrigger>
            <TabsTrigger value="users" data-testid="tab-users">
              <Users className="w-4 h-4 mr-2" />
              Users
            </TabsTrigger>
          </TabsList>

          {/* Companies Tab */}
          <TabsContent value="companies" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Companies</CardTitle>
                    <CardDescription>
                      Manage all companies in the system
                    </CardDescription>
                  </div>
                  <div className="w-72">
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                      <Input
                        placeholder="Search companies..."
                        value={companySearch}
                        onChange={(e) => setCompanySearch(e.target.value)}
                        className="pl-8"
                        data-testid="input-search-companies"
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {companiesLoading ? (
                  <div className="text-center py-8 text-gray-500">Loading companies...</div>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Company Name</TableHead>
                          <TableHead>Tax ID</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead className="text-center">Users</TableHead>
                          <TableHead className="text-center">Status</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredCompanies.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                              No companies found
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredCompanies.map((company) => (
                            <TableRow key={company.id} data-testid={`row-company-${company.id}`}>
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                  {company.name}
                                  {company.isDefault && (
                                    <Badge variant="secondary" className="text-xs">
                                      Default
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className="font-mono text-sm">
                                  {company.taxId || "-"}
                                </span>
                              </TableCell>
                              <TableCell>{company.email || "-"}</TableCell>
                              <TableCell>{company.phone || "-"}</TableCell>
                              <TableCell className="text-center">
                                <Badge variant="outline">{company.userCount}</Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                {company.isActive ? (
                                  <Badge className="bg-green-500">Active</Badge>
                                ) : (
                                  <Badge variant="destructive">Inactive</Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-sm text-gray-500">
                                {format(new Date(company.createdAt), "MMM d, yyyy")}
                              </TableCell>
                              <TableCell className="text-right">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      data-testid={`button-company-actions-${company.id}`}
                                    >
                                      <MoreVertical className="w-4 h-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                      onClick={() => toggleCompanyStatus(company.id, company.isActive)}
                                      data-testid={`button-toggle-company-${company.id}`}
                                    >
                                      {company.isActive ? (
                                        <>
                                          <XCircle className="w-4 h-4 mr-2" />
                                          Deactivate
                                        </>
                                      ) : (
                                        <>
                                          <CheckCircle className="w-4 h-4 mr-2" />
                                          Activate
                                        </>
                                      )}
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Users</CardTitle>
                    <CardDescription>
                      Manage all users in the system
                    </CardDescription>
                  </div>
                  <div className="w-72">
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                      <Input
                        placeholder="Search users..."
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        className="pl-8"
                        data-testid="input-search-users"
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <div className="text-center py-8 text-gray-500">Loading users...</div>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Username</TableHead>
                          <TableHead>Full Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead className="text-center">Role</TableHead>
                          <TableHead className="text-center">Companies</TableHead>
                          <TableHead className="text-center">Status</TableHead>
                          <TableHead>Last Login</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                              No users found
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredUsers.map((user) => (
                            <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                              <TableCell className="font-medium">{user.username}</TableCell>
                              <TableCell>
                                {user.firstName && user.lastName
                                  ? `${user.firstName} ${user.lastName}`
                                  : "-"}
                              </TableCell>
                              <TableCell>{user.email}</TableCell>
                              <TableCell className="text-center">
                                <Badge
                                  variant={user.role === "admin" ? "default" : "secondary"}
                                >
                                  {user.role}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge variant="outline">{user.companies.length}</Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                {user.isActive ? (
                                  <Badge className="bg-green-500">Active</Badge>
                                ) : (
                                  <Badge variant="destructive">Inactive</Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-sm text-gray-500">
                                {user.lastLogin
                                  ? format(new Date(user.lastLogin), "MMM d, yyyy HH:mm")
                                  : "Never"}
                              </TableCell>
                              <TableCell className="text-sm text-gray-500">
                                {format(new Date(user.createdAt), "MMM d, yyyy")}
                              </TableCell>
                              <TableCell className="text-right">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      data-testid={`button-user-actions-${user.id}`}
                                    >
                                      <MoreVertical className="w-4 h-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                      onClick={() => toggleUserStatus(user.id, user.isActive)}
                                      data-testid={`button-toggle-user-${user.id}`}
                                    >
                                      {user.isActive ? (
                                        <>
                                          <XCircle className="w-4 h-4 mr-2" />
                                          Deactivate
                                        </>
                                      ) : (
                                        <>
                                          <CheckCircle className="w-4 h-4 mr-2" />
                                          Activate
                                        </>
                                      )}
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
