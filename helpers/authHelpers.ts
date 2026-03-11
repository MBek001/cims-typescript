export function validateLogin({
  email,
  password,
}: {
  email: string;
  password: string;
}): string | null {
  if (!email) return "Email is required.";
  if (!password) return "Password is required.";
  if (!/^\S+@\S+\.\S+$/.test(email)) return "Email is invalid.";
  return null;
}

// ✅ Authentication helper
const TOKEN_KEY = "token";

export function isAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  const token = localStorage.getItem(TOKEN_KEY);
  return !!token;
}

type RedirectUser = {
  role?: string | null;
  permissions?: Record<string, boolean> | null;
} | null;

export function getDashboardRouteForUser(user: RedirectUser): string {
  const normalizedRole = user?.role?.trim().toLowerCase() ?? "";
  const isCeo = user?.permissions?.ceo === true || normalizedRole === "ceo";
  return isCeo ? "/dashboard" : "/member_dashboard";
}
