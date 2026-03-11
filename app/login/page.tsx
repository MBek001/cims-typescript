"use client";

import { getDashboardRouteForUser } from "@/helpers/authHelpers";
import { isUnauthorizedError } from "@/lib/api-error";
import { LoginForm } from "@/components/login-form";
import { fetchCurrentUser } from "@/services/authServices";
import useAuthStore from "@/stores/useAuthStore";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Page() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    const redirectAuthenticatedUser = async () => {
      if (typeof window === "undefined") {
        return;
      }

      const token = localStorage.getItem("token");
      if (!token) {
        return;
      }

      const authState = useAuthStore.getState();
      try {
        const user = authState.user ?? (await fetchCurrentUser());
        authState.setUser(user);

        if (cancelled) {
          return;
        }

        router.push(getDashboardRouteForUser(user));
      } catch (error: unknown) {
        if (cancelled) {
          return;
        }

        if (isUnauthorizedError(error)) {
          authState.logout();
        }
      }
    };

    void redirectAuthenticatedUser();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <LoginForm />
      </div>
    </div>
  );
}
