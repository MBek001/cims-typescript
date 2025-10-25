"use client"

import * as React from "react"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Toaster } from "@/components/ui/sonner"
import { useState } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
  ChevronRight,
} from "lucide-react"
import useClientStore from "@/stores/useClientStore"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"

import type { Client } from "@/services/clientServices"

// Status options
const STATUS_OPTIONS = [
  { value: "need_to_call", label: "Need to Call" },
  { value: "contacted", label: "Contacted" },
  { value: "project_started", label: "Project Started" },
  { value: "continuing", label: "Continuing" },
  { value: "finished", label: "Finished" },
  { value: "rejected", label: "Rejected" },
] as const

const getStatusLabel = (value?: string): string => {
  return STATUS_OPTIONS.find((s) => s.value === value)?.label || "Unknown"
}

const getStatusVariant = (status?: string) => {
  if (!status) return "outline"
  switch (status) {
    case "contacted":
    case "need_to_call":
      return "default"
    case "project_started":
    case "continuing":
      return "success"
    case "finished":
      return "secondary"
    case "rejected":
      return "destructive"
    default:
      return "outline"
  }
}

// Utility: Get initials from full name
const getInitials = (name: string) => {
  if (!name) return "?"
  return name
    .split(" ")
    .map((n) => n.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

// Format date for display
const formatDate = (dateString?: string) => {
  if (!dateString) return "-"
  try {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  } catch {
    return "-"
  }
}

// Truncate text helper
const truncateText = (text: string, maxLength = 30) => {
  if (!text || text.length <= maxLength) return text
  return text.substring(0, maxLength) + "..."
}

function DesktopTable({
  clients,
  onEdit,
  onDelete,
  onViewNote,
}: {
  clients: Client[]
  onEdit: (client: Client) => void
  onDelete: (client: Client) => void
  onViewNote: (note: string) => void
}) {
  return (
    <div className="hidden md:block border border-border rounded-lg overflow-hidden shadow-sm bg-card">
      <table className="w-full">
        <thead className="bg-muted border-b border-border">
          <tr>
            <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Client</th>
            <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Platform</th>
            <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Status</th>
            <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Assistant</th>
            <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Phone</th>
            <th className="px-6 py-4 text-right text-sm font-semibold text-foreground">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {clients.map((client) => (
            <tr key={client.id} className="hover:bg-muted/50 transition-colors duration-200">
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 ring-2 ring-border">
                    <AvatarImage src="/placeholder.svg" alt={client.full_name} />
                    <AvatarFallback className="text-xs font-semibold bg-muted text-foreground">
                      {getInitials(client.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-sm text-foreground">{client.full_name}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(client.created_at)}</p>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4">
                <Badge variant="secondary" className="text-xs font-medium">
                  {client.platform || "-"}
                </Badge>
              </td>
              <td className="px-6 py-4">
                <Badge variant={getStatusVariant(client.status)} className="text-xs font-medium">
                  {getStatusLabel(client.status)}
                </Badge>
              </td>
              <td className="px-6 py-4 text-sm text-foreground">{client.assistant_name || "-"}</td>
              <td className="px-6 py-4 text-sm text-foreground font-medium">{client.phone_number || "-"}</td>
              <td className="px-6 py-4 text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-muted">
                      <MoreHorizontal size={16} />
                      <span className="sr-only">Open menu</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => onEdit(client)}>
                      <Edit size={14} className="mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => onDelete(client)}
                    >
                      <Trash size={14} className="mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function MobileList({
  clients,
  onSelectClient,
}: {
  clients: Client[]
  onSelectClient: (client: Client) => void
}) {
  return (
    <div className="md:hidden space-y-2">
      {clients.map((client) => (
        <div
          key={client.id}
          onClick={() => onSelectClient(client)}
          className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg hover:bg-muted/50 transition-all duration-200 cursor-pointer active:scale-95"
        >
          <Avatar className="h-12 w-12 flex-shrink-0 ring-2 ring-border">
            <AvatarImage src="/placeholder.svg" alt={client.full_name} />
            <AvatarFallback className="text-sm font-bold bg-muted text-foreground">
              {getInitials(client.full_name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm text-foreground truncate">{client.full_name}</h3>
            <p className="text-xs text-muted-foreground truncate">
              {client.platform} • <span className="font-medium">{getStatusLabel(client.status)}</span>
            </p>
            {client.notes && (
              <p className="text-xs text-muted-foreground truncate mt-1 line-clamp-1">
                {truncateText(client.notes, 50)}
              </p>
            )}
          </div>
          <ChevronRight size={18} className="text-muted-foreground flex-shrink-0" />
        </div>
      ))}
    </div>
  )
}

function MobileDetailSheet({
  client,
  open,
  onOpenChange,
  onEdit,
  onDelete,
  onViewNote,
}: {
  client: Client | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit: (client: Client) => void
  onDelete: (client: Client) => void
  onViewNote: (note: string) => void
}) {
  if (!client) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader className="mb-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 ring-2 ring-border">
              <AvatarImage src="/placeholder.svg" alt={client.full_name} />
              <AvatarFallback className="text-lg font-bold bg-muted text-foreground">
                {getInitials(client.full_name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <SheetTitle className="text-2xl font-bold">{client.full_name}</SheetTitle>
              <p className="text-sm text-muted-foreground mt-1">{formatDate(client.created_at)}</p>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-4 pb-6">
          {/* Status */}
          <div className="bg-muted p-4 rounded-lg border border-border">
            <p className="text-xs text-muted-foreground mb-2 font-semibold uppercase tracking-wide">Status</p>
            <Badge variant={getStatusVariant(client.status)} className="text-sm font-semibold">
              {getStatusLabel(client.status)}
            </Badge>
          </div>

          {/* Phone */}
          {client.phone_number && (
            <div className="bg-muted p-4 rounded-lg border border-border">
              <div className="flex items-center gap-2 mb-2">
                <Phone size={16} className="text-foreground/60" />
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Phone</p>
              </div>
              <p className="text-base font-semibold text-foreground break-all">{client.phone_number}</p>
            </div>
          )}

          {/* Platform */}
          {client.platform && (
            <div className="bg-muted p-4 rounded-lg border border-border">
              <div className="flex items-center gap-2 mb-2">
                <Building size={16} className="text-foreground/60" />
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Platform</p>
              </div>
              <Badge variant="secondary" className="text-sm font-medium">
                {client.platform}
              </Badge>
            </div>
          )}

          {/* Assistant */}
          {client.assistant_name && (
            <div className="bg-muted p-4 rounded-lg border border-border">
              <div className="flex items-center gap-2 mb-2">
                <User size={16} className="text-foreground/60" />
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Assistant</p>
              </div>
              <p className="text-base font-semibold text-foreground">{client.assistant_name}</p>
            </div>
          )}

          {/* Notes */}
          {client.notes && (
            <div className="bg-muted p-4 rounded-lg border border-border">
              <div className="flex items-center gap-2 mb-3">
                <StickyNote size={16} className="text-foreground/60" />
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Notes</p>
              </div>
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{client.notes}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-border">
            <Button
              variant="outline"
              className="flex-1 bg-transparent"
              onClick={() => {
                onEdit(client)
                onOpenChange(false)
              }}
            >
              <Edit size={16} className="mr-2" />
              Edit
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={() => {
                onDelete(client)
                onOpenChange(false)
              }}
            >
              <Trash size={16} className="mr-2" />
              Delete
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

export function ClientsTable() {
  const clients = useClientStore((s) => s.clients)
  const loading = useClientStore((s) => s.loading)
  const error = useClientStore((s) => s.error)
  const fetchClients = useClientStore((s) => s.fetchClients)
  const addClient = useClientStore((s) => s.addClient)
  const updateClient = useClientStore((s) => s.updateClient)
  const deleteClient = useClientStore((s) => s.deleteClient)
  const clearError = useClientStore((s) => s.clearError)
  const [copied, setCopied] = useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  const [loadingDelete, setLoadingDelete] = React.useState(false)
  const [selectedClient, setSelectedClient] = React.useState<Client | null>(null)
  const [open, setOpen] = React.useState(false)
  const [dialogMode, setDialogMode] = React.useState<"add" | "edit" | "delete" | "view-note">("add")
  const [viewingNote, setViewingNote] = React.useState<string>("")
  const [mobileDetailOpen, setMobileDetailOpen] = React.useState(false)

  React.useEffect(() => {
    fetchClients().catch(console.error)
  }, [fetchClients])

  React.useEffect(() => {
    if (open) {
      clearError()
    }
  }, [open, clearError])

  const handleAddClient = () => {
    setSelectedClient(null)
    setDialogMode("add")
    setOpen(true)
  }

  const handleEditClient = (client: Client) => {
    setSelectedClient(client)
    setDialogMode("edit")
    setOpen(true)
  }

  const handleDeleteClient = (client: Client) => {
    setSelectedClient(client)
    setDialogMode("delete")
    setOpen(true)
  }

  const handleViewNote = (note: string) => {
    setViewingNote(note)
    setDialogMode("view-note")
    setOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!selectedClient) return
    setLoadingDelete(true)
    try {
      await deleteClient(selectedClient.id)
      toast.success("Client deleted successfully")
      setOpen(false)
      setSelectedClient(null)
      setMobileDetailOpen(false)
    } catch (err) {
      if (err instanceof Error) {
        toast.error(err.message || "Failed to delete client")
      } else {
        toast.error("An unknown error occurred while deleting client.")
      }
    } finally {
      setLoadingDelete(false)
    }
  }

  const handleAddClientSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (isSaving) return

    const formData = new FormData(e.currentTarget)
    const full_name = formData.get("full_name") as string
    const phone_number = formData.get("phone_number") as string
    const platform = formData.get("platform") as string
    const status = formData.get("status") as string
    const assistant_name = formData.get("assistant_name") as string
    const notes = formData.get("notes") as string

    if (!full_name || !platform) {
      toast.error("Full name and platform are required.")
      return
    }

    setIsSaving(true)
    try {
      const payload: Omit<Client, "id" | "created_at" | "updated_at"> = {
        full_name,
        username: full_name.toLowerCase().replace(/\s+/g, "."),
        phone_number,
        platform,
        status,
        assistant_name,
        notes,
      }

      await addClient(payload)
      toast.success("Client added successfully")
      setOpen(false)
    } catch (err) {
      if (err instanceof Error) {
        toast.error(err.message || "Failed to add client")
      } else {
        toast.error("An unknown error occurred while adding client.")
      }
    } finally {
      setIsSaving(false)
    }
  }

  const handleEditClientSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (isSaving || !selectedClient) return

    const formData = new FormData(e.currentTarget)
    const payload: Partial<Client> = {
      full_name: formData.get("full_name") as string,
      phone_number: formData.get("phone_number") as string,
      platform: formData.get("platform") as string,
      status: formData.get("status") as string,
      assistant_name: formData.get("assistant_name") as string,
      notes: formData.get("notes") as string,
    }

    setIsSaving(true)
    try {
      await updateClient(selectedClient.id, payload)
      toast.success("Client updated successfully")
      setOpen(false)
      setSelectedClient(null)
      setMobileDetailOpen(false)
    } catch (err) {
      if (err instanceof Error) {
        toast.error(err.message || "Failed to update client")
      } else {
        toast.error("An unknown error occurred while updating client.")
      }
    } finally {
      setIsSaving(false)
    }
  }

  const handleDialogClose = (isOpen: boolean) => {
    if (!isOpen && !isSaving && !loadingDelete) {
      setOpen(false)
      setSelectedClient(null)
      clearError()
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="mx-4 my-6">
        <div className="flex items-center justify-center p-12">
          <div className="text-center space-y-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mx-auto"></div>
            <p className="text-sm text-muted-foreground">Loading clients...</p>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="mx-4 my-6">
        <div className="flex items-center justify-center p-12">
          <div className="text-center space-y-3">
            <div className="text-destructive font-medium">Error Loading Clients</div>
            <p className="text-sm text-muted-foreground">{error}</p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" size="sm" onClick={clearError}>
                Dismiss
              </Button>
              <Button variant="outline" size="sm" onClick={() => fetchClients()}>
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-4 my-6">
      <Toaster richColors position="top-right" />

      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Clients</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage your clients ({clients?.length || 0} total)</p>
        </div>
        <Button onClick={handleAddClient} className="flex items-center gap-2 w-full sm:w-auto font-semibold">
          <Plus size={18} />
          Add Client
        </Button>
      </div>

      {!clients || clients.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
          <p className="text-muted-foreground mb-4 text-lg">No clients found</p>
          <Button variant="outline" size="sm" onClick={handleAddClient}>
            Add your first client
          </Button>
        </div>
      ) : (
        <>
          <DesktopTable
            clients={clients}
            onEdit={handleEditClient}
            onDelete={handleDeleteClient}
            onViewNote={handleViewNote}
          />

          <MobileList
            clients={clients}
            onSelectClient={(client) => {
              setSelectedClient(client)
              setMobileDetailOpen(true)
            }}
          />

          <MobileDetailSheet
            client={selectedClient}
            open={mobileDetailOpen}
            onOpenChange={setMobileDetailOpen}
            onEdit={handleEditClient}
            onDelete={handleDeleteClient}
            onViewNote={handleViewNote}
          />
        </>
      )}

      {/* Dialog for Add/Edit/Delete/View Note */}
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
                    <Input id="full_name" name="full_name" placeholder="Enter full name" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone_number">Phone</Label>
                    <Input id="phone_number" name="phone_number" placeholder="Enter phone number" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="platform">Platform</Label>
                    <Input id="platform" name="platform" placeholder="e.g., Instagram, WhatsApp" />
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
                    <Label htmlFor="assistant_name">Assistant</Label>
                    <Input id="assistant_name" name="assistant_name" placeholder="Assigned assistant" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea id="notes" name="notes" rows={3} placeholder="Add notes about the client..." />
                </div>
                {error && <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">{error}</div>}
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
                    <Select name="status" defaultValue={selectedClient.status || ""}>
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
                    <Label htmlFor="assistant_name">Assistant</Label>
                    <Input
                      id="assistant_name"
                      name="assistant_name"
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
                {error && <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">{error}</div>}
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
                  Are you sure you want to delete <span className="font-medium">{selectedClient.full_name}</span>? This
                  action cannot be undone.
                </p>
                {error && <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">{error}</div>}
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
                      await navigator.clipboard.writeText(viewingNote || "")
                      setCopied(true)
                      setTimeout(() => setCopied(false), 2000)
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
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
