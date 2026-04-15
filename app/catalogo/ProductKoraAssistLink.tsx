"use client";

import type { ReactNode } from "react";

type ProductKoraAssistLinkProps = {
  className?: string;
  prompt?: string;
  children: ReactNode;
};

export default function ProductKoraAssistLink({
  className,
  prompt = "Quiero asesoría para este producto",
  children,
}: ProductKoraAssistLinkProps) {
  function handleClick() {
    if (typeof window === "undefined") return;
    window.dispatchEvent(
      new CustomEvent("kensar:kora-open", {
        detail: {
          prompt,
        },
      })
    );
  }

  return (
    <button type="button" className={className} onClick={handleClick}>
      {children}
    </button>
  );
}
