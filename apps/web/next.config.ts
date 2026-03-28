import type { NextConfig } from "next"

const config: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-DNS-Prefetch-Control", value: "on"                          },
          { key: "X-Content-Type-Options",  value: "nosniff"                    },
          { key: "X-Frame-Options",          value: "DENY"                      },
          { key: "Referrer-Policy",          value: "strict-origin-when-cross-origin" },
        ],
      },
    ]
  },
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60,
  },
  env: {
    NEXT_PUBLIC_API_URL:    process.env.NEXT_PUBLIC_API_URL!,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN!,
  },
  ...(process.env.ANALYZE === "true" && {
    webpack: (config) => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { BundleAnalyzerPlugin } = require("webpack-bundle-analyzer")
      config.plugins.push(new BundleAnalyzerPlugin({ analyzerMode: "static" }))
      return config
    },
  }),
}

export default config
