"use client";

import { useRef, type ReactNode } from "react";

type ProductHorizontalDragScrollProps = {
  className?: string;
  children: ReactNode;
};

export default function ProductHorizontalDragScroll({
  className,
  children,
}: ProductHorizontalDragScrollProps) {
  const isPointerDownRef = useRef(false);
  const isMouseDragRef = useRef(false);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const startScrollLeftRef = useRef(0);
  const draggedRef = useRef(false);

  return (
    <div
      className={className}
      onPointerDown={(event) => {
        if (event.pointerType !== "mouse") {
          isMouseDragRef.current = false;
          return;
        }
        const interactiveTarget = (event.target as HTMLElement | null)?.closest(
          "a, button, input, select, textarea, label"
        );
        if (interactiveTarget) {
          isMouseDragRef.current = false;
          return;
        }
        const target = event.currentTarget;
        isMouseDragRef.current = true;
        isPointerDownRef.current = true;
        draggedRef.current = false;
        startXRef.current = event.clientX;
        startYRef.current = event.clientY;
        startScrollLeftRef.current = target.scrollLeft;
      }}
      onPointerMove={(event) => {
        if (!isMouseDragRef.current || !isPointerDownRef.current) return;
        const target = event.currentTarget;
        const deltaX = event.clientX - startXRef.current;
        const deltaY = event.clientY - startYRef.current;

        if (Math.abs(deltaX) > 10 && Math.abs(deltaX) > Math.abs(deltaY)) {
          draggedRef.current = true;
        }

        if (draggedRef.current) {
          target.scrollLeft = startScrollLeftRef.current - deltaX;
        }
      }}
      onPointerUp={(event) => {
        if (!isMouseDragRef.current) return;
        isPointerDownRef.current = false;
        isMouseDragRef.current = false;
        draggedRef.current = false;
      }}
      onPointerCancel={() => {
        isPointerDownRef.current = false;
        isMouseDragRef.current = false;
        draggedRef.current = false;
      }}
    >
      {children}
    </div>
  );
}
