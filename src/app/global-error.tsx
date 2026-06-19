"use client";

import { useEffect } from "react";

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
      <body
        style={{
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          display: "flex",
          minHeight: "100vh",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "12px",
          color: "#37352f",
          background: "#ffffff",
        }}
      >
        <p style={{ fontSize: "14px", fontWeight: 500 }}>Something went wrong</p>
        <button
          type="button"
          onClick={reset}
          style={{
            fontSize: "14px",
            padding: "8px 12px",
            borderRadius: "6px",
            background: "#2383e2",
            color: "#ffffff",
            border: "none",
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
