"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode, useState, useEffect } from "react";

// Fallback for when Convex is not configured
const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || "";

function NoOpProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export default function ConvexClientProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [client, setClient] = useState<ConvexReactClient | null>(null);

  useEffect(() => {
    if (CONVEX_URL) {
      try {
        const c = new ConvexReactClient(CONVEX_URL);
        setClient(c);
      } catch {
        // Convex not available — run in demo mode
      }
    }
  }, []);

  if (!client) {
    return <NoOpProvider>{children}</NoOpProvider>;
  }

  return <ConvexProvider client={client}>{children}</ConvexProvider>;
}
