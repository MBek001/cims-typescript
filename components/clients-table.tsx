"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Toaster } from "sonner";
import { useState } from "react";
import { cn } from "@/lib/utils";
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
  Search,
  X,
  Volume2,
  FileAudio,
  Calendar,
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

import type { Client } from "@/services/clientServices";

// Status options
const STATUS_OPTIONS = [
  { value: "need_to_call", label: "Need to Call" },
  { value: "contacted", label: "Contacted" },
  { value: "project_started", label: "Project Started" },
  { value: "continuing", label: "Continuing" },
  { value: "finished", label: "Finished" },
  { value: "rejected", label: "Rejected" },
] as const;

// Language options
const LANGUAGE_OPTIONS = [
  { value: "uz", label: "🇺🇿 Uzbek" },
  { value: "en", label: "🇬🇧 English" },
  { value: "ru", label: "🇷🇺 Russian" },
] as const;

const getStatusLabel = (value?: string): string => {
  return STATUS_OPTIONS.find((s) => s.value === value)?.label || "Unknown";
};

const getStatusVariant = (status?: string) => {
  if (!status) return "outline";
  switch (status) {
    case "need_to_call":
      return "destructive";
    case "contacted":
      return "secondary";
    case "project_started":
      return "default";
    case "continuing":
      return "default";
    case "finished":
      return "secondary";
    case "rejected":
      return "destructive";
    default:
      return "outline";
  }
};

const getStatusColor = (status?: string) => {
  if (!status)
    return "dark:bg-neutral-800 dark:text-neutral-200 bg-neutral-100 text-neutral-800";
  switch (status) {
    case "contacted":
      return "dark:bg-blue-900/50 dark:text-blue-400 dark:border-blue-800 bg-blue-100 text-blue-900 border border-blue-300";
    case "project_started":
      return "dark:bg-yellow-900/50 dark:text-yellow-400 dark:border-yellow-800 bg-yellow-100 text-yellow-900 border border-yellow-300";
    case "continuing":
      return "dark:bg-purple-900/50 dark:text-purple-400 dark:border-purple-800 bg-purple-100 text-purple-900 border border-purple-300";
    case "finished":
      return "dark:bg-green-900/50 dark:text-green-400 dark:border-green-800 bg-green-100 text-green-900 border border-green-300";
    case "rejected":
      return "dark:bg-red-900/50 dark:text-red-400 dark:border-red-800 bg-red-100 text-red-900 border border-red-300";
    case "need_to_call":
      return "dark:bg-orange-900/50 dark:text-orange-400 dark:border-orange-800 bg-orange-100 text-orange-900 border border-orange-300";
    default:
      return "dark:bg-neutral-800 dark:text-neutral-200 bg-neutral-100 text-neutral-800";
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
const truncateText = (text: string, maxLength = 30) => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
};

export function ClientsTable() {
  const clients = useClientStore((s) => s.filteredClients);
  const loading = useClientStore((s) => s.loading);
  const error = useClientStore((s) => s.error);
  const fetchClients = useClientStore((s) => s.fetchClients);
  const addClient = useClientStore((s) => s.addClient);
  const updateClient = useClientStore((s) => s.updateClient);
  const deleteClient = useClientStore((s) => s.deleteClient);
  const clearError = useClientStore((s) => s.clearError);

  // Get URL parameters
  const searchParams = new URLSearchParams(
    typeof window !== "undefined" ? window.location.search : "",
  );
  const urlSearch = searchParams.get("search") || "";
  const urlStatus = searchParams.get("status_filter");
  const showAll = searchParams.get("show_all") === "true";

  const setSearch = useClientStore((s) => s.setSearch);
  const setStatusFilter = useClientStore((s) => s.setStatusFilter);
  const setPlatformFilter = useClientStore((s) => s.setPlatformFilter);
  const setDateFilter = useClientStore((s) => s.setDateFilter);
  const setPhoneFilter = useClientStore((s) => s.setPhoneFilter);
  const clearFilters = useClientStore((s) => s.clearFilters);
  const filters = useClientStore((s) => s.filters);

  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [loadingDelete, setLoadingDelete] = React.useState(false);
  const [selectedClient, setSelectedClient] = React.useState<Client | null>(
    null,
  );
  const [open, setOpen] = React.useState(false);
  const [dialogMode, setDialogMode] = React.useState<
    "add" | "edit" | "delete" | "view-note" | "play-audio"
  >("add");
  const [viewingNote, setViewingNote] = React.useState<string>("");
  const [audioFile, setAudioFile] = React.useState<File | null>(null);
  const [audioFileName, setAudioFileName] = React.useState<string>("");
  const [playingAudioUrl, setPlayingAudioUrl] = React.useState<string>("");
  const [dateStart, setDateStart] = React.useState<string>("");
  const [dateEnd, setDateEnd] = React.useState<string>("");

  React.useEffect(() => {
    fetchClients().catch(console.error);

    // Initialize filters from URL parameters
    if (urlSearch) {
      setSearch(urlSearch);
    }
    if (urlStatus) {
      setStatusFilter(urlStatus);
    }
  }, [fetchClients, urlSearch, urlStatus]);

  React.useEffect(() => {
    if (open) {
      clearError();
      // Reset audio state when dialog opens
      setAudioFile(null);
      setAudioFileName("");
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

  const handlePlayAudio = (audioUrl: string) => {
    setPlayingAudioUrl(audioUrl);
    setDialogMode("play-audio");
    setOpen(true);
  };

  const handleAudioFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("audio/")) {
        toast.error("Please select an audio file");
        return;
      }
      // Validate file size (e.g., max 50MB)
      if (file.size > 50 * 1024 * 1024) {
        toast.error("File size must be less than 50MB");
        return;
      }
      setAudioFile(file);
      setAudioFileName(file.name);
    }
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
    const conversation_language = formData.get(
      "conversation_language",
    ) as string;

    // Validation
    if (
      !full_name?.trim() ||
      !platform?.trim() ||
      !phone_number?.trim() ||
      !status?.trim()
    ) {
      toast.error(
        "Full name, platform, phone number, and status are required.",
      );
      return;
    }

    setIsSaving(true);
    try {
      const submitFormData = new FormData();
      submitFormData.append("full_name", full_name.trim());
      submitFormData.append(
        "username",
        full_name.toLowerCase().replace(/\s+/g, "."),
      );
      submitFormData.append("phone_number", phone_number.trim());
      submitFormData.append("platform", platform.trim());
      submitFormData.append("status", status.trim());
      submitFormData.append("assistant_name", assistant_name?.trim() || "");
      submitFormData.append("notes", notes?.trim() || "");
      submitFormData.append(
        "conversation_language",
        conversation_language || "",
      );

      if (audioFile) {
        submitFormData.append("audio", audioFile, audioFile.name);
      }

      await addClient(submitFormData);
      toast.success("Client added successfully");
      setOpen(false);
      setAudioFile(null);
      setAudioFileName("");
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
    e: React.FormEvent<HTMLFormElement>,
  ) => {
    e.preventDefault();
    if (isSaving || !selectedClient) return;

    const formData = new FormData(e.currentTarget);

    const submitFormData = new FormData();
    submitFormData.append("full_name", formData.get("full_name") as string);
    submitFormData.append(
      "phone_number",
      formData.get("phone_number") as string,
    );
    submitFormData.append("platform", formData.get("platform") as string);
    submitFormData.append("status", formData.get("status") as string);
    submitFormData.append(
      "assistant_name",
      (formData.get("assistant_name") as string) || "",
    );
    submitFormData.append("notes", (formData.get("notes") as string) || "");
    submitFormData.append(
      "conversation_language",
      (formData.get("conversation_language") as string) || "",
    );

    if (audioFile) {
      submitFormData.append("audio", audioFile, audioFile.name);
    }

    setIsSaving(true);
    try {
      await updateClient(selectedClient.id, submitFormData);
      toast.success("Client updated successfully");
      setOpen(false);
      setSelectedClient(null);
      setAudioFile(null);
      setAudioFileName("");
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
      setAudioFile(null);
      setAudioFileName("");
      clearError();
    }
  };

  const handleDateFilterChange = () => {
    if (dateStart) {
      setDateFilter(dateStart, dateEnd || undefined);
    } else {
      setDateFilter("", undefined);
    }
  };

  // Loading state
  if (loading && clients.length === 0) {
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
      <div className="mb-6 flex justify-between items-center">
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

      <div className="mb-6 space-y-3 bg-muted/30 p-4 rounded-lg border border-border">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Filters</h3>
          {(filters.search ||
            filters.status ||
            filters.platform ||
            filters.phoneNumber ||
            filters.dateRange) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                clearFilters();
                setDateStart("");
                setDateEnd("");
                window.history.pushState({}, "", window.location.pathname);
              }}
              className="text-xs h-8"
            >
              <X size={14} className="mr-1" />
              Clear
            </Button>
          )}
        </div>

        {/* First row: Search and Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-2">
            <Label htmlFor="search" className="text-xs font-medium">
              Search
            </Label>
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-2.5 text-muted-foreground"
              />
              <Input
                id="search"
                placeholder="Name or username..."
                defaultValue={urlSearch}
                onChange={(e) => {
                  const value = e.target.value;
                  setSearch(value);
                  const params = new URLSearchParams(window.location.search);
                  if (value) {
                    params.set("search", value);
                  } else {
                    params.delete("search");
                  }
                  window.history.pushState(
                    {},
                    "",
                    `${window.location.pathname}?${params}`,
                  );
                }}
                className="pl-9 h-9 text-sm"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status-filter" className="text-xs font-medium">
              Status
            </Label>
            <Select
              value={urlStatus || "all"}
              onValueChange={(value) => {
                const status = value === "all" ? null : value;
                setStatusFilter(status);
                const params = new URLSearchParams(window.location.search);
                if (status) {
                  params.set("status_filter", status);
                } else {
                  params.delete("status_filter");
                }
                window.history.pushState(
                  {},
                  "",
                  `${window.location.pathname}?${params}`,
                );
              }}
            >
              <SelectTrigger id="status-filter" className="h-9 text-sm">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="platform-filter" className="text-xs font-medium">
              Platform
            </Label>
            <Select
              value={filters.platform || "all"}
              onValueChange={(value) =>
                setPlatformFilter(value === "all" ? null : value)
              }
            >
              <SelectTrigger id="platform-filter" className="h-9 text-sm">
                <SelectValue placeholder="All platforms" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Platforms</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="whatsApp">WhatsApp</SelectItem>
                <SelectItem value="facebook">Facebook</SelectItem>
                <SelectItem value="telegram">Telegram</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="phone">Phone</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Second row: Phone and Date Range */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-2">
            <Label htmlFor="phone" className="text-xs font-medium">
              Phone
            </Label>
            <div className="relative">
              <Phone
                size={14}
                className="absolute left-3 top-2.5 text-muted-foreground"
              />
              <Input
                id="phone"
                placeholder="Search by phone..."
                value={filters.phoneNumber}
                onChange={(e) => setPhoneFilter(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date-from" className="text-xs font-medium">
              From Date
            </Label>
            <div className="relative">
              <Calendar
                size={14}
                className="absolute left-3 top-2.5 text-muted-foreground"
              />
              <Input
                id="date-from"
                type="date"
                value={dateStart}
                onChange={(e) => {
                  setDateStart(e.target.value);
                  if (e.target.value) {
                    setDateFilter(e.target.value, dateEnd || undefined);
                  }
                }}
                className="pl-9 h-9 text-sm"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date-to" className="text-xs font-medium">
              To Date
            </Label>
            <div className="relative">
              <Calendar
                size={14}
                className="absolute left-3 top-2.5 text-muted-foreground"
              />
              <Input
                id="date-to"
                type="date"
                value={dateEnd}
                onChange={(e) => {
                  setDateEnd(e.target.value);
                  if (dateStart) {
                    setDateFilter(dateStart, e.target.value || undefined);
                  }
                }}
                className="pl-9 h-9 text-sm"
              />
            </div>
          </div>
        </div>
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
              <TableHead>Language</TableHead>
              <TableHead>Assistant</TableHead>
              <TableHead>Audio</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!clients || clients.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={10}
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
                        <AvatarImage
                          src="/placeholder.svg"
                          alt={client.full_name}
                        />
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
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium ${getStatusColor(client.status)}`}
                    >
                      {getStatusLabel(client.status)}
                    </span>
                  </TableCell>
                  <TableCell>
                    {client.conversation_language ? (
                      <div className={cn(
                        "text-xs px-2 py-1 rounded-md border inline-block w-fit",
                        "dark:bg-neutral-900/50 dark:text-neutral-300 dark:border-neutral-700",
                        "bg-neutral-100 text-neutral-800 border-neutral-300"
                      )}>
                        {LANGUAGE_OPTIONS.find(
                          (l) => l.value === client.conversation_language,
                        )?.label || client.conversation_language}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
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
                    {client.audio_url ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePlayAudio(client.audio_url!)}
                        className="h-8 px-2 hover:bg-primary/10"
                        title="Play audio"
                      >
                        <Volume2 size={16} className="text-primary" />
                      </Button>
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
                        <span className="text-sm">
                          {truncateText(client.notes)}
                        </span>
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
        <DialogContent className="max-w-lg max-h-[95vh] overflow-y-auto">
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
                    <Label htmlFor="phone_number">Phone *</Label>
                    <Input
                      id="phone_number"
                      name="phone_number"
                      placeholder="Enter phone number"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="platform">Platform *</Label>
                    <Select name="platform" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select platform" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Instagram">Instagram</SelectItem>
                        <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                        <SelectItem value="Facebook">Facebook</SelectItem>
                        <SelectItem value="Telegram">Telegram</SelectItem>
                        <SelectItem value="Email">Email</SelectItem>
                        <SelectItem value="Phone">Phone</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select name="status" defaultValue="need_to_call">
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
                    <Label htmlFor="conversation_language">Language</Label>
                    <Select name="conversation_language">
                      <SelectTrigger>
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                      <SelectContent>
                        {LANGUAGE_OPTIONS.map((opt) => (
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
                <div className="space-y-2">
                  <Label htmlFor="audio_upload">Call Voice/Audio</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="audio_upload"
                      type="file"
                      accept="audio/*"
                      onChange={handleAudioFileChange}
                      className="cursor-pointer"
                    />
                    {audioFileName && (
                      <div className="flex items-center gap-1 px-3 py-1 bg-muted rounded text-sm">
                        <FileAudio size={14} />
                        <span className="truncate">{audioFileName}</span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Max 50MB. Supported: MP3, WAV, OGG, M4A, etc.
                  </p>
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
                    <Label htmlFor="platform">Platform *</Label>
                    <Select
                      name="platform"
                      defaultValue={selectedClient.platform}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select platform" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="instagram">Instagram</SelectItem>
                        <SelectItem value="whatsApp">WhatsApp</SelectItem>
                        <SelectItem value="facebook">Facebook</SelectItem>
                        <SelectItem value="telegram">Telegram</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="phone">Phone</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      name="status"
                      defaultValue={selectedClient.status || "need_to_call"}
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
                    <Label htmlFor="conversation_language">Language</Label>
                    <Select
                      name="conversation_language"
                      defaultValue={selectedClient.conversation_language || ""}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                      <SelectContent>
                        {LANGUAGE_OPTIONS.map((opt) => (
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
                <div className="space-y-2">
                  <Label htmlFor="audio_upload_edit">Call Voice/Audio</Label>
                  <div className="space-y-2">
                    {selectedClient.audio_url && !audioFile && (
                      <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded">
                        <FileAudio
                          size={14}
                          className="text-muted-foreground flex-shrink-0"
                        />
                        <span className="text-sm text-muted-foreground truncate">
                          Current audio attached
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Input
                        id="audio_upload_edit"
                        type="file"
                        accept="audio/*"
                        onChange={handleAudioFileChange}
                        className="cursor-pointer"
                      />
                      {audioFileName && (
                        <div className="flex items-center gap-1 px-3 py-1 bg-muted rounded text-sm">
                          <FileAudio size={14} />
                          <span className="truncate">{audioFileName}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Max 50MB. Supported: MP3, WAV, OGG, M4A, etc.
                  </p>
                </div>{" "}
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
          )}

          {dialogMode === "play-audio" && (
            <>
              <DialogHeader>
                <DialogTitle>Play Call Recording</DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                <div className="bg-muted p-8 rounded-md flex flex-col items-center justify-center space-y-4">
                  <Volume2 size={48} className="text-primary" />
                  <audio
                    src={playingAudioUrl}
                    controls
                    autoPlay
                    className="w-full"
                    style={{
                      colorScheme: "dark",
                    }}
                  />
                </div>
                <div className="flex justify-end gap-2">
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
  );
}
