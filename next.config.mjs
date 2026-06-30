import path from "path";

function getSupabaseStoragePattern() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) {
    return null;
  }

  try {
    return {
      protocol: "https",
      hostname: new URL(supabaseUrl).hostname,
      pathname: "/storage/v1/object/public/**"
    };
  } catch {
    return null;
  }
}

const supabaseStoragePattern = getSupabaseStoragePattern();

/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: false,
  outputFileTracingRoot: path.join(process.cwd()),
  experimental: {
    optimizePackageImports: ["lucide-react", "@radix-ui/react-select", "@radix-ui/react-avatar"]
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com"
      },
      ...(supabaseStoragePattern ? [supabaseStoragePattern] : [])
    ]
  },
  async headers() {
    return [
      {
        source: "/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon.svg|screenshots).*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" }
        ]
      }
    ];
  }
};

export default nextConfig;
