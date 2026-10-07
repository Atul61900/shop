import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true,
  // Do not advertise the framework version in response headers.
  poweredByHeader: false,
  images: {
    // All imagery is served from /public so no remotePatterns are required.
    formats: ["image/avif", "image/webp"],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },    /**
     * Client Cache TTL, in seconds.
     *
     * The default for statically generated pages is 300s (5 min), so an admin
     * edit could appear to "undo itself": the record is gone from the database
     * and from freshly rendered HTML, but a client-side navigation replays the
     * cached RSC payload and the old entry reappears. Restarting the dev
     * server does not clear the browser's cache, which is what made this look
     * like the delete had never persisted.
     *
     * `dynamic: 0` means uncached (already the default). `static` has a
     * framework floor of 30, so 30 is the tightest the client cache can be for
     * prerendered pages — down from 300. Server-side output is invalidated
     * immediately regardless, via revalidateCatalogue() on every admin write.
     */
    staleTimes: {
      dynamic: 0,
      static: 30,
    },
  },
  /**
   * Baseline security headers. Deliberately no Content-Security-Policy here:
   * Next.js App Router relies on inline scripts/styles and a strict CSP
   * breaks navigations, so CSP needs per-route tuning as a follow-up, not a
   * drive-by. These headers break nothing and close real gaps (clickjacking,
   * MIME sniffing, referrer leakage, HSTS downgrade).
   */
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains",
          },
        ],
      },
    ];
  },
};

export default nextConfig;