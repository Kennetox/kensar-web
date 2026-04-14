"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const WHATSAPP_PHONE = "573185657508";
const WHATSAPP_MESSAGE =
  "Hola, quiero información sobre productos disponibles en la tienda web de Kensar.";
const LINE_ONE = "¿Necesitas ayuda?";
const LINE_TWO = "Escríbenos por WhatsApp";
const TYPE_SPEED_MS = 44;
const LINE_BREAK_MS = 420;
const VISIBLE_AFTER_TYPING_MS = 2400;
const INITIAL_DELAY_MS = 1300;

function resolveLoopIdleMs(pathname: string): number {
  if (pathname === "/catalogo" || pathname.startsWith("/catalogo/")) {
    return 60000;
  }
  return 20000;
}

export default function FloatingWhatsAppButton() {
  const pathname = usePathname();
  const href = `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;
  const [visible, setVisible] = useState(false);
  const [lineOne, setLineOne] = useState("");
  const [lineTwo, setLineTwo] = useState("");
  const [notifyPulse, setNotifyPulse] = useState(false);
  const loopIdleMs = resolveLoopIdleMs(pathname);

  useEffect(() => {
    let active = true;
    const timeouts: number[] = [];
    const intervals: number[] = [];

    function schedule(callback: () => void, delay: number) {
      const timeoutId = window.setTimeout(() => {
        if (!active) return;
        callback();
      }, delay);
      timeouts.push(timeoutId);
    }

    function triggerNotifyPulse() {
      setNotifyPulse(false);
      const startId = window.setTimeout(() => {
        if (!active) return;
        setNotifyPulse(true);
        window.dispatchEvent(
          new CustomEvent("kensar:whatsapp-nudge", {
            detail: { timestamp: Date.now() },
          })
        );
      }, 20);
      const endId = window.setTimeout(() => {
        if (!active) return;
        setNotifyPulse(false);
      }, 860);
      timeouts.push(startId, endId);
    }

    function typeLine(fullText: string, onTick: (next: string) => void, onDone: () => void) {
      let cursor = 0;
      const intervalId = window.setInterval(() => {
        if (!active) {
          window.clearInterval(intervalId);
          return;
        }
        cursor += 1;
        onTick(fullText.slice(0, cursor));
        if (cursor >= fullText.length) {
          window.clearInterval(intervalId);
          onDone();
        }
      }, TYPE_SPEED_MS);
      intervals.push(intervalId);
    }

    function runCycle() {
      if (!active) return;
      triggerNotifyPulse();
      setLineOne("");
      setLineTwo("");
      setVisible(true);

      typeLine(LINE_ONE, setLineOne, () => {
        schedule(() => {
          typeLine(LINE_TWO, setLineTwo, () => {
            schedule(() => {
              setVisible(false);
              schedule(runCycle, loopIdleMs);
            }, VISIBLE_AFTER_TYPING_MS);
          });
        }, LINE_BREAK_MS);
      });
    }

    schedule(runCycle, INITIAL_DELAY_MS);

    return () => {
      active = false;
      timeouts.forEach((id) => window.clearTimeout(id));
      intervals.forEach((id) => window.clearInterval(id));
    };
  }, [loopIdleMs]);

  const showLineOneCursor = visible && lineOne.length < LINE_ONE.length;
  const showLineTwoCursor = visible && lineOne.length === LINE_ONE.length && lineTwo.length < LINE_TWO.length;

  return (
    <>
      <div className={`floating-whatsapp-typing${visible ? " is-visible" : ""}`} aria-hidden="true">
        <p>
          {lineOne}
          {showLineOneCursor ? <span className="floating-whatsapp-typing-cursor" /> : null}
        </p>
        <p>
          {lineTwo}
          {showLineTwoCursor ? <span className="floating-whatsapp-typing-cursor" /> : null}
        </p>
      </div>

      <Link
        href={href}
        target="_blank"
        rel="noreferrer"
        className={`floating-whatsapp-btn${notifyPulse ? " is-notify-pulse" : ""}`}
        aria-label="Abrir WhatsApp de Kensar"
        title="Escribir por WhatsApp"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 3a8.95 8.95 0 0 0-7.77 13.37L3 21l4.8-1.2A9 9 0 1 0 12 3Zm0 16.2a7.17 7.17 0 0 1-3.66-1.01l-.26-.15-2.84.71.76-2.77-.17-.28A7.2 7.2 0 1 1 12 19.2Zm3.95-5.4c-.22-.11-1.3-.64-1.5-.71-.2-.08-.35-.11-.5.11-.15.22-.57.71-.7.86-.13.15-.26.17-.49.06-.22-.11-.94-.34-1.8-1.09-.66-.58-1.1-1.3-1.23-1.52-.13-.22-.01-.34.1-.45.1-.1.22-.26.34-.39.11-.13.15-.22.22-.37.08-.15.04-.28-.02-.39-.06-.11-.5-1.21-.69-1.66-.18-.43-.36-.38-.5-.39h-.43c-.15 0-.39.06-.6.28-.2.22-.78.76-.78 1.86s.8 2.16.91 2.31c.11.15 1.57 2.4 3.8 3.37.53.23.95.37 1.28.47.54.17 1.04.15 1.43.09.44-.07 1.3-.53 1.49-1.04.18-.5.18-.93.13-1.02-.06-.09-.2-.15-.42-.26Z"
            fill="currentColor"
          />
        </svg>
      </Link>
    </>
  );
}
