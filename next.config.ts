import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.10.16", "192.168.1.21"],
  images: {
    qualities: [75, 100],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "i.pravatar.cc",
        port: "",
        // 2. Ubah pathname menjadi "/**" agar tidak error "empty string"
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
