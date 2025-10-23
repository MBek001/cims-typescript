"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { useState } from "react";
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
  Edit,
  Trash,
  Loader2,
  Plus,
  Phone,
  Building,
  User,
  StickyNote,
} from "lucide-react";
import useClientStore from "@/stores/useClientStore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Client } from "@/services/clientServices";

// Status options
const STATUS_OPTIONS = [
  { value: "need_to_call", label: "Need to Call" },
  { value: "contacted", label: "Contacted" },
  { value: "project_started", label: "Project Started" },
  { value: "continuing", label: "Continuing" },
  { value: "finished", label: "Finished" },
  { value: "rejected", label: "Rejected" },
] as const;

const getStatusLabel = (value?: string): string => {
  return STATUS_OPTIONS.find((s) => s.value === value)?.label || "Unknown";
};

const getStatusVariant = (status?: string) => {
  if (!status) return "outline";
  switch (status) {
    case "contacted":
    case "need_to_call":
      return "default";
    case "project_started":
    case "continuing":
      return "success";
    case "finished":
      return "secondary";
    case "rejected":
      return "destructive";
    default:
      return "outline";
  }
};



// Utility: Get initials from full name
const getInitials = (name: string) => {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

// Format date for display
const formatDate = (dateString?: string) => {
  if (!dateString) return "-";
  try {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "-";
  }
};

// Truncate text helper
const truncateText = (text: string, maxLength: number = 30) => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
};

export function ClientsTable() {
  const clients = useClientStore((s) => s.clients);
  const loading = useClientStore((s) => s.loading);
  const error = useClientStore((s) => s.error);
  const fetchClients = useClientStore((s) => s.fetchClients);
  const addClient = useClientStore((s) => s.addClient);
  const updateClient = useClientStore((s) => s.updateClient);
  const deleteClient = useClientStore((s) => s.deleteClient);
  const clearError = useClientStore((s) => s.clearError);
const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [loadingDelete, setLoadingDelete] = React.useState(false);
  const [selectedClient, setSelectedClient] = React.useState<Client | null>(
    null
  );
  const [open, setOpen] = React.useState(false);
  const [dialogMode, setDialogMode] = React.useState<"add" | "edit" | "delete" | "view-note">(
    "add"
  );
  const [viewingNote, setViewingNote] = React.useState<string>("");

  React.useEffect(() => {
    fetchClients().catch(console.error);
  }, [fetchClients]);

  React.useEffect(() => {
    if (open) {
      clearError();
    }
  }, [open, clearError]);

  const handleAddClient = () => {
    setSelectedClient(null);
    setDialogMode("add");
    setOpen(true);
  };

  const handleEditClient = (client: Client) => {
    setSelectedClient(client);
    setDialogMode("edit");
    setOpen(true);
  };

  const handleDeleteClient = (client: Client) => {
    setSelectedClient(client);
    setDialogMode("delete");
    setOpen(true);
  };

  const handleViewNote = (note: string) => {
    setViewingNote(note);
    setDialogMode("view-note");
    setOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedClient) return;
    setLoadingDelete(true);
    try {
      await deleteClient(selectedClient.id);
      toast.success("Client deleted successfully");
      setOpen(false);
      setSelectedClient(null);
    } catch (err) {
      if (err instanceof Error) {
        toast.error(err.message || "Failed to delete client");
      } else {
        toast.error("An unknown error occurred while deleting client.");
      }
    } finally {
      setLoadingDelete(false);
    }
  };

  const handleAddClientSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSaving) return;

    const formData = new FormData(e.currentTarget);
    const full_name = formData.get("full_name") as string;
    const phone_number = formData.get("phone_number") as string;
    const platform = formData.get("platform") as string;
    const status = formData.get("status") as string;
    const assistant_name = formData.get("assistant_name") as string;
    const notes = formData.get("notes") as string;

    // Validation
    if (!full_name || !platform) {
      toast.error("Full name and platform are required.");
      return;
    }

    setIsSaving(true);
    try {
      const payload: Omit<Client, "id" | "created_at" | "updated_at"> = {
        full_name,
        username: full_name.toLowerCase().replace(/\s+/g, "."),
        phone_number,
        platform,
        status,
        assistant_name,
        notes,
      };

      await addClient(payload);
      toast.success("Client added successfully");
      setOpen(false);
    } catch (err) {
      if (err instanceof Error) {
        toast.error(err.message || "Failed to add client");
      } else {
        toast.error("An unknown error occurred while adding client.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditClientSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();
    if (isSaving || !selectedClient) return;

    const formData = new FormData(e.currentTarget);
    const payload: Partial<Client> = {
      full_name: formData.get("full_name") as string,
      phone_number: formData.get("phone_number") as string,
      platform: formData.get("platform") as string,
      status: formData.get("status") as string,
      assistant_name: formData.get("assistant_name") as string,
      notes: formData.get("notes") as string,
    };

    setIsSaving(true);
    try {
      await updateClient(selectedClient.id, payload);
      toast.success("Client updated successfully");
      setOpen(false);
      setSelectedClient(null);
    } catch (err) {
      if (err instanceof Error) {
        toast.error(err.message || "Failed to update client");
      } else {
        toast.error("An unknown error occurred while updating client.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDialogClose = (isOpen: boolean) => {
    if (!isOpen && !isSaving && !loadingDelete) {
      setOpen(false);
      setSelectedClient(null);
      clearError();
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="mx-4 my-6">
        <div className="border border-border rounded-md overflow-x-auto bg-card">
          <div className="flex items-center justify-center p-12">
            <div className="text-center space-y-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-sm text-muted-foreground">
                Loading clients...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="mx-4 my-6">
        <div className="border border-border rounded-md overflow-x-auto bg-card">
          <div className="flex items-center justify-center p-12">
            <div className="text-center space-y-3">
              <div className="text-destructive font-medium">
                Error Loading Clients
              </div>
              <p className="text-sm text-muted-foreground">{error}</p>
              <div className="flex gap-2 justify-center">
                <Button variant="outline" size="sm" onClick={clearError}>
                  Dismiss
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchClients()}
                >
                  Try Again
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-4 my-6">
      <Toaster richColors position="top-right" />

      {/* Header */}
      <div className="mb-4 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Clients</h2>
          <p className="text-sm text-muted-foreground">
            Manage your clients ({clients?.length || 0} total)
          </p>
        </div>
        <Button onClick={handleAddClient} className="flex items-center gap-2">
          <Plus size={16} />
          Add Client
        </Button>
      </div>

      {/* Table */}
      <div className="border border-border rounded-md overflow-x-auto bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Platform</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Assistant</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!clients || clients.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center py-8 text-muted-foreground"
                >
                  <div className="flex flex-col items-center space-y-2">
                    <p>No clients found</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAddClient}
                    >
                      Add your first client
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              clients.map((client, index) => (
                <TableRow
                  key={client.id || `client-${index}`}
                  className="hover:bg-muted/50"
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src="" alt={client.full_name} />
                        <AvatarFallback className="text-xs">
                          {getInitials(client.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="font-medium">{client.full_name}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {client.phone_number ? (
                      <div className="flex items-center gap-2">
                        <Phone size={14} className="text-muted-foreground" />
                        <span className="text-sm">{client.phone_number}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {client.platform ? (
                      <div className="flex items-center gap-2">
                        <Building size={14} className="text-muted-foreground" />
                        <Badge variant="secondary" className="text-xs">
                          {client.platform}
                        </Badge>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={getStatusVariant(client.status)}
                      className="text-xs"
                    >
                      {getStatusLabel(client.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {client.assistant_name ? (
                      <div className="flex items-center gap-1">
                        <User size={12} className="text-muted-foreground" />
                        <span className="text-sm">{client.assistant_name}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {client.notes ? (
                      <div 
                        className="flex items-center gap-1 cursor-pointer hover:text-primary transition-colors"
                        onClick={() => handleViewNote(client.notes!)}
                        title="Click to view full note"
                      >
                        <StickyNote
                          size={14}
                          className="text-muted-foreground flex-shrink-0"
                        />
                        <span className="text-sm">{truncateText(client.notes)}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>{formatDate(client.created_at)}</TableCell>
                  <TableCell className="text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                        >
                          <MoreHorizontal size={14} />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem
                          onClick={() => handleEditClient(client)}
                        >
                          <Edit size={14} className="mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => handleDeleteClient(client)}
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

      {/* Dialog */}
      <Dialog open={open} onOpenChange={handleDialogClose}>
        <DialogContent className="max-w-lg">
          {/* Add Client */}
          {dialogMode === "add" && (
            <>
              <DialogHeader>
                <DialogTitle>Add New Client</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddClientSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Full Name *</Label>
                    <Input
                      id="full_name"
                      name="full_name"
                      placeholder="Enter full name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone_number">Phone</Label>
                    <Input
                      id="phone_number"
                      name="phone_number"
                      placeholder="Enter phone number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="platform">Platform</Label>
                    <Input
                      id="platform"
                      name="platform"
                      placeholder="e.g., Instagram, WhatsApp"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select name="status" defaultValue="">
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="assistant">Assistant</Label>
                    <Input
                      id="assistant_name"
                      name="assistant_name"
                      placeholder="Assigned assistant"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    rows={3}
                    placeholder="Add notes about the client..."
                  />
                </div>
                {error && (
                  <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                    {error}
                  </div>
                )}
                <div className="flex gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOpen(false)}
                    disabled={isSaving}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSaving} className="flex-1">
                    {isSaving ? (
                      <>
                        <Loader2 className="animate-spin mr-2 h-4 w-4" />
                        Adding...
                      </>
                    ) : (
                      "Add Client"
                    )}
                  </Button>
                </div>
              </form>
            </>
          )}

          {/* Edit Client */}
          {dialogMode === "edit" && selectedClient && (
            <>
              <DialogHeader>
                <DialogTitle>Edit Client</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleEditClientSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Full Name *</Label>
                    <Input
                      id="full_name"
                      name="full_name"
                      defaultValue={selectedClient.full_name}
                      placeholder="Enter full name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone_number">Phone</Label>
                    <Input
                      id="phone_number"
                      name="phone_number"
                      defaultValue={selectedClient.phone_number || ""}
                      placeholder="Enter phone number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="platform">Platform</Label>
                    <Input
                      id="platform"
                      name="platform"
                      defaultValue={selectedClient.platform || ""}
                      placeholder="e.g., Instagram, WhatsApp"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      name="status"
                      defaultValue={selectedClient.status || ""}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="assistant">Assistant</Label>
                    <Input
                      id="assistant"
                      name="assistant"
                      defaultValue={selectedClient.assistant_name || ""}
                      placeholder="Assigned assistant"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    defaultValue={selectedClient.notes || ""}
                    rows={3}
                    placeholder="Add notes about the client..."
                  />
                </div>
                {error && (
                  <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                    {error}
                  </div>
                )}
                <div className="flex gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOpen(false)}
                    disabled={isSaving}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSaving} className="flex-1">
                    {isSaving ? (
                      <>
                        <Loader2 className="animate-spin mr-2 h-4 w-4" />
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                </div>
              </form>
            </>
          )}

          {/* Delete Confirmation */}
          {dialogMode === "delete" && selectedClient && (
            <>
              <DialogHeader>
                <DialogTitle>Delete Client</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Are you sure you want to delete{" "}
                  <span className="font-medium">
                    {selectedClient.full_name}
                  </span>
                  ? This action cannot be undone.
                </p>
                {error && (
                  <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                    {error}
                  </div>
                )}
                <div className="flex gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOpen(false)}
                    disabled={loadingDelete}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleConfirmDelete}
                    disabled={loadingDelete}
                    className="flex-1"
                  >
                    {loadingDelete ? (
                      <>
                        <Loader2 className="animate-spin mr-2 h-4 w-4" />
                        Deleting...
                      </>
                    ) : (
                      "Delete Client"
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}

          {/* View Note Dialog */}
          {dialogMode === "view-note" && (
            <>
              <DialogHeader>
                <DialogTitle>Client Note</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="bg-muted p-4 rounded-md max-h-96 overflow-y-auto">
                  <p className="text-sm whitespace-pre-wrap">{viewingNote}</p>
                </div>
          
                <div className="flex justify-end gap-2">
                  <Button
                    variant="secondary"
                    onClick={async () => {
                      await navigator.clipboard.writeText(viewingNote || "");
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                  >
                    {copied ? "Copied" : "Copy"}
                  </Button>
          
                  <Button variant="outline" onClick={() => setOpen(false)}>
                    Close
                  </Button>
                </div>
              </div>
            </>
          )

}
        </DialogContent>
      </Dialog>
    </div>
  );
}