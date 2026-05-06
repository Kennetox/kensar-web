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
        const target = event.currentTarget;
        isMouseDragRef.current = true;
        isPointerDownRef.current = true;
        draggedRef.current = false;
        startXRef.current = event.clientX;
        startScrollLeftRef.current = target.scrollLeft;
        target.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        if (!isMouseDragRef.current || !isPointerDownRef.current) return;
        const target = event.currentTarget;
        const deltaX = event.clientX - startXRef.current;

        if (Math.abs(deltaX) > 6) {
          draggedRef.current = true;
        }

        target.scrollLeft = startScrollLeftRef.current - deltaX;
      }}
      onPointerUp={(event) => {
        if (!isMouseDragRef.current) return;
        isPointerDownRef.current = false;
        isMouseDragRef.current = false;
        event.currentTarget.releasePointerCapture(event.pointerId);
      }}
      onPointerCancel={() => {
        isPointerDownRef.current = false;
        isMouseDragRef.current = false;
      }}
      onClickCapture={(event) => {
        if (!draggedRef.current) return;
        event.preventDefault();
        event.stopPropagation();
        draggedRef.current = false;
      }}
    >
      {children}
    </div>
  );
}
