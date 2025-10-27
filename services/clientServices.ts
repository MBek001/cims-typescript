import api from "@/lib/api";

// Backend response interface
export interface BackendClient {
  id: number;
  full_name: string;
  platform: string;
  username: string | null;
  phone_number: string;
  status: string;
  assistant_name: string | null;
  notes: string | null;
  conversation_language: string | null;
  audio: string | null;
  created_at: string;
  updated_at?: string;
}

// Frontend interface
export interface Client {
  id: number | string;
  full_name: string;
  username: string | null;
  platform: string;
  phone_number: string;
  status: string;
  assistant_name: string | null;
  notes: string | null;
  conversation_language: string | null;
  audio: string | null;
  created_at: string;
  updated_at: string;
}

// Dashboard API response - matches actual API structure
export interface DashboardResponse {
  customers?: BackendClient[];
  sales?: BackendClient[];
  total_customers: number;
  need_to_call: number;
  contacted: number;
  project_started: number;
  continuing: number;
  finished: number;
  rejected: number;
  status_dict?: Record<string, number>;
  status_percentages?: Record<string, number>;
}

// Transform: backend → frontend
const transformBackendToFrontend = (backend: BackendClient): Client => ({
  id: backend.id,
  full_name: backend.full_name,
  username: backend.username,
  platform: backend.platform,
  phone_number: backend.phone_number,
  status: backend.status,
  assistant_name: backend.assistant_name,
  notes: backend.notes,
  conversation_language: backend.conversation_language,
  audio: backend.audio,
  created_at: backend.created_at,
  updated_at: backend.updated_at ?? backend.created_at,
});

// Transform: frontend → backend
const transformFrontendToBackend = (
  client: Partial<Client>,
): Partial<BackendClient> => {
  const backend: Partial<BackendClient> = {};

  if (client.full_name !== undefined) backend.full_name = client.full_name;
  if (client.platform !== undefined) backend.platform = client.platform;
  if (client.username !== undefined) backend.username = client.username;
  if (client.phone_number !== undefined)
    backend.phone_number = client.phone_number;
  if (client.status !== undefined) backend.status = client.status;
  if (client.assistant_name !== undefined) {
    backend.assistant_name = client.assistant_name;
  }
  if (client.notes !== undefined) backend.notes = client.notes;
  if (client.conversation_language !== undefined) {
    backend.conversation_language = client.conversation_language;
  }
  if (client.audio !== undefined) backend.audio = client.audio;

  return backend;
};

// Helper: safely extract customers from response
const extractCustomers = (data: any): BackendClient[] => {
  if (!data) return [];
  
  // Try different possible response structures
  if (Array.isArray(data.customers)) return data.customers;
  if (Array.isArray(data.sales)) return data.sales;
  if (Array.isArray(data)) return data;
  
  return [];
};

// GET all clients with optional filters
export const getClients = async (filters?: {
  search?: string;
  status?: string;
  platform?: string;
  phone?: string;
  date_from?: string;
  date_to?: string;
}): Promise<Client[]> => {
  try {
    const params = new URLSearchParams();

    if (filters?.search) params.append("search", filters.search);
    if (filters?.status) params.append("status", filters.status);
    if (filters?.platform) params.append("platform", filters.platform);
    if (filters?.phone) params.append("phone", filters.phone);
    if (filters?.date_from) params.append("date_from", filters.date_from);
    if (filters?.date_to) params.append("date_to", filters.date_to);

    const url = `/crm/customers/latest?limit=100${params.toString() ? `&${params.toString()}` : ""}`;
    const res = await api.get<DashboardResponse>(url);
    
    const customers = extractCustomers(res.data);
    return customers.map(transformBackendToFrontend);
  } catch (error: any) {
    if (error.response?.status === 404) {
      return [];
    }
    throw error;
  }
};

// Search clients
export const searchClients = async (
  query: string,
  existingClients?: Client[],
): Promise<Client[]> => {
  if (existingClients) {
    return existingClients.filter(
      (client) =>
        client.full_name.toLowerCase().includes(query.toLowerCase()) ||
        client.username?.toLowerCase().includes(query.toLowerCase()),
    );
  }
  try {
    const res = await api.get<DashboardResponse>(
      `/crm/dashboard?search=${encodeURIComponent(query)}`,
    );
    const customers = extractCustomers(res.data);
    return customers.map(transformBackendToFrontend);
  } catch (error: any) {
    if (error.response?.status === 404) {
      return [];
    }
    throw error;
  }
};

// Filter by status
export const filterClientsByStatus = async (
  status: string,
  existingClients?: Client[],
): Promise<Client[]> => {
  if (existingClients) {
    return existingClients.filter((client) => client.status === status);
  }
  try {
    const res = await api.get<DashboardResponse>(
      `/crm/dashboard?status=${encodeURIComponent(status)}`,
    );
    const customers = extractCustomers(res.data);
    return customers.map(transformBackendToFrontend);
  } catch (error: any) {
    if (error.response?.status === 404) {
      return [];
    }
    throw error;
  }
};

// Filter by platform
export const filterClientsByPlatform = async (
  platform: string,
  existingClients?: Client[],
): Promise<Client[]> => {
  if (existingClients) {
    return existingClients.filter((client) => client.platform === platform);
  }
  try {
    const res = await api.get<DashboardResponse>(
      `/crm/dashboard?platform=${encodeURIComponent(platform)}`,
    );
    const customers = extractCustomers(res.data);
    return customers.map(transformBackendToFrontend);
  } catch (error: any) {
    if (error.response?.status === 404) {
      return [];
    }
    throw error;
  }
};

// Filter by date range
export const filterClientsByDate = async (
  startDate: string,
  endDate: string,
  existingClients?: Client[],
): Promise<Client[]> => {
  if (existingClients) {
    return existingClients.filter((client) => {
      const clientDate = new Date(client.created_at);
      const start = new Date(startDate);
      const end = new Date(endDate);
      return clientDate >= start && clientDate <= end;
    });
  }
  try {
    const res = await api.get<DashboardResponse>(
      `/crm/dashboard?date_from=${encodeURIComponent(startDate)}&date_to=${encodeURIComponent(endDate)}`,
    );
    const customers = extractCustomers(res.data);
    return customers.map(transformBackendToFrontend);
  } catch (error: any) {
    if (error.response?.status === 404) {
      return [];
    }
    throw error;
  }
};

// Search by phone number
export const searchClientsByPhone = async (
  phone: string,
  existingClients?: Client[],
): Promise<Client[]> => {
  if (existingClients) {
    return existingClients.filter((client) =>
      client.phone_number.includes(phone),
    );
  }
  try {
    const res = await api.get<DashboardResponse>(
      `/crm/dashboard?search=${encodeURIComponent(phone)}`,
    );
    const customers = extractCustomers(res.data);
    return customers.map(transformBackendToFrontend);
  } catch (error: any) {
    if (error.response?.status === 404) {
      return [];
    }
    throw error;
  }
};

// POST new client
export const addClient = async (
  data: Omit<Client, "id" | "created_at" | "updated_at">,
): Promise<Client> => {
  if (!data.full_name?.trim()) {
    throw new Error("Full name is required");
  }
  if (!data.platform?.trim()) {
    throw new Error("Platform is required");
  }
  if (!data.phone_number?.trim()) {
    throw new Error("Phone number is required");
  }
  if (!data.status?.trim()) {
    throw new Error("Status is required");
  }

  const clientData = {
    ...data,
    full_name: data.full_name.trim(),
    platform: data.platform.trim(),
    phone_number: data.phone_number.trim(),
    status: data.status.trim(),
    notes: data.notes || null,
    assistant_name: data.assistant_name || null,
    conversation_language: data.conversation_language || null,
    audio: data.audio || null,
    username:
      data.username || data.full_name.toLowerCase().replace(/\s+/g, "."),
  };

  const backendData = transformFrontendToBackend(clientData);

  try {
    const res = await api.post<BackendClient>(
      "/crm/customers",
      backendData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      }
    );
  
    if (!res.data) {
      throw new Error("No data received from server");
    }
  
    return transformBackendToFrontend(res.data);
  } catch (error) {
    throw error instanceof Error ? error : new Error("Failed to create client");
  }
};

// PUT update client
export const updateClient = async (
  id: string | number,
  data: Partial<Client>,
): Promise<Client> => {
  if (data.full_name !== undefined && !data.full_name.trim()) {
    throw new Error("Full name cannot be empty");
  }
  if (data.platform !== undefined && !data.platform.trim()) {
    throw new Error("Platform cannot be empty");
  }

  const clientData = {
    ...data,
    status: data.status || undefined,
    notes: data.notes?.trim() || null,
    assistant_name: data.assistant_name?.trim() || null,
    conversation_language: data.conversation_language?.trim() || null,
    username: data.username?.trim() || undefined,
    phone_number: data.phone_number?.trim() || undefined,
  };

  const backendData = transformFrontendToBackend(clientData);

  try {
    const res = await api.put<BackendClient>(
      `/crm/customers/${id}`,
      backendData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      }
    );
  
    if (!res.data) {
      throw new Error("No data received from server");
    }
  
    return transformBackendToFrontend(res.data);
  } 
catch (error) {
    throw error instanceof Error ? error : new Error("Failed to update client");
  }
};

// DELETE client
export const deleteClient = async (id: string | number): Promise<void> => {
  await api.delete(`/crm/customers/${id}`);
};