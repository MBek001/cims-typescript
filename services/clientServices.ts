import api from "@/lib/api"

// Backend response interface
export interface BackendClient {
  id: number
  full_name: string
  platform: string
  username: string | null
  phone_number: string
  status: string
  assistant_name: string | null
  notes: string | null
  conversation_language: string | null
  audio: string | null
  created_at: string
  updated_at?: string
}

// Frontend interface
export interface Client {
  id: number | string
  full_name: string
  username: string | null
  platform: string
  phone_number: string
  status: string
  assistant_name: string | null
  notes: string | null
  conversation_language: string | null
  audio: string | null
  created_at: string
  updated_at: string
}

// Dashboard API response - matches actual API structure
export interface DashboardResponse {
  customers?: BackendClient[]
  sales?: BackendClient[]
  total_customers: number
  need_to_call: number
  contacted: number
  project_started: number
  continuing: number
  finished: number
  rejected: number
  status_dict?: Record<string, number>
  status_percentages?: Record<string, number>
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
})

// Helper: safely extract customers from response
const extractCustomers = (data: any): BackendClient[] => {
  if (!data) return []

  // Try different possible response structures
  if (Array.isArray(data.customers)) return data.customers
  if (Array.isArray(data.sales)) return data.sales
  if (Array.isArray(data)) return data

  return []
}

// GET all clients with optional filters
export const getClients = async (filters?: {
  search?: string
  status?: string
  platform?: string
  phone?: string
  date_from?: string
  date_to?: string
}): Promise<Client[]> => {
  try {
    const params = new URLSearchParams()

    if (filters?.search) params.append("search", filters.search)
    if (filters?.status) params.append("status", filters.status)
    if (filters?.platform) params.append("platform", filters.platform)
    if (filters?.phone) params.append("phone", filters.phone)
    if (filters?.date_from) params.append("date_from", filters.date_from)
    if (filters?.date_to) params.append("date_to", filters.date_to)

    const url = `/crm/customers/latest?limit=100${params.toString() ? `&${params.toString()}` : ""}`
    const res = await api.get<DashboardResponse>(url)

    const customers = extractCustomers(res.data)
    return customers.map(transformBackendToFrontend)
  } catch (error: any) {
    if (error.response?.status === 404) {
      return []
    }
    throw error
  }
}

// Search clients
export const searchClients = async (query: string, existingClients?: Client[]): Promise<Client[]> => {
  if (existingClients) {
    return existingClients.filter(
      (client) =>
        client.full_name.toLowerCase().includes(query.toLowerCase()) ||
        client.username?.toLowerCase().includes(query.toLowerCase()),
    )
  }
  try {
    const res = await api.get<DashboardResponse>(`/crm/dashboard?search=${encodeURIComponent(query)}`)
    const customers = extractCustomers(res.data)
    return customers.map(transformBackendToFrontend)
  } catch (error: any) {
    if (error.response?.status === 404) {
      return []
    }
    throw error
  }
}

export const filterClientsByStatus = async (status: string, existingClients?: Client[]): Promise<Client[]> => {
  if (existingClients) {
    return existingClients.filter((client) => client.status === status)
  }
  try {
    const res = await api.get<DashboardResponse>(`/crm/customers/filter/status/${encodeURIComponent(status)}`)
    const customers = extractCustomers(res.data)
    return customers.map(transformBackendToFrontend)
  } catch (error: any) {
    if (error.response?.status === 404) {
      return []
    }
    throw error
  }
}

export const filterClientsByPlatform = async (
  platform: string,
  existingClients?: Client[],
): Promise<Client[]> => {
  if (existingClients) {
    return existingClients.filter((client) => client.platform === platform)
  }

  try {
    const res = await api.get<DashboardResponse>(
      `/crm/customers/filter/platform?platform=${encodeURIComponent(platform)}`
    )

    const customers = extractCustomers(res.data)
    return customers.map(transformBackendToFrontend)
  } catch (error: any) {
    if (error.response?.status === 404) {
      return []
    }
    throw error
  }
}


export const filterClientsByDate = async (
  startDate: string,
  endDate?: string,
  existingClients?: Client[],
): Promise<Client[]> => {
  if (existingClients) {
    return existingClients.filter((client) => {
      const clientDate = new Date(client.created_at).toISOString().split("T")[0]

      if (endDate) {
        // Date range filter
        return clientDate >= startDate && clientDate <= endDate
      } else {
        // Single date filter
        return clientDate === startDate
      }
    })
  }
  try {
    let url = `/crm/customers/filter/date?start_date=${encodeURIComponent(startDate)}`
    if (endDate) {
      url += `&end_date=${encodeURIComponent(endDate)}`
    }

    const res = await api.get<DashboardResponse>(url)
    const customers = extractCustomers(res.data)
    return customers.map(transformBackendToFrontend)
  } catch (error: any) {
    if (error.response?.status === 404) {
      return []
    }
    throw error
  }
}

// Search by phone number
export const searchClientsByPhone = async (phone: string, existingClients?: Client[]): Promise<Client[]> => {
  if (existingClients) {
    return existingClients.filter((client) => client.phone_number.includes(phone))
  }
  try {
    const res = await api.get<DashboardResponse>(`/crm/dashboard?search=${encodeURIComponent(phone)}`)
    const customers = extractCustomers(res.data)
    return customers.map(transformBackendToFrontend)
  } catch (error: any) {
    if (error.response?.status === 404) {
      return []
    }
    throw error
  }
}

// POST new client
export const addClient = async (data: FormData | Omit<Client, "id" | "created_at" | "updated_at">): Promise<Client> => {
  let formData: FormData

  // If data is already FormData, use it directly
  if (data instanceof FormData) {
    formData = data
  } else {
    // Convert object to FormData
    if (!data.full_name?.trim()) {
      throw new Error("Full name is required")
    }
    if (!data.platform?.trim()) {
      throw new Error("Platform is required")
    }
    if (!data.phone_number?.trim()) {
      throw new Error("Phone number is required")
    }
    if (!data.status?.trim()) {
      throw new Error("Status is required")
    }

    formData = new FormData()
    formData.append("full_name", data.full_name.trim())
    formData.append("platform", data.platform.trim())
    formData.append("phone_number", data.phone_number.trim())
    formData.append("status", data.status.trim())
    formData.append("username", data.username || data.full_name.toLowerCase().replace(/\s+/g, "."))
    formData.append("notes", data.notes || "")
    formData.append("assistant_name", data.assistant_name || "")
    formData.append("conversation_language", data.conversation_language || "")

    if (data.audio) {
      formData.append("audio", data.audio)
    }
  }

  try {
    const res = await api.post<BackendClient>("/crm/customers", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })

    if (!res.data) {
      throw new Error("No data received from server")
    }

    return transformBackendToFrontend(res.data)
  } catch (error) {
    throw error instanceof Error ? error : new Error("Failed to create client")
  }
}

// PUT update client
export const updateClient = async (id: string | number, data: FormData | Partial<Client>): Promise<Client> => {
  let formData: FormData

  // If data is already FormData, use it directly
  if (data instanceof FormData) {
    formData = data
  } else {
    // Convert object to FormData
    if (data.full_name !== undefined && !data.full_name.trim()) {
      throw new Error("Full name cannot be empty")
    }
    if (data.platform !== undefined && !data.platform.trim()) {
      throw new Error("Platform cannot be empty")
    }

    formData = new FormData()

    if (data.full_name) formData.append("full_name", data.full_name.trim())
    if (data.platform) formData.append("platform", data.platform.trim())
    if (data.phone_number) formData.append("phone_number", data.phone_number.trim())
    if (data.status) formData.append("status", data.status)
    if (data.username) formData.append("username", data.username.trim())
    if (data.notes !== undefined) formData.append("notes", data.notes || "")
    if (data.assistant_name !== undefined) formData.append("assistant_name", data.assistant_name || "")
    if (data.conversation_language !== undefined)
      formData.append("conversation_language", data.conversation_language || "")
    if (data.audio) formData.append("audio", data.audio)
  }

  try {
    const res = await api.put<BackendClient>(`/crm/customers/${id}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })

    if (!res.data) {
      throw new Error("No data received from server")
    }

    return transformBackendToFrontend(res.data)
  } catch (error) {
    throw error instanceof Error ? error : new Error("Failed to update client")
  }
}

// DELETE client
export const deleteClient = async (id: string | number): Promise<void> => {
  await api.delete(`/crm/customers/${id}`)
}
