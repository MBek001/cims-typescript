import { create } from "zustand";
import { getCanonicalCRMStatusValue } from "@/lib/crm-statuses";
import {
  getCrmDashboard,
  addClient as apiAddClient,
  updateClient as apiUpdateClient,
  deleteClient as apiDeleteClient,
  type Client,
} from "@/services/clientServices";

interface FilterState {
  search: string;
  status: string | null;
  platform: string | null;
  dateRange: { start: string; end?: string } | null;
  phoneNumber: string;
  show_all: boolean;
}

interface ClientStore {
  clients: Client[];
  filteredClients: Client[];
  loading: boolean;
  error: string | null;
  filters: FilterState;
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;

  // Actions
  fetchClients: () => Promise<void>;
  addClient: (
    client: FormData | Omit<Client, "id" | "created_at" | "updated_at">,
  ) => Promise<void>;
  updateClient: (
    id: string | number,
    client: FormData | Partial<Client>,
  ) => Promise<void>;
  deleteClient: (id: string | number) => Promise<void>;
  clearError: () => void;

  setSearch: (search: string) => Promise<void>;
  setStatusFilter: (status: string | null) => Promise<void>;
  setPlatformFilter: (platform: string | null) => Promise<void>;
  setDateFilter: (start: string, end?: string) => Promise<void>;
  setPhoneFilter: (phone: string) => Promise<void>;
  clearFilters: () => Promise<void>;
  setPage: (page: number) => Promise<void>;
  setPageSize: (pageSize: number) => Promise<void>;
}

// Helper function to safely get URL parameters (client-side only)
const getUrlParam = (param: string): string | null => {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get(param);
};

// Helper function to safely update URL (client-side only)
const updateUrl = (searchParams?: URLSearchParams) => {
  if (typeof window === "undefined") return;
  const newUrl = searchParams
    ? `${window.location.pathname}?${searchParams}`
    : window.location.pathname;
  window.history.pushState({}, "", newUrl);
};

const toComparableDate = (value?: string) => {
  const parsed = value ? new Date(value) : null;
  if (!parsed || Number.isNaN(parsed.getTime())) {
    return "";
  }

  return parsed.toISOString().split("T")[0];
};

const clampPage = (page: number, min = 1) =>
  Math.max(Number.isFinite(page) ? Math.floor(page) : min, min);

const clampPageSize = (pageSize: number, min = 1, max = 50) =>
  Math.min(Math.max(Number.isFinite(pageSize) ? Math.floor(pageSize) : min, min), max);

const applyClientFilters = (clients: Client[], filters: FilterState) => {
  const searchValue = filters.search.trim().toLowerCase();
  const phoneValue = filters.phoneNumber.trim();
  const selectedStatus = getCanonicalCRMStatusValue(filters.status);

  return clients.filter((client) => {
    if (searchValue) {
      const matchesSearch =
        client.full_name.toLowerCase().includes(searchValue) ||
        client.username?.toLowerCase().includes(searchValue);

      if (!matchesSearch) {
        return false;
      }
    }

    if (
      selectedStatus &&
      getCanonicalCRMStatusValue(client.status) !== selectedStatus
    ) {
      return false;
    }

    if (filters.platform && client.platform !== filters.platform) {
      return false;
    }

    if (phoneValue && !client.phone_number.includes(phoneValue)) {
      return false;
    }

    if (filters.dateRange?.start) {
      const clientDate = toComparableDate(client.created_at);
      if (!clientDate) {
        return false;
      }

      if (filters.dateRange.end) {
        return (
          clientDate >= filters.dateRange.start &&
          clientDate <= filters.dateRange.end
        );
      }

      return clientDate === filters.dateRange.start;
    }

    return true;
  });
};

const useClientStore = create<ClientStore>((set, get) => ({
  clients: [],
  filteredClients: [],
  loading: false,
  error: null,
  filters: {
    search: getUrlParam("search") || "",
    status: getCanonicalCRMStatusValue(getUrlParam("status_filter")),
    platform: null,
    dateRange: null,
    phoneNumber: "",
    show_all: getUrlParam("show_all") === "true",
  },
  page: 1,
  pageSize: 50,
  totalItems: 0,
  totalPages: 0,

  fetchClients: async () => {
    set({ loading: true, error: null });
    try {
      const { filters, page, pageSize } = get();
      const dashboard = await getCrmDashboard({
        search: filters.search || null,
        status_filter: filters.status || null,
        show_all: filters.show_all,
        page: clampPage(page),
        page_size: clampPageSize(pageSize),
      });
      const clients = dashboard.customers;
      const effectivePageSize = dashboard.page_size ?? pageSize;
      const totalItems = dashboard.total_items ?? clients.length;
      const totalPages =
        dashboard.total_pages ??
        Math.ceil(totalItems / (effectivePageSize || 1));
      set({
        clients,
        filteredClients: applyClientFilters(clients, filters),
        page: dashboard.page ?? page,
        pageSize: effectivePageSize,
        totalItems,
        totalPages,
      });
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
      set((state) => ({
        filters: {
          search: "",
          status: null,
          platform: null,
          dateRange: null,
          phoneNumber: "",
          show_all: false,
        },
        page: 1,
        pageSize: state.pageSize,
      }));
      updateUrl();
      await get().fetchClients();
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
      set((state) => ({
        filters: {
          search: "",
          status: null,
          platform: null,
          dateRange: null,
          phoneNumber: "",
          show_all: false,
        },
        page: 1,
        pageSize: state.pageSize,
      }));
      updateUrl();
      await get().fetchClients();
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
      set((state) => ({
        filters: {
          search: "",
          status: null,
          platform: null,
          dateRange: null,
          phoneNumber: "",
          show_all: false,
        },
        page: 1,
        pageSize: state.pageSize,
      }));
      updateUrl();
      await get().fetchClients();
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to delete client",
        loading: false,
      });
      throw err;
    }
  },

  clearError: () => set({ error: null }),

  setSearch: async (search) => {
    const searchParams = new URLSearchParams(
      typeof window !== "undefined" ? window.location.search : "",
    );
    if (search) {
      searchParams.set("search", search);
    } else {
      searchParams.delete("search");
    }
    updateUrl(searchParams);

    set((state) => ({
      filters: { ...state.filters, search },
      page: 1,
      error: null,
    }));
    await get().fetchClients();
  },

  setStatusFilter: async (status) => {
    const normalizedStatus = getCanonicalCRMStatusValue(status);
    const searchParams = new URLSearchParams(
      typeof window !== "undefined" ? window.location.search : "",
    );
    if (normalizedStatus) {
      searchParams.set("status_filter", normalizedStatus);
    } else {
      searchParams.delete("status_filter");
    }
    updateUrl(searchParams);

    set((state) => ({
      filters: { ...state.filters, status: normalizedStatus || null },
      page: 1,
      error: null,
    }));
    await get().fetchClients();
  },

  setPlatformFilter: async (platform) => {
    set((state) => ({
      filters: { ...state.filters, platform },
      page: 1,
      error: null,
    }));
    await get().fetchClients();
  },

  setDateFilter: async (start, end) => {
    set((state) => ({
      filters: {
        ...state.filters,
        dateRange: start ? { start, end } : null,
      },
      page: 1,
      error: null,
    }));
    await get().fetchClients();
  },

  setPhoneFilter: async (phone) => {
    set((state) => ({
      filters: { ...state.filters, phoneNumber: phone },
      page: 1,
      error: null,
    }));
    await get().fetchClients();
  },

  clearFilters: async () => {
    updateUrl();
    set((state) => ({
      filters: {
        search: "",
        status: null,
        platform: null,
        dateRange: null,
        phoneNumber: "",
        show_all: false,
      },
      page: 1,
      pageSize: state.pageSize,
    }));
    await get().fetchClients();
  },

  setPage: async (page) => {
    const nextPage = clampPage(page);
    set({ page: nextPage });
    await get().fetchClients();
  },

  setPageSize: async (pageSize) => {
    const nextSize = clampPageSize(pageSize);
    set({ page: 1, pageSize: nextSize });
    await get().fetchClients();
  },
}));

export default useClientStore;
