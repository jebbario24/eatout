import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import {
  Users,
  Search,
  Filter,
  MoreVertical,
  Ban,
  CheckCircle,
  Mail,
  Shield,
  Trash2,
  Key,
} from "lucide-react";

interface User {
  id: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  lastLogin: string | null;
  merchantName?: string;
  merchantId?: string;
}

export default function AdminUsers() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showSuspendDialog, setShowSuspendDialog] = useState(false);
  const [showActivateDialog, setShowActivateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ['/api/admin/users'],
  });

  const suspendUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest(`/api/admin/users/${userId}/suspend`, 'POST');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({
        title: "User Suspended",
        description: "The user account has been suspended.",
      });
      setShowSuspendDialog(false);
      setSelectedUser(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to suspend user.",
        variant: "destructive",
      });
    },
  });

  const activateUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest(`/api/admin/users/${userId}/activate`, 'POST');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({
        title: "User Activated",
        description: "The user account has been activated.",
      });
      setShowActivateDialog(false);
      setSelectedUser(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to activate user.",
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest(`/api/admin/users/${userId}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({
        title: "User Deleted",
        description: "The user account has been permanently deleted.",
      });
      setShowDeleteDialog(false);
      setSelectedUser(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete user.",
        variant: "destructive",
      });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest(`/api/admin/users/${userId}/reset-password`, 'POST');
    },
    onSuccess: () => {
      toast({
        title: "Password Reset",
        description: "A password reset email has been sent to the user.",
      });
      setShowResetDialog(false);
      setSelectedUser(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send password reset.",
        variant: "destructive",
      });
    },
  });

  const filteredUsers = users.filter((user) => {
    const matchesSearch = 
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.merchantName?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    const matchesStatus = 
      statusFilter === "all" || 
      (statusFilter === "active" && user.isActive) ||
      (statusFilter === "suspended" && !user.isActive);
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const getRoleBadge = (role: string, userId: string) => {
    switch (role) {
      case 'admin':
        return <Badge variant="destructive" data-testid={`badge-role-admin-${userId}`}><Shield className="w-3 h-3 mr-1" />Admin</Badge>;
      case 'owner':
        return <Badge variant="default" data-testid={`badge-role-owner-${userId}`}>Business Owner</Badge>;
      default:
        return <Badge variant="outline" data-testid={`badge-role-${role}-${userId}`}>{role}</Badge>;
    }
  };

  const getStatusBadge = (isActive: boolean, userId: string) => {
    return isActive ? (
      <Badge variant="default" className="bg-green-500" data-testid={`badge-status-active-${userId}`}>
        <CheckCircle className="w-3 h-3 mr-1" />
        Active
      </Badge>
    ) : (
      <Badge variant="destructive" data-testid={`badge-status-suspended-${userId}`}>
        <Ban className="w-3 h-3 mr-1" />
        Suspended
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center py-12 text-muted-foreground">Loading users...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Users className="w-8 h-8" />
          User Management
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage all platform users, accounts, and permissions
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-total-users">
              {users.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Business Owners</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-owners">
              {users.filter(u => u.role === 'owner').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-active">
              {users.filter(u => u.isActive).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="search">
                <Search className="w-4 h-4 inline mr-1" />
                Search
              </Label>
              <Input
                id="search"
                placeholder="Search by email or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="input-search-users"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role-filter">Role</Label>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger id="role-filter" data-testid="select-role-filter">
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="owner">Business Owners</SelectItem>
                  <SelectItem value="admin">Admins</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status-filter">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger id="status-filter" data-testid="select-status-filter">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Users ({filteredUsers.length})</CardTitle>
          <CardDescription>
            All registered users on the platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Merchant</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                  <TableCell className="font-medium" data-testid={`text-email-${user.id}`}>
                    {user.email}
                  </TableCell>
                  <TableCell>{getRoleBadge(user.role, user.id)}</TableCell>
                  <TableCell>{getStatusBadge(user.isActive, user.id)}</TableCell>
                  <TableCell data-testid={`text-merchant-${user.id}`}>
                    {user.merchantName || '-'}
                  </TableCell>
                  <TableCell data-testid={`text-created-${user.id}`}>
                    {new Date(user.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell data-testid={`text-lastlogin-${user.id}`}>
                    {user.lastLogin 
                      ? new Date(user.lastLogin).toLocaleDateString()
                      : 'Never'}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          data-testid={`button-actions-${user.id}`}
                        >
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {user.isActive ? (
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedUser(user);
                              setShowSuspendDialog(true);
                            }}
                            data-testid="action-suspend"
                          >
                            <Ban className="w-4 h-4 mr-2" />
                            Suspend Account
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedUser(user);
                              setShowActivateDialog(true);
                            }}
                            data-testid="action-activate"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Activate Account
                          </DropdownMenuItem>
                        )}

                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedUser(user);
                            setShowResetDialog(true);
                          }}
                          data-testid="action-reset-password"
                        >
                          <Key className="w-4 h-4 mr-2" />
                          Reset Password
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedUser(user);
                            setShowDeleteDialog(true);
                          }}
                          className="text-destructive focus:text-destructive"
                          data-testid="action-delete-user"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete User
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}

              {filteredUsers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    No users found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Suspend User Dialog */}
      <AlertDialog open={showSuspendDialog} onOpenChange={setShowSuspendDialog}>
        <AlertDialogContent data-testid="dialog-suspend-user">
          <AlertDialogHeader>
            <AlertDialogTitle>Suspend User Account?</AlertDialogTitle>
            <AlertDialogDescription>
              This will suspend <strong>{selectedUser?.email}</strong> and prevent them from
              accessing the platform. They will be logged out and unable to sign in until
              their account is reactivated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-suspend">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!selectedUser) return;
                suspendUserMutation.mutate(selectedUser.id);
              }}
              disabled={suspendUserMutation.isPending}
              data-testid="button-confirm-suspend"
            >
              Suspend Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Activate User Dialog */}
      <AlertDialog open={showActivateDialog} onOpenChange={setShowActivateDialog}>
        <AlertDialogContent data-testid="dialog-activate-user">
          <AlertDialogHeader>
            <AlertDialogTitle>Activate User Account?</AlertDialogTitle>
            <AlertDialogDescription>
              This will activate <strong>{selectedUser?.email}</strong> and allow them to
              access the platform again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-activate">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!selectedUser) return;
                activateUserMutation.mutate(selectedUser.id);
              }}
              disabled={activateUserMutation.isPending}
              data-testid="button-confirm-activate"
            >
              Activate Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete User Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent data-testid="dialog-delete-user">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User Account?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="text-destructive font-semibold">Warning: This action cannot be undone!</span>
              <br /><br />
              This will permanently delete <strong>{selectedUser?.email}</strong> and all associated data.
              {selectedUser?.role === 'owner' && selectedUser?.merchantName && (
                <>
                  <br /><br />
                  <span className="font-semibold">Note:</span> This user owns the merchant "{selectedUser.merchantName}".
                  Deleting this user will not delete the merchant. If you want to remove the merchant,
                  use the Merchant Management page.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!selectedUser) return;
                deleteUserMutation.mutate(selectedUser.id);
              }}
              disabled={deleteUserMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-user"
            >
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Password Dialog */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent data-testid="dialog-reset-password">
          <AlertDialogHeader>
            <AlertDialogTitle>Reset User Password?</AlertDialogTitle>
            <AlertDialogDescription>
              This will send a password reset email to <strong>{selectedUser?.email}</strong>.
              They will receive instructions on how to create a new password.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-reset">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!selectedUser) return;
                resetPasswordMutation.mutate(selectedUser.id);
              }}
              disabled={resetPasswordMutation.isPending}
              data-testid="button-confirm-reset"
            >
              Send Reset Email
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
