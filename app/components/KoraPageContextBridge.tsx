"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import type { KoraPageContext } from "@/app/lib/kora/knowledge-types";
import { publishPageContext } from "@/app/lib/kora/handoff-client";

export default function KoraPageContextBridge({ pageContext }: { pageContext: KoraPageContext }) {
  const pathname = usePathname();

  useEffect(() => {
    publishPageContext(pathname, pageContext);
  }, [pathname, pageContext]);

  return null;
}
