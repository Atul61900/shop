"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * Last-resort boundary for errors inside the root layout itself. Route-level
 * failures are handled by src/app/error.tsx; this only renders when even the
 * layout cannot.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <main
          style={{
            minHeight: "100dvh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "1rem",
            background: "#05070B",
            color: "#ffffff",
            fontFamily: "system-ui, sans-serif",
            textAlign: "center",
            padding: "2rem",
          }}
        >
          <h1 style={{ fontSize: "1.5rem", margin: 0 }}>Something went wrong</h1>
          <p style={{ color: "#9aa3b2", margin: 0 }}>
            Please try again. If it keeps happening, contact the shop directly.
          </p>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button
              type="button"
              onClick={reset}
              style={{
                padding: "0.75rem 1.5rem",
                background: "#0052FF",
                color: "#fff",
                border: "none",
                cursor: "pointer",
              }}
            >
              Try again
            </button>
            <Link
              href="/"
              style={{
                padding: "0.75rem 1.5rem",
                border: "1px solid #333",
                color: "#fff",
                textDecoration: "none",
              }}
            >
              Home
            </Link>
          </div>
        </main>
      </body>
    </html>
  );
}
