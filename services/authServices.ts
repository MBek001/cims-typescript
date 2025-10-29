import api from "@/lib/api";
import type { RegisterPayload } from "@/types/auth";

export async function registerUser(payload: RegisterPayload) {
  const { data } = await api.post("/auth/register", payload);
  return data;
}

  export async function loginUser({ email, password }: { email: string; password: string }) {
  const formData = new URLSearchParams();
  formData.append("grant_type", "password");
  formData.append("username", email);
  formData.append("password", password);
  formData.append("scope", "");
  formData.append("client_id", "");
  formData.append("client_secret", "");

  const response = await api.post("/auth/login", formData.toString(), {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });

  console.log("Raw API response:", response);
  console.log("Response data:", response.data);
  return response.data;
}

// ✅ verify OTP
export async function verifyOtp(email: string, code: string) {
  const { data } = await api.post("/auth/verify-email", {
    email,
    code,
  });
  return data;
}

// ✅ resend verification code
export async function resendVerificationCode(email: string) {
  const { data } = await api.post("/auth/resend-verification", {
    email,
  });
  return data;
}

// ✅ logout (frontend only)
export function logoutUser() {
  try {
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    return { success: true };
  } catch (error) {
    console.error("Logout failed:", error);
    return { success: false, error };
  }
}