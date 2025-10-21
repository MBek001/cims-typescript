import axios from "axios";
import useAuthStore, { getAuthToken } from "@/stores/useAuthStore";

interface RetryableRequest {
  _retry?: boolean;
  headers?: Record<string, string>;
}

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  
});

api.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshing: Promise<string | null> | null = null;

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config as RetryableRequest | undefined;
    if (original && err.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        if (!refreshing) {
          refreshing = api
            .post("/auth/refresh")
            .then((r) => {
              const newToken = r.data?.access_token;
              if (newToken) {
                useAuthStore.getState().setToken(newToken);
                return newToken;
              }
              return null;
            })
            .finally(() => {
              refreshing = null;
            });
        }
        const newToken = await refreshing;
        if (newToken && original.headers) {
          original.headers.Authorization = `Bearer ${newToken}`;
        }
        return original ? api(original) : Promise.reject(err);
      } catch {
        useAuthStore.getState().logout();
        // optionally: redirect to login here
      }
    }
    return Promise.reject(err);
  }
);

export default api;
