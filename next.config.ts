import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ✅ This makes Next.js output static HTML/CSS/JS in the "out" folder
  output: "export",

  eslint: {
    // ⚠️ Disables ESLint during builds (optional)
    ignoreDuringBuilds: true,
  },

  // Redirects are not supported with static exports
  // Use client-side navigation instead
  basePath: "",
};

export default nextConfig;
