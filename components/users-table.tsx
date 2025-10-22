"use client";
import * as React from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { Switch } from "@/components/ui/switch";
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  Mail,
  User,
  GripVertical,
  Edit,
  Trash,
  Loader2,
  Plus,
  Shield,
} from "lucide-react";
import useDashboardStore from "@/stores/useAdminStats";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "./ui/input";
import { toast } from "sonner";
import {
  updateUser,
  deleteUser,
  addUser,
  CreateUserPayload,
} from "@/services/userServices";
import { usePermissions } from "@/hooks/usePermissions";

type User = {
  id: string;
  name: string;
  surname: string;
  email: string;
  avatar?: string;
  role: string;
  company_code?: string;
  telegram_id?: string;
  default_salary?: number;
  is_active: boolean;
};

export function UsersTable() {
  const users = useDashboardStore((s) => s.users);
  const loading = useDashboardStore((s) => s.loading);
  const error = useDashboardStore((s) => s.error);
  const [isSaving, setIsSaving] = React.useState(false);
  const [loadingDelete, setLoadingDelete] = React.useState(false);
  const fetchDashboard = useDashboardStore((s) => s.fetchDashboard);
  const updateUserInStore = useDashboardStore((s) => s.updateUserInStore);

  const [selectedUser, setSelectedUser] = React.useState<User | null>(null);
  const [open, setOpen] = React.useState(false);
  const [dialogMode, setDialogMode] = React.useState<
    "edit" | "delete" | "add" | "permissions"
  >("edit");

  // Permissions state
  const [permissionsData, setPermissionsData] = React.useState<{
    [key: string]: boolean;
  }>({});
  const {
    data: permissions,
    isLoading: permissionsLoading,
    error: permissionsError,
    updatePermissions,
    isUpdating,
  } = usePermissions(selectedUser?.id ?? "");

   React.useEffect(() => {
    if (permissions) {
      // Check if permissions is an object with a permissions property
      if (typeof permissions === 'object' && 'permissions' in permissions) {
        setPermissionsData(permissions.permissions as { [key: string]: boolean });
      } 
      // Check if permissions is an array
      else if (Array.isArray(permissions)) {
        const perms = permissions.reduce((acc, p) => {
          acc[p.name] = p.granted;
          return acc;
        }, {} as { [key: string]: boolean });
        setPermissionsData(perms);
      }
      // Check if permissions is already a flat object
      else if (typeof permissions === 'object') {
        setPermissionsData(permissions as { [key: string]: boolean });
      }
    }
  }, [permissions]);    

  const getInitials = (name: string, surname: string) => {
    return `${name?.charAt(0) || ""}${surname?.charAt(0) || ""}`.toUpperCase();
  };

  const handleAddUser = () => {
    setSelectedUser(null);
    setDialogMode("add");
    setOpen(true);
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setDialogMode("edit");
    setOpen(true);
  };

  const handleDeleteUser = (user: User) => {
    setSelectedUser(user);
    setDialogMode("delete");
    setOpen(true);
  };

  const handleManagePermissions = (user: User) => {
    setSelectedUser(user);
    setDialogMode("permissions");
    setOpen(true);
  };

  const handlePermissionToggle = (permissionKey: string) => {
    setPermissionsData((prev) => ({
      ...prev,
      [permissionKey]: !prev[permissionKey]
    }));
  };
  
  const handleSavePermissions = async () => {
    try {
      await updatePermissions(permissionsData);
      toast.success("Permissions updated successfully");
      setOpen(false);
    } catch (err) {
      let message = "Failed to update permissions";
      if (err instanceof Error) {
        message = err.message;
      } else if (
        err &&
        typeof err === "object" &&
        "response" in err &&
        err.response &&
        typeof err.response === "object" &&
        "data" in err.response &&
        err.response.data &&
        typeof err.response.data === "object"
      ) {
        const data = err.response.data as { message?: string };
        message = data.message || message;
      }
      toast.error(message);
    }
  };

  const handleSavePermissions = async () => {
    const permissionsToUpdate = Object.entries(permissionsData).map(
      ([name, granted]) => ({ name, granted })
    );
    try {
      await updatePermissions(permissionsToUpdate as any);
      toast.success("Permissions updated successfully");
      setOpen(false);
    } catch (err) {
      let message = "Failed to update permissions";
      if (err instanceof Error) {
        message = err.message;
      } else if (
        err &&
        typeof err === "object" &&
        "response" in err &&
        err.response &&
        typeof err.response === "object" &&
        "data" in err.response &&
        err.response.data &&
        typeof err.response.data === "object"
      ) {
        const data = err.response.data as { message?: string };
        message = data.message || message;
      }
      toast.error(message);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedUser) return;

    setLoadingDelete(true);
    try {
      await deleteUser(selectedUser.id);
      toast.success("User deleted successfully");
      await fetchDashboard(true); // Sync UI with server
      setOpen(false);
      setSelectedUser(null);
    } catch (err) {
      let message = "Failed to delete user. Try again.";
      if (err instanceof Error) {
        message = err.message;
      } else if (
        err &&
        typeof err === "object" &&
        "response" in err &&
        err.response &&
        typeof err.response === "object" &&
        "data" in err.response &&
        err.response.data &&
        typeof err.response.data === "object"
      ) {
        const data = err.response.data as { message?: string };
        message = data.message || message;
      }
      toast.error(message);
    } finally {
      setLoadingDelete(false);
    }
  };

  const handleAddUserSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSaving) return;

    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const payload: CreateUserPayload = {
      email: (formData.get("email") as string) || "",
      name: (formData.get("name") as string) || "",
      surname: (formData.get("surname") as string) || "",
      role: (formData.get("role") as string) || "",
      company_code: (formData.get("company_code") as string) || undefined,
      telegram_id: (formData.get("telegram_id") as string) || undefined,
      default_salary: formData.get("default_salary")
        ? Number(formData.get("default_salary"))
        : undefined,
      is_active: formData.get("is_active") === "true",
    };

    try {
      setIsSaving(true);
      await addUser(payload);
      toast.success("User added successfully");
      await fetchDashboard(true); // Refresh data from server
      setOpen(false);
    } catch (err) {
      let message = "Failed to add user. Try again.";
      if (err instanceof Error) {
        message = err.message;
      } else if (
        err &&
        typeof err === "object" &&
        "response" in err &&
        err.response &&
        typeof err.response === "object" &&
        "data" in err.response &&
        err.response.data &&
        typeof err.response.data === "object"
      ) {
        const data = err.response.data as { message?: string };
        message = data.message || message;
      }
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-4 my-6">
        <div className="border border-border rounded-md overflow-x-auto bg-card">
          <div className="flex items-center justify-center p-12">
            <div className="text-center space-y-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-sm text-muted-foreground">Loading users...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-4 my-6">
        <div className="border border-border rounded-md overflow-x-auto bg-card">
          <div className="flex items-center justify-center p-12">
            <div className="text-center space-y-3">
              <div className="text-destructive font-medium">
                Error loading users
              </div>
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchDashboard()}
              >
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-4 my-6">
      <Toaster richColors position="top-right" />

      {/* Add User Button */}
      <div className="mb-4 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-foreground">
            Users Management
          </h2>
          <p className="text-sm text-muted-foreground">
            Manage users, roles, and permissions
          </p>
        </div>
        <Button onClick={handleAddUser} className="flex items-center gap-2">
          <Plus size={16} />
          Add User
        </Button>
      </div>

      <div className="border border-border rounded-md overflow-x-auto bg-card">
        <Table className="min-w-full border border-border border-collapse">
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50 border-b border-border">
              <TableHead className="px-4 py-2 text-left text-sm font-semibold text-muted-foreground whitespace-nowrap border border-border w-8" />
              <TableHead className="px-4 py-2 text-left text-sm font-semibold text-muted-foreground whitespace-nowrap border border-border">
                User
              </TableHead>
              <TableHead className="px-4 py-2 text-left text-sm font-semibold text-muted-foreground whitespace-nowrap border border-border">
                Email
              </TableHead>
              <TableHead className="px-4 py-2 text-left text-sm font-semibold text-muted-foreground whitespace-nowrap border border-border">
                Role
              </TableHead>
              <TableHead className="px-4 py-2 text-left text-sm font-semibold text-muted-foreground whitespace-nowrap border border-border">
                Company
              </TableHead>
              <TableHead className="px-4 py-2 text-left text-sm font-semibold text-muted-foreground whitespace-nowrap border border-border">
                Telegram
              </TableHead>
              <TableHead className="px-4 py-2 text-left text-sm font-semibold text-muted-foreground whitespace-nowrap border border-border">
                Salary
              </TableHead>
              <TableHead className="px-4 py-2 text-left text-sm font-semibold text-muted-foreground whitespace-nowrap border border-border">
                Status
              </TableHead>
              <TableHead className="px-4 py-2 text-left text-sm font-semibold text-muted-foreground whitespace-nowrap border border-border w-24">
                Message
              </TableHead>
              <TableHead className="px-4 py-2 text-center text-sm font-semibold text-muted-foreground whitespace-nowrap border border-border w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!users || users.length === 0 ? (
              <TableRow className="hover:bg-muted/50 border border-border">
                <TableCell
                  colSpan={10}
                  className="text-center py-6 text-muted-foreground border border-border"
                >
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              users.map((user, idx: number) => (
                <TableRow
                  key={user.id || idx}
                  className="hover:bg-muted/50 border border-border text-foreground"
                >
                  <TableCell className="w-8 text-muted-foreground border border-border cursor-grab">
                    <GripVertical size={16} />
                  </TableCell>
                  <TableCell className="border border-border">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatar} />
                        <AvatarFallback className="text-xs font-semibold">
                          {getInitials(user.name, user.surname)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-foreground">
                          {user.name} {user.surname}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="border border-border text-muted-foreground">
                    <span className="font-mono text-sm">{user.email}</span>
                  </TableCell>
                  <TableCell className="border border-border">
                    <span
                      className={`inline-block px-2 py-1 rounded-sm text-xs font-medium ${
                        user.role === "CEO"
                          ? "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400"
                          : user.role === "Financial Director"
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400"
                          : "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400"
                      }`}
                    >
                      {user.role}
                    </span>
                  </TableCell>
                  <TableCell className="border border-border text-sm">
                    {user.company_code}
                  </TableCell>
                  <TableCell className="border border-border text-sm text-blue-600 dark:text-blue-400">
                    @{user.telegram_id}
                  </TableCell>
                  <TableCell className="border border-border font-medium text-green-600 dark:text-green-400">
                    ${user.default_salary?.toLocaleString() || "0"}
                  </TableCell>
                  <TableCell className="border border-border">
                    <span
                      className={`inline-block px-2 py-1 rounded-sm text-xs font-medium ${
                        user.is_active
                          ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                          : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
                      }`}
                    >
                      {user.is_active ? "Active" : "Inactive"}
                    </span>
                  </TableCell>
                  <TableCell className="border border-border">
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label="Send Message"
                      className="h-8 w-8 p-0 hover:bg-muted"
                    >
                      <Mail size={14} />
                    </Button>
                  </TableCell>
                  <TableCell className="border border-border text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label="More options"
                          className="h-8 w-8 p-0 hover:bg-muted"
                        >
                          <MoreHorizontal size={14} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel className="text-xs font-semibold">
                          Actions
                        </DropdownMenuLabel>
                        <DropdownMenuItem
                          className="cursor-pointer text-sm"
                          onClick={() => handleEditUser(user)}
                        >
                          <Edit size={14} className="mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer text-sm">
                          <User size={14} className="mr-2" />
                          View Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="cursor-pointer text-sm"
                          onClick={() => handleManagePermissions(user)}
                        >
                          <Shield size={14} className="mr-2" />
                          Manage Permissions
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="cursor-pointer text-sm text-destructive hover:text-destructive"
                          onClick={() => handleDeleteUser(user)}
                        >
                          <Trash size={14} className="mr-2" />
                          Delete
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

      {/* Unified Dialog for Add, Edit, Delete, and Permissions */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          {dialogMode === "add" && (
            <>
              <DialogHeader>
                <DialogTitle>Add New User</DialogTitle>
              </DialogHeader>
              <form className="space-y-4" onSubmit={handleAddUserSubmit}>
                <div className="space-y-1">
                  <Label>Email *</Label>
                  <Input name="email" type="email" required />
                </div>
                <div className="space-y-1">
                  <Label>Name *</Label>
                  <Input name="name" required />
                </div>
                <div className="space-y-1">
                  <Label>Surname *</Label>
                  <Input name="surname" required />
                </div>
                <div className="space-y-1">
                  <Label>Password *</Label>
                  <Input name="password" type="password" required />
                </div>
                <div className="space-y-1">
                  <Label>Role *</Label>
                  <select
                    name="role"
                    required
                    className="w-full border border-input rounded-md p-2"
                  >
                    <option value="">Select a role</option>
                    <option value="CEO">CEO</option>
                    <option value="Financial Director">
                      Financial Director
                    </option>
                    <option value="Member">Member</option>
                    <option value="Customer">Customer</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>Company Code</Label>
                  <Input name="company_code" />
                </div>
                <div className="space-y-1">
                  <Label>Telegram ID</Label>
                  <Input name="telegram_id" />
                </div>
                <div className="space-y-1">
                  <Label>Default Salary</Label>
                  <Input
                    name="default_salary"
                    type="number"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Status *</Label>
                  <select
                    name="is_active"
                    defaultValue="true"
                    className="w-full border border-input rounded-md p-2"
                    required
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
                <Button
                  type="submit"
                  className="w-full flex items-center justify-center"
                  disabled={isSaving}
                >
                  {isSaving && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {isSaving ? "Adding..." : "Add User"}
                </Button>
              </form>
            </>
          )}

          {dialogMode === "edit" && selectedUser && (
            <>
              <DialogHeader>
                <DialogTitle>Edit {selectedUser.name}</DialogTitle>
              </DialogHeader>
              <form
                className="space-y-4"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (isSaving) return;
                  const formData = new FormData(
                    e.currentTarget as HTMLFormElement
                  );
                  const payload: Partial<{
                    email: string;
                    name: string;
                    surname: string;
                    password: string;
                    company_code: string;
                    telegram_id: string;
                    default_salary: number;
                    role: string;
                    is_active: boolean;
                  }> = {
                    email: (formData.get("email") as string) || "",
                    name: (formData.get("name") as string) || "",
                    surname: (formData.get("surname") as string) || "",
                    password: (formData.get("password") as string) || undefined,
                    company_code:
                      (formData.get("company_code") as string) || undefined,
                    telegram_id:
                      (formData.get("telegram_id") as string) || undefined,
                    default_salary: formData.get("default_salary")
                      ? Number(formData.get("default_salary"))
                      : undefined,
                    role: (formData.get("role") as string) || "",
                    is_active: formData.get("is_active") === "true",
                  };

                  try {
                    setIsSaving(true);
                    // Optimistic update
                    updateUserInStore(selectedUser.id, payload);
                    await updateUser(selectedUser.id, payload);
                    toast.success("User updated successfully");
                    setOpen(false);
                    setSelectedUser(null);
                  } catch (err) {
                    // Revert on error
                    await fetchDashboard(true);
                    let message = "Failed to update user";
                    if (err instanceof Error) {
                      message = err.message;
                    } else if (
                      err &&
                      typeof err === "object" &&
                      "response" in err &&
                      err.response &&
                      typeof err.response === "object" &&
                      "data" in err.response &&
                      err.response.data &&
                      typeof err.response.data === "object"
                    ) {
                      const data = err.response.data as { message?: string };
                      message = data.message || message;
                    }
                    toast.error(message);
                  } finally {
                    setIsSaving(false);
                  }
                }}
              >
                <div className="space-y-1">
                  <Label>Email</Label>
                  <Input name="email" defaultValue={selectedUser.email} />
                </div>
                <div className="space-y-1">
                  <Label>Name</Label>
                  <Input name="name" defaultValue={selectedUser.name} />
                </div>
                <div className="space-y-1">
                  <Label>Surname</Label>
                  <Input name="surname" defaultValue={selectedUser.surname} />
                </div>
                <div className="space-y-1">
                  <Label>Password</Label>
                  <Input
                    name="password"
                    type="password"
                    placeholder="Enter new password (leave blank to keep current)"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Company Code</Label>
                  <Input
                    name="company_code"
                    defaultValue={selectedUser.company_code}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Telegram ID</Label>
                  <Input
                    name="telegram_id"
                    defaultValue={selectedUser.telegram_id}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Default Salary</Label>
                  <Input
                    name="default_salary"
                    type="number"
                    defaultValue={selectedUser.default_salary}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Role</Label>
                  <select
                    name="role"
                    defaultValue={selectedUser.role}
                    className="w-full border border-input rounded-md p-2"
                  >
                    <option value="">Select a role</option>
                    <option value="CEO">CEO</option>
                    <option value="Financial Director">
                      Financial Director
                    </option>
                    <option value="Member">Member</option>
                    <option value="Customer">Customer</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>Active</Label>
                  <select
                    name="is_active"
                    defaultValue={selectedUser.is_active ? "true" : "false"}
                    className="w-full border border-input rounded-md p-2"
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
                <Button
                  type="submit"
                  className="w-full flex items-center justify-center"
                  disabled={isSaving}
                >
                  {isSaving && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
              </form>
            </>
          )}

          {dialogMode === "delete" && selectedUser && (
            <>
              <DialogHeader>
                <DialogTitle>Delete {selectedUser.name}?</DialogTitle>
              </DialogHeader>
              <p>
                Are you sure you want to delete{" "}
                <strong>
                  {selectedUser.name} {selectedUser.surname}
                </strong>
                ? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={loadingDelete}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleConfirmDelete}
                  disabled={loadingDelete}
                >
                  {loadingDelete ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    "Delete"
                  )}
                </Button>
              </div>
            </>
          )}

          {dialogMode === "permissions" && selectedUser && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Shield size={18} />
                  Manage Permissions - {selectedUser.name}{" "}
                  {selectedUser.surname}
                </DialogTitle>
              </DialogHeader>

              {permissionsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center space-y-3">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    <p className="text-sm text-muted-foreground">
                      Loading permissions...
                    </p>
                  </div>
                </div>
              ) : permissionsError ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center space-y-3">
                    <div className="text-destructive font-medium">
                      Error loading permissions
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {permissionsError.message || "Failed to load permissions"}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    Configure user permissions and access levels
                  </div>

                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {permissionsData &&
                    Object.keys(permissionsData).length > 0 ? (
                      Object.entries(permissionsData).map(([key, value]) => (
                        <div
                          key={key}
                          className="flex items-center justify-between py-2 px-3 border border-border rounded-md bg-muted/25"
                        >
                          <div className="flex-1">
                            <Label
                              htmlFor={`permission-${key}`}
                              className="text-sm font-medium cursor-pointer capitalize"
                            >
                              {key.replace(/_/g, " ")}
                            </Label>
                          </div>
                          <Switch
                            id={`permission-${key}`}
                            checked={value}
                            onCheckedChange={() => handlePermissionToggle(key)}
                            disabled={isUpdating}
                          />
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-6 text-muted-foreground">
                        No permissions found for this user.
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button
                      variant="outline"
                      onClick={() => setOpen(false)}
                      disabled={isUpdating}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSavePermissions}
                      disabled={
                        isUpdating || !Object.keys(permissionsData).length
                      }
                      className="flex items-center gap-2"
                    >
                      {isUpdating && (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      )}
                      {isUpdating ? "Updating..." : "Save Permissions"}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
