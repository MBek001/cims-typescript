import { create } from "zustand";
import {
  getClients,
  addClient as apiAddClient,
  updateClient as apiUpdateClient,
  deleteClient as apiDeleteClient,
  filterClientsByStatus,
  filterClientsByPlatform,
  filterClientsByDate,
  searchClientsByPhone,
  searchClients,
  type Client,
} from "@/services/clientServices";

interface FilterState {
  search: string;
  status: string | null;
  platform: string | null;
  dateRange: { start: string; end: string } | null;
  phoneNumber: string;
  show_all: boolean;
}

interface ClientStore {
  clients: Client[];
  filteredClients: Client[];
  loading: boolean;
  error: string | null;
  filters: FilterState;

  // Actions
  fetchClients: () => Promise<void>;
  addClient: (
    client: Omit<Client, "id" | "created_at" | "updated_at">,
  ) => Promise<void>;
  updateClient: (id: string | number, client: Partial<Client>) => Promise<void>;
  deleteClient: (id: string | number) => Promise<void>;
  clearError: () => void;

  setSearch: (search: string) => Promise<void>;
  setStatusFilter: (status: string | null) => Promise<void>;
  setPlatformFilter: (platform: string | null) => Promise<void>;
  setDateFilter: (start: string, end: string) => Promise<void>;
  setPhoneFilter: (phone: string) => Promise<void>;
  clearFilters: () => Promise<void>;
}

const useClientStore = create<ClientStore>((set, get) => ({
  clients: [],
  filteredClients: [],
  loading: false,
  error: null,
  filters: {
    search: new URLSearchParams(window.location.search).get("search") || "",
    status: new URLSearchParams(window.location.search).get("status_filter"),
    platform: null,
    dateRange: null,
    phoneNumber: "",
    show_all:
      new URLSearchParams(window.location.search).get("show_all") === "true",
  },

  fetchClients: async () => {
    set({ loading: true, error: null });
    try {
      const data = await getClients();
      set({ clients: data, filteredClients: data });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to fetch clients",
      });
    } finally {
      set({ loading: false });
    }
  },

  addClient: async (client) => {
    set({ loading: true, error: null });
    try {
      await apiAddClient(client);
      // Refetch all clients to ensure we have fresh data
      const updatedClients = await getClients();
      set({
        clients: updatedClients,
        filteredClients: updatedClients,
        filters: {
          search: "",
          status: null,
          platform: null,
          dateRange: null,
          phoneNumber: "",
          show_all: false,
        },
      });
      // Clear URL params to match reset filters
      window.history.pushState({}, "", window.location.pathname);
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to add client",
        loading: false,
      });
      throw err;
    }
  },

  updateClient: async (id, client) => {
    set({ loading: true, error: null });
    try {
      await apiUpdateClient(id, client);
      // Refetch all clients to ensure we have fresh data
      const updatedClients = await getClients();
      set({
        clients: updatedClients,
        filteredClients: updatedClients,
        filters: {
          search: "",
          status: null,
          platform: null,
          dateRange: null,
          phoneNumber: "",
          show_all: false,
        },
      });
      // Clear URL params to match reset filters
      window.history.pushState({}, "", window.location.pathname);
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to update client",
        loading: false,
      });
      throw err;
    }
  },

  deleteClient: async (id) => {
    set({ loading: true, error: null });
    try {
      await apiDeleteClient(id);
      const { clients } = get();
      const newClients = clients.filter((c) => c.id !== id);
      set({
        clients: newClients,
        filteredClients: newClients,
        filters: {
          search: "",
          status: null,
          platform: null,
          dateRange: null,
          phoneNumber: "",
          show_all: false,
        },
      });
      // Clear URL params to match reset filters
      window.history.pushState({}, "", window.location.pathname);
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to delete client",
      });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  clearError: () => set({ error: null }),

  setSearch: async (search) => {
    const searchParams = new URLSearchParams(window.location.search);
    searchParams.set("search", search);
    window.history.pushState(
      {},
      "",
      `${window.location.pathname}?${searchParams}`,
    );

    set((state) => ({ filters: { ...state.filters, search } }));
    const { filters } = get();
    set({ loading: true });
    try {
      let results = await searchClients(search);
      if (filters.status) {
        results = await filterClientsByStatus(filters.status, results);
      }
      if (filters.platform) {
        results = await filterClientsByPlatform(filters.platform, results);
      }
      if (filters.phoneNumber) {
        results = await searchClientsByPhone(filters.phoneNumber, results);
      }
      set({ filteredClients: results });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Search failed" });
    } finally {
      set({ loading: false });
    }
  },

  setStatusFilter: async (status) => {
    const searchParams = new URLSearchParams(window.location.search);
    if (status) {
      searchParams.set("status_filter", status);
    } else {
      searchParams.delete("status_filter");
    }
    window.history.pushState(
      {},
      "",
      `${window.location.pathname}?${searchParams}`,
    );

    set((state) => ({ filters: { ...state.filters, status } }));
    const { filters } = get();
    set({ loading: true });
    try {
      let results = filters.search
        ? await searchClients(filters.search)
        : get().clients;
      if (status) {
        results = await filterClientsByStatus(status, results);
      }
      if (filters.platform) {
        results = await filterClientsByPlatform(filters.platform, results);
      }
      if (filters.phoneNumber) {
        results = await searchClientsByPhone(filters.phoneNumber, results);
      }
      set({ filteredClients: results });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Filter failed" });
    } finally {
      set({ loading: false });
    }
  },

  setPlatformFilter: async (platform) => {
    set((state) => ({ filters: { ...state.filters, platform } }));
    if (platform) {
      set({ loading: true });
      try {
        const results = await filterClientsByPlatform(platform);
        set({ filteredClients: results });
      } catch (err) {
        set({ error: err instanceof Error ? err.message : "Filter failed" });
      } finally {
        set({ loading: false });
      }
    } else {
      const { clients } = get();
      set({ filteredClients: clients });
    }
  },

  setDateFilter: async (start, end) => {
    set((state) => ({
      filters: { ...state.filters, dateRange: { start, end } },
    }));
    if (start && end) {
      set({ loading: true });
      try {
        const results = await filterClientsByDate(start, end);
        set({ filteredClients: results });
      } catch (err) {
        set({ error: err instanceof Error ? err.message : "Filter failed" });
      } finally {
        set({ loading: false });
      }
    } else {
      const { clients } = get();
      set({ filteredClients: clients });
    }
  },

  setPhoneFilter: async (phone) => {
    set((state) => ({ filters: { ...state.filters, phoneNumber: phone } }));
    if (phone.trim()) {
      set({ loading: true });
      try {
        const results = await searchClientsByPhone(phone);
        set({ filteredClients: results });
      } catch (err) {
        set({ error: err instanceof Error ? err.message : "Search failed" });
      } finally {
        set({ loading: false });
      }
    } else {
      const { clients } = get();
      set({ filteredClients: clients });
    }
  },

  clearFilters: async () => {
    window.history.pushState({}, "", window.location.pathname);
    set({
      filters: {
        search: "",
        status: null,
        platform: null,
        dateRange: null,
        phoneNumber: "",
        show_all: false,
      },
    });
    const { clients } = get();
    set({ filteredClients: clients });
  },
}));

export default useClientStore;
